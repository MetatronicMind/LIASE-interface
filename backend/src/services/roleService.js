const cosmosService = require('./cosmosService');
const Role = require('../models/Role');

class RoleService {
  
  // Get all roles for an organization
  async getRolesByOrganization(organizationId) {
    try {
      const query = `
        SELECT * FROM c 
        WHERE c.type = 'role' 
        AND c.organizationId = @organizationId 
        AND c.isActive = true
        ORDER BY c.displayName ASC
      `;
      
      const parameters = [
        { name: '@organizationId', value: organizationId }
      ];

      const roles = await cosmosService.queryItems('users', query, parameters);
      
      // Sort in JavaScript to avoid composite index requirement in Cosmos DB
      const sortedRoles = roles.sort((a, b) => {
        // First sort by isSystemRole (system roles first)
        if (a.isSystemRole !== b.isSystemRole) {
          return b.isSystemRole - a.isSystemRole; // true (1) before false (0)
        }
        // Then sort by displayName alphabetically
        return a.displayName.localeCompare(b.displayName);
      });
      
      return sortedRoles.map(role => new Role(role));
    } catch (error) {
      console.error('Error fetching roles:', error);
      throw error;
    }
  }

  // Get a specific role by ID
  async getRoleById(roleId, organizationId) {
    try {
      const role = await cosmosService.getItem('users', roleId, organizationId);
      if (!role || role.type !== 'role') {
        return null;
      }
      return new Role(role);
    } catch (error) {
      console.error('Error fetching role:', error);
      throw error;
    }
  }

  // Check if an ID already exists in the users container
  async checkIdExists(id) {
    try {
      console.log(`🔥 [DETAILED DEBUG] Checking if ID exists: ${id}`);
      const query = `
        SELECT c.id FROM c 
        WHERE c.id = @id
      `;
      
      const parameters = [
        { name: '@id', value: id }
      ];

      console.log(`🔥 [DETAILED DEBUG] Executing query:`, query);
      console.log(`🔥 [DETAILED DEBUG] With parameters:`, parameters);

      const results = await cosmosService.queryItems('users', query, parameters);
      console.log(`🔥 [DETAILED DEBUG] Query results:`, JSON.stringify(results, null, 2));
      console.log(`🔥 [DETAILED DEBUG] ID exists: ${results.length > 0}`);
      
      return results.length > 0;
    } catch (error) {
      console.error('🔥 [DETAILED DEBUG] Error checking ID existence:', error);
      console.error('🔥 [DETAILED DEBUG] Assuming ID doesn\'t exist due to query error');
      return false; // Assume ID doesn't exist if query fails
    }
  }

  // Get role by name within organization
  async getRoleByName(roleName, organizationId) {
    try {
      const query = `
        SELECT * FROM c 
        WHERE c.type = 'role' 
        AND c.name = @roleName 
        AND c.organizationId = @organizationId
      `;
      
      const parameters = [
        { name: '@roleName', value: roleName },
        { name: '@organizationId', value: organizationId }
      ];

      console.log('Checking for existing role:', { roleName, organizationId });
      const roles = await cosmosService.queryItems('users', query, parameters);
      console.log(`Found ${roles.length} roles with name '${roleName}'`);
      
      if (roles.length > 0) {
        console.log('Existing role details:', {
          id: roles[0].id,
          name: roles[0].name,
          isActive: roles[0].isActive,
          organizationId: roles[0].organizationId
        });
      }
      
      return roles.length > 0 ? new Role(roles[0]) : null;
    } catch (error) {
      console.error('Error fetching role by name:', error);
      throw error;
    }
  }

  // Create a new role
  async createRole(roleData, createdBy) {
    try {
      console.log('Creating role with data:', {
        roleName: roleData.name,
        organizationId: roleData.organizationId,
        createdById: createdBy.id
      });

      // Check if role name already exists in organization
      const existingRole = await this.getRoleByName(roleData.name, roleData.organizationId);
      if (existingRole) {
        console.log('Role already exists:', existingRole.id);
        throw new Error(`Role with name '${roleData.name}' already exists in this organization`);
      }

      // Create role object
      const role = new Role({
        ...roleData,
        createdBy: createdBy.id
      });

      console.log('Creating role in database:', {
        roleId: role.id,
        roleName: role.name,
        organizationId: role.organizationId,
        hasRolePrefix: role.id.startsWith('role_')
      });

      // Check if this specific ID already exists in the database
      console.log('Checking if role ID already exists in database...');
      try {
        const existingEntity = await cosmosService.getItem('users', role.id, role.organizationId);
        if (existingEntity) {
          console.error('ID CONFLICT: Entity with this ID already exists:', {
            conflictingId: role.id,
            existingEntityType: existingEntity.type,
            existingEntityName: existingEntity.name || existingEntity.email,
            existingEntityOrgId: existingEntity.organizationId
          });
          // Generate a new ID and try again
          const newRole = new Role({
            ...roleData,
            createdBy: createdBy.id
          });
          console.log('Generated new role ID:', newRole.id);
          role.id = newRole.id;
        }
      } catch (getError) {
        // If getItem fails, the ID likely doesn't exist, which is good
        console.log('ID check passed - no existing entity with this ID');
      }

      // Save to database
      const savedRole = await cosmosService.createItem('users', role.toJSON());
      
      console.log('Role created successfully:', savedRole.id);
      return new Role(savedRole);

    } catch (error) {
      console.error('Error creating role:', {
        message: error.message,
        code: error.code,
        statusCode: error.statusCode,
        activityId: error.activityId,
        roleName: roleData?.name,
        organizationId: roleData?.organizationId,
        attemptedRoleId: error.attemptedRoleId
      });
      
      // If it's a 409 conflict, let's investigate further
      if (error.code === 409 || error.statusCode === 409) {
        console.log('409 Conflict detected - investigating...');
        
        // Check what entity exists with this ID
        const conflictQuery = `SELECT * FROM c WHERE c.id = @roleId`;
        const conflictParams = [{ name: '@roleId', value: roleData.attemptedRoleId || 'unknown' }];
        
        try {
          const conflictingEntity = await cosmosService.queryItems('users', conflictQuery, conflictParams);
          console.log('Conflicting entity found:', conflictingEntity.map(e => ({
            id: e.id,
            type: e.type,
            name: e.name || e.email,
            organizationId: e.organizationId
          })));
        } catch (queryError) {
          console.error('Failed to query conflicting entity:', queryError);
        }
      }
      
      throw error;
    }
  }

  // Update an existing role
  async updateRole(roleId, organizationId, updateData, updatedBy) {
    try {
      const existingRole = await this.getRoleById(roleId, organizationId);
      if (!existingRole) {
        throw new Error('Role not found');
      }

      if (existingRole.isSystemRole) {
        throw new Error('Cannot modify system roles');
      }

      // If name is being changed, check for duplicates
      if (updateData.name && updateData.name !== existingRole.name) {
        const duplicateRole = await this.getRoleByName(updateData.name, organizationId);
        if (duplicateRole && duplicateRole.id !== roleId) {
          throw new Error(`Role with name '${updateData.name}' already exists in this organization`);
        }
      }

      const updatedRole = new Role({
        ...existingRole.toJSON(),
        ...updateData,
        id: roleId, // Ensure ID doesn't change
        organizationId, // Ensure org doesn't change
        isSystemRole: existingRole.isSystemRole, // Preserve system role flag
        updatedAt: new Date().toISOString(),
        updatedBy: updatedBy.id
      });

      await cosmosService.updateItem('users', roleId, organizationId, updatedRole.toJSON());
      return updatedRole;
    } catch (error) {
      console.error('Error updating role:', error);
      throw error;
    }
  }

  // Delete a role (soft delete)
  async deleteRole(roleId, organizationId, deletedBy) {
    try {
      const existingRole = await this.getRoleById(roleId, organizationId);
      if (!existingRole) {
        throw new Error('Role not found');
      }

      if (existingRole.isSystemRole) {
        throw new Error('Cannot delete system roles');
      }

      // Check if any users are assigned to this role
      const usersWithRole = await this.getUsersWithRole(roleId, organizationId);
      if (usersWithRole.length > 0) {
        throw new Error(`Cannot delete role: ${usersWithRole.length} user(s) are assigned to this role`);
      }

      const deletedRole = new Role({
        ...existingRole.toJSON(),
        isActive: false,
        updatedAt: new Date().toISOString(),
        deletedAt: new Date().toISOString(),
        deletedBy: deletedBy.id
      });

      await cosmosService.updateItem('users', roleId, organizationId, deletedRole.toJSON());
      return deletedRole;
    } catch (error) {
      console.error('Error deleting role:', error);
      throw error;
    }
  }

  // Get users assigned to a specific role
  async getUsersWithRole(roleId, organizationId) {
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

      return await cosmosService.queryItems('users', query, parameters);
    } catch (error) {
      console.error('Error fetching users with role:', error);
      throw error;
    }
  }

  // Initialize system roles for an organization
  async initializeSystemRoles(organizationId, createdBy) {
    try {
      const systemRoleTypes = ['superadmin', 'admin', 'pharmacovigilance', 'sponsor_auditor', 'data_entry', 'medical_examiner'];
      const createdRoles = [];

      for (const roleType of systemRoleTypes) {
        const existingRole = await this.getRoleByName(roleType, organizationId);
        if (!existingRole) {
          const role = Role.createFromSystemRole(roleType, organizationId, createdBy?.id);
          await cosmosService.createItem('users', role.toJSON());
          createdRoles.push(role);
        }
      }

      return createdRoles;
    } catch (error) {
      console.error('Error initializing system roles:', error);
      throw error;
    }
  }

  // Get available permissions structure
  getPermissionStructure() {
    return {
      dashboard: {
        displayName: 'Dashboard',
        description: 'Access to main dashboard and overview',
        actions: {
          read: 'View dashboard',
          write: 'Modify dashboard settings'
        }
      },
      users: {
        displayName: 'User Management',
        description: 'Manage user accounts and profiles',
        actions: {
          read: 'View users',
          write: 'Create and edit users',
          delete: 'Delete users'
        }
      },
      roles: {
        displayName: 'Role Management',
        description: 'Manage roles and permissions',
        actions: {
          read: 'View roles',
          write: 'Create and edit roles',
          delete: 'Delete roles'
        }
      },
      drugs: {
        displayName: 'Drug Management',
        description: 'Access to drug database and search',
        actions: {
          read: 'View drug information',
          write: 'Add and edit drug data',
          delete: 'Delete drug entries'
        }
      },
      studies: {
        displayName: 'Study Management',
        description: 'Access to clinical studies and trials',
        actions: {
          read: 'View study information',
          write: 'Create and edit studies',
          delete: 'Delete studies'
        }
      },
      audit: {
        displayName: 'Audit Trail',
        description: 'Access to system audit logs',
        actions: {
          read: 'View audit logs',
          write: 'Add audit entries',
          delete: 'Delete audit logs'
        }
      },
      settings: {
        displayName: 'System Settings',
        description: 'Configure system preferences',
        actions: {
          read: 'View settings',
          write: 'Modify settings'
        }
      },
      organizations: {
        displayName: 'Organization Management',
        description: 'Manage organization settings and data',
        actions: {
          read: 'View organization data',
          write: 'Edit organization settings',
          delete: 'Delete organizations'
        }
      }
    };
  }
}

module.exports = new RoleService();