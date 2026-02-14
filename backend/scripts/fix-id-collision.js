const cosmosService = require('../src/services/cosmosService');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

async function fixIdCollision() {
  try {
    console.log('🔄 Fixing ID collision issue...');

    // Initialize database connection
    await cosmosService.initializeDatabase();
    console.log('✅ Database connected successfully');

    const conflictingId = 'd79d7f95-0441-49bd-831a-1440c2f15cee';
    const organizationId = '67415e99-fab1-4f0d-83e6-36177411e838';
    
    // First, let's find what entity has this ID
    const query = `
      SELECT * FROM c 
      WHERE c.id = @id
    `;
    
    const parameters = [
      { name: '@id', value: conflictingId }
    ];

    console.log('🔍 Searching for entity with conflicting ID...');
    const entities = await cosmosService.queryItems('users', query, parameters);
    
    if (entities.length === 0) {
      console.log('✅ No entity found with conflicting ID. The issue may have been resolved.');
      return;
    }

    console.log(`Found ${entities.length} entity(ies) with conflicting ID:`);
    entities.forEach((entity, index) => {
      console.log(`${index + 1}. Type: ${entity.type || 'Unknown'}`);
      console.log(`   Name: ${entity.name || entity.username || 'Unknown'}`);
      console.log(`   Organization: ${entity.organizationId}`);
      console.log(`   Active: ${entity.isActive}`);
      console.log(`   Created: ${entity.createdAt}`);
      console.log('   ---');
    });

    // Check if any of these are roles with the same name
    const conflictingRoles = entities.filter(e => 
      e.type === 'role' && 
      e.name === 'data_entry_new_test' && 
      e.organizationId === organizationId
    );

    if (conflictingRoles.length > 0) {
      console.log('🔧 Found conflicting role(s). Options:');
      console.log('1. Delete the conflicting role if it\'s inactive or duplicate');
      console.log('2. Update the conflicting role if it should be kept');
      
      const role = conflictingRoles[0];
      if (!role.isActive) {
        console.log('💡 The conflicting role is inactive. Safe to delete.');
        
        // Uncomment the next line to actually delete
        // await cosmosService.deleteItem('users', conflictingId, organizationId);
        // console.log('✅ Deleted inactive conflicting role');
        
        console.log('⚠️  To delete, uncomment the deletion code in this script and run again.');
      } else {
        console.log('⚠️  The conflicting role is active. Manual review required.');
      }
    } else {
      console.log('⚠️  The conflicting entity is not a role or has different details.');
      console.log('   Manual review required to determine if it can be safely removed.');
    }

  } catch (error) {
    console.error('❌ Error fixing ID collision:', error);
    throw error;
  }
}

// If run directly
if (require.main === module) {
  fixIdCollision()
    .then(() => {
      console.log('🎉 ID collision analysis completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Failed to fix ID collision:', error);
      process.exit(1);
    });
}

module.exports = { fixIdCollision };