// Demo: How to Create Custom Roles with Your New System
// This script shows you how to create custom roles from the frontend

console.log('=== Custom Role Creation Demo ===');

// Import the Role model to see available templates
const Role = require('./backend/src/models/Role');

// 1. Check available permission templates
console.log('\n📋 Available Permission Templates:');
const templates = Role.getPermissionTemplates();
Object.entries(templates).forEach(([key, template]) => {
  console.log(`  ${key}: ${template.displayName}`);
  console.log(`    - ${template.description}`);
});

// 2. Example: Create a TRIAGE role using triage_specialist template
console.log('\n🎯 Example 1: Creating a TRIAGE role');
const triageRole = Role.createCustomRole(
  'TRIAGE',                    // Custom name (what you want to call it)
  'Triage Team',               // Display name (what users see)
  'triage_specialist',         // Permission template to use
  'org_12345',                 // Your organization ID
  'Our custom triage team role' // Optional description
);

console.log('Created TRIAGE role:');
console.log('  ID:', triageRole.id);
console.log('  Name:', triageRole.name);
console.log('  Display Name:', triageRole.displayName);
console.log('  Can classify studies:', triageRole.hasPermission('triage', 'classify'));
console.log('  Can run manual drug tests:', triageRole.hasPermission('triage', 'manual_drug_test'));

// 3. Example: Create a QA_TEAM role using qa_reviewer template
console.log('\n✅ Example 2: Creating a QA_TEAM role');
const qaRole = Role.createCustomRole(
  'QA_TEAM',
  'Quality Assurance Team',
  'qa_reviewer',
  'org_12345',
  'Our custom QA team for approving classifications'
);

console.log('Created QA_TEAM role:');
console.log('  Can approve classifications:', qaRole.hasPermission('qa', 'approve'));
console.log('  Can reject classifications:', qaRole.hasPermission('qa', 'reject'));

// 4. Example: Create a DATA_ENTRY role using data_entry_specialist template
console.log('\n📝 Example 3: Creating a DATA_ENTRY role');
const dataEntryRole = Role.createCustomRole(
  'DATA_ENTRY',
  'Data Entry Specialists',
  'data_entry_specialist',
  'org_12345',
  'Our custom data entry team for R3 forms'
);

console.log('Created DATA_ENTRY role:');
console.log('  Can fill R3 forms:', dataEntryRole.hasPermission('data_entry', 'r3_form'));

// 5. Example: Create a MEDICAL_REVIEW role using medical_reviewer template
console.log('\n🩺 Example 4: Creating a MEDICAL_REVIEW role');
const medicalRole = Role.createCustomRole(
  'MEDICAL_REVIEW',
  'Medical Review Team',
  'medical_reviewer',
  'org_12345',
  'Our custom medical review team'
);

console.log('Created MEDICAL_REVIEW role:');
console.log('  Can comment on fields:', medicalRole.hasPermission('medical_examiner', 'comment_fields'));
console.log('  Can edit fields:', medicalRole.hasPermission('medical_examiner', 'edit_fields'));
console.log('  Can revoke studies:', medicalRole.hasPermission('medical_examiner', 'revoke_studies'));

console.log('\n🎉 All custom roles created successfully!');

// 6. Frontend API Usage Examples
console.log('\n🌐 Frontend API Usage Examples:');

console.log('\n// Get permission templates');
console.log(`fetch('/api/roles/templates', {
  headers: { 'Authorization': 'Bearer ' + token }
}).then(res => res.json());`);

console.log('\n// Create TRIAGE role via API');
console.log(`fetch('/api/roles/custom', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + token
  },
  body: JSON.stringify({
    customName: 'TRIAGE',
    customDisplayName: 'Triage Team',
    permissionTemplate: 'triage_specialist',
    organizationId: 'your-org-id',
    description: 'Our custom triage team'
  })
});`);

console.log('\n// Create QA_TEAM role via API');
console.log(`fetch('/api/roles/custom', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + token
  },
  body: JSON.stringify({
    customName: 'QA_TEAM',
    customDisplayName: 'Quality Assurance Team',
    permissionTemplate: 'qa_reviewer',
    organizationId: 'your-org-id',
    description: 'Our QA team for classification approval'
  })
});`);

console.log('\n✨ Benefits of this approach:');
console.log('  ✅ You can name roles whatever you want (TRIAGE, QA_TEAM, etc.)');
console.log('  ✅ Permissions are predefined and consistent');
console.log('  ✅ Easy to create from frontend with simple API calls');
console.log('  ✅ Built-in validation and error handling');
console.log('  ✅ Maintains audit trail of who created what');
console.log('  ✅ Follows your existing workflow requirements');

module.exports = {
  createTriageRole: (orgId, createdBy) => Role.createCustomRole('TRIAGE', 'Triage Team', 'triage_specialist', orgId, 'Custom triage role', createdBy),
  createQARole: (orgId, createdBy) => Role.createCustomRole('QA_TEAM', 'QA Team', 'qa_reviewer', orgId, 'Custom QA role', createdBy),
  createDataEntryRole: (orgId, createdBy) => Role.createCustomRole('DATA_ENTRY', 'Data Entry Team', 'data_entry_specialist', orgId, 'Custom data entry role', createdBy),
  createMedicalRole: (orgId, createdBy) => Role.createCustomRole('MEDICAL_REVIEW', 'Medical Review Team', 'medical_reviewer', orgId, 'Custom medical review role', createdBy)
};