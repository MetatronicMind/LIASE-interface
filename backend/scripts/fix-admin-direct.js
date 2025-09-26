const { CosmosClient } = require('@azure/cosmos');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

async function fixAdminUserDirect() {
  try {
    console.log('🔄 Starting direct Cosmos DB permissions fix...');

    // Initialize Cosmos client directly
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    const client = new CosmosClient({
      endpoint: process.env.COSMOS_DB_ENDPOINT,
      key: process.env.COSMOS_DB_KEY,
      agent: new (require('https').Agent)({
        rejectUnauthorized: false
      })
    });

    const database = client.database('liase-saas-local');
    const container = database.container('users');

    const userId = '8ecfefd9-2cbe-4ffd-8040-64bf6c875e84';
    
    console.log(`🔍 Looking for user: ${userId}`);
    
    // Get all users and find the one we need
    const { resources: users } = await container.items.query('SELECT * FROM c').fetchAll();
    const user = users.find(u => u.id === userId);
    
    if (!user) {
      console.log('❌ User not found!');
      return { success: false, message: 'User not found' };
    }

    console.log(`📋 Found user: ${user.username} (${user.email})`);
    console.log('User document keys:', Object.keys(user));
    console.log('Full user document:', JSON.stringify(user, null, 2));
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

    // Update the user document directly
    const updatedUser = {
      ...user,
      permissions: updatedPermissions,
      updatedAt: new Date().toISOString()
    };

    // Replace the document using the organizationId as partition key
    const { resource } = await container.item(userId, user.organizationId).replace(updatedUser);
    
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
  fixAdminUserDirect()
    .then((result) => {
      console.log('Fix result:', result);
      process.exit(0);
    })
    .catch((error) => {
      console.error('Fix failed:', error);
      process.exit(1);
    });
}

module.exports = { fixAdminUserDirect };