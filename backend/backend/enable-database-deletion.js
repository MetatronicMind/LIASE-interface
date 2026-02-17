/**
 * Enable Database Deletion in Archival Settings
 * This script helps configure the archival system to delete studies after archiving
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:8000';
const ADMIN_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI4ZWNmZWZkOS0yY2JlLTRmZmQtODA0MC02NGJmNmM4NzVlODQiLCJvcmdhbml6YXRpb25JZCI6Ijk0YjdlMTA2LTFlODYtNDgwNS05NzI1LTViZGVjNGE0Mzc1ZiIsInJvbGUiOiJBZG1pbiIsImlhdCI6MTc2NDY5MTI3MywiZXhwIjoxNzY0Nzc3NjczfQ.ZqCtwGyWp5KzS6N2eEiDnSQIdS0iQOCOR9TW1ZwR2PI'; // Replace with your admin token

async function enableDeletion() {
  console.log('🔧 Configuring Archival Settings for Database Deletion\n');

  try {
    // Step 1: Get current configuration
    console.log('1️⃣ Fetching current configuration...');
    const getResponse = await axios.get(`${API_BASE_URL}/api/archival/config`, {
      headers: { Authorization: `Bearer ${ADMIN_TOKEN}` }
    });

    const currentConfig = getResponse.data;
    console.log('✅ Current settings retrieved\n');

    // Step 2: Display current deletion settings
    console.log('📋 Current Database Deletion Settings:');
    console.log(`   - Delete from CosmosDB: ${currentConfig.dataRetention?.deleteFromCosmosDB}`);
    console.log(`   - Create Backup Before Delete: ${currentConfig.dataRetention?.createBackupBeforeDelete}`);
    console.log(`   - Retention Days: ${currentConfig.dataRetention?.retentionDays}\n`);

    // Step 3: Update configuration to enable deletion
    console.log('2️⃣ Enabling database deletion...');
    
    const updatedConfig = {
      ...currentConfig,
      dataRetention: {
        ...currentConfig.dataRetention,
        deleteFromCosmosDB: true,
        createBackupBeforeDelete: true // Always create backup before deleting
      }
    };

    const updateResponse = await axios.post(
      `${API_BASE_URL}/api/archival/config`,
      updatedConfig,
      {
        headers: { Authorization: `Bearer ${ADMIN_TOKEN}` }
      }
    );

    console.log('✅ Configuration updated successfully!\n');

    // Step 4: Verify the changes
    console.log('3️⃣ Verifying changes...');
    const verifyResponse = await axios.get(`${API_BASE_URL}/api/archival/config`, {
      headers: { Authorization: `Bearer ${ADMIN_TOKEN}` }
    });

    const verifiedConfig = verifyResponse.data;
    console.log('📋 Updated Database Deletion Settings:');
    console.log(`   - Delete from CosmosDB: ${verifiedConfig.dataRetention?.deleteFromCosmosDB} ✓`);
    console.log(`   - Create Backup Before Delete: ${verifiedConfig.dataRetention?.createBackupBeforeDelete} ✓`);
    console.log(`   - Retention Days: ${verifiedConfig.dataRetention?.retentionDays}\n`);

    console.log('═════════════════════════════════════════════════════════════');
    console.log('✅ Database deletion is now ENABLED!');
    console.log('═════════════════════════════════════════════════════════════\n');
    console.log('What happens now when you archive a study:');
    console.log('1. PDF and CSV files are generated');
    console.log('2. Files are uploaded to Google Drive (if configured)');
    console.log('3. Email notification is sent with attachments');
    console.log('4. A backup is created in the Archives container');
    console.log('5. The study is DELETED from the studies container ← NOW ENABLED\n');
    console.log('⚠️  IMPORTANT: The study will be permanently removed from');
    console.log('   the studies container, but a backup will be kept in');
    console.log('   the Archives container for reference.\n');

  } catch (error) {
    console.error('\n❌ Configuration update failed:');
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Message: ${error.response.data.message || error.response.data.error}`);
      console.error(`   Full error:`, error.response.data);
    } else {
      console.error(`   Error: ${error.message}`);
      console.error(`   Stack:`, error.stack);
    }
    process.exit(1);
  }
}

// Instructions
console.log('═════════════════════════════════════════════════════════════');
console.log('   ENABLE DATABASE DELETION');
console.log('═════════════════════════════════════════════════════════════\n');
console.log('⚠️  WARNING: This will enable automatic deletion of studies');
console.log('   from the database after archiving. Make sure you understand');
console.log('   the implications before proceeding.\n');
console.log('Before running:');
console.log('1. Backend must be running (npm start)');
console.log('2. Get your admin token:');
console.log('   - Login at http://localhost:3000');
console.log('   - Open browser console (F12)');
console.log('   - Type: localStorage.getItem("auth_token")');
console.log('   - Copy the token\n');
console.log('3. Replace ADMIN_TOKEN in this file\n');
console.log('4. Run: node enable-database-deletion.js\n');
console.log('═════════════════════════════════════════════════════════════\n');

// Check if token is provided
if (ADMIN_TOKEN === 'YOUR_ADMIN_TOKEN_HERE') {
  console.log('⚠️  Please set ADMIN_TOKEN first!\n');
  process.exit(1);
}

// Run the configuration
enableDeletion();
