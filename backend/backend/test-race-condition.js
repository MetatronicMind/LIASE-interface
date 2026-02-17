const axios = require('axios');

// CONFIGURATION
const API_URL = 'http://localhost:8000/api';
// Make sure these users actually exist in your LOCAL database!
const EMAIL_USER_1 = 'testadmin10012026@gmail.com'; 
const PASSWORD_USER_1 = 'Aa123!@#';
const EMAIL_USER_2 = 'triage@mmt.com'; 
const PASSWORD_USER_2 = 'Aa123!@#';
const EMAIL_USER_3 = 'qc@mmt.com'; 
const PASSWORD_USER_3 = 'Aa123!@#';
const EMAIL_USER_4 = 'mr@mmt.com'; 
const PASSWORD_USER_4 = 'Aa123!@#';
const EMAIL_USER_5 = 'dataentry@mmt.com'; 
const PASSWORD_USER_5 = 'Aa123!@#';

async function login(email, password) {
    try {
        const response = await axios.post(`${API_URL}/auth/login`, { email, password });
        return response.data.token;
    } catch (error) {
        console.error(`\n❌ Login failed for ${email}`);
        if (error.response) {
            // The request was made and the server responded with a status code
            // that falls out of the range of 2xx
            console.error('Status:', error.response.status);
            console.error('Response:', JSON.stringify(error.response.data, null, 2));
        } else if (error.request) {
            // The request was made but no response was received
            console.error('No response received (Server might be down or unreachable)');
        } else {
            // Something happened in setting up the request that triggered an Error
            console.error('Error Message:', error.message);
        }
        process.exit(1);
    }
}

async function allocateCase(token, userLabel) {
    try {
        const response = await axios.post(
            `${API_URL}/studies/allocate-case`,
            { studyId: '1' }, // Note: studyId checks might not be used if the backend picks ANY case
            { headers: { Authorization: `Bearer ${token}` } }
        );
        
        const caseData = response.data.case || response.data.data;
        const caseId = caseData?.id || caseData?.caseId;

        if (!caseId) {
            console.log(`⚠️ ${userLabel} SUCCEEDED but response format is unexpected:`, JSON.stringify(response.data));
            return null;
        }

        console.log(`✅ ${userLabel} SUCCEEDED. Case ID: ${caseId}`);
        return caseId;
    } catch (error) {
        // 409 (Conflict) or 412 (Precondition Failed) is acceptable for the 'loser' of the race
        const status = error.response?.status || 'Unknown';
        const msg = error.response?.data?.message || error.message;
        console.log(`⚠️  ${userLabel} did not get a case (Expected for race loser). Status: ${status} - ${msg}`);
        return null; // Return null to indicate no case assigned
    }
}

async function runRaceTest() {
    console.log('----------------------------------------');
    console.log('🏁 STARTING RACE CONDITION TEST (5 USERS)');
    console.log('----------------------------------------');

    console.log('1️⃣  Logging in User 1...');
    const token1 = await login(EMAIL_USER_1, PASSWORD_USER_1);
    
    console.log('2️⃣  Logging in User 2...');
    const token2 = await login(EMAIL_USER_2, PASSWORD_USER_2);

    console.log('3️⃣  Logging in User 3...');
    const token3 = await login(EMAIL_USER_3, PASSWORD_USER_3);

    console.log('4️⃣  Logging in User 4...');
    const token4 = await login(EMAIL_USER_4, PASSWORD_USER_4);

    console.log('5️⃣  Logging in User 5...');
    const token5 = await login(EMAIL_USER_5, PASSWORD_USER_5);

    console.log('🚀 Firing 5 simultaneous requests...');
    
    // We create the promises but don't await them immediately to fire them as close as possible
    const p1 = allocateCase(token1, 'User 1 (Admin)');
    const p2 = allocateCase(token2, 'User 2 (Triage)');
    const p3 = allocateCase(token3, 'User 3 (QC)');
    const p4 = allocateCase(token4, 'User 4 (MR)');
    const p5 = allocateCase(token5, 'User 5 (DataEntry)');

    // Wait for all to finish
    const results = await Promise.all([p1, p2, p3, p4, p5]);
    
    // Filter out nulls (failed allocations) to see successful case IDs
    const successfulAllocations = results.filter(id => id !== null);
    
    console.log('\n----------------------------------------');
    console.log('📊 RESULTS');
    console.log('----------------------------------------');
    
    console.log(`Total Requests: 5`);
    console.log(`Successful Allocations: ${successfulAllocations.length}`);
    console.log(`Allocated Case IDs:`, successfulAllocations);

    // Check for duplicates
    const uniqueCases = new Set(successfulAllocations);
    if (uniqueCases.size !== successfulAllocations.length) {
        console.error('🚨 FAILURE: Critical Bug! Duplicate case IDs assigned!');
        // Find duplicates
        const duplicates = successfulAllocations.filter((item, index) => successfulAllocations.indexOf(item) !== index);
        console.error('Duplicate Cases:', duplicates);
    } else {
        if (successfulAllocations.length > 0) {
            console.log('✅ SUCCESS: All assigned cases are unique.');
        } else {
            console.log('❓ INCONCLUSIVE: No cases were assigned (maybe no cases available?).');
        }
    }
    
    console.log('----------------------------------------');
}

runRaceTest();