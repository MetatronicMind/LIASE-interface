/**
 * Test script for API failover and job tracking functionality
 */

const externalApiService = require('../src/services/externalApiService');
const jobTrackingService = require('../src/services/jobTrackingService');

async function testApiFailover() {
  console.log('=== Testing API Failover ===');
  
  // Test connection to all endpoints
  console.log('\n1. Testing endpoint health...');
  const healthStatus = externalApiService.getHealthStatus();
  console.log('Current health status:', JSON.stringify(healthStatus, null, 2));
  
  // Test connections
  console.log('\n2. Testing connections...');
  const connectionTest = await externalApiService.testConnection();
  console.log('Connection test results:', JSON.stringify(connectionTest, null, 2));
  
  // Test with sample data
  console.log('\n3. Testing with sample drug data...');
  const testDrugs = [
    {
      pmid: '12345678',
      title: 'Test Study on Drug Safety',
      drugName: 'TestDrug',
      authors: ['Test Author'],
      journal: 'Test Journal',
      publicationDate: '2023-01-01',
      abstract: 'This is a test abstract for testing purposes.'
    }
  ];
  
  try {
    const result = await externalApiService.sendDrugData(testDrugs, {
      query: 'TestDrug',
      sponsor: 'TestSponsor',
      frequency: 'manual'
    });
    
    console.log('API call result:', {
      success: result.success,
      processedCount: result.processedCount,
      totalCount: result.totalCount,
      hasResults: result.results && result.results.length > 0
    });
    
    if (result.results && result.results.length > 0) {
      console.log('First result sample:', {
        pmid: result.results[0].pmid,
        hasAiInference: !!result.results[0].aiInference
      });
    }
    
  } catch (error) {
    console.error('API call failed:', error.message);
  }
}

async function testJobTracking() {
  console.log('\n\n=== Testing Job Tracking ===');
  
  const testUserId = 'test-user-id';
  const testOrgId = 'test-org-id';
  
  try {
    // Create a test job
    console.log('\n1. Creating test job...');
    const job = await jobTrackingService.createJob(
      'test_discovery',
      testUserId,
      testOrgId,
      {
        totalSteps: 10,
        testParam: 'test-value'
      }
    );
    
    console.log('Created job:', {
      id: job.id,
      type: job.type,
      status: job.status,
      progress: job.progress
    });
    
    // Update job progress
    console.log('\n2. Updating job progress...');
    await jobTrackingService.updateJob(job.id, {
      progress: 50,
      currentStep: 5,
      message: 'Halfway complete...'
    });
    
    // Get job status
    console.log('\n3. Getting job status...');
    const updatedJob = await jobTrackingService.getJob(job.id);
    console.log('Updated job status:', {
      id: updatedJob.id,
      progress: updatedJob.progress,
      message: updatedJob.message,
      currentStep: updatedJob.currentStep
    });
    
    // Complete job
    console.log('\n4. Completing job...');
    await jobTrackingService.completeJob(job.id, {
      testResult: 'success',
      itemsProcessed: 100
    }, 'Test job completed successfully');
    
    // Get final status
    const completedJob = await jobTrackingService.getJob(job.id);
    console.log('Completed job status:', {
      id: completedJob.id,
      status: completedJob.status,
      progress: completedJob.progress,
      results: completedJob.results
    });
    
    console.log('\n✓ Job tracking test completed successfully!');
    
  } catch (error) {
    console.error('Job tracking test failed:', error.message);
  }
}

async function runTests() {
  console.log('Starting API Failover and Job Tracking Tests...');
  console.log('='.repeat(50));
  
  try {
    await testApiFailover();
    await testJobTracking();
    
    console.log('\n' + '='.repeat(50));
    console.log('✅ All tests completed!');
    
  } catch (error) {
    console.error('Test suite failed:', error);
  }
}

// Run the tests if this file is executed directly
if (require.main === module) {
  runTests();
}

module.exports = { testApiFailover, testJobTracking, runTests };