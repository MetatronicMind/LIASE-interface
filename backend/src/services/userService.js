const cosmosService = require('./cosmosService');
const roleService = require('./roleService');
const User = require('../models/User');

class UserService {
  
  // Get all users for an organization with their role information
  async getUsersByOrganization(organizationId) {
    try {
      const query = `
        SELECT * FROM c 
        WHERE c.type = 'user' 
        AND c.organizationId = @organizationId 
        AND c.isActive = true
        ORDER BY c.createdAt DESC
      `;
      
      const parameters = [
        { name: '@organizationId', value: organizationId }
      ];

      const users = await cosmosService.queryItems('users', query, parameters);
      
      // Populate role information for each user
      const usersWithRoles = await Promise.all(users.map(async (userData) => {
        const user = new User(userData);
        
        if (user.roleId) {
          const role = await roleService.getRoleById(user.roleId, organizationId);
          if (role) {
            user.role = role.name;
            user.roleDisplayName = role.displayName;
            user.setPermissions(role.permissions);
          }
        } else if (user.role) {
          // Handle legacy users with role names instead of roleId
          const role = await roleService.getRoleByName(user.role, organizationId);
          if (role) {
            user.roleId = role.id;
            user.roleDisplayName = role.displayName;
            user.setPermissions(role.permissions);
          }
        }
        
        return user;
      }));

      return usersWithRoles;
    } catch (error) {
      console.error('Error fetching users with roles:', error);
      throw error;
    }
  }

  // Get a specific user by ID with role information
  async getUserById(userId, organizationId) {
    try {
      const userData = await cosmosService.getItem('users', userId, organizationId);
      if (!userData || userData.type !== 'user') {
        return null;
      }

      const user = new User(userData);
      
      // Populate role information
      if (user.roleId) {
        const role = await roleService.getRoleById(user.roleId, organizationId);
        if (role) {
          user.role = role.name;
          user.roleDisplayName = role.displayName;
          user.setPermissions(role.permissions);
        }
      } else if (user.role) {
        // Handle legacy users
        const role = await roleService.getRoleByName(user.role, organizationId);
        if (role) {
          user.roleId = role.id;
          user.roleDisplayName = role.displayName;
          user.setPermissions(role.permissions);
        }
      }

      return user;
    } catch (error) {
      console.error('Error fetching user by ID:', error);
      throw error;
    }
  }

  // Get user by username
  async getUserByUsername(username, organizationId) {
    try {
      const query = `
        SELECT * FROM c 
        WHERE c.type = 'user' 
        AND c.username = @username 
        AND c.organizationId = @organizationId
        AND c.isActive = true
      `;
      
      const parameters = [
        { name: '@username', value: username.toLowerCase() },
        { name: '@organizationId', value: organizationId }
      ];

      const users = await cosmosService.queryItems('users', query, parameters);
      if (users.length === 0) {
        return null;
      }

      return await this.getUserById(users[0].id, organizationId);
    } catch (error) {
      console.error('Error fetching user by username:', error);
      throw error;
    }
  }

  // Create a new user
  async createUser(userData, createdBy) {
    try {
      // Validate role exists
      let role = null;
      if (userData.roleId) {
        role = await roleService.getRoleById(userData.roleId, userData.organizationId);
      } else if (userData.role) {
        role = await roleService.getRoleByName(userData.role, userData.organizationId);
      }

      if (!role) {
        throw new Error('Invalid role specified');
      }

      // Check if username already exists
      const existingUser = await this.getUserByUsername(userData.username, userData.organizationId);
      if (existingUser) {
        throw new Error('Username already exists');
      }

      // Check if email already exists
      if (userData.email) {
        const existingEmailUser = await this.getUserByEmail(userData.email, userData.organizationId);
        if (existingEmailUser) {
          throw new Error('Email already exists');
        }
      }

      const user = new User({
        ...userData,
        roleId: role.id,
        role: role.name,
        createdBy: createdBy.id
      });

      // Set permissions from role
      user.setPermissions(role.permissions);

      // Hash password
      await user.hashPassword();

      await cosmosService.createItem('users', user.toJSON());
      return user;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  // Update an existing user
  async updateUser(userId, organizationId, updateData, updatedBy) {
    try {
      const existingUser = await this.getUserById(userId, organizationId);
      if (!existingUser) {
        throw new Error('User not found');
      }

      // If role is being changed, validate new role
      let newRole = null;
      if (updateData.roleId && updateData.roleId !== existingUser.roleId) {
        newRole = await roleService.getRoleById(updateData.roleId, organizationId);
        if (!newRole) {
          throw new Error('Invalid role specified');
        }
      } else if (updateData.role && updateData.role !== existingUser.role) {
        newRole = await roleService.getRoleByName(updateData.role, organizationId);
        if (!newRole) {
          throw new Error('Invalid role specified');
        }
      }

      // Check username uniqueness if being changed
      if (updateData.username && updateData.username !== existingUser.username) {
        const duplicateUser = await this.getUserByUsername(updateData.username, organizationId);
        if (duplicateUser && duplicateUser.id !== userId) {
          throw new Error('Username already exists');
        }
      }

      // Check email uniqueness if being changed
      if (updateData.email && updateData.email !== existingUser.email) {
        const duplicateEmailUser = await this.getUserByEmail(updateData.email, organizationId);
        if (duplicateEmailUser && duplicateEmailUser.id !== userId) {
          throw new Error('Email already exists');
        }
      }

      const updatedUser = new User({
        ...existingUser.toJSON(),
        ...updateData,
        id: userId, // Ensure ID doesn't change
        organizationId, // Ensure org doesn't change
        updatedAt: new Date().toISOString(),
        updatedBy: updatedBy.id
      });

      // Update role information if role changed
      if (newRole) {
        updatedUser.roleId = newRole.id;
        updatedUser.role = newRole.name;
        updatedUser.setPermissions(newRole.permissions);
      }

      // Hash password if being changed
      if (updateData.password) {
        await updatedUser.hashPassword();
      }

      await cosmosService.updateItem('users', userId, organizationId, updatedUser.toJSON());
      return updatedUser;
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  // Delete a user (soft delete)
  async deleteUser(userId, organizationId, deletedBy) {
    try {
      const existingUser = await this.getUserById(userId, organizationId);
      if (!existingUser) {
        throw new Error('User not found');
      }

      // Prevent deletion of superadmin users
      if (existingUser.isSuperAdmin()) {
        throw new Error('Cannot delete superadmin users');
      }

      const deletedUser = new User({
        ...existingUser.toJSON(),
        isActive: false,
        updatedAt: new Date().toISOString(),
        deletedAt: new Date().toISOString(),
        deletedBy: deletedBy.id
      });

      await cosmosService.updateItem('users', userId, organizationId, deletedUser.toJSON());
      return deletedUser;
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }

  // Get user by email
  async getUserByEmail(email, organizationId) {
    try {
      const query = `
        SELECT * FROM c 
        WHERE c.type = 'user' 
        AND c.email = @email 
        AND c.organizationId = @organizationId
        AND c.isActive = true
      `;
      
      const parameters = [
        { name: '@email', value: email.toLowerCase() },
        { name: '@organizationId', value: organizationId }
      ];

      const users = await cosmosService.queryItems('users', query, parameters);
      if (users.length === 0) {
        return null;
      }

      return await this.getUserById(users[0].id, organizationId);
    } catch (error) {
      console.error('Error fetching user by email:', error);
      throw error;
    }
  }

  // Update user's last login
  async updateLastLogin(userId, organizationId) {
    try {
      const user = await this.getUserById(userId, organizationId);
      if (!user) {
        return null;
      }

      const updatedUser = new User({
        ...user.toJSON(),
        lastLogin: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      await cosmosService.updateItem('users', userId, organizationId, updatedUser.toJSON());
      return updatedUser;
    } catch (error) {
      console.error('Error updating last login:', error);
      throw error;
    }
  }

  // Get users by role
  async getUsersByRole(roleId, organizationId) {
    try {
      const query = `
        SELECT * FROM c 
        WHERE c.type = 'user' 
        AND c.roleId = @roleId 
        AND c.organizationId = @organizationId 
        AND c.isActive = true
      `;
      
      const parameters = [
        { name: '@roleId', value: roleId },
        { name: '@organizationId', value: organizationId }
      ];

      const users = await cosmosService.queryItems('users', query, parameters);
      return await Promise.all(users.map(userData => this.getUserById(userData.id, organizationId)));
    } catch (error) {
      console.error('Error fetching users by role:', error);
      throw error;
    }
  }
}

module.exports = new UserService();