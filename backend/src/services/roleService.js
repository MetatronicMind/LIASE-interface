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

      const roles = await cosmosService.queryItems('roles', query, parameters);
      
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
      const role = await cosmosService.getItem('roles', roleId, organizationId);
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

      const results = await cosmosService.queryItems('roles', query, parameters);
      console.log(`🔥 [DETAILED DEBUG] Query results:`, JSON.stringify(results, null, 2));
      console.log(`🔥 [DETAILED DEBUG] ID exists: ${results.length > 0}`);
      
      return results.length > 0;
    } catch (error) {
      console.error('🔥 [DETAILED DEBUG] Error checking ID existence:', error);
      console.error('🔥 [DETAILED DEBUG] Assuming ID doesn\'t exist due to query error');
      return false; // Assume ID doesn't exist if query fails
    }
  }

  // Get a specific role by ID
  async getRoleById(roleId, organizationId) {
    try {
      const role = await cosmosService.getItem('roles', roleId, organizationId);
      if (!role || role.type !== 'role') {
        return null;
      }
      return new Role(role);
    } catch (error) {
      console.error('Error fetching role:', error);
      throw error;
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
      const roles = await cosmosService.queryItems('roles', query, parameters);
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
      console.log('🔥 [ROLE CREATE] Starting with data:', {
        roleName: roleData.name,
        organizationId: roleData.organizationId,
        createdById: createdBy.id
      });

      // Check if role name already exists in organization
      const existingRole = await this.getRoleByName(roleData.name, roleData.organizationId);
      if (existingRole) {
        console.log('🔥 [ROLE CREATE] Role name already exists:', existingRole.id);
        throw new Error(`Role with name '${roleData.name}' already exists in this organization`);
      }

      // Create role object with guaranteed unique prefixed ID
      const role = new Role({
        ...roleData,
        createdBy: createdBy.id
      });

      console.log('🔥 [ROLE CREATE] Generated role:', {
        roleId: role.id,
        roleName: role.name,
        organizationId: role.organizationId,
        hasRolePrefix: role.id.startsWith('role_')
      });

      // Double-check for any ID conflicts in the users container
      let retryCount = 0;
      const maxRetries = 3;
      
      while (retryCount < maxRetries) {
        try {
          // Check if this specific ID exists anywhere in this organization's partition
          const existingEntity = await cosmosService.getItem('roles', role.id, role.organizationId);
          
          if (existingEntity) {
            console.error(`🔥 [ROLE CREATE] ID CONFLICT (attempt ${retryCount + 1}):`, {
              conflictingId: role.id,
              organizationId: role.organizationId,
              existingEntityType: existingEntity.type,
              existingEntityName: existingEntity.name || existingEntity.email || existingEntity.displayName
            });
            
            // Generate a completely new role
            const newRole = new Role({
              ...roleData,
              createdBy: createdBy.id
            });
            
            console.log(`🔥 [ROLE CREATE] Generated new ID (attempt ${retryCount + 1}):`, newRole.id);
            role.id = newRole.id;
            retryCount++;
            continue; // Try again with new ID
          }
          
          // No conflict found, break out of retry loop
          break;
          
        } catch (getError) {
          // If getItem fails with 404, the ID doesn't exist - this is good
          if (getError.code === 404 || getError.statusCode === 404) {
            console.log('🔥 [ROLE CREATE] ID check passed - no conflicts found');
            break;
          } else {
            console.log('🔥 [ROLE CREATE] Unexpected error during ID check:', getError.message);
            // Continue anyway, the createItem will catch real conflicts
            break;
          }
        }
      }
      
      if (retryCount >= maxRetries) {
        throw new Error('Failed to generate unique role ID after multiple attempts');
      }

      // Save to database
      const roleJson = role.toJSON();
      console.log('🔥 [ROLE CREATE] Saving to roles container:', {
        id: roleJson.id,
        type: roleJson.type,
        organizationId: roleJson.organizationId
      });
      
      const savedRole = await cosmosService.createItem('roles', roleJson);
      
      console.log('🔥 [ROLE CREATE] ✅ Success:', savedRole.id);
      return new Role(savedRole);

    } catch (error) {
      console.error('🔥 [ROLE CREATE] ❌ Failed:', {
        message: error.message,
        code: error.code,
        statusCode: error.statusCode,
        roleName: roleData?.name,
        organizationId: roleData?.organizationId
      });
      
      // Enhanced 409 debugging - show what's in the organization
      if (error.code === 409 || error.statusCode === 409) {
        console.log('🔥 [ROLE CREATE] 409 CONFLICT - Analyzing organization contents...');
        
        try {
          const orgQuery = `SELECT c.id, c.type, c.name, c.displayName FROM c WHERE c.organizationId = @orgId`;
          const orgParams = [{ name: '@orgId', value: roleData.organizationId }];
          const entitiesInOrg = await cosmosService.queryItems('roles', orgQuery, orgParams);
          
          console.log('🔥 [ROLE CREATE] Organization contents:', entitiesInOrg.map(e => ({
            id: e.id,
            type: e.type,
            name: e.name || e.email || e.displayName
          })));
          
          // Check specifically for ID pattern conflicts
          const users = entitiesInOrg.filter(e => e.type === 'user');
          const roles = entitiesInOrg.filter(e => e.type === 'role');
          const unprefixedUsers = users.filter(u => !u.id.startsWith('user_'));
          const unprefixedRoles = roles.filter(r => !r.id.startsWith('role_'));
          
          console.log('🔥 [ROLE CREATE] ID Analysis:', {
            totalUsers: users.length,
            totalRoles: roles.length,
            unprefixedUsers: unprefixedUsers.length,
            unprefixedRoles: unprefixedRoles.length,
            unprefixedUserIds: unprefixedUsers.map(u => u.id),
            unprefixedRoleIds: unprefixedRoles.map(r => r.id)
          });
          
        } catch (queryError) {
          console.error('🔥 [ROLE CREATE] Failed to analyze organization:', queryError);
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

      await cosmosService.updateItem('roles', roleId, organizationId, updatedRole.toJSON());
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

      // Hard delete the role
      await cosmosService.deleteItem('roles', roleId, organizationId);
      return existingRole;
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
      const systemRoleTypes = ['superadmin', 'admin', 'triage', 'QC', 'pharmacovigilance', 'sponsor_auditor', 'data_entry', 'medical_examiner'];
      const createdRoles = [];

      for (const roleType of systemRoleTypes) {
        const existingRole = await this.getRoleByName(roleType, organizationId);
        if (!existingRole) {
          const role = Role.createFromSystemRole(roleType, organizationId, createdBy?.id);
          await cosmosService.createItem('roles', role.toJSON());
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
          read: 'Can view dashboard',
          write: 'Can edit dashboard'
        }
      },
      drugs: {
        displayName: 'Literature Search Configuration',
        description: 'Manage literature search configurations',
        actions: {
          read: 'Can View Section',
          write: 'Can Modify/Create Configuration',
          delete: 'Can Delete Configuration'
        }
      },
      triage: {
        displayName: 'Literature Triage',
        description: 'Access to literature triage and classification',
        actions: {
          read: 'Can View Section',
          write: 'Can Edit Triage Data',
          classify: 'Can Classify Studies',
          manual_drug_test: 'Can Run Manual Drug Test'
        }
      },
      QA: {
        displayName: 'QC Allocation (QA)',
        description: 'Manage QC allocation',
        actions: {
          read: 'Can View Section',
          write: 'Can Allocate',
          approve: 'Can Approve Allocation',
          reject: 'Can Reject Allocation'
        }
      },
      QC: {
        displayName: 'QC Triage & Data Entry',
        description: 'Quality control for triage and data entry',
        actions: {
          read: 'Can View Section',
          write: 'Can Edit QC Data',
          approve: 'Can Approve QC',
          reject: 'Can Reject QC'
        }
      },
      data_entry: {
        displayName: 'Data Entry',
        description: 'Data entry operations',
        actions: {
          read: 'Can View Section',
          write: 'Can Edit Data',
          r3_form: 'Can Open/Edit R3 XML Form',
          revoke_studies: 'Can Revoke Studies'
        }
      },
      medical_examiner: {
        displayName: 'Medical Review',
        description: 'Medical review operations',
        actions: {
          read: 'Can View Section',
          write: 'Can Edit Medical Data',
          comment_fields: 'Can Comment',
          edit_fields: 'Can Edit Fields',
          revoke_studies: 'Can Revoke Studies'
        }
      },
      reports: {
        displayName: 'Reports & ICSR',
        description: 'Access to Reports and ICSR Reports',
        actions: {
          read: 'Can View Section',
          write: 'Can Generate Reports',
          delete: 'Can Delete Reports',
          export: 'Can Export'
        }
      },
      aoiAssessment: {
        displayName: 'AOI Assessment',
        description: 'Assessment of interest',
        actions: {
          read: 'Can View Section',
          save: 'Can Save Assessment'
        }
      },
      audit: {
        displayName: 'Audit Trail',
        description: 'System audit logs',
        actions: {
          read: 'Can View Section',
          write: 'Can Write Audit Logs', // Usually automatic
          delete: 'Can Delete Audit Logs',
          export: 'Can Export'
        }
      },
      users: {
        displayName: 'User Management',
        description: 'Manage users',
        actions: {
          read: 'Can view Section',
          create: 'Can Add New User',
          update: 'Can Edit Users',
          write: 'Can Write Users',
          delete: 'Can Delete Users'
        }
      },
      roles: {
        displayName: 'Role Management',
        description: 'Manage roles',
        actions: {
          read: 'Can view Roles',
          write: 'Can create/edit Roles',
          delete: 'Can delete Roles'
        }
      },
      legacyData: {
        displayName: 'Legacy Data',
        description: 'Access to legacy data',
        actions: {
          read: 'Can View Section',
          create: 'Can Add Data'
        }
      },
      archive: {
        displayName: 'Archive',
        description: 'Archival operations',
        actions: {
          read: 'Can View Section',
          archive: 'Can Archive studies'
        }
      },
      settings: {
        displayName: 'Settings',
        description: 'System settings',
        actions: {
          read: 'Can View Section',
          write: 'Can Edit Settings',
          viewDateTime: 'Can view Date/Time Settings',
          viewRoleManagement: 'Can view Role Management Settings',
          viewOrganization: 'Can view Organization Settings',
          viewWorkflow: 'Can view Workflow Settings',
          viewNotifications: 'Can view Notifications Settings',
          viewEmail: 'Can view Email Settings',
          viewArchival: 'Can view Archival Settings',
          viewAdminConfig: 'Can view Admin Configuration',
          viewStudyQueue: 'Can view Study Queue Configuration',
          viewSystemConfig: 'Can view System Configuration'
        }
      },
      drugs: {
        displayName: 'Drugs Configuration',
        description: 'Manage drug configurations',
        actions: {
          read: 'Can View',
          write: 'Can Edit',
          delete: 'Can Delete'
        }
      },
      organizations: {
        displayName: 'Organizations',
        description: 'Manage organizations',
        actions: {
          read: 'Can View',
          write: 'Can Edit',
          delete: 'Can Delete'
        }
      },
      notifications: {
        displayName: 'Notifications',
        description: 'Manage notifications',
        actions: {
          read: 'Can View',
          write: 'Can Edit',
          delete: 'Can Delete'
        }
      },
      email: {
        displayName: 'Email',
        description: 'Manage email',
        actions: {
          read: 'Can View',
          write: 'Can Edit',
          delete: 'Can Delete'
        }
      },
      admin_config: {
        displayName: 'Admin Config',
        description: 'Administrative configuration',
        actions: {
          read: 'Can View',
          write: 'Can Edit',
          manage_jobs: 'Can Manage Jobs'
        }
      }
    };
  }
}

module.exports = new RoleService();