require('dotenv').config({ path: '.env.local' });
const cosmosService = require('./src/services/cosmosService');

// Disable TLS rejection for local development with self-signed certs
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function verifyMigration() {
  try {
    console.log('Verifying migration...');
    
    // Query for any remaining studies with "Study in Process" status
    const query = "SELECT * FROM c WHERE c.status = 'Study in Process'";
    
    const remainingStudies = await cosmosService.queryItems('studies', query);
    
    console.log(`Found ${remainingStudies.length} studies with 'Study in Process' status.`);
    
    if (remainingStudies.length === 0) {
      console.log('✅ Verification SUCCESS: No studies found with the old status.');
      
      // Also check a few to make sure they have the new status
      const newStatusQuery = "SELECT TOP 5 * FROM c WHERE c.status = 'Under Triage Review'";
      
      const newStatusStudies = await cosmosService.queryItems('studies', newStatusQuery);
      console.log(`Found ${newStatusStudies.length} studies with 'Under Triage Review' status (checking sample).`);
      
      if (newStatusStudies.length > 0) {
        console.log('Sample of updated studies:');
        newStatusStudies.forEach(s => console.log(`- ${s.id} (PMID: ${s.pmid}): ${s.status}`));
      }
      
    } else {
      console.log('❌ Verification FAILED: Some studies still have the old status.');
    }
    
  } catch (error) {
    console.error('Verification error:', error);
  }
}

verifyMigration();
