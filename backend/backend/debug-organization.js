// Simple role creation test with organization debugging

const express = require('express');
const app = express();
app.use(express.json());

// Mock user with organization
const mockUser = {
  id: 'test-user-123',
  name: 'Test User',
  organizationId: 'org-123', // This should match what's in the database
  email: 'test@example.com'
};

app.post('/debug-role-creation', async (req, res) => {
  try {
    console.log('🔍 [DEBUG] Starting role creation debug...');
    
    // Import services
    const roleService = require('./src/services/roleService');
    
    // Simple role data
    const roleData = {
      name: `debug_role_${Date.now()}`,
      displayName: 'Debug Role',
      description: 'Debug role for testing',
      organizationId: mockUser.organizationId, // Use mock user's org
      permissions: {
        dashboard: { read: true, write: false },
        users: { read: false, write: false, delete: false },
        roles: { read: false, write: false, delete: false },
        drugs: { read: true, write: false, delete: false },
        studies: { read: true, write: false, delete: false },
        audit: { read: false, write: false, delete: false },
        settings: { read: false, write: false },
        organizations: { read: false, write: false, delete: false }
      },
      isSystemRole: false
    };

    console.log('🔍 [DEBUG] Role data:', JSON.stringify(roleData, null, 2));
    console.log('🔍 [DEBUG] Created by:', JSON.stringify(mockUser, null, 2));
    
    // Check if organization exists in database first
    console.log('🔍 [DEBUG] Checking what organizations exist...');
    const cosmosService = require('./src/services/cosmosService');
    
    const orgQuery = 'SELECT * FROM c WHERE c.type = "organization" OR c.type = "user"';
    const allEntities = await cosmosService.queryItems('users', orgQuery, []);
    
    console.log('🔍 [DEBUG] Found entities:', allEntities.length);
    const organizations = allEntities.filter(e => e.type === 'organization');
    const users = allEntities.filter(e => e.type === 'user');
    
    console.log('🔍 [DEBUG] Organizations found:', organizations.map(o => ({ id: o.id, name: o.name })));
    console.log('🔍 [DEBUG] Users found:', users.map(u => ({ id: u.id, email: u.email, organizationId: u.organizationId })));
    
    // Check for existing roles
    console.log('🔍 [DEBUG] Checking existing roles...');
    const existingRoles = await roleService.getRolesByOrganization(mockUser.organizationId);
    console.log('🔍 [DEBUG] Existing roles in org:', existingRoles.map(r => ({ id: r.id, name: r.name })));
    
    // Now try to create the role
    console.log('🔍 [DEBUG] Attempting to create role...');
    const result = await roleService.createRole(roleData, mockUser);
    
    console.log('🔍 [DEBUG] ✅ Role created successfully:', result.id);
    
    res.json({
      success: true,
      message: 'Debug role creation successful',
      roleId: result.id,
      roleName: result.name,
      organizationId: result.organizationId,
      debug: {
        organizationsFound: organizations.length,
        usersFound: users.length,
        existingRolesCount: existingRoles.length
      }
    });
    
  } catch (error) {
    console.error('🔍 [DEBUG] ❌ Error:', error.message);
    console.error('🔍 [DEBUG] ❌ Stack:', error.stack);
    
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
});

const port = 3002;
app.listen(port, () => {
  console.log(`🔍 [DEBUG] Debug server running on port ${port}`);
  console.log(`🔍 [DEBUG] Test endpoint: POST http://localhost:${port}/debug-role-creation`);
});