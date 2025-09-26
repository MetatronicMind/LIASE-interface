const cosmosService = require('../src/services/cosmosService');
const Role = require('../src/models/Role');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

async function migrateAdminPermissions() {
  try {
    console.log('🔄 Starting admin permissions migration...');

    // Initialize database connection
    console.log('🔄 Initializing database connection...');
    await cosmosService.initializeDatabase();
    console.log('✅ Database connected successfully');

    // Get all users with admin role
    const adminUsers = await cosmosService.queryItems('users', {
      query: 'SELECT * FROM c WHERE c.role = @role AND c.type = @type',
      parameters: [
        { name: '@role', value: 'admin' },
        { name: '@type', value: 'user' }
      ]
    });

    console.log(`📋 Found ${adminUsers.length} admin users to update`);

    // Get the correct admin permissions from the Role model
    const systemRoles = Role.getSystemRoles();
    const adminRoleTemplate = systemRoles.admin;

    for (const user of adminUsers) {
      console.log(`🔧 Updating permissions for user: ${user.username} (${user.email})`);
      
      // Update user permissions to match admin role
      const updatedUser = {
        ...user,
        permissions: adminRoleTemplate.permissions,
        updatedAt: new Date().toISOString()
      };

      await cosmosService.upsertItem('users', updatedUser, user.id);
      console.log(`✅ Updated permissions for ${user.username}`);
    }

    console.log('🎉 Admin permissions migration completed successfully!');
    return { success: true, updated: adminUsers.length };

  } catch (error) {
    console.error('❌ Error during admin permissions migration:', error);
    throw error;
  }
}

module.exports = { migrateAdminPermissions };

// If run directly
if (require.main === module) {
  migrateAdminPermissions()
    .then((result) => {
      console.log('Migration result:', result);
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}