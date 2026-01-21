const express = require('express');
const app = express();

// Simple middleware to parse JSON
app.use(express.json());

// Very basic role creation test without auth
app.post('/test-simple-role', async (req, res) => {
  try {
    console.log('🔥 [SIMPLE TEST] Starting basic role creation test...');
    
    // Try to import roleService
    const roleService = require('./src/services/roleService');
    console.log('🔥 [SIMPLE TEST] RoleService imported successfully');
    
    // Try to import cosmosService directly
    const cosmosService = require('./src/services/cosmosService');
    console.log('🔥 [SIMPLE TEST] CosmosService imported successfully');
    
    // Test basic database connection
    console.log('🔥 [SIMPLE TEST] Testing database connection...');
    
    // Create very simple role data
    const simpleRoleData = {
      name: `simple_test_${Date.now()}`,
      description: 'Simple test role',
      organizationId: 'test-org',
      permissions: ['read']
    };
    
    const simpleUser = {
      id: 'test-user',
      name: 'Test User',
      organizationId: 'test-org'
    };
    
    console.log('🔥 [SIMPLE TEST] Attempting role creation...');
    console.log('🔥 [SIMPLE TEST] Role data:', JSON.stringify(simpleRoleData, null, 2));
    
    const result = await roleService.createRole(simpleRoleData, simpleUser);
    
    console.log('🔥 [SIMPLE TEST] ✅ Role created successfully!');
    
    res.json({
      success: true,
      message: 'Simple role creation test passed',
      roleId: result?.id,
      roleName: result?.name
    });
    
  } catch (error) {
    console.error('🔥 [SIMPLE TEST] ❌ Error:', error.message);
    console.error('🔥 [SIMPLE TEST] ❌ Stack:', error.stack);
    
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
});

// Test database connection
app.get('/test-db', async (req, res) => {
  try {
    const cosmosService = require('./src/services/cosmosService');
    
    // Try a simple query
    const query = 'SELECT TOP 5 * FROM c WHERE c.type = "role"';
    const results = await cosmosService.queryItems('users', query, []);
    
    res.json({
      success: true,
      message: 'Database connection test passed',
      resultCount: results?.length || 0,
      results: results?.slice(0, 3) // Show first 3 results
    });
    
  } catch (error) {
    console.error('🔥 [DB TEST] ❌ Error:', error.message);
    
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`🔥 [SIMPLE TEST] Test server running on port ${port}`);
  console.log(`🔥 [SIMPLE TEST] Test endpoints:`);
  console.log(`🔥 [SIMPLE TEST] - POST http://localhost:${port}/test-simple-role`);
  console.log(`🔥 [SIMPLE TEST] - GET http://localhost:${port}/test-db`);
});