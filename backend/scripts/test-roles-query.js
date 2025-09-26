const cosmosService = require('../src/services/cosmosService');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

async function testRolesQuery() {
  try {
    console.log('🔄 Testing roles query...');

    // Initialize database connection
    await cosmosService.initializeDatabase();
    console.log('✅ Database connected successfully');

    const organizationId = '94b7e106-1e86-4805-9725-5bdec4a4375f';

    // Test the exact query from roleService
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

    console.log('🔍 Executing query:', query);
    console.log('📋 Parameters:', parameters);

    const roles = await cosmosService.queryItems('users', query, parameters);
    
    console.log(`✅ Query successful! Found ${roles.length} roles:`);
    
    roles.forEach((role, index) => {
      console.log(`${index + 1}. ${role.displayName} (${role.name})`);
      console.log(`   System Role: ${role.isSystemRole}`);
      console.log(`   Active: ${role.isActive}`);
      console.log('   ---');
    });

    return roles;

  } catch (error) {
    console.error('❌ Error testing roles query:', error);
    throw error;
  }
}

// If run directly
if (require.main === module) {
  testRolesQuery()
    .then((roles) => {
      console.log(`🎉 Test completed successfully! Found ${roles.length} roles.`);
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Test failed:', error);
      process.exit(1);
    });
}

module.exports = { testRolesQuery };