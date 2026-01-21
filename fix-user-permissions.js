// Script to diagnose and fix user permissions for Full Report access

const cosmosService = require('./src/services/cosmosService');
const userService = require('./src/services/userService');
const roleService = require('./src/services/roleService');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

async function diagnoseAndFixUserPermissions() {
  try {
    console.log('🔍 Starting user permissions diagnosis...');

    // Initialize database connection
    await cosmosService.initializeDatabase();
    console.log('✅ Database connected successfully');

    // Get all users
    const users = await cosmosService.queryItems('users', 'SELECT * FROM c');
    console.log(`📋 Found ${users.length} users:`);

    for (const user of users) {
      console.log(`\n👤 User: ${user.username} (${user.email})`);
      console.log(`   Current Role: ${user.role}`);
      console.log(`   Role ID: ${user.roleId || 'None'}`);
      
      // Get full user details with role information
      try {
        const fullUser = await userService.getUserById(user.id, user.organizationId);
        console.log(`   Permissions:`, JSON.stringify(fullUser.permissions || {}, null, 2));
        
        // Check if user has reports permission
        const hasReportsRead = fullUser.permissions?.reports?.read === true;
        const hasReportsWrite = fullUser.permissions?.reports?.write === true;
        
        console.log(`   ✓ Reports Read Permission: ${hasReportsRead ? '✅ YES' : '❌ NO'}`);
        console.log(`   ✓ Reports Write Permission: ${hasReportsWrite ? '✅ YES' : '❌ NO'}`);
        
        // If user doesn't have reports permission but should have medical_examiner role
        if (!hasReportsRead) {
          console.log(`\n🔧 User ${user.username} needs reports permission. Checking available roles...`);
          
          // Get all roles for the organization
          const roles = await roleService.getRolesByOrganization(user.organizationId);
          const medicalExaminerRole = roles.find(role => 
            role.name === 'medical_examiner' || 
            role.displayName === 'Medical Examiner' ||
            (role.permissions?.reports?.read === true)
          );
          
          if (medicalExaminerRole) {
            console.log(`   ✅ Found medical examiner role: ${medicalExaminerRole.displayName} (${medicalExaminerRole.id})`);
            console.log(`   🔧 Assigning role to user...`);
            
            try {
              await userService.updateUser(user.id, user.organizationId, {
                roleId: medicalExaminerRole.id,
                role: medicalExaminerRole.name
              });
              console.log(`   ✅ Successfully assigned medical examiner role to ${user.username}`);
            } catch (error) {
              console.error(`   ❌ Failed to assign role: ${error.message}`);
            }
          } else {
            console.log(`   ❌ No medical examiner role found. Creating one...`);
            
            try {
              // Create medical examiner role
              const roleData = {
                organizationId: user.organizationId,
                name: 'medical_examiner',
                displayName: 'Medical Examiner',
                description: 'Review and examine ICSR studies completed by data entry users',
                permissions: {
                  dashboard: { read: true, write: false },
                  users: { read: false, write: false, delete: false },
                  roles: { read: false, write: false, delete: false },
                  drugs: { read: true, write: false, delete: false },
                  studies: { read: true, write: true, delete: false },
                  audit: { read: true, write: false, delete: false },
                  settings: { read: false, write: false },
                  organizations: { read: false, write: false, delete: false },
                  reports: { read: true, write: true, delete: false }
                },
                isSystemRole: false
              };
              
              const newRole = await roleService.createRole(roleData);
              console.log(`   ✅ Created medical examiner role: ${newRole.id}`);
              
              // Assign the new role to the user
              await userService.updateUser(user.id, user.organizationId, {
                roleId: newRole.id,
                role: newRole.name
              });
              console.log(`   ✅ Successfully assigned new medical examiner role to ${user.username}`);
              
            } catch (error) {
              console.error(`   ❌ Failed to create/assign role: ${error.message}`);
            }
          }
        } else {
          console.log(`   ✅ User ${user.username} already has sufficient permissions for Full Report`);
        }
        
      } catch (error) {
        console.error(`   ❌ Error getting user details: ${error.message}`);
      }
    }

    console.log(`\n✅ User permissions diagnosis completed!`);
    
    // Show role summary
    console.log('\n📊 Role Summary:');
    for (const user of users) {
      try {
        const fullUser = await userService.getUserById(user.id, user.organizationId);
        const hasReports = fullUser.permissions?.reports?.read === true;
        console.log(`   ${user.username}: ${hasReports ? '✅' : '❌'} Full Report Access`);
      } catch (error) {
        console.log(`   ${user.username}: ❌ Error checking permissions`);
      }
    }

  } catch (error) {
    console.error('❌ Error during diagnosis:', error);
    throw error;
  }
}

// If run directly
if (require.main === module) {
  diagnoseAndFixUserPermissions()
    .then(() => {
      console.log('\n🎉 Diagnosis and fix completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('🚨 Diagnosis failed:', error);
      process.exit(1);
    });
}

module.exports = { diagnoseAndFixUserPermissions };