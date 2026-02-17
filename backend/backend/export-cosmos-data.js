const fs = require('fs');
const path = require('path');
const { CosmosClient } = require('@azure/cosmos');
require('dotenv').config({ path: '.env.local' });

// Disable SSL verification for local Cosmos DB emulator
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const EXPORT_DIR = path.join(__dirname, 'db');

const containersToExport = [
  'organizations',
  'users',
  'roles',
  'drugs',
  'studies',
  'drugSearchConfigs',
  'jobs',
  'audit-logs',
  'ScheduledJobs',
  'Notifications',
  'Emails',
  'EmailTemplates',
  'SMTPConfigs',
  'Reports',
  'AdminConfigs',
  'Settings',
  'Archives',
  'legacyData'
];

async function exportData() {
  try {
    // Ensure export directory exists
    if (!fs.existsSync(EXPORT_DIR)) {
      fs.mkdirSync(EXPORT_DIR);
    }

    const endpoint = process.env.COSMOS_DB_ENDPOINT;
    const key = process.env.COSMOS_DB_KEY;
    const dbId = process.env.COSMOS_DB_DATABASE_ID || 'LIASE-Database';

    if (!endpoint || !key) {
      throw new Error('COSMOS_DB_ENDPOINT and COSMOS_DB_KEY must be set in .env.local');
    }

    console.log(`Connecting to Cosmos DB: ${endpoint}`);
    const client = new CosmosClient({ endpoint, key });
    const database = client.database(dbId);

    // Fetch all containers dynamically
    console.log('Fetching all containers...');
    const { resources: containers } = await database.containers.readAll().fetchAll();
    const containerIds = containers.map(c => c.id);
    console.log(`Found ${containerIds.length} containers: ${containerIds.join(', ')}`);

    for (const containerId of containerIds) {
      console.log(`Exporting container: ${containerId}...`);
      const container = database.container(containerId);
      
      try {
        const { resources: items } = await container.items.readAll().fetchAll();
        
        const filePath = path.join(EXPORT_DIR, `${containerId}.json`);
        fs.writeFileSync(filePath, JSON.stringify(items, null, 2));
        
        console.log(`  Saved ${items.length} items to ${filePath}`);
      } catch (err) {
        if (err.code === 404) {
            console.log(`  Container ${containerId} not found.`);
        } else {
            console.error(`  Error exporting ${containerId}:`, err.message);
        }
      }
    }

    console.log('Export complete.');

  } catch (error) {
    console.error('Export failed:', error);
  }
}

exportData();
