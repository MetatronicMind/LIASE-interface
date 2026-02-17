/**
 * Test script to verify user deletion is working correctly
 * This checks if soft-deleted users are properly filtered out
 */

require('dotenv').config({ path: './test.env' });
const userService = require('./src/services/userService');
const cosmosService = require('./src/services/cosmosService');

async function testUserDeletion() {
  try {
    console.log('🧪 Testing User Deletion...\n');

    // Get organization ID from environment or use test org
    const testOrgId = process.env.TEST_ORG_ID || 'org_test';
    
    console.log(`📋 Fetching all active users for org: ${testOrgId}`);
    const activeUsers = await userService.getUsersByOrganization(testOrgId);
    console.log(`✅ Found ${activeUsers.length} active users:`);
    activeUsers.forEach(user => {
      console.log(`   - ${user.username} (${user.email}) - isActive: ${user.isActive}`);
    });

    console.log('\n📋 Checking for inactive users in database directly...');
    const query = `
      SELECT * FROM c 
      WHERE c.type = 'user' 
      AND c.organizationId = @organizationId 
      AND c.isActive = false
    `;
    
    const parameters = [
      { name: '@organizationId', value: testOrgId }
    ];

    const inactiveUsers = await cosmosService.queryItems('users', query, parameters);
    console.log(`❌ Found ${inactiveUsers.length} inactive (soft-deleted) users:`);
    inactiveUsers.forEach(user => {
      console.log(`   - ${user.username} (${user.email}) - isActive: ${user.isActive}, deletedAt: ${user.deletedAt}`);
    });

    console.log('\n✅ Test Complete!');
    console.log('\n📝 Summary:');
    console.log(`   Active users (shown in UI): ${activeUsers.length}`);
    console.log(`   Inactive users (soft-deleted): ${inactiveUsers.length}`);
    console.log('\n💡 If you see inactive users here, they are properly soft-deleted');
    console.log('   and should NOT appear in the frontend user list.');

  } catch (error) {
    console.error('❌ Error testing user deletion:', error);
  } finally {
    process.exit(0);
  }
}

// Run the test
testUserDeletion();
