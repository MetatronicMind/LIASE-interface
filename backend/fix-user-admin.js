const cosmosService = require('./src/services/cosmosService');
const userService = require('./src/services/userService');
const roleService = require('./src/services/roleService');
require('dotenv').config();

async function checkAndFixUserRole() {
  try {
    console.log('Enter your username:');
    const username = process.argv[2];
    
    if (!username) {
      console.log('Usage: node fix-user-admin.js <username> <organizationId>');
      process.exit(1);
    }
    
    const organizationId = process.argv[3] || 'default-org';
    
    // Find user
    const user = await userService.getUserByUsername(username, organizationId);
    
    if (!user) {
      console.log(`User "${username}" not found in organization "${organizationId}"`);
      process.exit(1);
    }
    
    console.log('\n=== Current User Details ===');
    console.log('Username:', user.username);
    console.log('Email:', user.email);
    console.log('Current Role:', user.role);
    console.log('Role ID:', user.roleId);
    console.log('Is Admin?', ['Super Admin', 'Admin'].includes(user.role));
    
    // Check if user is already admin
    if (['Super Admin', 'Admin'].includes(user.role)) {
      console.log('\n✓ User already has Admin privileges');
      process.exit(0);
    }
    
    // Find Admin role
    const adminRole = await roleService.getRoleByName('Admin', organizationId);
    
    if (!adminRole) {
      console.log('\nAdmin role not found. Creating it...');
      // This shouldn't happen but just in case
      process.exit(1);
    }
    
    console.log('\n=== Updating User to Admin ===');
    
    // Update user role
    await cosmosService.updateItem('users', user.id, organizationId, {
      role: 'Admin',
      roleId: adminRole.id,
      updatedAt: new Date().toISOString()
    });
    
    console.log('✓ User role updated to Admin');
    console.log('\nPlease log out and log back in for changes to take effect.');
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkAndFixUserRole();
