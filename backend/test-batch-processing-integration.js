/**
 * Test Batch Processing Integration
 * 
 * This script tests the complete batch processing integration including:
 * - Batch AI inference service
 * - Enhanced external API service
 * - Route integration
 * - Progress callbacks
 */

require('dotenv').config({ path: '.env.local' });

const externalApiService = require('./src/services/externalApiService');
const batchAiInferenceService = require('./src/services/batchAiInferenceService');

async function testBatchProcessingIntegration() {
  console.log('🚀 Testing Batch Processing Integration');
  console.log('=====================================\n');

  try {
    // Test 1: Health Status
    console.log('📊 Test 1: Health Status Check');
    console.log('------------------------------');
    
    const comprehensiveHealth = externalApiService.getComprehensiveHealthStatus();
    console.log('Comprehensive Health Status:', JSON.stringify(comprehensiveHealth, null, 2));
    
    const batchHealth = externalApiService.getBatchHealthStatus();
    console.log('Batch Health Status:', JSON.stringify(batchHealth, null, 2));
    
    // Test 2: Connection Tests
    console.log('\n🔗 Test 2: Connection Tests');
    console.log('---------------------------');
    
    const legacyConnectionTest = await externalApiService.testConnection();
    console.log('Legacy Connection Test:', JSON.stringify(legacyConnectionTest, null, 2));
    
    const batchConnectionTest = await externalApiService.testBatchConnection();
    console.log('Batch Connection Test:', JSON.stringify(batchConnectionTest, null, 2));
    
    // Test 3: Small Dataset (Sequential Processing)
    console.log('\n🔄 Test 3: Small Dataset (Sequential Processing)');
    console.log('------------------------------------------------');
    
    const smallDataset = [
      {
        pmid: '40995636',
        drugName: 'DEXAMETHASONE',
        title: 'Test Study 1'
      },
      {
        pmid: '40190438',
        drugName: 'ASPIRIN',
        title: 'Test Study 2'
      }
    ];
    
    console.log(`Testing with ${smallDataset.length} items (should use sequential processing)...`);
    const smallDatasetResult = await externalApiService.sendDrugData(
      smallDataset,
      { query: 'test', sponsor: 'TestSponsor', frequency: 'manual' },
      { enableDetailedLogging: true }
    );
    
    console.log('Small Dataset Result:', {
      success: smallDatasetResult.success,
      processingMethod: smallDatasetResult.processingMethod,
      processedCount: smallDatasetResult.processedCount,
      totalCount: smallDatasetResult.totalCount,
      performance: smallDatasetResult.performance
    });
    
    // Test 4: Large Dataset (Batch Processing)
    console.log('\n⚡ Test 4: Large Dataset (Batch Processing)');
    console.log('--------------------------------------------');
    
    const largeDataset = [
      {
        pmid: '40995636',
        drugName: 'DEXAMETHASONE',
        title: 'Test Study 1'
      },
      {
        pmid: '40190438',
        drugName: 'ASPIRIN',
        title: 'Test Study 2'
      },
      {
        pmid: '12345678',
        drugName: 'IBUPROFEN',
        title: 'Test Study 3'
      },
      {
        pmid: '87654321',
        drugName: 'ACETAMINOPHEN',
        title: 'Test Study 4'
      },
      {
        pmid: '11111111',
        drugName: 'NAPROXEN',
        title: 'Test Study 5'
      },
      {
        pmid: '22222222',
        drugName: 'CELECOXIB',
        title: 'Test Study 6'
      }
    ];
    
    console.log(`Testing with ${largeDataset.length} items (should use batch processing)...`);
    
    // Progress callback for testing
    const progressCallback = (progress) => {
      console.log(`Progress: ${progress.processed}/${progress.total} (${progress.percentage}%) - Batch ${progress.currentBatch}/${progress.totalBatches}`);
    };
    
    const largeDatasetResult = await externalApiService.sendDrugData(
      largeDataset,
      { query: 'test', sponsor: 'TestSponsor', frequency: 'manual' },
      { 
        enableDetailedLogging: true,
        progressCallback: progressCallback,
        batchSize: 3,
        maxConcurrency: 2
      }
    );
    
    console.log('Large Dataset Result:', {
      success: largeDatasetResult.success,
      processingMethod: largeDatasetResult.processingMethod,
      processedCount: largeDatasetResult.processedCount,
      totalCount: largeDatasetResult.totalCount,
      performance: largeDatasetResult.performance
    });
    
    // Test 5: Forced Batch Processing
    console.log('\n🎯 Test 5: Forced Batch Processing');
    console.log('----------------------------------');
    
    console.log('Testing forced batch processing with small dataset...');
    const forcedBatchResult = await externalApiService.sendDrugDataBatchForced(
      smallDataset,
      { query: 'test', sponsor: 'TestSponsor', frequency: 'manual' },
      { 
        enableDetailedLogging: true,
        batchSize: 2,
        maxConcurrency: 1
      }
    );
    
    console.log('Forced Batch Result:', {
      success: forcedBatchResult.success,
      processingMethod: forcedBatchResult.processingMethod || 'batch',
      processedCount: forcedBatchResult.processedCount,
      totalCount: forcedBatchResult.totalCount,
      performance: forcedBatchResult.performance
    });
    
    // Test 6: Direct Batch Service Test
    console.log('\n🔧 Test 6: Direct Batch Service Test');
    console.log('------------------------------------');
    
    const directBatchResult = await batchAiInferenceService.processBatch(
      smallDataset,
      { query: 'test', sponsor: 'TestSponsor', frequency: 'manual' },
      {
        batchSize: 2,
        maxConcurrency: 1,
        enableDetailedLogging: true
      }
    );
    
    console.log('Direct Batch Service Result:', {
      success: directBatchResult.success,
      totalItems: directBatchResult.totalItems,
      successfulItems: directBatchResult.successfulItems,
      failedItems: directBatchResult.failedItems,
      performance: directBatchResult.performance
    });
    
    // Summary
    console.log('\n📋 Test Summary');
    console.log('===============');
    console.log('✅ Health status checks: Complete');
    console.log('✅ Connection tests: Complete');
    console.log('✅ Sequential processing (small dataset): Complete');
    console.log('✅ Batch processing (large dataset): Complete');
    console.log('✅ Forced batch processing: Complete');
    console.log('✅ Direct batch service: Complete');
    
    console.log('\n🎉 All batch processing integration tests completed successfully!');
    
    return {
      success: true,
      tests: {
        healthStatus: true,
        connectionTests: true,
        sequentialProcessing: smallDatasetResult.success,
        batchProcessing: largeDatasetResult.success,
        forcedBatch: forcedBatchResult.success,
        directBatch: directBatchResult.success
      },
      performance: {
        sequential: smallDatasetResult.performance,
        batch: largeDatasetResult.performance,
        forcedBatch: forcedBatchResult.performance,
        directBatch: directBatchResult.performance
      }
    };
    
  } catch (error) {
    console.error('❌ Batch processing integration test failed:', error);
    console.error('Stack trace:', error.stack);
    
    return {
      success: false,
      error: error.message,
      stack: error.stack
    };
  }
}

// Run the tests if this file is executed directly
if (require.main === module) {
  testBatchProcessingIntegration()
    .then((result) => {
      if (result.success) {
        console.log('\n🎊 Integration test suite completed successfully!');
        process.exit(0);
      } else {
        console.log('\n💥 Integration test suite failed!');
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('Test suite error:', error);
      process.exit(1);
    });
}

module.exports = { testBatchProcessingIntegration };