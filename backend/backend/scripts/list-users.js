const cosmosService = require('../src/services/cosmosService');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

async function listAllUsers() {
  try {
    console.log('🔄 Listing all users in database...');

    // Initialize database connection
    await cosmosService.initializeDatabase();
    console.log('✅ Database connected successfully');

    // Get all users - pass the query as a string
    const users = await cosmosService.queryItems('users', 'SELECT * FROM c');
    
    console.log(`📋 Found ${users.length} users:`);
    users.forEach((user, index) => {
      console.log(`${index + 1}. ID: ${user.id}`);
      console.log(`   Username: ${user.username}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Permissions: ${JSON.stringify(user.permissions || {}, null, 2)}`);
      console.log('   ---');
    });

    return users;

  } catch (error) {
    console.error('❌ Error listing users:', error);
    throw error;
  }
}

// If run directly
if (require.main === module) {
  listAllUsers()
    .then((users) => {
      console.log(`Total users found: ${users.length}`);
      process.exit(0);
    })
    .catch((error) => {
      console.error('List failed:', error);
      process.exit(1);
    });
}

module.exports = { listAllUsers };