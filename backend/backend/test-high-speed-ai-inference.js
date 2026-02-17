/**
 * High-Speed Concurrent AI Inference Test
 * 
 * This script tests maximum speed concurrent processing with all 4 endpoints
 * firing simultaneously for blazing fast AI inference processing.
 */

require('dotenv').config({ path: '.env.local' });

const ImprovedExternalApiService = require('./src/services/improvedExternalApiService');

async function highSpeedTest() {
  console.log('⚡ High-Speed Concurrent AI Inference Test');
  console.log('='.repeat(60));
  
  try {
    // Initialize the improved service
    const service = new ImprovedExternalApiService();
    
    console.log('🚀 Configuration for Maximum Speed:');
    console.log(`   - 4 concurrent requests (1 per endpoint)`);
    console.log(`   - 90-second timeout per request`);
    console.log(`   - 1-second interval between batches`);
    console.log(`   - Intelligent load balancing`);
    console.log('');
    
    // Test data - using multiple PMIDs for concurrent testing
    const testDrugs = [
      {
        pmid: '41024340',
        drugName: 'Dexamethasone',
        title: 'Simultaneous Quantification of Dexamethasone and Cortisol'
      },
      {
        pmid: '41022107',
        drugName: 'Dexamethasone',
        title: 'Overview of harziane diterpenoids'
      },
      {
        pmid: '41020002',
        drugName: 'Dexamethasone',
        title: 'Transfersomal delivery study'
      },
      {
        pmid: '41022524',
        drugName: 'Dexamethasone',
        title: 'Multidrug efflux pumps study'
      }
    ];
    
    const searchParams = {
      sponsor: 'Synthon',
      query: 'Dexamethasone'
    };
    
    console.log(`🧬 Starting high-speed test with ${testDrugs.length} drugs...`);
    console.log(`📦 Will process in batches of 4 (all endpoints simultaneously)`);
    console.log('');
    
    testDrugs.forEach((drug, i) => {
      console.log(`  ${i + 1}. PMID: ${drug.pmid} - ${drug.drugName}`);
    });
    console.log('');
    
    console.log('⏳ Expected processing time: ~60-90 seconds total (concurrent processing)');
    console.log('🔥 This should be MUCH faster than sequential processing!');
    console.log('');
    
    const startTime = Date.now();
    
    // Send the requests with maximum concurrency
    const result = await service.sendDrugData(testDrugs, searchParams);
    
    const totalTime = Date.now() - startTime;
    const averageTimePerDrug = totalTime / testDrugs.length;
    
    console.log('🎯 High-Speed Test Results:');
    console.log('='.repeat(50));
    console.log(`✅ Success: ${result.success}`);
    console.log(`📊 Processed: ${result.processedCount}/${result.totalCount}`);
    console.log(`⏱️ Total time: ${Math.round(totalTime/1000)}s`);
    console.log(`⚡ Average per drug: ${Math.round(averageTimePerDrug/1000)}s`);
    console.log(`🎲 Success rate: ${result.successRate}%`);
    console.log(`🚀 Processing method: ${result.processingMethod}`);
    console.log('');
    
    // Calculate speed improvement
    const sequentialEstimate = testDrugs.length * 60; // Assume 60s per drug sequentially
    const speedImprovement = sequentialEstimate / (totalTime / 1000);
    console.log(`📈 Speed Improvement:`);
    console.log(`   - Sequential estimate: ~${sequentialEstimate}s`);
    console.log(`   - Concurrent actual: ${Math.round(totalTime/1000)}s`);
    console.log(`   - Speed improvement: ${speedImprovement.toFixed(1)}x faster!`);
    console.log('');
    
    if (result.results && result.results.length > 0) {
      console.log('📝 Detailed Results:');
      result.results.forEach((res, i) => {
        console.log(`  ${i + 1}. PMID ${res.pmid}:`);
        console.log(`     - Endpoint: ${res.endpoint}`);
        console.log(`     - Response time: ${res.responseTime}ms`);
        console.log(`     - Attempt: ${res.attempt}`);
        console.log(`     - AI inference: ${!!res.aiInference ? 'YES' : 'NO'}`);
      });
      console.log('');
    }
    
    if (result.errors && result.errors.length > 0) {
      console.log('❌ Errors:');
      result.errors.forEach(error => {
        console.log(`   - PMID ${error.pmid}: ${error.error}`);
      });
      console.log('');
    }
    
    console.log('📈 Final Service Statistics:');
    const status = service.getStatus();
    console.log(`   - Healthy endpoints: ${status.healthyEndpoints}`);
    console.log(`   - Overall success rate: ${status.overallSuccessRate}`);
    console.log(`   - Total requests: ${status.totalRequests}`);
    console.log('');
    
    console.log('🏁 High-speed test completed successfully!');
    console.log('💡 This demonstrates the power of concurrent processing!');
    
  } catch (error) {
    console.error('💥 High-speed test failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  highSpeedTest()
    .then(() => {
      console.log('✅ High-speed test finished');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ High-speed test failed:', error);
      process.exit(1);
    });
}

module.exports = highSpeedTest;