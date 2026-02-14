const config = require('./src/config/secretLoader');
const roleService = require('./src/services/roleService');

async function testRoleCreation() {
  try {
    console.log('🔥 [TEST] Starting role creation test...');
    
    // Test creating a new role
    const roleData = {
      name: `data_entry_new_test_${Date.now()}`,
      description: 'Test role with enhanced race condition protection',
      organizationId: 'test-org-123',
      permissions: ['read_data', 'write_data']
    };
    
    const createdBy = {
      id: 'test-user-456',
      name: 'Test User'
    };
    
    console.log('🔥 [TEST] Role data:', JSON.stringify(roleData, null, 2));
    console.log('🔥 [TEST] Created by:', JSON.stringify(createdBy, null, 2));
    
    console.log('🔥 [TEST] Calling roleService.createRole...');
    const startTime = Date.now();
    
    const result = await roleService.createRole(roleData, createdBy);
    
    const endTime = Date.now();
    console.log(`🔥 [TEST] Role creation completed in ${endTime - startTime}ms`);
    console.log('🔥 [TEST] Created role:', JSON.stringify(result, null, 2));
    
    // Test querying the role back
    console.log('🔥 [TEST] Verifying role was created by fetching it back...');
    const fetchedRole = await roleService.getRoleByName(roleData.name, roleData.organizationId);
    
    if (fetchedRole) {
      console.log('✅ [TEST] Role successfully created and fetched back!');
      console.log('🔥 [TEST] Fetched role ID:', fetchedRole.id);
    } else {
      console.log('❌ [TEST] Role was not found after creation!');
    }
    
    return result;
    
  } catch (error) {
    console.error('❌ [TEST] Error during role creation test:', error.message);
    console.error('🔥 [TEST] Full error stack:', error.stack);
    throw error;
  }
}

// Run the test
testRoleCreation()
  .then(result => {
    console.log('🎉 [TEST] Role creation test completed successfully!');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 [TEST] Role creation test failed!');
    process.exit(1);
  });