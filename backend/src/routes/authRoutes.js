const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');

const cosmosService = require('../services/cosmosService');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const authenticateToken = require('../middleware/auth');
const geolocationService = require('../services/geolocationService');

const router = express.Router();

// Login endpoint
router.post('/login', [
  body('email').optional().isEmail().normalizeEmail(),
  body('username').optional().isLength({ min: 3 }),
  body('password').isLength({ min: 6 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { email, username, password, organizationId } = req.body;
    
    console.log('Login attempt:', { email, username, organizationId, hasPassword: !!password });
    
    // Check that either email or username is provided
    if (!email && !username) {
      return res.status(400).json({
        error: 'Either email or username is required'
      });
    }

    // Find user by email or username
    let user;
    const loginIdentifier = email || username;
    
    // Try email lookup first (handles cases where username field contains email)
    if (loginIdentifier.includes('@')) {
      console.log('Looking up user by email:', loginIdentifier);
      user = await cosmosService.getUserByEmail(loginIdentifier);
    } else {
      console.log('Looking up user by username:', loginIdentifier);
      user = await cosmosService.getUserByUsernameGlobal(loginIdentifier);
    }
    
    console.log('User found:', user ? 'Yes' : 'No', user ? `ID: ${user.id}` : '');
    
    if (!user || !user.isActive) {
      // Get location information
      const location = await geolocationService.getCountryFromIP(req.ip).catch(() => null);
      
      // Create failed login audit log
      const auditLog = new AuditLog({
        organizationId: 'unknown',
        userId: 'unknown',
        userName: email || username,
        action: 'login_failed',
        resource: 'auth',
        resourceId: 'unknown',
        details: `Failed login attempt for ${email ? 'email' : 'username'} ${email || username}`,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        location
      });
      
      await cosmosService.createItem('audit-logs', auditLog.toJSON()).catch(console.error);
      
      return res.status(401).json({
        error: 'Invalid credentials'
      });
    }

    // Validate password
    const userInstance = new User(user);
    console.log('Validating password for user:', user.id);
    const isValidPassword = await userInstance.validatePassword(password);
    console.log('Password validation result:', isValidPassword);
    
    if (!isValidPassword) {
      // Get location information
      const location = await geolocationService.getCountryFromIP(req.ip).catch(() => null);
      
      // Create failed login audit log
      const auditLog = AuditLog.createLoginLog(userInstance, req.ip, req.get('User-Agent'), false, location);
      await cosmosService.createItem('audit-logs', auditLog.toJSON()).catch(console.error);
      
      return res.status(401).json({
        error: 'Invalid credentials'
      });
    }

    // Update last login
    userInstance.updateLastLogin();
    await cosmosService.updateItem('users', user.id, user.organizationId, {
      lastLogin: userInstance.lastLogin,
      updatedAt: userInstance.updatedAt
    });

    // Create JWT token
    const token = jwt.sign(
      { 
        userId: user.id,
        organizationId: user.organizationId,
        role: user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    // Get location information
    const location = await geolocationService.getCountryFromIP(req.ip).catch(() => null);
    
    // Create successful login audit log
    const auditLog = AuditLog.createLoginLog(userInstance, req.ip, req.get('User-Agent'), true, location);
    await cosmosService.createItem('audit-logs', auditLog.toJSON()).catch(console.error);

    // Get organization details
    const organization = await cosmosService.getItem('organizations', user.organizationId, user.organizationId);

    res.json({
      message: 'Login successful',
      token,
      user: userInstance.toSafeJSON(),
      organization: organization ? {
        id: organization.id,
        name: organization.name,
        plan: organization.plan,
        settings: organization.settings
      } : null
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'Login failed',
      message: error.message
    });
  }
});

// Register organization and admin user
router.post('/register', [
  body('organizationName').isLength({ min: 2 }),
  body('adminEmail').isEmail().normalizeEmail(),
  body('adminPassword').isLength({ min: 8 }),
  body('adminFirstName').isLength({ min: 1 }),
  body('adminLastName').isLength({ min: 1 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const {
      organizationName,
      adminEmail,
      adminPassword,
      adminFirstName,
      adminLastName,
      plan = 'basic'
    } = req.body;



    // Validate required fields
    if (!organizationName || !adminEmail || !adminPassword || !adminFirstName || !adminLastName) {
      return res.status(400).json({
        error: 'Missing required fields',
        details: {
          organizationName: !organizationName ? 'required' : 'ok',
          adminEmail: !adminEmail ? 'required' : 'ok',
          adminPassword: !adminPassword ? 'required' : 'ok',
          adminFirstName: !adminFirstName ? 'required' : 'ok',
          adminLastName: !adminLastName ? 'required' : 'ok'
        }
      });
    }

    // Check if user with email already exists
    const existingUser = await cosmosService.getUserByEmail(adminEmail);
    if (existingUser) {
      return res.status(409).json({
        error: 'User with this email already exists'
      });
    }

    // Create organization
    const Organization = require('../models/Organization');
    const organization = new Organization({
      name: organizationName,
      adminEmail,
      plan
    });

    const orgValidationErrors = Organization.validate(organization);
    if (orgValidationErrors.length > 0) {
      return res.status(400).json({
        error: 'Organization validation failed',
        details: orgValidationErrors
      });
    }

    const createdOrg = await cosmosService.createItem('organizations', organization.toJSON());

    // Create admin user
    const username = `${adminEmail.split('@')[0]}_${createdOrg.id.substring(0, 6)}`;
    const adminUser = new User({
      organizationId: createdOrg.id,
      username: username, // Use email prefix + org ID for uniqueness
      email: adminEmail,
      password: adminPassword,
      firstName: adminFirstName,
      lastName: adminLastName,
      role: 'Admin',
      createdBy: 'system'
    });

    const userValidationErrors = User.validate(adminUser);
    if (userValidationErrors.length > 0) {
      // Cleanup: delete organization if user creation fails
      await cosmosService.deleteItem('organizations', createdOrg.id, createdOrg.id);
      return res.status(400).json({
        error: 'User validation failed',
        details: userValidationErrors
      });
    }

    await adminUser.hashPassword();
    const createdUser = await cosmosService.createItem('users', adminUser.toJSON());

    // Create initial audit log
    const auditLog = new AuditLog({
      organizationId: createdOrg.id,
      userId: createdUser.id,
      userName: adminUser.getFullName(),
      action: 'create',
      resource: 'organization',
      resourceId: createdOrg.id,
      details: `Organization ${organizationName} registered with admin user`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      metadata: { plan }
    });

    await cosmosService.createItem('audit-logs', auditLog.toJSON());

    res.status(201).json({
      message: 'Organization and admin user created successfully',
      organization: {
        id: createdOrg.id,
        name: createdOrg.name,
        plan: createdOrg.plan
      },
      user: {
        id: createdUser.id,
        email: createdUser.email,
        name: adminUser.getFullName(),
        role: createdUser.role
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      error: 'Registration failed',
      message: error.message
    });
  }
});

// Refresh token endpoint
router.post('/refresh', async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(401).json({
        error: 'Refresh token required'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user to ensure they still exist and are active
    const user = await cosmosService.getItem('users', decoded.userId, decoded.organizationId);
    
    if (!user || !user.isActive) {
      return res.status(401).json({
        error: 'User not found or inactive'
      });
    }

    // Create new token
    const newToken = jwt.sign(
      { 
        userId: user.id,
        organizationId: user.organizationId,
        role: user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    res.json({
      token: newToken
    });

  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(401).json({
      error: 'Invalid refresh token'
    });
  }
});

// Logout endpoint
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    // Get location information
    const location = await geolocationService.getCountryFromIP(req.ip).catch(() => null);
    
    // Create logout audit log
    const auditLog = AuditLog.createLogoutLog(req.user, req.ip, req.get('User-Agent'), location);
    await cosmosService.createItem('audit-logs', auditLog.toJSON()).catch(console.error);

    res.json({
      message: 'Logout successful'
    });

  } catch (error) {
    console.error('Logout error:', error);
    // Even if audit logging fails, we should still return success for logout
    res.json({
      message: 'Logout successful'
    });
  }
});

module.exports = router;
