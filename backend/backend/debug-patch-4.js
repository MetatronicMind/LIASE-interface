const { CosmosClient } = require('@azure/cosmos');

const endpoint = process.env.COSMOS_DB_ENDPOINT || 'https://localhost:8081';
const key = process.env.COSMOS_DB_KEY || 'C2y6yDjf5/R+ob0N8A7Cgv30VRDJIWEHLM+4QDU5DE2nQ9nDuVTqobD4b8mGGyPMbIZnqyMsEcaGQy67XIw/Jw==';
const dbId = 'liase-saas-local';
const containerId = 'studies'; // using studies for test

async function testPatchAccessCondition() {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    console.log('Connecting to Cosmos:', endpoint);
    const client = new CosmosClient({ endpoint, key });
    const container = client.database(dbId).container(containerId);

    // 1. Create a test item
    const newItem = {
        id: 'debug-patch-ac-' + Date.now(),
        organizationId: 'debug-org',
        testValue: 'original',
        assignedTo: null
    };

    const { resource: created } = await container.items.create(newItem);
    console.log('Created ETag:', created._etag);

    // 2. Modify it
    created.testValue = 'modified';
    const { resource: updated } = await container.item(created.id, 'debug-org').replace(created);
    console.log('Updated ETag:', updated._etag);

    const oldEtag = created._etag;

    // Try PATCH with accessCondition
    console.log('\n--- PATCH with accessCondition ---');
    try {
        const operations = [{ op: 'set', path: '/testValue', value: 'patched' }];
        
        // Use accessCondition syntax which Worked for Replace
        const options = {
            accessCondition: { type: 'IfMatch', condition: oldEtag }
        };

        const { resource } = await container.item(created.id, 'debug-org').patch(
            operations,
            options
        );
        console.log('❌ Failed: Patch succeeded despite mismatched ETag');
    } catch (e) {
        if (e.code === 412) {
             console.log('✅ Success: Patch failed with code 412');
        } else {
             console.log('❓ Failed with unexpected code ' + e.code);
        }
    }

    // Cleanup
    await container.item(created.id, 'debug-org').delete();
}

testPatchAccessCondition().catch(console.error);
