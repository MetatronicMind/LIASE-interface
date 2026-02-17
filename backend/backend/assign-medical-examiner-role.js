// Script to assign medical_examiner role to a specific user for Full Report access

const cosmosService = require('./src/services/cosmosService');
const userService = require('./src/services/userService');
const roleService = require('./src/services/roleService');
const Role = require('./src/models/Role');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

async function assignMedicalExaminerRole(username) {
  try {
    console.log(`🔍 Assigning medical examiner role to user: ${username}`);

    // Initialize database connection
    await cosmosService.initializeDatabase();
    console.log('✅ Database connected successfully');

    // Find the user
    const users = await cosmosService.queryItems('users', 
      `SELECT * FROM c WHERE c.username = "${username}"`
    );
    
    if (users.length === 0) {
      throw new Error(`User "${username}" not found`);
    }
    
    const user = users[0];
    console.log(`👤 Found user: ${user.username} (${user.email})`);
    console.log(`   Organization ID: ${user.organizationId}`);
    console.log(`   Current Role: ${user.role}`);

    // Check if medical_examiner role exists for this organization
    const roles = await roleService.getRolesByOrganization(user.organizationId);
    let medicalExaminerRole = roles.find(role => 
      role.name === 'medical_examiner' || 
      role.displayName === 'Medical Examiner'
    );

    if (!medicalExaminerRole) {
      console.log('🔧 Medical examiner role not found. Creating it...');
      
      // Create medical examiner role from system template
      try {
        medicalExaminerRole = Role.createFromSystemRole('medical_examiner', user.organizationId, null);
        medicalExaminerRole = await roleService.createRole(medicalExaminerRole.toJSON());
        console.log(`✅ Created medical examiner role: ${medicalExaminerRole.id}`);
      } catch (error) {
        console.error('❌ Failed to create medical examiner role:', error.message);
        
        // Fallback: create role manually
        const roleData = {
          organizationId: user.organizationId,
          name: 'medical_examiner',
          displayName: 'Medical Examiner',
          description: 'Review and examine ICSR studies completed by data entry users - Full Report Access',
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
        
        medicalExaminerRole = await roleService.createRole(roleData);
        console.log(`✅ Created medical examiner role (fallback): ${medicalExaminerRole.id}`);
      }
    } else {
      console.log(`✅ Found existing medical examiner role: ${medicalExaminerRole.displayName} (${medicalExaminerRole.id})`);
      
      // Verify it has the correct permissions
      if (!medicalExaminerRole.permissions?.reports?.read) {
        console.log('🔧 Updating role permissions to include reports access...');
        const updatedPermissions = {
          ...medicalExaminerRole.permissions,
          reports: { read: true, write: true, delete: false }
        };
        
        try {
          await roleService.updateRole(medicalExaminerRole.id, user.organizationId, {
            permissions: updatedPermissions
          });
          console.log('✅ Updated role permissions');
        } catch (error) {
          console.error('❌ Failed to update role permissions:', error.message);
        }
      }
    }

    // Assign the role to the user
    console.log(`🔧 Assigning medical examiner role to ${username}...`);
    try {
      await userService.updateUser(user.id, user.organizationId, {
        roleId: medicalExaminerRole.id,
        role: medicalExaminerRole.name
      });
      console.log(`✅ Successfully assigned medical examiner role to ${username}`);
    } catch (error) {
      console.error(`❌ Failed to assign role: ${error.message}`);
      throw error;
    }

    // Verify the assignment
    console.log('🔍 Verifying role assignment...');
    const updatedUser = await userService.getUserById(user.id, user.organizationId);
    const hasReportsRead = updatedUser.permissions?.reports?.read === true;
    const hasReportsWrite = updatedUser.permissions?.reports?.write === true;
    
    console.log('\n📊 Permission Summary:');
    console.log(`   User: ${updatedUser.username}`);
    console.log(`   Role: ${updatedUser.role}`);
    console.log(`   Role ID: ${updatedUser.roleId}`);
    console.log(`   Reports Read: ${hasReportsRead ? '✅ YES' : '❌ NO'}`);
    console.log(`   Reports Write: ${hasReportsWrite ? '✅ YES' : '❌ NO'}`);
    
    if (hasReportsRead) {
      console.log('\n🎉 SUCCESS! User now has access to Full Report functionality.');
      console.log('   The user should now see "Full Report" in their dashboard navigation.');
    } else {
      console.log('\n❌ WARNING: Role assignment completed but reports permission not detected.');
    }

  } catch (error) {
    console.error('❌ Error assigning medical examiner role:', error);
    throw error;
  }
}

// Get username from command line arguments
const username = process.argv[2];

if (!username) {
  console.error('❌ Usage: node assign-medical-examiner-role.js <username>');
  console.error('   Example: node assign-medical-examiner-role.js john.doe');
  process.exit(1);
}

// If run directly
if (require.main === module) {
  assignMedicalExaminerRole(username)
    .then(() => {
      console.log('\n🎉 Role assignment completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('🚨 Role assignment failed:', error.message);
      process.exit(1);
    });
}

module.exports = { assignMedicalExaminerRole };