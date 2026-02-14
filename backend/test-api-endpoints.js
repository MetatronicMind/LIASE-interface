// Test API endpoints to check R3 form completion flow
// This script tests the API endpoints without requiring local database access

const API_BASE_URL = 'http://localhost:5000/api'; // Adjust if different

async function testR3CompletionFlow() {
  console.log('🔍 Testing R3 Form Completion Flow...\n');
  
  // You'll need to provide a valid token - check your browser's localStorage
  const token = 'YOUR_AUTH_TOKEN_HERE'; // Replace with actual token from browser
  
  if (token === 'YOUR_AUTH_TOKEN_HERE') {
    console.log('❌ Please update the token in this script with your actual auth token');
    console.log('   1. Open your browser and login to the app');
    console.log('   2. Open Developer Tools (F12)');
    console.log('   3. Go to Application tab > Local Storage');
    console.log('   4. Copy the value of "auth_token" or "token"');
    console.log('   5. Replace YOUR_AUTH_TOKEN_HERE in this script\n');
    return;
  }

  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  try {
    // Test 1: Get data entry studies (should show ICSR studies)
    console.log('1️⃣ Testing Data Entry endpoint...');
    const dataEntryResponse = await fetch(`${API_BASE_URL}/studies/data-entry`, {
      headers
    });
    
    if (dataEntryResponse.ok) {
      const dataEntryData = await dataEntryResponse.json();
      console.log(`   ✅ Found ${dataEntryData.data?.length || 0} ICSR studies for data entry`);
      
      if (dataEntryData.data?.length > 0) {
        const study = dataEntryData.data[0];
        console.log(`   📋 Sample study: PMID ${study.pmid}, Status: ${study.r3FormStatus}`);
        
        // Test 2: Check if this study can be completed
        if (study.r3FormStatus !== 'completed') {
          console.log('\n2️⃣ Testing R3 Form completion...');
          
          // Try to complete the R3 form
          const completeResponse = await fetch(`${API_BASE_URL}/studies/${study.id}/r3-form/complete`, {
            method: 'POST',
            headers
          });
          
          if (completeResponse.ok) {
            console.log('   ✅ R3 form completion endpoint works');
          } else {
            const error = await completeResponse.text();
            console.log(`   ❌ R3 form completion failed: ${error}`);
          }
        }
      }
    } else {
      console.log(`   ❌ Data entry endpoint failed: ${dataEntryResponse.status}`);
    }

    // Test 3: Get medical examiner studies (should show completed R3 forms)
    console.log('\n3️⃣ Testing Medical Examiner endpoint (Full Report data)...');
    const medicalExaminerResponse = await fetch(`${API_BASE_URL}/studies/medical-examiner`, {
      headers
    });
    
    if (medicalExaminerResponse.ok) {
      const medicalExaminerData = await medicalExaminerResponse.json();
      console.log(`   📊 Found ${medicalExaminerData.data?.length || 0} completed ICSR studies`);
      
      if (medicalExaminerData.data?.length === 0) {
        console.log('   ❌ This is why your Full Report page shows "none"!');
        console.log('   💡 The medical examiner endpoint only returns studies with:');
        console.log('      - userTag = "ICSR"');
        console.log('      - r3FormStatus = "completed"');
      } else {
        console.log('   ✅ Studies available for Full Report:');
        medicalExaminerData.data.forEach((study, index) => {
          console.log(`      ${index + 1}. PMID: ${study.pmid}, Title: ${study.title?.substring(0, 50)}...`);
        });
      }
    } else {
      console.log(`   ❌ Medical examiner endpoint failed: ${medicalExaminerResponse.status}`);
    }

    // Test 4: Check if there are any studies with incomplete R3 forms
    console.log('\n4️⃣ Checking for studies that need R3 completion...');
    const dataEntryResponse2 = await fetch(`${API_BASE_URL}/studies/data-entry`, {
      headers
    });
    
    if (dataEntryResponse2.ok) {
      const dataEntryData2 = await dataEntryResponse2.json();
      const incompleteStudies = dataEntryData2.data?.filter(s => s.r3FormStatus !== 'completed') || [];
      
      if (incompleteStudies.length > 0) {
        console.log(`   📝 Found ${incompleteStudies.length} studies that need R3 form completion:`);
        incompleteStudies.forEach((study, index) => {
          console.log(`      ${index + 1}. PMID: ${study.pmid}, Status: ${study.r3FormStatus || 'not_started'}`);
        });
        console.log('\n   💡 Complete these studies to see them in Full Report page');
      } else {
        console.log('   ✅ All ICSR studies have completed R3 forms');
      }
    }

  } catch (error) {
    console.error('❌ Error during API testing:', error.message);
    if (error.message.includes('fetch')) {
      console.log('   💡 Make sure the backend server is running on http://localhost:5000');
    }
  }
}

async function getTokenInstructions() {
  console.log('📋 How to get your auth token:');
  console.log('   1. Open your LIASE application in the browser');
  console.log('   2. Login with your credentials');
  console.log('   3. Press F12 to open Developer Tools');
  console.log('   4. Go to Application tab > Local Storage');
  console.log('   5. Look for "auth_token" or "token" key');
  console.log('   6. Copy the value and replace YOUR_AUTH_TOKEN_HERE in this script');
  console.log('   7. Run this script again\n');
}

// Check if running directly
if (require.main === module) {
  testR3CompletionFlow();
}

module.exports = { testR3CompletionFlow, getTokenInstructions };