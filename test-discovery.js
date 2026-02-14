// Simple test to check what the /discover endpoint returns
const fetch = require('node-fetch');

async function testDiscovery() {
  try {
    const response = await fetch('http://localhost:8000/api/drugs/discover?query=aspirin&maxResults=5', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token' // You might need a real token
      }
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', response.headers.raw());
    
    const data = await response.json();
    console.log('Response data:', JSON.stringify(data, null, 2));
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testDiscovery();