/**
 * Quick script to check QA user permissions
 */

require('dotenv').config();
const cosmosService = require('./src/services/cosmosService');

async function checkQAUser() {
  try {
    console.log('Initializing Cosmos DB...');
    await cosmosService.initialize();

    // Find QA users
    const querySpec = {
      query: 'SELECT * FROM c WHERE CONTAINS(LOWER(c.role.name), "qa") OR CONTAINS(LOWER(c.email), "qa")'
    };

    const { resources: users } = await cosmosService.container.items
      .query(querySpec)
      .fetchAll();

    console.log(`\nFound ${users.length} QA user(s):\n`);

    users.forEach(user => {
      console.log('=' .repeat(60));
      console.log(`Email: ${user.email}`);
      console.log(`Name: ${user.fullName}`);
      console.log(`Role: ${user.role?.name || 'No role'}`);
      console.log(`\nFull Permissions Object:`);
      console.log(JSON.stringify(user.permissions, null, 2));
      console.log('=' .repeat(60));
      console.log('\n');
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  }
}

checkQAUser()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
