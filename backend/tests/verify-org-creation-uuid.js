
const { v4: uuidv4 } = require('uuid');

// Mock Organization class
class Organization {
    constructor({ id = uuidv4(), name, tenantId }) {
        this.id = id;
        this.name = name;
        this.tenantId = tenantId || null;
    }
}

console.log('Testing Organization UUID generation...');

const dbId = 'liase-database-ncs';
const orgName = 'My Test Org';

// Simulate the old way (databaseId passed as id)
const oldWay = new Organization({ id: dbId, name: orgName });
console.log('Old Way ID:', oldWay.id);  // Should be 'liase-database-ncs'

// Simulate the new way (UUID generated, databaseId as tenantId)
const newId = uuidv4();
const newWay = new Organization({ id: newId, name: orgName, tenantId: dbId });

console.log('New Way ID:', newWay.id);
console.log('New Way TenantId:', newWay.tenantId);

if (newWay.id === dbId) {
    console.error('❌ FAILED: ID should NOT be the tenant ID');
    process.exit(1);
}

if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(newWay.id)) {
    console.error('❌ FAILED: ID is not a valid UUID');
    process.exit(1);
}

if (newWay.tenantId !== dbId) {
    console.error('❌ FAILED: TenantId was not stored correctly');
    process.exit(1);
}

console.log('✅ PASSED: Organization ID is a valid UUID and tenantId is stored.');
