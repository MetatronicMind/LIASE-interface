const { CosmosClient } = require('@azure/cosmos');

const endpoint = process.env.COSMOS_DB_ENDPOINT || 'https://localhost:8081';
const key = process.env.COSMOS_DB_KEY || 'C2y6yDjf5/R+ob0N8A7Cgv30VRDJIWEHLM+4QDU5DE2nQ9nDuVTqobD4b8mGGyPMbIZnqyMsEcaGQy67XIw/Jw==';
const dbId = 'liase-saas-local';
const containerId = 'studies'; // using studies for test

async function testVariations() {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    console.log('Connecting to Cosmos:', endpoint);
    const client = new CosmosClient({ endpoint, key });
    const container = client.database(dbId).container(containerId);

    // 1. Create a test item
    const newItem = {
        id: 'debug-opt-test-' + Date.now(),
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

    // Variation 1: ifMatch at top level (Standard v4)
    console.log('\n--- Variation 1: ifMatch at top level ---');
    try {
        const { resource } = await container.item(created.id, 'debug-org').replace(
            { ...updated, testValue: 'var1' },
            { ifMatch: oldEtag }
        );
        console.log('❌ Failed: Update succeeded despite mismatched ETag');
    } catch (e) {
        console.log('✅ Success: Update failed with code ' + e.code);
    }

    // Variation 2: accessCondition (v3 style)
    console.log('\n--- Variation 2: accessCondition (v3 style) ---');
    try {
        const { resource } = await container.item(created.id, 'debug-org').replace(
            { ...updated, testValue: 'var2' },
            { accessCondition: { type: 'IfMatch', condition: oldEtag } }
        );
        console.log('❌ Failed: Update succeeded despite mismatched ETag');
    } catch (e) {
        console.log('✅ Success: Update failed with code ' + e.code);
    }

    // Variation 3: ifMatch in requestOptions (Unlikely but checking)
    console.log('\n--- Variation 3: ifMatch in requestOptions ---');
    try {
        const { resource } = await container.item(created.id, 'debug-org').replace(
            { ...updated, testValue: 'var3' },
            { requestOptions: { ifMatch: oldEtag } }
        );
        console.log('❌ Failed: Update succeeded despite mismatched ETag');
    } catch (e) {
        console.log('✅ Success: Update failed with code ' + e.code);
    }


    // Cleanup
    await container.item(created.id, 'debug-org').delete();
}

testVariations().catch(console.error);
