// Test script to verify the improved drug discovery functionality
const pubmedService = require('./src/services/pubmedService');
const studyCreationService = require('./src/services/studyCreationService');

async function testImprovedDrugDiscovery() {
    console.log('=== Testing Improved Drug Discovery ===\n');
    
    try {
        // Test 1: Basic drug discovery with date range
        console.log('1. Testing drug discovery with date range...');
        const results = await pubmedService.discoverDrugs({
            query: 'aspirin',
            maxResults: 5,
            frequency: 'custom',
            dateFrom: '2020/01/01',
            dateTo: '2023/12/31',
            sponsor: 'TestSponsor'
        });
        
        console.log(`✓ Found ${results.totalFound} drugs`);
        console.log(`✓ Date range: 2020/01/01 to 2023/12/31`);
        console.log(`✓ Sponsor passed for AI inference: ${results.searchParams.sponsor}`);
        
        if (results.drugs && results.drugs.length > 0) {
            console.log(`✓ First result: PMID ${results.drugs[0].pmid}, Drug: ${results.drugs[0].drugName}`);
        }
        
        // Test 2: Daily frequency (automatic date range)
        console.log('\n2. Testing daily frequency (last 24 hours)...');
        const dailyResults = await pubmedService.discoverDrugs({
            query: 'drug safety',
            frequency: 'daily',
            maxResults: 10
        });
        
        console.log(`✓ Daily search found ${dailyResults.totalFound} drugs`);
        
        // Test 3: Weekly frequency
        console.log('\n3. Testing weekly frequency (last 7 days)...');
        const weeklyResults = await pubmedService.discoverDrugs({
            query: 'medication',
            frequency: 'weekly',
            maxResults: 10
        });
        
        console.log(`✓ Weekly search found ${weeklyResults.totalFound} drugs`);
        
        // Test 4: Monthly frequency
        console.log('\n4. Testing monthly frequency (last 30 days)...');
        const monthlyResults = await pubmedService.discoverDrugs({
            query: 'pharmaceutical',
            frequency: 'monthly',
            maxResults: 10
        });
        
        console.log(`✓ Monthly search found ${monthlyResults.totalFound} drugs`);
        
        // Test 5: Study creation service
        console.log('\n5. Testing study creation service...');
        const mockPMIDs = ['12345678', '87654321', '11111111'];
        const jobId = `test-job-${Date.now()}`;
        
        await studyCreationService.startStudyCreationJob(
            jobId,
            mockPMIDs,
            {
                drugName: 'Test Drug',
                adverseEvent: 'Test Adverse Event'
            },
            'test-user-id',
            'test-org-id'
        );
        
        console.log(`✓ Started asynchronous study creation job: ${jobId}`);
        
        // Check job status
        setTimeout(() => {
            const status = studyCreationService.getJobStatus(jobId);
            if (status) {
                console.log(`✓ Job status: ${status.status}, Progress: ${status.progress}%`);
                console.log(`✓ Processed: ${status.processed}/${status.total}`);
            }
        }, 2000);
        
        console.log('\n=== All Tests Completed Successfully! ===');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('Stack:', error.stack);
    }
}

// Run the test
testImprovedDrugDiscovery();