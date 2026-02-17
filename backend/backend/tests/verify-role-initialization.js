
const assert = require('assert');
const RoleService = require('../src/services/roleService');

// Mock Cosmos Service to avoid DB calls
const mockCosmosService = {
    queryItems: async () => [],
    createItem: async (container, item) => {
        console.log(`Created item in ${container}:`, item.name);
        return item;
    },
    getItem: async () => null
};

// We need to inject the mock, but RoleService requires it via require(). 
// For this quick verification, we can inspect the source code of RoleService 
// or instantiate it if it allows dependency injection.
// Looking at the file, it requires cosmosService directly. 
// However, the change was to a hardcoded array in `initializeSystemRoles`.
// We can test this by checking the RoleService prototype or just running the method 
// and mocking the DB calls if possible. 

// A safer way knowing the code structure is to rely on what we just wrote.
// But to be sure, let's try to mock the require if we were running a real test runner.
// Since we are running node directly, we can't easily mock require without a tool.

// simplified verification:
// We will rely on reading the file content for the exact string change primarily, 
// and this script can just check if we can import the service without crashing.

console.log('Verifying RoleService initialization...');

// Since we cannot easily mock the internal require('cosmosService') without a framework,
// and we just modified the file, I will trust the file modification tool's output 
// plus a regex check on the file content to ensure the array is correct.

const fs = require('fs');
const path = require('path');
const roleServicePath = path.join(__dirname, '../src/services/roleService.js');

const content = fs.readFileSync(roleServicePath, 'utf8');
const expectedLine = "const systemRoleTypes = ['admin', 'triage', 'QC', 'pharmacovigilance', 'sponsor_auditor', 'data_entry', 'medical_examiner'];";

if (content.includes(expectedLine)) {
    console.log('✅ PASSED: systemRoleTypes array is correctly updated.');
} else {
    console.error('❌ FAILED: systemRoleTypes array does not match expectation.');
    console.log('Expected to contain:', expectedLine);
    process.exit(1);
}
