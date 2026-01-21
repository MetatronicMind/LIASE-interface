/**
 * Test Enhanced Archival with Complete Workflow Data
 * This tests the comprehensive PDF and CSV generation
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:8000';
const STUDY_PMID = '40868337'; // The study we archived before

// You need to get a valid admin token
// Login first, then paste the token here
const ADMIN_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI4ZWNmZWZkOS0yY2JlLTRmZmQtODA0MC02NGJmNmM4NzVlODQiLCJvcmdhbml6YXRpb25JZCI6Ijk0YjdlMTA2LTFlODYtNDgwNS05NzI1LTViZGVjNGE0Mzc1ZiIsInJvbGUiOiJBZG1pbiIsImlhdCI6MTc2NDY5MTI3MywiZXhwIjoxNzY0Nzc3NjczfQ.ZqCtwGyWp5KzS6N2eEiDnSQIdS0iQOCOR9TW1ZwR2PI';

async function testEnhancedArchival() {
  console.log('🧪 Testing Enhanced Archival System\n');

  try {
    // Step 1: Check archival configuration
    console.log('1️⃣ Checking archival configuration...');
    const configResponse = await axios.get(`${API_BASE_URL}/api/archival/config`, {
      headers: { Authorization: `Bearer ${ADMIN_TOKEN}` }
    });
    
    const config = configResponse.data;
    console.log('📋 Current Configuration:');
    console.log(`   - Delete from CosmosDB: ${config.dataRetention?.deleteFromCosmosDB}`);
    console.log(`   - Create Backup: ${config.dataRetention?.createBackupBeforeDelete}`);
    console.log(`   - Include Audit Trail: ${config.fileGeneration?.includeAuditTrail}`);
    console.log(`   - Email Enabled: ${config.notifications?.email?.enabled}`);
    console.log(`   - Google Drive Enabled: ${config.notifications?.googleDrive?.enabled}\n`);

    // Step 2: Check if deletion is disabled
    if (!config.dataRetention?.deleteFromCosmosDB) {
      console.log('⚠️  Database deletion is DISABLED in settings');
      console.log('   This is why the study is not being deleted.\n');
      console.log('   To enable deletion:');
      console.log('   1. Go to Settings > Archival Settings');
      console.log('   2. Find "Data Retention" section');
      console.log('   3. Toggle "Delete from CosmosDB" to ON');
      console.log('   4. Save settings\n');
    }

    // Step 3: Archive the study again with enhanced report
    console.log('2️⃣ Archiving study with enhanced PDF/CSV...');
    console.log(`   Study PMID: ${STUDY_PMID}\n`);
    
    const archiveResponse = await axios.post(
      `${API_BASE_URL}/api/archival/archive-study/${STUDY_PMID}`,
      {},
      {
        headers: { Authorization: `Bearer ${ADMIN_TOKEN}` }
      }
    );

    console.log('✅ Archival completed!');
    console.log('📊 Results:');
    console.log(JSON.stringify(archiveResponse.data, null, 2));
    console.log('\n');

    // Step 4: Get archival records
    console.log('3️⃣ Retrieving archival records...');
    const recordsResponse = await axios.get(`${API_BASE_URL}/api/archival/records`, {
      headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
      params: { limit: 5 }
    });

    console.log(`📁 Found ${recordsResponse.data.records.length} recent records`);
    recordsResponse.data.records.forEach((record, index) => {
      console.log(`\n   Record ${index + 1}:`);
      console.log(`   - Study: ${record.studyTitle?.substring(0, 60)}...`);
      console.log(`   - Status: ${record.status}`);
      console.log(`   - PDF: ${record.files?.pdf?.generated ? '✓ Generated' : '✗ Failed'}`);
      console.log(`   - CSV: ${record.files?.csv?.generated ? '✓ Generated' : '✗ Failed'}`);
      console.log(`   - Email: ${record.notifications?.email?.sent ? '✓ Sent' : '✗ Not sent'}`);
      console.log(`   - Google Drive: ${record.notifications?.googleDrive?.uploaded ? '✓ Uploaded' : '✗ Failed'}`);
      console.log(`   - Backup: ${record.cleanup?.backupCreated ? '✓ Created' : '✗ Not created'}`);
      console.log(`   - Deleted: ${record.cleanup?.deletedFromCosmosDB ? '✓ Yes' : '✗ No'}`);
    });

    console.log('\n✅ Test completed successfully!');

  } catch (error) {
    console.error('\n❌ Test failed:');
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Message: ${error.response.data.message || error.response.data.error}`);
      console.error(`   Details:`, error.response.data);
    } else {
      console.error(`   ${error.message}`);
    }
  }
}

// Instructions
console.log('═════════════════════════════════════════════════════════════');
console.log('   ENHANCED ARCHIVAL TEST');
console.log('═════════════════════════════════════════════════════════════\n');
console.log('Before running this test:');
console.log('1. Make sure backend is running (npm start)');
console.log('2. Login as admin and get your token:');
console.log('   - Go to http://localhost:3000');
console.log('   - Login with admin credentials');
console.log('   - Open browser console (F12)');
console.log('   - Type: localStorage.getItem("auth_token")');
console.log('   - Copy the token\n');
console.log('3. Replace ADMIN_TOKEN in this file with your token\n');
console.log('4. Run: node test-enhanced-archival.js\n');
console.log('═════════════════════════════════════════════════════════════\n');

// Check if token is provided
if (ADMIN_TOKEN === 'YOUR_ADMIN_TOKEN_HERE') {
  console.log('⚠️  Please set ADMIN_TOKEN first!\n');
  console.log('Edit this file and replace YOUR_ADMIN_TOKEN_HERE with your actual token.\n');
  process.exit(1);
}

// Run the test
testEnhancedArchival();
