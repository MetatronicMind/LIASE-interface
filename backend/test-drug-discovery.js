const pubmedService = require('./src/services/pubmedService');

async function testDrugDiscovery() {
    console.log('Testing drug discovery...');
    
    try {
        // Test the new getDrugArticles function
        console.log('Calling getDrugArticles...');
        const results = await pubmedService.getDrugArticles('aspirin', 5);
        
        console.log('Results:', JSON.stringify(results, null, 2));
        console.log('Number of articles found:', results.length);
        
        if (results.length > 0) {
            console.log('First article structure:');
            console.log('- PMID:', results[0].PMID);
            console.log('- DrugName:', results[0].DrugName);
            console.log('- Sponsor:', results[0].Sponsor);
            console.log('- Title:', results[0].Title);
            console.log('- Journal:', results[0].Journal);
        }
        
    } catch (error) {
        console.error('Error testing drug discovery:', error);
        console.error('Stack:', error.stack);
    }
}

testDrugDiscovery();