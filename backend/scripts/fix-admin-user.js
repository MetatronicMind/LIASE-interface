const cosmosService = require('../src/services/cosmosService');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

async function fixSpecificAdminUser() {
  try {
    console.log('🔄 Starting targeted admin permissions fix...');

    // Initialize database connection
    console.log('🔄 Initializing database connection...');
    await cosmosService.initializeDatabase();
    console.log('✅ Database connected successfully');

    // Your specific user ID
    const userId = '8ecfefd9-2cbe-4ffd-8040-64bf6c875e84';
    
    console.log(`🔍 Looking for user: ${userId}`);
    
    // Get the specific user using query instead of getItem
    const users = await cosmosService.queryItems('users', 'SELECT * FROM c WHERE c.id = @userId', [{ name: '@userId', value: userId }]);
    const user = users && users.length > 0 ? users[0] : null;
    
    if (!user) {
      console.log('❌ User not found!');
      return { success: false, message: 'User not found' };
    }

    console.log(`📋 Found user: ${user.username} (${user.email})`);
    console.log('Current permissions:', JSON.stringify(user.permissions, null, 2));

    // Update permissions to include roles permissions
    const updatedPermissions = {
      ...user.permissions,
      roles: {
        read: true,
        write: true,
        delete: true
      }
    };

    // Update the user permissions
    await cosmosService.updateItem('users', userId, {
      permissions: updatedPermissions
    });
    
    console.log('✅ Successfully updated user permissions!');
    console.log('New permissions:', JSON.stringify(updatedPermissions, null, 2));

    return { success: true, updated: 1 };

  } catch (error) {
    console.error('❌ Error during permissions fix:', error);
    throw error;
  }
}

// If run directly
if (require.main === module) {
  fixSpecificAdminUser()
    .then((result) => {
      console.log('Fix result:', result);
      process.exit(0);
    })
    .catch((error) => {
      console.error('Fix failed:', error);
      process.exit(1);
    });
}

module.exports = { fixSpecificAdminUser };