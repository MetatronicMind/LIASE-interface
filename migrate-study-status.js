/**
 * Script to migrate "Study in Process" status to "Under Triage Review"
 */

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
require('dotenv').config({ path: '.env.local' });
const cosmosService = require('./src/services/cosmosService');

async function migrateStudyStatus() {
  try {
    console.log('Initializing Cosmos DB...');
    await cosmosService.initializeDatabase();
    
    console.log('\n=== Migrating Study Status ===\n');
    
    // Query for studies with "Study in Process" status
    const query = 'SELECT * FROM c WHERE c.status = "Study in Process"';
    const studies = await cosmosService.queryItems('studies', query);
    
    console.log(`Found ${studies.length} studies with status "Study in Process"`);
    
    if (studies.length === 0) {
      console.log('No migration needed.');
      return;
    }

    let updatedCount = 0;
    let errorCount = 0;

    for (const study of studies) {
      try {
        console.log(`Updating study ${study.id} (PMID: ${study.pmid})...`);
        
        study.status = 'Under Triage Review';
        study.updatedAt = new Date().toISOString();
        
        // Add a system comment
        if (!study.comments) {
          study.comments = [];
        }
        
        study.comments.push({
          id: require('uuid').v4(),
          userId: 'system',
          userName: 'System Migration',
          text: 'Status automatically updated from "Study in Process" to "Under Triage Review"',
          type: 'system',
          createdAt: new Date().toISOString()
        });

        await cosmosService.updateItem('studies', study.id, study);
        updatedCount++;
        console.log(`✅ Updated study ${study.id}`);
        
      } catch (err) {
        console.error(`❌ Failed to update study ${study.id}:`, err.message);
        errorCount++;
      }
    }

    console.log('\n=== Migration Summary ===');
    console.log(`Total found: ${studies.length}`);
    console.log(`Successfully updated: ${updatedCount}`);
    console.log(`Errors: ${errorCount}`);
    
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

migrateStudyStatus();
