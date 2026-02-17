/**
 * Check SMTP Configuration in Database
 * Run: node check-smtp-config.js
 */

require('dotenv').config();
const cosmosService = require('./src/services/cosmosService');

async function checkSMTPConfig() {
  try {
    console.log('🔍 Checking SMTP Configuration...\n');

    // Initialize cosmos service
    await cosmosService.initializeDatabase();
    const containerName = 'email_logs';

    // Get the organization ID from notifications
    const notificationQuery = `
      SELECT DISTINCT c.organizationId 
      FROM c 
      WHERE c.type_doc = 'notification'
      LIMIT 1
    `;
    
    const orgResults = await cosmosService.queryItems('notifications', notificationQuery, []);
    
    if (orgResults.length === 0) {
      console.log('❌ No organizations found with notifications');
      return;
    }

    const organizationId = orgResults[0].organizationId;
    console.log(`📋 Organization ID: ${organizationId}\n`);

    // Check for any SMTP configs
    const allSmtpQuery = `
      SELECT * FROM c 
      WHERE c.organizationId = @organizationId
      AND c.type_doc = 'smtp_config'
    `;

    const allSmtpParams = [
      { name: '@organizationId', value: organizationId }
    ];

    const allConfigs = await cosmosService.queryItems(containerName, allSmtpQuery, allSmtpParams);
    
    console.log(`📧 Total SMTP configs found: ${allConfigs.length}\n`);

    if (allConfigs.length === 0) {
      console.log('❌ NO SMTP CONFIGURATIONS FOUND!');
      console.log('\n💡 To fix this, you need to:');
      console.log('1. Go to Settings > Email Configuration in the UI');
      console.log('2. Create a new SMTP configuration');
      console.log('3. Make sure to set it as "Default" and "Active"\n');
      return;
    }

    // Display all configs
    allConfigs.forEach((config, index) => {
      console.log(`\n📝 Config ${index + 1}:`);
      console.log(`   ID: ${config.id}`);
      console.log(`   Name: ${config.name}`);
      console.log(`   Host: ${config.host}`);
      console.log(`   Port: ${config.port}`);
      console.log(`   From Email: ${config.fromEmail}`);
      console.log(`   Is Default: ${config.isDefault}`);
      console.log(`   Is Active: ${config.isActive}`);
      console.log(`   Secure: ${config.secure}`);
    });

    // Check for default config
    const defaultQuery = `
      SELECT * FROM c 
      WHERE c.organizationId = @organizationId
      AND c.type_doc = 'smtp_config'
      AND c.isDefault = true
      AND c.isActive = true
    `;

    const defaultConfig = await cosmosService.queryItems(containerName, defaultQuery, allSmtpParams);

    console.log('\n\n🎯 Default Active Config Check:');
    if (defaultConfig.length > 0) {
      console.log('✅ Default SMTP config found and active!');
      console.log(`   Name: ${defaultConfig[0].name}`);
      console.log(`   Host: ${defaultConfig[0].host}:${defaultConfig[0].port}`);
    } else {
      console.log('❌ NO DEFAULT ACTIVE SMTP CONFIG FOUND!');
      console.log('\n💡 Fix this by:');
      
      if (allConfigs.length > 0) {
        console.log('   One of your configs exists but is not set as default or not active.');
        console.log('   Update your SMTP config to:');
        console.log('   - Set isDefault = true');
        console.log('   - Set isActive = true');
      }
    }

    console.log('\n✅ Diagnostic complete!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    process.exit(0);
  }
}

checkSMTPConfig();
