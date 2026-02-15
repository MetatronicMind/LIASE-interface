const cosmosService = require('../src/services/cosmosService');

async function fixQAPermissions() {
  try {
    console.log('Fetching all users...');
    
    // Get all users
    const query = 'SELECT * FROM c WHERE c.type = "user"';
    const { resources: users } = await cosmosService.container('users').items
      .query(query)
      .fetchAll();

    console.log(`Found ${users.length} users`);

    for (const user of users) {
      let needsUpdate = false;
      
      // Check if user has QC permissions but not QA permissions
      if (user.permissions && user.permissions.QC && !user.permissions.QA) {
        console.log(`\nUser ${user.username} (${user.email}) is missing QA permissions`);
        
        // Add QA permissions structure
        user.permissions.QA = {
          read: false,
          write: false,
          approve: false,
          reject: false
        };
        
        needsUpdate = true;
      }

      // If user has a role with "qa" in the name, enable QA permissions
      if (user.role && user.role.toLowerCase().includes('qa') && user.permissions.QA) {
        console.log(`  - Enabling QA permissions for QA role user`);
        user.permissions.QA = {
          read: true,
          write: true,
          approve: true,
          reject: true
        };
        needsUpdate = true;
      }

      // If user has a role with "qc" in the name, enable QC permissions
      if (user.role && user.role.toLowerCase().includes('qc') && user.permissions.QC) {
        console.log(`  - Enabling QC permissions for QC role user`);
        user.permissions.QC = {
          read: true,
          write: true,
          approve: true,
          reject: true
        };
        needsUpdate = true;
      }

      if (needsUpdate) {
        console.log(`  - Updating user ${user.username}...`);
        await cosmosService.updateItem('users', user.id, user.organizationId, user);
        console.log(`  ✓ Updated`);
      }
    }

    console.log('\n✓ All users processed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error fixing QA permissions:', error);
    process.exit(1);
  }
}

fixQAPermissions();
