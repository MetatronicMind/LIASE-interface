/**
 * Set SMTP Config as Default
 * This updates the existing SMTP config to be the default one
 */

const cosmosService = require('./src/services/cosmosService');

async function setSmtpAsDefault() {
  try {
    console.log('🔧 Setting SMTP configuration as default...\n');

    await cosmosService.initializeDatabase();
    console.log('✅ Database connected\n');

    const containerName = 'Emails';
    const organizationId = '94b7e106-1e86-4805-9725-5bdec4a4375f';

    // Get all SMTP configs for this org
    const query = `
      SELECT * FROM c 
      WHERE c.organizationId = @organizationId
      AND c.type_doc = 'smtp_config'
    `;

    const parameters = [
      { name: '@organizationId', value: organizationId }
    ];

    const configs = await cosmosService.queryItems(containerName, query, parameters);
    
    console.log(`📧 Found ${configs.length} SMTP configuration(s)\n`);

    if (configs.length === 0) {
      console.log('❌ No SMTP configurations found!');
      return;
    }

    // Update the first config to be default
    const configToUpdate = configs[0];
    
    console.log('📝 Current config:');
    console.log(`   Name: ${configToUpdate.name}`);
    console.log(`   isDefault: ${configToUpdate.isDefault}`);
    console.log(`   isActive: ${configToUpdate.isActive}\n`);

    configToUpdate.isDefault = true;
    configToUpdate.isActive = true;
    configToUpdate.updatedAt = new Date().toISOString();

    await cosmosService.updateItem(
      containerName,
      configToUpdate.id,
      configToUpdate
    );

    console.log('✅ SMTP Configuration updated!');
    console.log(`   Name: ${configToUpdate.name}`);
    console.log(`   isDefault: true ✓`);
    console.log(`   isActive: true ✓`);
    console.log('\n✨ Your notifications should now work!\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    process.exit(0);
  }
}

setSmtpAsDefault();
