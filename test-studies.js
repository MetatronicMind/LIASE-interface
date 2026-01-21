// Test script to check if we can retrieve studies from the database
const cosmosService = require('./src/services/cosmosService');

async function testStudyRetrieval() {
  try {
    console.log('Testing study retrieval...');
    
    // Initialize the database first
    console.log('Initializing database...');
    await cosmosService.initializeDatabase();
    console.log('Database initialized successfully');
    
    // Try to get all studies (without organization filter for testing)
    const query = 'SELECT * FROM c WHERE c.type = "study" OR NOT IS_DEFINED(c.type)';
    const studies = await cosmosService.queryItems('studies', query, []);
    
    console.log(`Found ${studies.length} studies in database:`);
    studies.forEach((study, index) => {
      console.log(`${index + 1}. PMID: ${study.pmid || 'N/A'}, Title: ${study.title?.substring(0, 50) || 'N/A'}...`);
      console.log(`   Organization: ${study.organizationId || 'N/A'}`);
    });
    
    if (studies.length === 0) {
      console.log('\nNo studies found in database. This explains why the frontend is empty.');
      console.log('You may need to:');
      console.log('1. Run drug discovery to create studies');
      console.log('2. Import existing studies');
      console.log('3. Check database connection');
    }
    
  } catch (error) {
    console.error('Error testing study retrieval:', error);
  }
}

testStudyRetrieval();