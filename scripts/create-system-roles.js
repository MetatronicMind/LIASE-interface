const cosmosService = require('../src/services/cosmosService');
const { v4: uuidv4 } = require('uuid');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

async function createSystemRoles() {
  try {
    console.log('🔄 Creating system roles...');

    // Initialize database connection
    await cosmosService.initializeDatabase();
    console.log('✅ Database connected successfully');

    const organizationId = '94b7e106-1e86-4805-9725-5bdec4a4375f'; // Your org ID from user

    // Define system roles
    const systemRoles = [
      {
        id: uuidv4(),
        type: 'role',
        organizationId: organizationId,
        name: 'admin',
        displayName: 'Administrator',
        description: 'Full system access with all permissions',
        isSystemRole: true,
        isActive: true,
        permissions: {
          dashboard: { read: true, write: true },
          users: { read: true, write: true, delete: true },
          roles: { read: true, write: true, delete: true },
          drugs: { read: true, write: true, delete: true },
          studies: { read: true, write: true, delete: true },
          audit: { read: true, write: false, delete: false },
          settings: { read: true, write: true },
          organizations: { read: true, write: true, delete: false }
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'system'
      },
      {
        id: uuidv4(),
        type: 'role',
        organizationId: organizationId,
        name: 'user',
        displayName: 'Standard User',
        description: 'Basic user access with limited permissions',
        isSystemRole: true,
        isActive: true,
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
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'system'
      },
      {
        id: uuidv4(),
        type: 'role',
        organizationId: organizationId,
        name: 'researcher',
        displayName: 'Researcher',
        description: 'Research-focused role with drug and study access',
        isSystemRole: true,
        isActive: true,
        permissions: {
          dashboard: { read: true, write: false },
          users: { read: false, write: false, delete: false },
          roles: { read: false, write: false, delete: false },
          drugs: { read: true, write: true, delete: false },
          studies: { read: true, write: true, delete: false },
          audit: { read: true, write: false, delete: false },
          settings: { read: false, write: false },
          organizations: { read: false, write: false, delete: false }
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'system'
      }
    ];

    let created = 0;
    for (const role of systemRoles) {
      // Check if role already exists
      const existing = await cosmosService.queryItems('users', 
        'SELECT * FROM c WHERE c.type = @type AND c.organizationId = @orgId AND c.name = @name',
        [
          { name: '@type', value: 'role' },
          { name: '@orgId', value: organizationId },
          { name: '@name', value: role.name }
        ]
      );

      if (existing.length === 0) {
        await cosmosService.createItem('users', role, role.organizationId);
        console.log(`✅ Created system role: ${role.displayName}`);
        created++;
      } else {
        console.log(`⏭️  System role already exists: ${role.displayName}`);
      }
    }

    console.log(`🎉 Created ${created} new system roles!`);
    return { success: true, created };

  } catch (error) {
    console.error('❌ Error creating system roles:', error);
    throw error;
  }
}

// If run directly
if (require.main === module) {
  createSystemRoles()
    .then((result) => {
      console.log('System roles setup complete:', result);
      process.exit(0);
    })
    .catch((error) => {
      console.error('System roles setup failed:', error);
      process.exit(1);
    });
}

module.exports = { createSystemRoles };