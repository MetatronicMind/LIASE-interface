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
      console.log('🔥 [DETAILED DEBUG] Starting role creation...');
      console.log('🔥 [DETAILED DEBUG] Role data:', JSON.stringify(roleData, null, 2));
      console.log('🔥 [DETAILED DEBUG] Created by:', JSON.stringify(createdBy, null, 2));

      // Check if role name already exists in organization
      console.log('🔥 [DETAILED DEBUG] Checking for existing role...');
      const existingRole = await this.getRoleByName(roleData.name, roleData.organizationId);
      if (existingRole) {
        console.log('🔥 [DETAILED DEBUG] Role already exists:', existingRole.id);
        throw new Error(`Role with name '${roleData.name}' already exists in this organization`);
      }
      console.log('🔥 [DETAILED DEBUG] No existing role found, proceeding...');

      console.log('🔥 [DETAILED DEBUG] Creating Role object...');
      const role = new Role({
        ...roleData,
        createdBy: createdBy.id
      });

      console.log('🔥 [DETAILED DEBUG] Generated role ID:', role.id);
      console.log('🔥 [DETAILED DEBUG] Full role object:', JSON.stringify(role.toJSON(), null, 2));

      // Check if the generated ID already exists (with retry logic)
      console.log('🔥 [DETAILED DEBUG] Starting ID collision check...');
      let attempts = 0;
      const maxAttempts = 3;
      let finalRole = role;
      
      while (attempts < maxAttempts) {
        console.log(`🔥 [DETAILED DEBUG] ID check attempt ${attempts + 1}/${maxAttempts} for ID: ${finalRole.id}`);
        const idExists = await this.checkIdExists(finalRole.id);
        console.log(`🔥 [DETAILED DEBUG] ID exists result: ${idExists}`);
        
        if (!idExists) {
          console.log('🔥 [DETAILED DEBUG] ID is unique, proceeding with creation...');
          break; // ID is unique, proceed
        }
        
        attempts++;
        console.log(`🔥 [DETAILED DEBUG] ID collision detected (attempt ${attempts}). Generating new ID...`);
        
        if (attempts < maxAttempts) {
          finalRole = new Role({
            ...roleData,
            createdBy: createdBy.id
          });
          console.log('🔥 [DETAILED DEBUG] New role ID generated:', finalRole.id);
        } else {
          console.log('🔥 [DETAILED DEBUG] Failed to generate unique ID after multiple attempts');
          throw new Error('Failed to generate unique ID after multiple attempts');
        }
      }

      console.log('🔥 [DETAILED DEBUG] About to create item in Cosmos DB...');
      console.log('🔥 [DETAILED DEBUG] Final role to create:', JSON.stringify(finalRole.toJSON(), null, 2));

      try {
        await cosmosService.createItem('users', finalRole.toJSON());
        console.log('🔥 [DETAILED DEBUG] ✅ Role created successfully:', finalRole.id);
        return finalRole;
      } catch (cosmosError) {
        console.error('🔥 [DETAILED DEBUG] ❌ Cosmos DB error occurred:');
        console.error('🔥 [DETAILED DEBUG] Error code:', cosmosError.code);
        console.error('🔥 [DETAILED DEBUG] Error message:', cosmosError.message);
        console.error('🔥 [DETAILED DEBUG] Full Cosmos error:', JSON.stringify(cosmosError, null, 2));
        
        // Handle Cosmos DB specific errors
        if (cosmosError.code === 409) {
          console.log('🔥 [DETAILED DEBUG] Handling 409 conflict error...');
          if (cosmosError.message?.includes('already exists')) {
            // Check if it's the same role name or just ID collision
            console.log('🔥 [DETAILED DEBUG] Double-checking for role name conflict...');
            const existingRoleCheck = await this.getRoleByName(roleData.name, roleData.organizationId);
            if (existingRoleCheck) {
              console.log('🔥 [DETAILED DEBUG] Confirmed: Role name conflict');
              throw new Error(`Role with name '${roleData.name}' already exists in this organization`);
            } else {
              // ID collision with different entity - this shouldn't happen with our pre-check but handle it
              console.error('🔥 [DETAILED DEBUG] Unexpected ID collision after pre-check. This may indicate a race condition.');
              console.error('🔥 [DETAILED DEBUG] Conflicting ID:', finalRole.id);
              
              // Let's check what entity has this ID
              const conflictQuery = `SELECT * FROM c WHERE c.id = @id`;
              const conflictParams = [{ name: '@id', value: finalRole.id }];
              try {
                const conflictingEntities = await cosmosService.queryItems('users', conflictQuery, conflictParams);
                console.log('🔥 [DETAILED DEBUG] Conflicting entities found:', JSON.stringify(conflictingEntities, null, 2));
              } catch (queryError) {
                console.error('🔥 [DETAILED DEBUG] Failed to query conflicting entity:', queryError);
              }
              
              throw new Error(`Unexpected ID collision. Please try again. Conflicting ID: ${finalRole.id}`);
            }
          } else {
            console.log('🔥 [DETAILED DEBUG] 409 error but not "already exists" message');
            throw new Error(`Conflict error: ${cosmosError.message}`);
          }
        }
        
        console.log('🔥 [DETAILED DEBUG] Non-409 error, re-throwing...');
        throw cosmosError;
      }
    } catch (error) {
      console.error('🔥 [DETAILED DEBUG] ❌ Error in createRole method:');
      console.error('🔥 [DETAILED DEBUG] Error type:', error.constructor.name);
      console.error('🔥 [DETAILED DEBUG] Error message:', error.message);
      console.error('🔥 [DETAILED DEBUG] Error stack:', error.stack);
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