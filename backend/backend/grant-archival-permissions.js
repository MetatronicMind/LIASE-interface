const cosmosService = require('./src/services/cosmosService');
const userService = require('./src/services/userService');
const roleService = require('./src/services/roleService');
require('dotenv').config();

async function grantArchivalPermissions() {
  try {
    const username = process.argv[2];
    const organizationId = process.argv[3] || 'default-org';
    
    if (!username) {
      console.log('Usage: node grant-archival-permissions.js <username> [organizationId]');
      console.log('\nExample: node grant-archival-permissions.js admin@example.com default-org');
      process.exit(1);
    }
    
    console.log('=== Granting Archival Permissions ===\n');
    
    // Find user
    console.log(`Looking for user: ${username}`);
    const user = await userService.getUserByUsername(username, organizationId);
    
    if (!user) {
      console.log(`❌ User "${username}" not found in organization "${organizationId}"`);
      process.exit(1);
    }
    
    console.log('✓ User found');
    console.log(`  Username: ${user.username}`);
    console.log(`  Email: ${user.email}`);
    console.log(`  Current Role: ${user.role}`);
    console.log(`  Role ID: ${user.roleId}`);
    
    // Check if user already has archival permissions
    const hasViewPerm = user.hasPermission && user.hasPermission('archival', 'view');
    const hasManagePerm = user.hasPermission && user.hasPermission('archival', 'manage');
    
    console.log(`\n  Current Archival Permissions:`);
    console.log(`    - view: ${hasViewPerm ? '✓ Yes' : '✗ No'}`);
    console.log(`    - manage: ${hasManagePerm ? '✓ Yes' : '✗ No'}`);
    
    if (hasViewPerm && hasManagePerm) {
      console.log('\n✓ User already has full archival permissions!');
      process.exit(0);
    }
    
    // Update user permissions
    console.log('\n=== Updating Permissions ===');
    
    const currentPermissions = user.permissions || {};
    const updatedPermissions = {
      ...currentPermissions,
      archival: {
        view: true,
        manage: true
      }
    };
    
    await cosmosService.updateItem('users', user.id, organizationId, {
      permissions: updatedPermissions,
      updatedAt: new Date().toISOString()
    });
    
    console.log('✓ Permissions updated successfully!');
    console.log('\nNew archival permissions:');
    console.log('  - view: ✓ Yes');
    console.log('  - manage: ✓ Yes');
    console.log('\n⚠️  Please log out and log back in for changes to take effect.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

grantArchivalPermissions();
