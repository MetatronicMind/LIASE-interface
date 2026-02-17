/**
 * Test Archival Config Endpoint
 * Debug script to see what's happening with the API
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:8000';
const ADMIN_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI4ZWNmZWZkOS0yY2JlLTRmZmQtODA0MC02NGJmNmM4NzVlODQiLCJvcmdhbml6YXRpb25JZCI6Ijk0YjdlMTA2LTFlODYtNDgwNS05NzI1LTViZGVjNGE0Mzc1ZiIsInJvbGUiOiJBZG1pbiIsImlhdCI6MTc2NDY5MTI3MywiZXhwIjoxNzY0Nzc3NjczfQ.ZqCtwGyWp5KzS6N2eEiDnSQIdS0iQOCOR9TW1ZwR2PI';

async function testEndpoint() {
  console.log('🧪 Testing Archival Config Endpoint\n');

  try {
    // Test 1: Check if backend is running
    console.log('1️⃣ Testing backend connectivity...');
    try {
      const healthCheck = await axios.get(`${API_BASE_URL}/api/health`, { timeout: 3000 });
      console.log('✅ Backend is running');
    } catch (error) {
      console.log('❌ Backend is NOT running or /api/health endpoint missing');
      console.log('   Please start backend with: npm start');
      process.exit(1);
    }

    // Test 2: Get current config
    console.log('\n2️⃣ Fetching current archival configuration...');
    const getResponse = await axios.get(`${API_BASE_URL}/api/archival/config`, {
      headers: { Authorization: `Bearer ${ADMIN_TOKEN}` }
    });

    console.log('✅ Config retrieved successfully!');
    console.log('\n📋 Current Configuration:');
    console.log(JSON.stringify(getResponse.data, null, 2));

    // Test 3: Check if deleteFromCosmosDB exists
    console.log('\n3️⃣ Checking deleteFromCosmosDB setting...');
    if (getResponse.data.dataRetention) {
      console.log(`   deleteFromCosmosDB: ${getResponse.data.dataRetention.deleteFromCosmosDB}`);
      console.log(`   createBackupBeforeDelete: ${getResponse.data.dataRetention.createBackupBeforeDelete}`);
      console.log(`   retainAuditLogs: ${getResponse.data.dataRetention.retainAuditLogs}`);
    } else {
      console.log('   ⚠️ dataRetention section is missing!');
    }

    // Test 4: Try to update config
    console.log('\n4️⃣ Attempting to enable database deletion...');
    const updatedConfig = {
      ...getResponse.data,
      dataRetention: {
        ...(getResponse.data.dataRetention || {}),
        deleteFromCosmosDB: true,
        createBackupBeforeDelete: true,
        retainAuditLogs: true
      }
    };

    console.log('\n📝 Sending update request...');
    const updateResponse = await axios.post(
      `${API_BASE_URL}/api/archival/config`,
      updatedConfig,
      {
        headers: { 
          Authorization: `Bearer ${ADMIN_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ Update successful!');
    console.log('\n📋 Update Response:');
    console.log(JSON.stringify(updateResponse.data, null, 2));

    // Test 5: Verify the update
    console.log('\n5️⃣ Verifying the update...');
    const verifyResponse = await axios.get(`${API_BASE_URL}/api/archival/config`, {
      headers: { Authorization: `Bearer ${ADMIN_TOKEN}` }
    });

    console.log('✅ Verification successful!');
    console.log('\n📋 Updated Configuration:');
    console.log(`   deleteFromCosmosDB: ${verifyResponse.data.dataRetention?.deleteFromCosmosDB}`);
    console.log(`   createBackupBeforeDelete: ${verifyResponse.data.dataRetention?.createBackupBeforeDelete}`);
    console.log(`   retainAuditLogs: ${verifyResponse.data.dataRetention?.retainAuditLogs}`);

    console.log('\n✅ All tests passed! Database deletion is now enabled.');

  } catch (error) {
    console.error('\n❌ Test failed:');
    if (error.response) {
      console.error(`   Status: ${error.response.status} ${error.response.statusText}`);
      console.error(`   URL: ${error.config?.url}`);
      console.error(`   Response Data:`, error.response.data);
      if (error.response.status === 401) {
        console.error('\n   ⚠️ Token expired or invalid!');
        console.error('   Please get a new token from browser console:');
        console.error('   localStorage.getItem("auth_token")');
      }
    } else if (error.code === 'ECONNREFUSED') {
      console.error('   Connection refused - is the backend running?');
      console.error('   Start it with: npm start');
    } else {
      console.error(`   Error: ${error.message}`);
      if (error.stack) {
        console.error(`\n   Stack trace:`);
        console.error(error.stack);
      }
    }
    process.exit(1);
  }
}

// Run the test
testEndpoint();
