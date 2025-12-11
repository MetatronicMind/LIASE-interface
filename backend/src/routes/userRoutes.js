const express = require('express');
const { body, validationResult } = require('express-validator');

const userService = require('../services/userService');
const roleService = require('../services/roleService');
const cosmosService = require('../services/cosmosService');
const User = require('../models/User');
const { authorizeRole, authorizePermission, authorizeSelfOrAdmin } = require('../middleware/authorization');
const { auditLogger, auditAction } = require('../middleware/audit');

const router = express.Router();

// Apply audit logging to all routes
router.use(auditLogger());

// Get all users in organization with role information
router.get('/', 
  authorizePermission('users', 'read'),
  async (req, res) => {
    try {
      const users = await userService.getUsersByOrganization(req.user.organizationId);
      
      // Remove passwords and format response
      const safeUsers = users.map(user => user.toSafeJSON());

      res.json({
        users: safeUsers,
        total: safeUsers.length
      });

    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({
        error: 'Failed to fetch users',
        message: error.message
      });
    }
  }
);

// Get specific user with role information
router.get('/:userId',
  authorizeSelfOrAdmin,
  async (req, res) => {
    try {
      const user = await userService.getUserById(req.params.userId, req.user.organizationId);
      
      if (!user) {
        return res.status(404).json({
          error: 'User not found'
        });
      }

      res.json({
        user: user.toSafeJSON()
      });

    } catch (error) {
      console.error('Error fetching user:', error);
      res.status(500).json({
        error: 'Failed to fetch user',
        message: error.message
      });
    }
  }
);

// Create new user (Admin only)
router.post('/',
  authorizePermission('users', 'write'),
  [
    body('username').isLength({ min: 3 }).matches(/^[a-zA-Z0-9_]+$/),
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }),
    body('firstName').isLength({ min: 1 }),
    body('lastName').isLength({ min: 1 }),
    body('roleId').optional().isUUID().withMessage('Role ID must be a valid UUID'),
    body('role').optional().isString().withMessage('Role must be a string')
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

      const userData = {
        ...req.body,
        organizationId: req.user.organizationId
      };

      // Create user with dynamic role assignment
      const user = await userService.createUser(userData, req.user);

      // Create audit log
      await auditAction(req, 'CREATE', 'user', user.id, {
        username: user.username,
        role: user.role,
        email: user.email
      });

      res.status(201).json({
        message: 'User created successfully',
        user: user.toSafeJSON()
      });

    } catch (error) {
      console.error('Error creating user:', error);
      res.status(500).json({
        error: 'Failed to create user',
        message: error.message
      });
    }
  }
);

// Update user
router.put('/:userId',
  authorizeSelfOrAdmin,
  [
    body('username').optional().isLength({ min: 3 }).matches(/^[a-zA-Z0-9_]+$/),
    body('email').optional().isEmail().normalizeEmail(),
    body('password').optional().isLength({ min: 8, max: 12 }),
    body('firstName').optional().isLength({ min: 1 }),
    body('lastName').optional().isLength({ min: 1 }),
    body('roleId').optional().isUUID().withMessage('Role ID must be a valid UUID'),
    body('role').optional().isString().withMessage('Role must be a string')
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

      const { userId } = req.params;
      const updates = req.body;

      // Check password update restriction for non-admin users
      if (updates.password && !req.user.isAdmin()) {
        const passwordChangedAt = new Date(req.user.passwordChangedAt || req.user.createdAt);
        const threeMonths = 90 * 24 * 60 * 60 * 1000;
        const oneWeek = 7 * 24 * 60 * 60 * 1000;
        const expiryDate = new Date(passwordChangedAt.getTime() + threeMonths);
        const windowStart = new Date(expiryDate.getTime() - oneWeek);
        
        if (Date.now() < windowStart.getTime()) {
             return res.status(403).json({ error: 'Password can only be changed 1 week before expiration (3 months)' });
        }
      }

      // Remove sensitive fields that shouldn't be updated this way
      delete updates.id;
      delete updates.organizationId;
      delete updates.createdAt;
      delete updates.createdBy;

      // Validate updates
      const validationErrors = User.validate(updates, true);
      if (validationErrors.length > 0) {
        return res.status(400).json({
          error: 'Validation failed',
          details: validationErrors
        });
      }

      // Only users with write permissions can change roles
      if ((updates.role || updates.roleId) && !req.user.hasPermission('users', 'write')) {
        return res.status(403).json({
          error: 'Insufficient permissions to change user roles'
        });
      }

      // Update user with dynamic role assignment
      const updatedUser = await userService.updateUser(userId, req.user.organizationId, updates, req.user);

      // Create audit log
      await auditAction(
        req.user,
        'update',
        'user',
        userId,
        `Updated user: ${updatedUser.username}`,
        { updates: Object.keys(updates) }
      );

      res.json({
        message: 'User updated successfully',
        user: new User(updatedUser).toJSON()
      });

    } catch (error) {
      console.error('Error updating user:', error);
      res.status(500).json({
        error: 'Failed to update user',
        message: error.message
      });
    }
  }
);

// Delete user (Admin only)
router.delete('/:userId',
  authorizePermission('users', 'delete'),
  async (req, res) => {
    try {
      const { userId } = req.params;
      const { hardDelete } = req.query; // Optional query param: ?hardDelete=true

      // Prevent deleting self
      if (userId === req.user.id) {
        return res.status(400).json({
          error: 'Cannot delete your own account'
        });
      }

      // Delete user using service (soft delete by default, hard delete if requested)
      const deletedUser = await userService.deleteUser(
        userId, 
        req.user.organizationId, 
        req.user,
        hardDelete === 'true'
      );

      // Create audit log
      await auditAction(req, 'DELETE', 'user', userId, {
        username: deletedUser.username,
        email: deletedUser.email,
        role: deletedUser.role,
        hardDelete: hardDelete === 'true'
      });

      res.json({
        message: hardDelete === 'true' ? 'User permanently deleted' : 'User deleted successfully'
      });

    } catch (error) {
      console.error('Error deleting user:', error);
      res.status(500).json({
        error: 'Failed to delete user',
        message: error.message
      });
    }
  }
);

// Get available roles for user assignment
router.get('/roles/available',
  authorizePermission('users', 'write'),
  async (req, res) => {
    try {
      const roles = await roleService.getRolesByOrganization(req.user.organizationId);
      
      // Filter roles based on user's permissions
      const availableRoles = roles.filter(role => {
        // Superadmins can assign any role
        if (req.user.isSuperAdmin()) {
          return true;
        }
        // Admins can assign all roles except superadmin
        if (req.user.isAdmin()) {
          return role.name !== 'superadmin';
        }
        // Other users cannot assign roles
        return false;
      });

      res.json({
        roles: availableRoles.map(role => ({
          id: role.id,
          name: role.name,
          displayName: role.displayName,
          description: role.description,
          isSystemRole: role.isSystemRole
        }))
      });

    } catch (error) {
      console.error('Error fetching available roles:', error);
      res.status(500).json({
        error: 'Failed to fetch available roles',
        message: error.message
      });
    }
  }
);

// Get current user's profile
router.get('/profile/me', async (req, res) => {
  try {
    const userInstance = new User(req.user);
    res.json(userInstance.toJSON());
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({
      error: 'Failed to fetch profile',
      message: error.message
    });
  }
});

// Update current user's profile
router.put('/profile/me',
  [
    body('firstName').optional().isLength({ min: 1 }),
    body('lastName').optional().isLength({ min: 1 }),
    body('email').optional().isEmail().normalizeEmail(),
    body('password').optional().isLength({ min: 8, max: 12 }),
    body('currentPassword').optional()
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

      const updates = req.body;
      
      // Remove fields that users shouldn't update themselves
      delete updates.role;
      delete updates.permissions;
      delete updates.organizationId;
      delete updates.isActive;

      // Check password update restriction for non-admin users
      if (updates.password && !req.user.isAdmin()) {
        const passwordChangedAt = new Date(req.user.passwordChangedAt || req.user.createdAt);
        const threeMonths = 90 * 24 * 60 * 60 * 1000;
        const oneWeek = 7 * 24 * 60 * 60 * 1000;
        const expiryDate = new Date(passwordChangedAt.getTime() + threeMonths);
        const windowStart = new Date(expiryDate.getTime() - oneWeek);
        
        if (Date.now() < windowStart.getTime()) {
             return res.status(403).json({ error: 'Password can only be changed 1 week before expiration (3 months)' });
        }
      }

      // Check email uniqueness if being changed
      if (updates.email && updates.email !== req.user.email) {
        const existingUser = await cosmosService.getUserByEmail(updates.email);
        if (existingUser) {
          return res.status(409).json({
            error: 'Email already exists'
          });
        }
      }

      // Handle password hashing if password is being updated
      if (updates.password) {
        // Verify current password if provided (recommended)
        if (updates.currentPassword) {
          const isValid = await req.user.validatePassword(updates.currentPassword);
          if (!isValid) {
            return res.status(400).json({ error: 'Invalid current password' });
          }
        }

        const tempUser = new User({ ...req.user, password: updates.password });
        await tempUser.hashPassword();
        updates.password = tempUser.password;
        updates.passwordChangedAt = new Date().toISOString();
        delete updates.currentPassword; // Don't save this
      }

      const updatedUser = await cosmosService.updateItem(
        'users',
        req.user.id,
        req.user.organizationId,
        updates
      );

      res.json({
        message: 'Profile updated successfully',
        user: new User(updatedUser).toJSON()
      });

    } catch (error) {
      console.error('Error updating profile:', error);
      res.status(500).json({
        error: 'Failed to update profile',
        message: error.message
      });
    }
  }
);

module.exports = router;
