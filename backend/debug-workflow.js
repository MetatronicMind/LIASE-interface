process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
require('dotenv').config({ path: '.env.local' });
const cosmosService = require('./src/services/cosmosService');

async function checkWorkflow() {
  try {
    await cosmosService.initializeDatabase();
    console.log('Database initialized');

    const query = `SELECT * FROM c WHERE c.configType = 'workflow'`;
    const results = await cosmosService.queryItems('AdminConfigs', query, []);

    console.log('Found', results.length, 'workflow configs');
    
    results.forEach(config => {
      console.log('\nOrganization:', config.organizationId);
      console.log('Stages:', JSON.stringify(config.configData.stages, null, 2));
      console.log('Transitions:', JSON.stringify(config.configData.transitions, null, 2));
    });

  } catch (error) {
    console.error('Error:', error);
  }
}

checkWorkflow();
