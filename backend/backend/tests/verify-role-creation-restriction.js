
const assert = require('assert');

// Mock logic from roleRoutes.js
function checkRestriction(userRole, roleName, displayName) {
    if (userRole !== 'superadmin') {
        const restrictedNames = ['admin', 'superadmin', 'administrator', 'super administrator'];
        const normalizedName = roleName.toLowerCase();
        const normalizedDisplayName = displayName.toLowerCase();

        if (restrictedNames.some(name => normalizedName.includes(name) || normalizedDisplayName.includes(name))) {
            return false; // Forbidden
        }
    }
    return true; // Allowed
}

console.log('Testing role creation restriction...');

// Case 1: Non-superadmin trying to create 'administrator'
if (checkRestriction('admin', 'new_admin', 'Administrator')) {
    console.error('❌ FAILED: Non-superadmin should NOT be able to create "Administrator"');
    process.exit(1);
}
console.log('✅ PASSED: Blocked "Administrator" creation by non-superadmin');

// Case 2: Non-superadmin trying to create 'superadmin'
if (checkRestriction('admin', 'superadmin_fake', 'My Superadmin')) {
    console.error('❌ FAILED: Non-superadmin should NOT be able to create "Superadmin"');
    process.exit(1);
}
console.log('✅ PASSED: Blocked "Superadmin" creation by non-superadmin');

// Case 3: Superadmin trying to create 'administrator'
if (!checkRestriction('superadmin', 'new_admin', 'Administrator')) {
    console.error('❌ FAILED: Superadmin SHOULD be able to create "Administrator"');
    process.exit(1);
}
console.log('✅ PASSED: Allowed "Administrator" creation by superadmin');

// Case 4: Non-superadmin creating valid role
if (!checkRestriction('admin', 'researcher', 'Clinical Researcher')) {
    console.error('❌ FAILED: Non-superadmin SHOULD be able to create "Clinical Researcher"');
    process.exit(1);
}
console.log('✅ PASSED: Allowed valid role creation');

console.log('✅ ALL TESTS PASSED');
