// Test AI API connection
require('dotenv').config({ path: '.env.local' });

const externalApiService = require('./src/services/externalApiService');

async function testAIConnection() {
  try {
    console.log('🔍 Testing AI API connection...');
    
    const isConnected = await externalApiService.testConnection();
    
    if (isConnected) {
      console.log('✅ AI API is accessible!');
    } else {
      console.log('❌ AI API is not accessible.');
    }
    
    // Test with a specific PMID
    console.log('\n🧪 Testing with specific PMID...');
    const testResult = await externalApiService.sendDrugData([{
      pmid: '40995636',
      drugName: 'DEXAMETHASONE',
      title: 'Test Study'
    }], {
      sponsor: 'TestSponsor',
      query: 'DEXAMETHASONE'
    });
    
    console.log('Test result:', testResult);
    
  } catch (error) {
    console.error('❌ Error testing AI API:', error);
  }
}

testAIConnection();