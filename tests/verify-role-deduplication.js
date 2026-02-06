
const assert = require('assert');

// Mock data with duplicates
const mockRoles = [
    { id: '1', name: 'admin', displayName: 'Administrator', isSystemRole: true },
    { id: '2', name: 'admin_custom', displayName: 'Administrator', isSystemRole: false },
    { id: '3', name: 'user', displayName: 'User', isSystemRole: true }
];

// Mock logic from userRoutes.js
function deduplicateRoles(availableRoles) {
    const uniqueRoles = [];
    const seenDisplayNames = new Set();

    availableRoles.forEach(role => {
        if (!seenDisplayNames.has(role.displayName)) {
            seenDisplayNames.add(role.displayName);
            uniqueRoles.push(role);
        }
    });

    return uniqueRoles;
}

console.log('Testing role deduplication...');

const uniqueRoles = deduplicateRoles(mockRoles);

console.log('Original roles count:', mockRoles.length);
console.log('Unique roles count:', uniqueRoles.length);
console.log('Unique roles:', JSON.stringify(uniqueRoles, null, 2));

if (uniqueRoles.length !== 2) {
    console.error('❌ FAILED: Start with 3 roles (2 duplicates), expected 2 unique roles.');
    process.exit(1);
}

if (uniqueRoles.find(r => r.id === '2')) {
    console.error('❌ FAILED: Expected to keep the first occurrence (id: 1), but found id: 2');
    process.exit(1);
}

console.log('✅ PASSED: Role deduplication works correctly.');
