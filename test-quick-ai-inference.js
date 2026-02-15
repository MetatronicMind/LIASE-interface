/**
 * Quick Test for Improved AI Inference Service
 * 
 * This script tests the improved AI inference service with a single request
 * to verify it's working correctly with your 45-60 second API responses.
 */

require('dotenv').config({ path: '.env.local' });

const ImprovedExternalApiService = require('./src/services/improvedExternalApiService');
const config = require('./ai-inference-config');

async function quickTest() {
  console.log('🧪 Quick Test: Improved AI Inference Service');
  console.log('='.repeat(60));
  
  try {
    // Initialize the improved service
    const service = new ImprovedExternalApiService();
    
    console.log('📋 Configuration:');
    console.log(`   - Request timeout: ${config.requestTimeout}ms`);
    console.log(`   - Max retries: ${config.maxRetries}`);
    console.log(`   - Circuit breaker threshold: ${config.circuitBreakerThreshold}`);
    console.log(`   - Max concurrent requests: ${config.maxConcurrentRequests} (OPTIMIZED FOR SPEED!)`);
    console.log(`   - Min request interval: ${config.minRequestInterval}ms`);
    console.log('');
    
    // Test data - using a real PMID from your test output
    const testDrugs = [
      {
        pmid: '41024340',
        drugName: 'Dexamethasone',
        title: 'Simultaneous Quantification of Dexamethasone and Cortisol for the Dexamethasone Suppression Test'
      }
    ];
    
    const searchParams = {
      sponsor: 'Synthon',
      query: 'Dexamethasone'
    };
    
    console.log('🚀 Starting test with single drug...');
    console.log(`   - PMID: ${testDrugs[0].pmid}`);
    console.log(`   - Drug: ${testDrugs[0].drugName}`);
    console.log(`   - Sponsor: ${searchParams.sponsor}`);
    console.log('');
    
    console.log('⏳ Expected response time: 45-60 seconds...');
    console.log('📊 This will test the full improved pipeline...');
    console.log('');
    
    const startTime = Date.now();
    
    // Send the request
    const result = await service.sendDrugData(testDrugs, searchParams);
    
    const totalTime = Date.now() - startTime;
    
    console.log('🎯 Test Results:');
    console.log('='.repeat(40));
    console.log(`✅ Success: ${result.success}`);
    console.log(`📊 Processed: ${result.processedCount}/${result.totalCount}`);
    console.log(`⏱️ Total time: ${Math.round(totalTime/1000)}s`);
    console.log(`🎲 Success rate: ${result.successRate}%`);
    console.log('');
    
    if (result.results && result.results.length > 0) {
      const firstResult = result.results[0];
      console.log('📝 Response Details:');
      console.log(`   - PMID: ${firstResult.pmid}`);
      console.log(`   - Endpoint: ${firstResult.endpoint}`);
      console.log(`   - Response time: ${firstResult.responseTime}ms`);
      console.log(`   - Attempt: ${firstResult.attempt}`);
      console.log(`   - AI inference received: ${!!firstResult.aiInference}`);
      
      if (firstResult.aiInference) {
        console.log(`   - AI response keys: ${Object.keys(firstResult.aiInference).join(', ')}`);
        
        // Show a preview of the AI response
        const aiPreview = JSON.stringify(firstResult.aiInference).substring(0, 200);
        console.log(`   - AI response preview: ${aiPreview}...`);
      }
    }
    
    if (result.errors && result.errors.length > 0) {
      console.log('');
      console.log('❌ Errors:');
      result.errors.forEach(error => {
        console.log(`   - PMID ${error.pmid}: ${error.error}`);
      });
    }
    
    console.log('');
    console.log('📈 Service Statistics:');
    const status = service.getStatus();
    console.log(`   - Healthy endpoints: ${status.healthyEndpoints}`);
    console.log(`   - Overall success rate: ${status.overallSuccessRate}`);
    console.log(`   - Total requests: ${status.totalRequests}`);
    
    console.log('');
    console.log('🏁 Test completed successfully!');
    
  } catch (error) {
    console.error('💥 Test failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  quickTest()
    .then(() => {
      console.log('✅ Quick test finished');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Quick test failed:', error);
      process.exit(1);
    });
}

module.exports = quickTest;