const { CosmosClient } = require('@azure/cosmos');
require('dotenv').config({ path: './.env.local' });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function checkConfig() {
  const endpoint = process.env.COSMOS_DB_ENDPOINT;
  const key = process.env.COSMOS_DB_KEY;
  const databaseId = process.env.COSMOS_DB_DATABASE_ID || 'LIASE-Database';

  console.log('Endpoint:', endpoint);
  console.log('Database:', databaseId);
  const containerId = 'admin_config';

  if (!endpoint || !key || !databaseId) {
    console.error('Missing Cosmos DB credentials');
    return;
  }

  const client = new CosmosClient({ endpoint, key });
  const container = client.database(databaseId).container(containerId);

  try {
    const querySpec = {
      query: "SELECT * FROM c WHERE c.configType = 'workflow'"
    };

    const { resources: configs } = await container.items.query(querySpec).fetchAll();

    if (configs.length === 0) {
      console.log('No workflow config found');
    } else {
      const config = configs[0];
      console.log('Workflow Config Found:');
      console.log('Transitions:', JSON.stringify(config.configData.transitions, null, 2));
      console.log('Stages:', JSON.stringify(config.configData.stages.map(s => ({id: s.id, label: s.label})), null, 2));
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

checkConfig();
