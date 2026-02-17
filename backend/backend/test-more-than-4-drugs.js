/**
 * Test to verify that the system can now process more than 4 drugs
 * This test simulates discovery of 8 drugs and verifies they all get processed
 */

const externalApiService = require('./src/services/externalApiService');

async function testMoreThan4Drugs() {
  console.log('🔬 Testing processing of more than 4 drugs');
  console.log('='.repeat(50));

  // Create a test dataset with 8 drugs (2x the original limit)
  const testDrugs = [
    { pmid: '40995636', drugName: 'DEXAMETHASONE', title: 'Test Study 1' },
    { pmid: '40190438', drugName: 'ASPIRIN', title: 'Test Study 2' },
    { pmid: '12345678', drugName: 'IBUPROFEN', title: 'Test Study 3' },
    { pmid: '87654321', drugName: 'ACETAMINOPHEN', title: 'Test Study 4' },
    { pmid: '11111111', drugName: 'NAPROXEN', title: 'Test Study 5' },
    { pmid: '22222222', drugName: 'CELECOXIB', title: 'Test Study 6' },
    { pmid: '33333333', drugName: 'METFORMIN', title: 'Test Study 7' },
    { pmid: '44444444', drugName: 'SIMVASTATIN', title: 'Test Study 8' }
  ];

  console.log(`📊 Testing with ${testDrugs.length} drugs (should process ALL of them):`);
  testDrugs.forEach((drug, i) => {
    console.log(`  ${i + 1}. PMID: ${drug.pmid} - ${drug.drugName}`);
  });
  console.log('');

  try {
    const startTime = Date.now();
    
    console.log('🚀 Starting AI inference processing...');
    const result = await externalApiService.sendDrugData(
      testDrugs,
      { query: 'test', sponsor: 'TestSponsor', frequency: 'manual' },
      { 
        enableDetailedLogging: true,
        batchSize: 16, // Use higher batch size
        maxConcurrency: 16 // Use higher concurrency
      }
    );

    const endTime = Date.now();
    const duration = Math.round((endTime - startTime) / 1000);

    console.log('\n🎯 RESULTS:');
    console.log('='.repeat(30));
    console.log(`✅ Success: ${result.success}`);
    console.log(`📊 Total discovered: ${testDrugs.length}`);
    console.log(`✨ Successfully processed: ${result.processedCount || result.results?.length || 0}`);
    console.log(`❌ Failed: ${result.errors?.length || 0}`);
    console.log(`⏱️ Total time: ${duration} seconds`);
    console.log(`🚀 Processing method: ${result.processingMethod || 'batch'}`);
    
    if (result.performance) {
      console.log(`📈 Throughput: ${result.performance.throughputPerSecond || 'N/A'} drugs/sec`);
      console.log(`⚡ Average response time: ${result.performance.averageResponseTimeMs}ms`);
    }

    const processedCount = result.processedCount || result.results?.length || 0;
    
    if (processedCount >= testDrugs.length) {
      console.log('\n🎉 SUCCESS: All drugs were processed!');
      console.log(`✅ Fixed the 4-drug limitation - now processing ${processedCount}/${testDrugs.length} drugs`);
    } else {
      console.log('\n⚠️ PARTIAL SUCCESS:');
      console.log(`Only ${processedCount}/${testDrugs.length} drugs were processed`);
      if (processedCount > 4) {
        console.log('✅ Good news: More than 4 drugs were processed (improvement!)');
      } else {
        console.log('❌ Still limited to 4 drugs or fewer');
      }
    }

    if (result.errors && result.errors.length > 0) {
      console.log('\n❌ Errors encountered:');
      result.errors.forEach((error, i) => {
        console.log(`  ${i + 1}. PMID ${error.pmid}: ${error.error}`);
      });
    }

  } catch (error) {
    console.error('\n❌ Test failed with error:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run the test
testMoreThan4Drugs().then(() => {
  console.log('\n🏁 Test completed');
}).catch(error => {
  console.error('Test execution failed:', error);
});