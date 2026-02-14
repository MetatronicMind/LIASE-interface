const cosmosService = require('../src/services/cosmosService');
const roleService = require('../src/services/roleService');
const User = require('../src/models/User');
const Role = require('../src/models/Role');
const { v4: uuidv4 } = require('uuid');

// Load environment variables
require('dotenv').config();

async function fixSuperAdminPermissions() {
  try {
    console.log('🔄 Fixing superadmin permissions...');

    // Initialize database connection
    await cosmosService.initializeDatabase();
    console.log('✅ Database connected successfully');

    const userId = '35a5123b-0192-4966-b0d2-00077f07b511';
    const organizationId = '82d2503d-7391-404b-9c7e-fd27fd32596f';

    // 1. First, ensure the superadmin role exists in this organization
    let superAdminRole = await roleService.getRoleByName('superadmin', organizationId);
    
    if (!superAdminRole) {
      console.log('🔨 Creating superadmin role...');
      
      // Create superadmin role with full permissions
      const roleData = {
        organizationId: organizationId,
        name: 'superadmin',
        displayName: 'Super Administrator',
        description: 'Full system access with all permissions including organization management',
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
        }
      };

      superAdminRole = new Role(roleData);
      await cosmosService.createItem('users', superAdminRole.toJSON());
      console.log('✅ Superadmin role created with ID:', superAdminRole.id);
    } else {
      console.log('✅ Superadmin role already exists with ID:', superAdminRole.id);
    }

    // 2. Update the user to link to the superadmin role
    console.log('🔨 Updating user with roleId and permissions...');
    
    const user = await cosmosService.getItem('users', userId, organizationId);
    if (!user) {
      throw new Error('User not found');
    }

    // Update the user with proper roleId and permissions
    const updatedUser = {
      ...user,
      roleId: superAdminRole.id,
      role: 'superadmin',
      permissions: superAdminRole.permissions,
      updatedAt: new Date().toISOString()
    };

    await cosmosService.updateItem('users', userId, organizationId, updatedUser);
    
    console.log('✅ User updated successfully!');
    console.log('User details:');
    console.log({
      id: updatedUser.id,
      email: updatedUser.email,
      role: updatedUser.role,
      roleId: updatedUser.roleId,
      hasPermissions: Object.keys(updatedUser.permissions).length > 0
    });

    // 3. Verify permissions
    const userInstance = new User(updatedUser);
    console.log('\n🔍 Permission verification:');
    console.log('- Can read users:', userInstance.hasPermission('users', 'read'));
    console.log('- Can write users:', userInstance.hasPermission('users', 'write'));
    console.log('- Can delete users:', userInstance.hasPermission('users', 'delete'));
    console.log('- Can manage roles:', userInstance.hasPermission('roles', 'write'));
    console.log('- Can manage organizations:', userInstance.hasPermission('organizations', 'write'));
    console.log('- Is superadmin:', userInstance.isSuperAdmin());

  } catch (error) {
    console.error('❌ Error fixing superadmin permissions:', error.message);
    console.error(error.stack);
  }
}

// Run the fix
fixSuperAdminPermissions();