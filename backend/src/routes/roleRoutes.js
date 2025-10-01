const express = require('express');
const { body, validationResult } = require('express-validator');

const roleService = require('../services/roleService');
const { authorizeRole, authorizePermission } = require('../middleware/authorization');
const { auditLogger, auditAction } = require('../middleware/audit');

const router = express.Router();

// Apply audit logging to all routes
router.use(auditLogger());

// Get all roles for the organization
router.get('/', 
  authorizePermission('roles', 'read'),
  async (req, res) => {
    try {
      const roles = await roleService.getRolesByOrganization(req.user.organizationId);
      
      res.json({
        roles: roles.map(role => role.toJSON()),
        total: roles.length
      });

    } catch (error) {
      console.error('Error fetching roles:', error);
      res.status(500).json({
        error: 'Failed to fetch roles',
        message: error.message
      });
    }
  }
);

// Get specific role
router.get('/:roleId',
  authorizePermission('roles', 'read'),
  async (req, res) => {
    try {
      const role = await roleService.getRoleById(req.params.roleId, req.user.organizationId);
      
      if (!role) {
        return res.status(404).json({
          error: 'Role not found'
        });
      }

      res.json({
        role: role.toJSON()
      });

    } catch (error) {
      console.error('Error fetching role:', error);
      res.status(500).json({
        error: 'Failed to fetch role',
        message: error.message
      });
    }
  }
);

// Create new role
router.post('/',
  authorizePermission('roles', 'write'),
  [
    body('name')
      .trim()
      .isLength({ min: 2, max: 50 })
      .matches(/^[a-z0-9_]+$/)
      .withMessage('Role name must be 2-50 characters, lowercase letters, numbers, and underscores only'),
    body('displayName')
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Display name must be 2-100 characters'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Description must be less than 500 characters'),
    body('permissions')
      .isObject()
      .withMessage('Permissions must be an object')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const roleData = {
        organizationId: req.user.organizationId,
        name: req.body.name,
        displayName: req.body.displayName,
        description: req.body.description || '',
        permissions: req.body.permissions,
        isSystemRole: false
      };

      const role = await roleService.createRole(roleData, req.user);

      // Log the action
      await auditAction(req, 'CREATE', 'role', role.id, {
        roleName: role.name,
        displayName: role.displayName
      });

      res.status(201).json({
        message: 'Role created successfully',
        role: role.toJSON()
      });

    } catch (error) {
      console.error('Error creating role:', error);
      
      if (error.message.includes('already exists')) {
        return res.status(409).json({
          error: error.message
        });
      }

      res.status(500).json({
        error: 'Failed to create role',
        message: error.message
      });
    }
  }
);

// Update role
router.put('/:roleId',
  authorizePermission('roles', 'write'),
  [
    body('name')
      .optional()
      .trim()
      .isLength({ min: 2, max: 50 })
      .matches(/^[a-z0-9_]+$/)
      .withMessage('Role name must be 2-50 characters, lowercase letters, numbers, and underscores only'),
    body('displayName')
      .optional()
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Display name must be 2-100 characters'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Description must be less than 500 characters'),
    body('permissions')
      .optional()
      .isObject()
      .withMessage('Permissions must be an object')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const updateData = {};
      ['name', 'displayName', 'description', 'permissions'].forEach(field => {
        if (req.body[field] !== undefined) {
          updateData[field] = req.body[field];
        }
      });

      const role = await roleService.updateRole(
        req.params.roleId, 
        req.user.organizationId, 
        updateData, 
        req.user
      );

      // Log the action
      await auditAction(req, 'UPDATE', 'role', role.id, {
        roleName: role.name,
        displayName: role.displayName,
        changes: updateData
      });

      res.json({
        message: 'Role updated successfully',
        role: role.toJSON()
      });

    } catch (error) {
      console.error('Error updating role:', error);
      
      if (error.message === 'Role not found') {
        return res.status(404).json({ error: error.message });
      }
      
      if (error.message.includes('Cannot modify') || error.message.includes('already exists')) {
        return res.status(400).json({ error: error.message });
      }

      res.status(500).json({
        error: 'Failed to update role',
        message: error.message
      });
    }
  }
);

// Delete role
router.delete('/:roleId',
  authorizePermission('roles', 'delete'),
  async (req, res) => {
    try {
      const role = await roleService.deleteRole(req.params.roleId, req.user.organizationId, req.user);

      // Log the action
      await auditAction(req, 'DELETE', 'role', role.id, {
        roleName: role.name,
        displayName: role.displayName
      });

      res.json({
        message: 'Role deleted successfully'
      });

    } catch (error) {
      console.error('Error deleting role:', error);
      
      if (error.message === 'Role not found') {
        return res.status(404).json({ error: error.message });
      }
      
      if (error.message.includes('Cannot delete') || error.message.includes('user(s) are assigned')) {
        return res.status(400).json({ error: error.message });
      }

      res.status(500).json({
        error: 'Failed to delete role',
        message: error.message
      });
    }
  }
);

// Get users assigned to a role
router.get('/:roleId/users',
  authorizePermission('roles', 'read'),
  async (req, res) => {
    try {
      const users = await roleService.getUsersWithRole(req.params.roleId, req.user.organizationId);
      
      // Remove sensitive information
      const safeUsers = users.map(user => {
        const { password, ...safeUser } = user;
        return safeUser;
      });

      res.json({
        users: safeUsers,
        total: safeUsers.length
      });

    } catch (error) {
      console.error('Error fetching users with role:', error);
      res.status(500).json({
        error: 'Failed to fetch users with role',
        message: error.message
      });
    }
  }
);

// Get permission structure (for UI purposes)
router.get('/system/permissions',
  authorizePermission('roles', 'read'),
  async (req, res) => {
    try {
      const permissionStructure = roleService.getPermissionStructure();
      
      res.json({
        permissions: permissionStructure
      });

    } catch (error) {
      console.error('Error fetching permission structure:', error);
      res.status(500).json({
        error: 'Failed to fetch permission structure',
        message: error.message
      });
    }
  }
);

// Initialize system roles (for setup purposes)
router.post('/system/initialize',
  authorizeRole('superadmin'),
  async (req, res) => {
    try {
      const createdRoles = await roleService.initializeSystemRoles(req.user.organizationId, req.user);
      
      // Log the action
      await auditAction(req, 'CREATE', 'system_roles', 'bulk', {
        createdRoles: createdRoles.map(role => role.name)
      });

      res.json({
        message: 'System roles initialized successfully',
        createdRoles: createdRoles.map(role => role.toJSON())
      });

    } catch (error) {
      console.error('Error initializing system roles:', error);
      res.status(500).json({
        error: 'Failed to initialize system roles',
        message: error.message
      });
    }
  }
);

// Debug endpoint to inspect all data in users container
router.get('/debug/inspect-database',
  authorizeRole('superadmin'),
  async (req, res) => {
    try {
      console.log('🔍 DEBUG: Inspecting database for organization:', req.user.organizationId);
      
      const cosmosService = require('../services/cosmosService');
      
      // Get ALL items for this organization (not just roles)
      const allItemsQuery = `
        SELECT * FROM c 
        WHERE c.organizationId = @organizationId
      `;
      
      const parameters = [
        { name: '@organizationId', value: req.user.organizationId }
      ];

      console.log('🔍 Querying all items for organization...');
      const allItems = await cosmosService.queryItems('users', allItemsQuery, parameters);
      
      // Get ALL roles (including inactive ones)
      const allRolesQuery = `
        SELECT * FROM c 
        WHERE c.type = 'role' 
        AND c.organizationId = @organizationId
      `;
      
      console.log('🔍 Querying all roles for organization...');
      const allRoles = await cosmosService.queryItems('users', allRolesQuery, parameters);
      
      // Categorize items by type
      const itemsByType = {};
      allItems.forEach(item => {
        const type = item.type || 'unknown';
        if (!itemsByType[type]) {
          itemsByType[type] = [];
        }
        itemsByType[type].push({
          id: item.id,
          name: item.name || item.username || 'N/A',
          isActive: item.isActive,
          isSystemRole: item.isSystemRole,
          createdAt: item.createdAt
        });
      });

      // Check for specific ID conflicts
      const conflictingIds = [
        'd79d7f95-0441-49bd-831a-1440c2f15cee',
        '030a279a-e6ba-4727-9bd5-57319893b167'
      ];
      
      const conflictResults = {};
      for (const id of conflictingIds) {
        const conflictQuery = `SELECT * FROM c WHERE c.id = @id`;
        const conflictParams = [{ name: '@id', value: id }];
        const conflictItems = await cosmosService.queryItems('users', conflictQuery, conflictParams);
        conflictResults[id] = conflictItems;
      }

      console.log(`🎯 Found ${allItems.length} total items, ${allRoles.length} roles`);

      res.json({
        organization: req.user.organizationId,
        summary: {
          totalItems: allItems.length,
          totalRoles: allRoles.length,
          itemsByType: Object.keys(itemsByType).map(type => ({
            type,
            count: itemsByType[type].length
          }))
        },
        allRoles: allRoles.map(role => ({
          id: role.id,
          name: role.name,
          displayName: role.displayName,
          isActive: role.isActive,
          isSystemRole: role.isSystemRole,
          createdAt: role.createdAt
        })),
        itemsByType,
        conflictingIds: conflictResults,
        debug: {
          message: 'This shows all data in the users container for your organization'
        }
      });

    } catch (error) {
      console.error('Error inspecting database:', error);
      res.status(500).json({
        error: 'Failed to inspect database',
        message: error.message
      });
    }
  }
);

// Debug endpoint to force delete all roles (including system roles)
router.delete('/debug/force-delete-all',
  authorizeRole('superadmin'),
  async (req, res) => {
    try {
      console.log('🚨 DEBUG: Force deleting all roles for organization:', req.user.organizationId);
      
      // Get all roles for the organization (including system roles and inactive ones)
      const query = `
        SELECT * FROM c 
        WHERE c.type = 'role' 
        AND c.organizationId = @organizationId
      `;
      
      const parameters = [
        { name: '@organizationId', value: req.user.organizationId }
      ];

      const cosmosService = require('../services/cosmosService');
      const allRoles = await cosmosService.queryItems('users', query, parameters);
      
      console.log(`Found ${allRoles.length} roles to delete`);
      
      const deletedRoles = [];
      const errors = [];

      // Force delete each role directly from Cosmos DB
      for (const role of allRoles) {
        try {
          console.log(`Deleting role: ${role.name} (${role.id})`);
          await cosmosService.deleteItem('users', role.id, req.user.organizationId);
          deletedRoles.push({
            id: role.id,
            name: role.name,
            displayName: role.displayName,
            isSystemRole: role.isSystemRole
          });
          console.log(`✅ Deleted role: ${role.name}`);
        } catch (deleteError) {
          console.error(`❌ Failed to delete role ${role.name}:`, deleteError);
          errors.push({
            id: role.id,
            name: role.name,
            error: deleteError.message
          });
        }
      }

      // Log the action
      await auditAction(req, 'DELETE', 'all_roles', 'debug_operation', {
        deletedCount: deletedRoles.length,
        errorCount: errors.length,
        deletedRoles: deletedRoles.map(r => r.name)
      });

      console.log(`🎉 Debug operation completed. Deleted: ${deletedRoles.length}, Errors: ${errors.length}`);

      res.json({
        message: 'Force delete operation completed',
        deleted: deletedRoles,
        errors: errors,
        summary: {
          totalFound: allRoles.length,
          successfullyDeleted: deletedRoles.length,
          failed: errors.length
        }
      });

    } catch (error) {
      console.error('Error in force delete all roles:', error);
      res.status(500).json({
        error: 'Failed to force delete all roles',
        message: error.message
      });
    }
  }
);

module.exports = router;