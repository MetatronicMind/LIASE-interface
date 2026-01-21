/**
 * Script to add QA permissions to a specific user
 * Usage: node scripts/add-qa-permissions-to-user.js <userId or email>
 */

require('dotenv').config();
const cosmosService = require('../src/services/cosmosService');

async function addQAPermissionsToUser(userIdentifier) {
  try {
    console.log('Initializing Cosmos DB...');
    await cosmosService.initialize();

    console.log(`\nSearching for user: ${userIdentifier}...`);
    
    // Try to find user by ID or email
    const querySpec = {
      query: 'SELECT * FROM c WHERE c.id = @identifier OR c.email = @identifier',
      parameters: [
        { name: '@identifier', value: userIdentifier }
      ]
    };

    const { resources: users } = await cosmosService.container.items
      .query(querySpec)
      .fetchAll();

    if (users.length === 0) {
      console.error(`❌ User not found: ${userIdentifier}`);
      console.log('Please provide a valid user ID or email');
      return;
    }

    const user = users[0];
    console.log(`\n✅ Found user: ${user.email} (${user.fullName})`);
    console.log(`Role: ${user.role?.name || 'No role assigned'}`);

    // Check current permissions
    console.log('\n📋 Current Permissions:');
    console.log('QA permissions:', user.permissions?.QA || 'NOT SET');
    console.log('QC permissions:', user.permissions?.QC || 'NOT SET');

    // Add QA permissions if missing
    if (!user.permissions) {
      user.permissions = {};
    }

    if (!user.permissions.QA) {
      console.log('\n⚙️  Adding QA permissions...');
      
      // Add QA permissions based on role
      const isQARole = user.role?.name?.toLowerCase().includes('qa') || 
                       user.role?.name?.toLowerCase().includes('quality assurance');
      
      user.permissions.QA = {
        read: isQARole,
        write: isQARole,
        approve: isQARole,
        reject: isQARole
      };

      // Update user in database
      const { resource: updatedUser } = await cosmosService.container
        .item(user.id, user.organizationId)
        .replace(user);

      console.log('\n✅ QA permissions added successfully!');
      console.log('\n📋 Updated Permissions:');
      console.log('QA permissions:', updatedUser.permissions.QA);
      console.log('QC permissions:', updatedUser.permissions.QC);
      
      console.log('\n✅ User updated successfully!');
      console.log('The user can now access the QA Review page.');
    } else {
      console.log('\n✅ User already has QA permissions:');
      console.log(user.permissions.QA);
      console.log('\nNo update needed.');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  }
}

// Get user identifier from command line
const userIdentifier = process.argv[2];

if (!userIdentifier) {
  console.log('Usage: node scripts/add-qa-permissions-to-user.js <userId or email>');
  console.log('Example: node scripts/add-qa-permissions-to-user.js qa@example.com');
  process.exit(1);
}

addQAPermissionsToUser(userIdentifier)
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
