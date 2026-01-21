const { CosmosClient } = require('@azure/cosmos');
require('dotenv').config({ path: './.env.local' });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function getStudy() {
  const endpoint = process.env.COSMOS_DB_ENDPOINT;
  const key = process.env.COSMOS_DB_KEY;
  const client = new CosmosClient({ endpoint, key });
  const container = client.database('LIASE-Database').container('studies');
  
  // Use parameter to avoid quoting issues
  const querySpec = {
    query: "SELECT * FROM c WHERE c.pmid = '41491513'"
  };
  
  try {
    const { resources } = await container.items.query(querySpec).fetchAll();
    if (resources.length > 0) {
      const study = resources[0];
      console.log('UserTag:', study.userTag);
      console.log('Status:', study.status);
      console.log('Full Object:', JSON.stringify(study, null, 2));
    } else {
      console.log('Study not found');
    }
  } catch (err) {
    console.error(err);
  }
}

getStudy();