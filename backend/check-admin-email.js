/**
 * Script to check and update admin user email
 */

const cosmosService = require('./src/services/cosmosService');

async function checkAndUpdateAdminEmail() {
  try {
    console.log('Initializing Cosmos DB...');
    await cosmosService.initializeDatabase();
    
    console.log('\n=== Checking Admin Users ===\n');
    
    // Get all organizations
    const organizations = await cosmosService.queryItems('organizations', 
      'SELECT * FROM c WHERE c.type_doc = "organization"'
    );
    
    console.log(`Found ${organizations.length} organization(s)\n`);
    
    for (const org of organizations) {
      console.log(`\nOrganization: ${org.name} (${org.id})`);
      console.log(`Admin Email in Org: ${org.adminEmail || 'NOT SET'}`);
      
      // Get admin/superadmin users for this org
      const adminUsers = await cosmosService.queryItems('users', 
        `SELECT * FROM c 
         WHERE c.organizationId = "${org.id}" 
         AND c.type = "user"
         AND (c.role = "admin" OR c.role = "superadmin" OR c.role = "Admin" OR c.role = "Super Admin")`
      );
      
      console.log(`\nFound ${adminUsers.length} admin user(s):`);
      
      for (const user of adminUsers) {
        console.log(`\n  User: ${user.username}`);
        console.log(`  - ID: ${user.id}`);
        console.log(`  - Email: ${user.email || 'NOT SET'}`);
        console.log(`  - Role: ${user.role}`);
        console.log(`  - First Name: ${user.firstName}`);
        console.log(`  - Last Name: ${user.lastName}`);
        
        // If user doesn't have email but org has adminEmail, update it
        if (!user.email && org.adminEmail) {
          console.log(`\n  ⚠️  User missing email. Would you like to set it to: ${org.adminEmail}?`);
          console.log(`  Run with --fix flag to update automatically.`);
        } else if (!user.email) {
          console.log(`\n  ⚠️  User missing email and no adminEmail in organization.`);
          console.log(`  Please provide an email address.`);
        }
      }
      
      console.log('\n' + '='.repeat(60));
    }
    
    // Check if --fix flag is provided
    if (process.argv.includes('--fix')) {
      console.log('\n\n=== FIXING ADMIN EMAILS ===\n');
      
      for (const org of organizations) {
        const adminUsers = await cosmosService.queryItems('users', 
          `SELECT * FROM c 
           WHERE c.organizationId = "${org.id}" 
           AND c.type = "user"
           AND (c.role = "admin" OR c.role = "superadmin" OR c.role = "Admin" OR c.role = "Super Admin")`
        );
        
        for (const user of adminUsers) {
          if (!user.email && org.adminEmail) {
            console.log(`Updating user ${user.username} with email: ${org.adminEmail}`);
            
            user.email = org.adminEmail.toLowerCase().trim();
            user.updatedAt = new Date().toISOString();
            
            await cosmosService.updateItem('users', user.id, user, user.organizationId);
            console.log(`✓ Updated successfully`);
          } else if (!user.email) {
            console.log(`❌ Cannot update ${user.username} - no email available`);
          }
        }
      }
      
      console.log('\n✓ Fix complete!');
    } else {
      console.log('\n\nTo automatically fix missing emails, run:');
      console.log('node check-admin-email.js --fix');
    }
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

checkAndUpdateAdminEmail();
