/**
 * Test script to verify R3 form data endpoint is working
 * Run this with: node test-r3-endpoint.js
 */

const axios = require('axios');

async function testR3Endpoint() {
  try {
    console.log('Testing R3 form data endpoint...\n');
    
    // Test parameters - replace with actual values from your database
    const testPMID = '35000000'; // Replace with a real PMID from your database
    const testDrugCode = 'Synthon';
    const testDrugName = 'Metformin'; // Replace with a real drug name
    
    // External API endpoint
    const externalApiUrl = `http://20.242.200.176/get_r3_fields/?PMID=${testPMID}&drug_code=${testDrugCode}&drugname=${testDrugName}`;
    
    console.log('1. Testing external API directly:');
    console.log('URL:', externalApiUrl);
    
    try {
      const externalResponse = await axios.get(externalApiUrl, { timeout: 10000 });
      console.log('✓ External API is responding');
      console.log('Response status:', externalResponse.status);
      console.log('Response data keys:', Object.keys(externalResponse.data || {}));
      console.log('Sample data:', JSON.stringify(externalResponse.data, null, 2).substring(0, 500));
    } catch (error) {
      console.error('✗ External API failed:', error.message);
      if (error.response) {
        console.error('Status:', error.response.status);
        console.error('Data:', error.response.data);
      }
    }
    
    console.log('\n2. Testing your backend endpoint:');
    console.log('Note: Make sure your backend server is running on http://localhost:5000');
    console.log('Note: You need a valid auth token to test this endpoint');
    console.log('\nTo test manually:');
    console.log(`GET http://localhost:5000/api/studies/{study-id}/r3-form-data?pmid=${testPMID}&drug_code=${testDrugCode}&drugname=${testDrugName}`);
    console.log('Headers: Authorization: Bearer {your-token}');
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

// Check if we have command line arguments
const args = process.argv.slice(2);
if (args.length >= 2) {
  const pmid = args[0];
  const drugname = args[1];
  const drugcode = args[2] || 'Synthon';
  
  console.log(`Testing with custom parameters: PMID=${pmid}, DrugName=${drugname}, DrugCode=${drugcode}\n`);
  
  const apiUrl = `http://20.242.200.176/get_r3_fields/?PMID=${pmid}&drug_code=${drugcode}&drugname=${drugname}`;
  
  axios.get(apiUrl, { timeout: 10000 })
    .then(response => {
      console.log('✓ External API is responding');
      console.log('Response status:', response.status);
      console.log('\nAll R3 fields returned:');
      console.log(JSON.stringify(response.data, null, 2));
    })
    .catch(error => {
      console.error('✗ External API failed:', error.message);
      if (error.response) {
        console.error('Status:', error.response.status);
        console.error('Data:', error.response.data);
      }
    });
} else {
  testR3Endpoint();
  console.log('\n\nTip: You can also run this script with custom parameters:');
  console.log('node test-r3-endpoint.js <PMID> <DrugName> [DrugCode]');
}
