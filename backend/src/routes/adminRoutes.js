const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const cosmosService = require('../services/cosmosService');
const { authorizeRole } = require('../middleware/authorization');
const { auditAction } = require('../middleware/audit');
const authenticateToken = require('../middleware/auth');

const router = express.Router();

// Admin-only routes for system administration

// UNPROTECTED: Create initial organization and admin user
// This endpoint is used for initial setup and doesn't require authentication
router.post('/create-organization', async (req, res) => {
  try {
    const { name, adminUser } = req.body;

    // Validate input
    if (!name || !adminUser || !adminUser.username || !adminUser.email || !adminUser.password) {
      return res.status(400).json({
        error: 'Organization name and admin user details are required',
        required: {
          name: 'string',
          adminUser: {
            username: 'string',
            email: 'string',
            password: 'string',
            firstName: 'string',
            lastName: 'string'
          }
        }
      });
    }

    // Check if organization with similar name already exists
    const existingOrgs = await cosmosService.queryItems('organizations', 
      'SELECT * FROM c WHERE LOWER(c.name) = LOWER(@name)', 
      [{ name: '@name', value: name }]
    );

    if (existingOrgs.length > 0) {
      return res.status(409).json({
        error: 'Organization with this name already exists',
        existingOrganization: existingOrgs[0].name
      });
    }

    // Check if user with this email already exists across all organizations
    const existingUsers = await cosmosService.queryItems('users',
      'SELECT * FROM c WHERE LOWER(c.email) = LOWER(@email)',
      [{ name: '@email', value: adminUser.email }]
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({
        error: 'User with this email already exists',
        existingEmail: adminUser.email
      });
    }

    // Create organization
    const organizationId = uuidv4();
    const organization = {
      id: organizationId,
      name: name.trim(),
      status: 'active',
      plan: 'basic',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      settings: {
        allowUserRegistration: false,
        requireEmailVerification: true,
        sessionTimeout: 24, // hours
        passwordPolicy: {
          minLength: 8,
          requireUppercase: true,
          requireLowercase: true,
          requireNumbers: true,
          requireSpecialChars: true
        }
      },
      limits: {
        maxUsers: 100,
        maxDrugs: 1000,
        maxStudies: 50
      }
    };

    const createdOrg = await cosmosService.createItem('organizations', organization);

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(adminUser.password, saltRounds);

    // Create admin user
    const userId = uuidv4();
    const user = {
      id: userId,
      organizationId: organizationId,
      username: adminUser.username.toLowerCase().trim(),
      email: adminUser.email.toLowerCase().trim(),
      firstName: adminUser.firstName.trim(),
      lastName: adminUser.lastName.trim(),
      role: 'admin',
      passwordHash: hashedPassword,
      status: 'active',
      emailVerified: true, // Auto-verify for initial admin
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastLogin: null,
      permissions: {
        canManageUsers: true,
        canManageOrganization: true,
        canViewAuditLogs: true,
        canManageDrugs: true,
        canManageStudies: true,
        canExportData: true
      }
    };

    const createdUser = await cosmosService.createItem('users', user);

    // Generate JWT token for immediate use
    const token = jwt.sign(
      { 
        userId: createdUser.id, 
        organizationId: createdOrg.id,
        role: createdUser.role,
        username: createdUser.username
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    // Remove sensitive data from response
    const { passwordHash, ...userResponse } = createdUser;

    console.log(`✅ Organization created: ${createdOrg.name}`);
    console.log(`✅ Admin user created: ${createdUser.username}`);

    res.status(201).json({
      message: 'Organization and admin user created successfully',
      organization: createdOrg,
      user: userResponse,
      token: token
    });

  } catch (error) {
    console.error('Error creating organization:', error);
    res.status(500).json({
      error: 'Failed to create organization',
      details: error.message
    });
  }
});

// Get all organizations (Super Admin only - for future use)
router.get('/organizations',
  authenticateToken,
  authorizeRole('Admin'), // This would need to be extended for super admin
  async (req, res) => {
    try {
      // This endpoint would only be available to super admins in a multi-tenant setup
      // For now, just return the current organization
      const organization = await cosmosService.getItem('organizations', req.user.organizationId, req.user.organizationId);
      
      res.json({
        organizations: organization ? [organization] : [],
        total: organization ? 1 : 0
      });

    } catch (error) {
      console.error('Error fetching organizations:', error);
      res.status(500).json({
        error: 'Failed to fetch organizations',
        message: error.message
      });
    }
  }
);

// Get system statistics (Admin only)
router.get('/stats/system',
  authenticateToken,
  authorizeRole('Admin'),
  async (req, res) => {
    try {
      const [users, drugs, studies, auditLogs] = await Promise.all([
        cosmosService.getUsersByOrganization(req.user.organizationId),
        cosmosService.getDrugsByOrganization(req.user.organizationId),
        cosmosService.getStudiesByOrganization(req.user.organizationId),
        cosmosService.getAuditLogsByOrganization(req.user.organizationId, 1000)
      ]);

      // Get recent activity (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const recentAuditLogs = auditLogs.filter(log => 
        new Date(log.timestamp) > thirtyDaysAgo
      );

      // Activity by day
      const activityByDay = {};
      recentAuditLogs.forEach(log => {
        const day = log.timestamp.split('T')[0];
        activityByDay[day] = (activityByDay[day] || 0) + 1;
      });

      // User activity
      const userActivity = {};
      recentAuditLogs.forEach(log => {
        userActivity[log.userName] = (userActivity[log.userName] || 0) + 1;
      });

      const stats = {
        overview: {
          totalUsers: users.length,
          activeUsers: users.filter(u => u.isActive).length,
          totalDrugs: drugs.length,
          activeDrugs: drugs.filter(d => d.status === 'Active').length,
          totalStudies: studies.length,
          pendingStudies: studies.filter(s => s.status === 'Pending Review').length
        },
        activity: {
          totalActions: recentAuditLogs.length,
          dailyActivity: Object.entries(activityByDay)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, count]) => ({ date, count })),
          topUsers: Object.entries(userActivity)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10)
            .map(([user, count]) => ({ user, count })),
          actionBreakdown: recentAuditLogs.reduce((acc, log) => {
            acc[log.action] = (acc[log.action] || 0) + 1;
            return acc;
          }, {})
        },
        health: {
          databaseConnected: true,
          lastActivityAt: auditLogs.length > 0 ? auditLogs[0].timestamp : null,
          averageResponseTime: '< 100ms', // This would come from monitoring
          uptime: process.uptime()
        }
      };

      res.json(stats);

    } catch (error) {
      console.error('Error fetching system statistics:', error);
      res.status(500).json({
        error: 'Failed to fetch system statistics',
        message: error.message
      });
    }
  }
);

// Clean up old audit logs (Admin only)
router.post('/cleanup/audit-logs',
  authenticateToken,
  authorizeRole('Admin'),
  async (req, res) => {
    try {
      const { olderThanDays = 90 } = req.body;
      
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      // Get old audit logs
      const oldLogs = await cosmosService.queryItems(
        'audit-logs',
        'SELECT c.id FROM c WHERE c.organizationId = @orgId AND c.timestamp < @cutoffDate',
        [
          { name: '@orgId', value: req.user.organizationId },
          { name: '@cutoffDate', value: cutoffDate.toISOString() }
        ]
      );

      let deletedCount = 0;
      const batchSize = 100;

      // Delete in batches
      for (let i = 0; i < oldLogs.length; i += batchSize) {
        const batch = oldLogs.slice(i, i + batchSize);
        
        await Promise.all(
          batch.map(log => 
            cosmosService.deleteItem('audit-logs', log.id, req.user.organizationId)
              .then(() => deletedCount++)
              .catch(error => console.error(`Failed to delete audit log ${log.id}:`, error))
          )
        );
      }

      // Create audit log for cleanup
      await auditAction(
        req.user,
        'delete',
        'audit',
        'cleanup',
        `Cleaned up ${deletedCount} old audit log entries (older than ${olderThanDays} days)`,
        { deletedCount, olderThanDays }
      );

      res.json({
        message: 'Audit log cleanup completed',
        deletedCount,
        olderThanDays
      });

    } catch (error) {
      console.error('Error cleaning up audit logs:', error);
      res.status(500).json({
        error: 'Failed to clean up audit logs',
        message: error.message
      });
    }
  }
);

// Database health check (Admin only)
router.get('/health/database',
  authenticateToken,
  authorizeRole('Admin'),
  async (req, res) => {
    try {
      const startTime = Date.now();
      
      // Test database connectivity
      const testQuery = await cosmosService.queryItems(
        'organizations',
        'SELECT VALUE COUNT(1) FROM c WHERE c.id = @orgId',
        [{ name: '@orgId', value: req.user.organizationId }]
      );
      
      const responseTime = Date.now() - startTime;

      const health = {
        status: 'healthy',
        responseTime: `${responseTime}ms`,
        timestamp: new Date().toISOString(),
        tests: {
          connectivity: testQuery !== null,
          queryExecution: responseTime < 1000,
          organizationAccess: testQuery[0] === 1
        }
      };

      // Determine overall status
      const allTestsPassed = Object.values(health.tests).every(test => test === true);
      health.status = allTestsPassed ? 'healthy' : 'degraded';

      res.json(health);

    } catch (error) {
      console.error('Database health check failed:', error);
      res.status(500).json({
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
);

// Export organization data (Admin only)
router.get('/export/organization-data',
  authenticateToken,
  authorizeRole('Admin'),
  async (req, res) => {
    try {
      const { format = 'json' } = req.query;

      const [organization, users, drugs, studies] = await Promise.all([
        cosmosService.getItem('organizations', req.user.organizationId, req.user.organizationId),
        cosmosService.getUsersByOrganization(req.user.organizationId),
        cosmosService.getDrugsByOrganization(req.user.organizationId),
        cosmosService.getStudiesByOrganization(req.user.organizationId)
      ]);

      // Remove sensitive data
      const sanitizedUsers = users.map(user => {
        const { password, ...safeUser } = user;
        return safeUser;
      });

      const exportData = {
        organization,
        users: sanitizedUsers,
        drugs,
        studies,
        exportedAt: new Date().toISOString(),
        exportedBy: req.user.id
      };

      if (format === 'json') {
        const filename = `organization-export-${req.user.organizationId}-${new Date().toISOString().split('T')[0]}.json`;
        
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.json(exportData);
      } else {
        return res.status(400).json({
          error: 'Unsupported format. Only JSON is supported.'
        });
      }

      // Create audit log
      await auditAction(
        req.user,
        'export',
        'organization',
        req.user.organizationId,
        `Exported complete organization data (${format.toUpperCase()} format)`,
        { 
          format, 
          dataTypes: ['organization', 'users', 'drugs', 'studies'],
          counts: {
            users: sanitizedUsers.length,
            drugs: drugs.length,
            studies: studies.length
          }
        }
      );

    } catch (error) {
      console.error('Error exporting organization data:', error);
      res.status(500).json({
        error: 'Failed to export organization data',
        message: error.message
      });
    }
  }
);

// Create admin user with full permissions
router.post('/create-admin-user', async (req, res) => {
  try {
    const { username, email, password, firstName, lastName, roleType = 'admin' } = req.body;

    // Validate input
    if (!username || !email || !password || !firstName || !lastName) {
      return res.status(400).json({
        error: 'All fields are required',
        required: ['username', 'email', 'password', 'firstName', 'lastName']
      });
    }

    // Use requesting user's organization or allow override for superadmin
    const organizationId = req.user ? req.user.organizationId : req.body.organizationId;
    
    if (!organizationId) {
      return res.status(400).json({
        error: 'Organization ID is required'
      });
    }

    console.log(`Creating ${roleType} user: ${email} in org: ${organizationId}`);

    // Check if user already exists
    const existingUserQuery = `
      SELECT * FROM c 
      WHERE c.type = 'user' 
      AND (c.email = @email OR c.username = @username)
    `;
    const existingUsers = await cosmosService.queryItems('users', existingUserQuery, [
      { name: '@email', value: email.toLowerCase() },
      { name: '@username', value: username.toLowerCase() }
    ]);

    if (existingUsers.length > 0) {
      return res.status(409).json({
        error: 'User with this email or username already exists'
      });
    }

    // Ensure the role exists
    const roleQuery = `
      SELECT * FROM c 
      WHERE c.type = 'role' 
      AND c.name = @roleName 
      AND c.organizationId = @organizationId
    `;
    const roleParams = [
      { name: '@roleName', value: roleType },
      { name: '@organizationId', value: organizationId }
    ];
    
    let existingRoles = await cosmosService.queryItems('users', roleQuery, roleParams);
    let role;

    if (existingRoles.length === 0) {
      // Create the role
      console.log(`Creating ${roleType} role...`);
      
      const rolePermissions = roleType === 'superadmin' ? {
        dashboard: { read: true, write: true },
        users: { read: true, write: true, delete: true },
        roles: { read: true, write: true, delete: true },
        drugs: { read: true, write: true, delete: true },
        studies: { read: true, write: true, delete: true },
        audit: { read: true, write: true, delete: false },
        settings: { read: true, write: true },
        organizations: { read: true, write: true, delete: true },
        reports: { read: true, write: true, delete: true }
      } : {
        dashboard: { read: true, write: true },
        users: { read: true, write: true, delete: true },
        roles: { read: true, write: true, delete: true },
        drugs: { read: true, write: true, delete: true },
        studies: { read: true, write: true, delete: true },
        audit: { read: true, write: false, delete: false },
        settings: { read: true, write: true },
        organizations: { read: true, write: true, delete: false },
        reports: { read: true, write: true, delete: false }
      };

      role = {
        id: uuidv4(),
        type: 'role',
        organizationId: organizationId,
        name: roleType,
        displayName: roleType === 'superadmin' ? 'Super Administrator' : 'Administrator',
        description: `${roleType === 'superadmin' ? 'Full system' : 'Organization'} administrator with ${roleType === 'superadmin' ? 'all' : 'most'} permissions`,
        isSystemRole: true,
        isActive: true,
        permissions: rolePermissions,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: req.user ? req.user.id : 'system'
      };
      
      await cosmosService.createItem('users', role);
      console.log(`${roleType} role created with ID:`, role.id);
    } else {
      role = existingRoles[0];
      console.log(`Using existing ${roleType} role with ID:`, role.id);
    }

    // Create the user
    const User = require('../models/User');
    const newUser = new User({
      organizationId: organizationId,
      username: username.toLowerCase(),
      email: email.toLowerCase(),
      password: password,
      firstName: firstName,
      lastName: lastName,
      roleId: role.id,
      role: roleType,
      permissions: role.permissions,
      createdBy: req.user ? req.user.id : 'system'
    });

    // Hash password
    await newUser.hashPassword();

    // Save user
    const savedUser = await cosmosService.createItem('users', newUser.toJSON());

    // Return safe user data
    const safeUser = newUser.toSafeJSON();

    res.status(201).json({
      message: `${roleType} user created successfully`,
      user: safeUser,
      role: {
        id: role.id,
        name: role.name,
        displayName: role.displayName,
        permissions: role.permissions
      }
    });

  } catch (error) {
    console.error('Error creating admin user:', error);
    res.status(500).json({
      error: 'Failed to create admin user',
      message: error.message
    });
  }
});

// TEMPORARY: Fix superadmin permissions for a specific user
router.post('/fix-superadmin-permissions', async (req, res) => {
  try {
    const { userId, organizationId } = req.body;

    if (!userId || !organizationId) {
      return res.status(400).json({
        error: 'userId and organizationId are required'
      });
    }

    console.log(`Fixing superadmin permissions for user ${userId} in org ${organizationId}`);

    // Get the user
    const user = await cosmosService.getItem('users', userId, organizationId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if superadmin role exists
    const roleQuery = `
      SELECT * FROM c 
      WHERE c.type = 'role' 
      AND c.name = 'superadmin' 
      AND c.organizationId = @organizationId
    `;
    const roleParams = [{ name: '@organizationId', value: organizationId }];
    const existingRoles = await cosmosService.queryItems('users', roleQuery, roleParams);

    let superadminRole;
    
    if (existingRoles.length === 0) {
      // Create superadmin role
      console.log('Creating superadmin role...');
      superadminRole = {
        id: uuidv4(),
        type: 'role',
        organizationId: organizationId,
        name: 'superadmin',
        displayName: 'Super Administrator',
        description: 'Full system access with all permissions',
        isSystemRole: true,
        isActive: true,
        permissions: {
          dashboard: { read: true, write: true },
          users: { read: true, write: true, delete: true },
          roles: { read: true, write: true, delete: true },
          drugs: { read: true, write: true, delete: true },
          studies: { read: true, write: true, delete: true },
          audit: { read: true, write: true, delete: false },
          settings: { read: true, write: true },
          organizations: { read: true, write: true, delete: true }
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'system'
      };
      
      await cosmosService.createItem('users', superadminRole);
      console.log('Superadmin role created with ID:', superadminRole.id);
    } else {
      superadminRole = existingRoles[0];
      console.log('Using existing superadmin role with ID:', superadminRole.id);
    }

    // Update the user
    const updatedUser = {
      ...user,
      roleId: superadminRole.id,
      role: 'superadmin',
      permissions: superadminRole.permissions,
      updatedAt: new Date().toISOString()
    };

    await cosmosService.updateItem('users', userId, organizationId, updatedUser);

    res.json({
      message: 'Superadmin permissions fixed successfully',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        role: updatedUser.role,
        roleId: updatedUser.roleId,
        permissions: updatedUser.permissions
      }
    });

  } catch (error) {
    console.error('Error fixing superadmin permissions:', error);
    res.status(500).json({
      error: 'Failed to fix superadmin permissions',
      message: error.message
    });
  }
});

module.exports = router;
