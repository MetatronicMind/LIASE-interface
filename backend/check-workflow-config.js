const { CosmosClient } = require('@azure/cosmos');
require('dotenv').config({ path: './.env.local' });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function checkConfig() {
  const endpoint = process.env.COSMOS_DB_ENDPOINT;
  const key = process.env.COSMOS_DB_KEY;
  const databaseId = process.env.COSMOS_DB_DATABASE_ID || 'LIASE-Database';
  const containerId = 'AdminConfigs';

  console.log(`Connecting to ${endpoint} db: ${databaseId}`);

  if (!endpoint || !key) {
    console.error('Missing credentials');
    return;
  }

  const client = new CosmosClient({ endpoint, key });
  const container = client.database(databaseId).container(containerId);

  try {
    // Try to find ANY workflow config to see what orgs we have
    const querySpec = {
      query: "SELECT * FROM c WHERE c.configType = 'workflow'"
    };

    const { resources: configs } = await container.items.query(querySpec).fetchAll();

    console.log(`Found ${configs.length} workflow configs.`);

    for (const config of configs) {
      const bypassVal = config.configData ? config.configData.bypassQcForIcsr : 'UNDEFINED';
      
      console.log(`\n--- Config for Org: ${config.organizationId} ---`);
      console.log(`bypassQcForIcsr raw value: '${bypassVal}'`);
      console.log(`bypassQcForIcsr type: ${typeof bypassVal}`);
      
      const isEnabled = bypassVal === true || String(bypassVal) === 'true';
      console.log(`Logic Evaluation (isEnabled): ${isEnabled}`);
      
      if (config.configData && config.configData.stages) {
          const dataEntry = config.configData.stages.find(s => s.id === 'data_entry');
          console.log('Has Data Entry Stage:', !!dataEntry);
          if (dataEntry) console.log('Data Entry Stage:', JSON.stringify(dataEntry, null, 2));
          if (!dataEntry) console.log('Stages available:', config.configData.stages.map(s => s.id));
      } else {
          console.log('No configData.stages found!');
      }
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

checkConfig();
