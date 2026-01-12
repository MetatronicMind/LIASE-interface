const axios = require('axios');
const { CosmosClient } = require('@azure/cosmos');

// CONFIGURATION
const API_URL = 'http://localhost:8000/api';
// Using the same users as test-race-condition.js
const USERS = [
    { email: 'testadmin10012026@gmail.com', password: 'Aa123!@#', label: 'User 1' },
    { email: 'triage@mmt.com', password: 'Aa123!@#', label: 'User 2' },
    { email: 'qc@mmt.com', password: 'Aa123!@#', label: 'User 3' },
    { email: 'mr@mmt.com', password: 'Aa123!@#', label: 'User 4' },
    { email: 'dataentry@mmt.com', password: 'Aa123!@#', label: 'User 5' }
];

async function login(user) {
    try {
        const response = await axios.post(`${API_URL}/auth/login`, { 
            email: user.email, 
            password: user.password 
        });
        return { ...user, token: response.data.token, id: response.data.user.id };
    } catch (error) {
        console.error(`❌ Login failed for ${user.email}:`, error.message);
        return null;
    }
}

async function releaseAllCases(token) {
    console.log('🧹 Releasing all cases first...');
    try {
        // We'll use a hack or just rely on the test users releasing their own batches
        // But for a true reset, we might need a direct DB release or admin endpoint.
        // Assuming /studies/release-batch works for the calling user.
        // For this test, we'll try to have each user release their cases first.
    } catch (e) {
        console.log('Release error', e.message);
    }
}

async function allocateBatch(user) {
    const start = Date.now();
    try {
        const response = await axios.post(
            `${API_URL}/studies/allocate-batch`,
            {}, 
            { headers: { Authorization: `Bearer ${user.token}` } }
        );
        const duration = Date.now() - start;
        
        if (response.data.success) {
            const cases = response.data.cases || [];
            console.log(`✅ ${user.label}: Allocated ${cases.length} cases in ${duration}ms`);
            return cases.map(c => ({ id: c.id, assignedTo: user.id }));
        }
    } catch (error) {
        const duration = Date.now() - start;
        if (error.response?.status === 412 || error.response?.status === 409) {
            console.log(`⚠️ ${user.label}: Race condition/Conflict handled correctly (${error.response.status}).`);
        } else {
            console.log(`❌ ${user.label}: Failed (${error.response?.status || error.message})`);
        }
    }
    return [];
}

async function runVerification() {
    console.log('🚀 Starting Aggressive Race Condition Verification');
    
    // 1. Log in all users
    console.log('🔑 Logging in users...');
    const loggedInUsers = [];
    for (const u of USERS) {
        const userWithToken = await login(u);
        if (userWithToken) loggedInUsers.push(userWithToken);
    }
    
    if (loggedInUsers.length < 2) {
        console.error('Not enough users to race.');
        return;
    }

    // 2. Release existing allocations for these users ensure clean slate
    console.log('🧹 Cleaning up existing allocations...');
    for (const user of loggedInUsers) {
        try {
            await axios.post(`${API_URL}/studies/release-batch`, {}, { 
                headers: { Authorization: `Bearer ${user.token}` } 
            });
        } catch (e) { /* ignore */ }
    }

    // 3. Fire simultaneous batch requests
    console.log(`\n🏁 Firing ${loggedInUsers.length} simultaneous BATCH requests...`);
    
    const promises = loggedInUsers.map(u => allocateBatch(u));
    const results = await Promise.all(promises);
    
    // 4. Analyze Results
    const allAllocations = results.flat();
    const caseMap = new Map();
    let overlaps = 0;

    console.log(`\n📊 Analysis of ${allAllocations.length} total allocations:`);

    allAllocations.forEach(alloc => {
        if (caseMap.has(alloc.id)) {
            const existingOwner = caseMap.get(alloc.id);
            if (existingOwner !== alloc.assignedTo) {
                console.error(`🚨 CRITICAL FAIL: Case ${alloc.id} assigned to BOTH ${existingOwner} and ${alloc.assignedTo}`);
                overlaps++;
            }
        } else {
            caseMap.set(alloc.id, alloc.assignedTo);
        }
    });

    if (overlaps === 0) {
        console.log('\n✅ SUCCESS: No overlaps detected. The ETag fix is working.');
        console.log(`   Total Unique Cases Allocated: ${caseMap.size}`);
    } else {
        console.log(`\n❌ FAILURE: ${overlaps} overlaps detected!`);
    }
}

runVerification();
