const cosmosService = require('./src/services/cosmosService');
const userService = require('./src/services/userService');
const roleService = require('./src/services/roleService');
require('dotenv').config();

async function diagnoseArchivalAccess() {
  try {
    const username = process.argv[2];
    const organizationId = process.argv[3] || 'default-org';
    
    if (!username) {
      console.log('Usage: node diagnose-archival-access.js <username> [organizationId]');
      console.log('\nExample: node diagnose-archival-access.js admin@example.com default-org');
      process.exit(1);
    }
    
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║          ARCHIVAL ACCESS DIAGNOSTIC TOOL                 ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
    
    // Find user
    console.log('1. Looking up user...');
    const user = await userService.getUserByUsername(username, organizationId);
    
    if (!user) {
      console.log(`   ❌ User "${username}" not found in organization "${organizationId}"`);
      console.log('\n📝 Available organizations:');
      const orgs = await cosmosService.queryItems('organizations', 
        'SELECT c.id, c.name FROM c WHERE c.type = @type',
        [{ name: '@type', value: 'organization' }]
      );
      orgs.forEach(org => console.log(`   - ${org.id}: ${org.name}`));
      process.exit(1);
    }
    
    console.log('   ✓ User found\n');
    
    // Display user info
    console.log('2. User Information:');
    console.log(`   Username:      ${user.username}`);
    console.log(`   Email:         ${user.email}`);
    console.log(`   User ID:       ${user.id}`);
    console.log(`   Organization:  ${organizationId}`);
    console.log(`   Active:        ${user.isActive ? '✓ Yes' : '✗ No'}`);
    console.log(`   Role:          ${user.role || 'Not assigned'}`);
    console.log(`   Role ID:       ${user.roleId || 'Not assigned'}`);
    console.log(`   Display Name:  ${user.roleDisplayName || 'N/A'}\n`);
    
    // Check role details
    if (user.roleId) {
      console.log('3. Role Details:');
      const role = await roleService.getRoleById(user.roleId, organizationId);
      if (role) {
        console.log(`   Role Name:     ${role.name}`);
        console.log(`   Display Name:  ${role.displayName}`);
        console.log(`   Is Admin:      ${['admin', 'superadmin'].includes(role.name.toLowerCase()) ? '✓ Yes' : '✗ No'}`);
        console.log(`   Permissions:`);
        if (role.permissions && role.permissions.archival) {
          console.log(`     archival.view:    ${role.permissions.archival.view ? '✓' : '✗'}`);
          console.log(`     archival.manage:  ${role.permissions.archival.manage ? '✓' : '✗'}`);
        } else {
          console.log(`     archival: ✗ Not set in role`);
        }
      } else {
        console.log('   ⚠️  Role not found in database');
      }
    } else {
      console.log('3. Role Details: ⚠️  No role assigned');
    }
    console.log();
    
    // Check user-specific permissions
    console.log('4. User-Specific Permissions:');
    if (user.permissions) {
      console.log('   Custom permissions defined:');
      Object.keys(user.permissions).forEach(resource => {
        console.log(`   ${resource}:`);
        Object.keys(user.permissions[resource]).forEach(action => {
          console.log(`     - ${action}: ${user.permissions[resource][action] ? '✓' : '✗'}`);
        });
      });
      
      if (user.permissions.archival) {
        console.log(`\n   Archival permissions:`);
        console.log(`     - view:    ${user.permissions.archival.view ? '✓ Yes' : '✗ No'}`);
        console.log(`     - manage:  ${user.permissions.archival.manage ? '✓ Yes' : '✗ No'}`);
      } else {
        console.log('   ⚠️  No archival permissions set');
      }
    } else {
      console.log('   No custom permissions defined');
    }
    console.log();
    
    // Check effective permissions
    console.log('5. Effective Permissions (after merge):');
    const hasViewPerm = user.hasPermission && user.hasPermission('archival', 'view');
    const hasManagePerm = user.hasPermission && user.hasPermission('archival', 'manage');
    console.log(`   archival.view:    ${hasViewPerm ? '✓ GRANTED' : '✗ DENIED'}`);
    console.log(`   archival.manage:  ${hasManagePerm ? '✓ GRANTED' : '✗ DENIED'}\n`);
    
    // Check if admin role
    const isAdmin = user.role && ['Super Admin', 'Admin'].includes(user.role);
    console.log('6. Authorization Check:');
    console.log(`   Is Admin Role:              ${isAdmin ? '✓ Yes' : '✗ No'}`);
    console.log(`   Has archival view access:   ${hasViewPerm || isAdmin ? '✓ Yes' : '✗ No'}`);
    console.log(`   Has archival manage access: ${hasManagePerm || isAdmin ? '✓ Yes' : '✗ No'}\n`);
    
    // Final verdict
    console.log('═══════════════════════════════════════════════════════════');
    console.log('VERDICT:');
    
    if (hasViewPerm || isAdmin) {
      console.log('✓ User CAN access /api/archival/records');
    } else {
      console.log('✗ User CANNOT access /api/archival/records');
      console.log('\n📋 To fix this, run:');
      console.log(`   node grant-archival-permissions.js ${username} ${organizationId}`);
      console.log('\n   OR make the user an Admin:');
      console.log(`   node fix-user-admin.js ${username} ${organizationId}`);
    }
    console.log('═══════════════════════════════════════════════════════════\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

diagnoseArchivalAccess();
