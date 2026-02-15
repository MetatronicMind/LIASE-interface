/**
 * Fix SMTP Configuration - Set as Default and Active
 * This script finds all SMTP configs and sets the first one as default
 */

const cosmosService = require('./src/services/cosmosService');

async function fixSMTPConfig() {
  try {
    console.log('🔧 Fixing SMTP Configuration...\n');

    await cosmosService.initializeDatabase();
    console.log('✅ Database connected\n');

    const containerName = 'email_logs';

    // Get all SMTP configs
    const query = `
      SELECT * FROM c 
      WHERE c.type_doc = 'smtp_config'
    `;

    const configs = await cosmosService.queryItems(containerName, query, []);
    
    console.log(`📧 Found ${configs.length} SMTP configuration(s)\n`);

    if (configs.length === 0) {
      console.log('❌ No SMTP configurations found!');
      console.log('Please create one in the UI: Settings > Email Configuration\n');
      return;
    }

    // Display all configs
    configs.forEach((config, index) => {
      console.log(`Config ${index + 1}:`);
      console.log(`  ID: ${config.id}`);
      console.log(`  Name: ${config.name}`);
      console.log(`  Organization: ${config.organizationId}`);
      console.log(`  Host: ${config.host}:${config.port}`);
      console.log(`  From: ${config.fromEmail}`);
      console.log(`  isDefault: ${config.isDefault}`);
      console.log(`  isActive: ${config.isActive}`);
      console.log('');
    });

    // Find if any is already default
    const defaultConfig = configs.find(c => c.isDefault && c.isActive);
    
    if (defaultConfig) {
      console.log('✅ A default active SMTP config already exists!');
      console.log(`   Using: ${defaultConfig.name} (${defaultConfig.fromEmail})\n`);
      return;
    }

    // Set the first config as default and active
    console.log('🔧 Setting first config as default and active...\n');
    
    const configToUpdate = configs[0];
    configToUpdate.isDefault = true;
    configToUpdate.isActive = true;
    configToUpdate.updatedAt = new Date().toISOString();

    await cosmosService.updateItem(
      containerName,
      configToUpdate.id,
      configToUpdate
    );

    console.log('✅ SMTP Configuration updated successfully!');
    console.log(`   Name: ${configToUpdate.name}`);
    console.log(`   Host: ${configToUpdate.host}:${configToUpdate.port}`);
    console.log(`   From: ${configToUpdate.fromEmail}`);
    console.log(`   isDefault: true`);
    console.log(`   isActive: true`);
    console.log('\n✨ Notifications should now work!\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.stack) {
      console.error('\nStack trace:', error.stack);
    }
  } finally {
    process.exit(0);
  }
}

fixSMTPConfig();
