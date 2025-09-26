const https = require('https');
const { CosmosClient } = require('@azure/cosmos');
require('dotenv').config({ path: '.env.local' });

async function setupLocalDatabase() {
  console.log('🚀 Setting up local Cosmos DB database (Alternative method)...');
  
  // Create an HTTPS agent that ignores SSL errors for local development
  const httpsAgent = new https.Agent({
    rejectUnauthorized: false,
    secureProtocol: 'TLSv1_2_method'
  });

  const client = new CosmosClient({
    endpoint: process.env.COSMOS_DB_ENDPOINT,
    key: process.env.COSMOS_DB_KEY,
    agent: httpsAgent,
    connectionPolicy: {
      disableSSLVerification: true,
      enableEndpointDiscovery: false
    }
  });

  try {
    // Test connection first
    console.log('🔍 Testing connection to Cosmos DB Emulator...');
    await client.getDatabaseAccount();
    console.log('✅ Connection successful!');

    // Create database
    console.log(`📦 Creating database: ${process.env.COSMOS_DB_DATABASE_ID}`);
    const { database } = await client.databases.createIfNotExists({
      id: process.env.COSMOS_DB_DATABASE_ID
    });
    console.log(`✅ Database ready: ${database.id}`);

    // Create containers with proper partition keys
    const containers = [
      { 
        id: 'organizations', 
        partitionKey: '/id',
        description: 'Organization master data'
      },
      { 
        id: 'users', 
        partitionKey: '/organizationId',
        description: 'User accounts per organization' 
      },
      { 
        id: 'drugs', 
        partitionKey: '/organizationId',
        description: 'Drug information per organization'
      },
      { 
        id: 'studies', 
        partitionKey: '/organizationId',
        description: 'Clinical studies per organization'
      },
      { 
        id: 'audit-logs', 
        partitionKey: '/organizationId',
        description: 'Audit trail logs per organization'
      }
    ];

    console.log('📋 Creating containers...');
    for (const containerDef of containers) {
      try {
        const { container } = await database.containers.createIfNotExists({
          id: containerDef.id,
          partitionKey: {
            paths: [containerDef.partitionKey]
          },
          throughput: 400
        });
        console.log(`✅ Container ready: ${container.id} (${containerDef.description})`);
      } catch (containerError) {
        console.log(`⚠️  Container ${containerDef.id}: ${containerError.message}`);
      }
    }

    console.log('🎉 Local database setup complete!');
    console.log('📝 Next steps:');
    console.log('   1. Run: npm run dev');
    console.log('   2. Test health: curl http://localhost:3001/api/health');
    console.log('   3. Create organization: npm run seed-data');
    
  } catch (error) {
    console.error('❌ Error setting up database:', error.message);
    
    console.log('\n🔧 Troubleshooting Steps:');
    console.log('1. Make sure Cosmos DB Emulator is running:');
    console.log('   - Open Azure Cosmos DB Emulator from Start Menu');
    console.log('   - Wait for it to fully start (green checkmark)');
    console.log('   - Browser should open to https://localhost:8081/_explorer/index.html');
    console.log('');
    console.log('2. If emulator is not installed:');
    console.log('   - Download: https://aka.ms/cosmosdb-emulator');
    console.log('   - Install and restart your computer');
    console.log('');
    console.log('3. Alternative: Use Azure Cosmos DB in the cloud:');
    console.log('   - Update COSMOS_DB_ENDPOINT and COSMOS_DB_KEY in .env.local');
    console.log('   - Use your Azure Cosmos DB connection details');
    
    process.exit(1);
  }
}

setupLocalDatabase();