const { CosmosClient } = require('@azure/cosmos');

// Load environment variables directly or hardcode for test
// Using values from .env.local usually
const endpoint = process.env.COSMOS_DB_ENDPOINT || 'https://localhost:8081';
const key = process.env.COSMOS_DB_KEY || 'C2y6yDjf5/R+ob0N8A7Cgv30VRDJIWEHLM+4QDU5DE2nQ9nDuVTqobD4b8mGGyPMbIZnqyMsEcaGQy67XIw/Jw==';
const dbId = 'liase-saas-local';
const containerId = 'studies'; // using studies for test

async function testPatchEtag() {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    console.log('Connecting to Cosmos:', endpoint);
    const client = new CosmosClient({ endpoint, key });
    const container = client.database(dbId).container(containerId);

    // 1. Create a test item
    const newItem = {
        id: 'debug-patch-test-' + Date.now(),
        organizationId: 'debug-org', // Required for partition key usually
        testValue: 'original',
        assignedTo: null
    };

    console.log('Creating item:', newItem.id);
    const { resource: created } = await container.items.create(newItem);
    console.log('Created. ETag:', created._etag);

    // 2. Modify it "behind the back"
    created.testValue = 'modified';
    const { resource: updated } = await container.item(created.id, 'debug-org').replace(created);
    console.log('Updated item. New ETag:', updated._etag);

    // 3. Try to PATCH using the OLD ETAG
    console.log('Attempting PATCH with OLD ETAG (should fail)...');
    try {
        const operations = [
            { op: 'set', path: '/testValue', value: 'patched' }
        ];
        
        // Try passing etag/ifMatch
        const options = {
            ifMatch: created._etag // OLD ETAG
        };

        const { resource: patched } = await container.item(created.id, 'debug-org').patch(operations, options);
        console.log('❌ FAILURE: Patch SUCCEEDED! ETag check was ignored.');
    } catch (err) {
        if (err.code === 412) {
            console.log('✅ SUCCESS: Patch failed with 412 Precondition Failed as expected.');
        } else {
            console.log('❓ ERROR: Failed with unexpected code:', err.code, err.message);
        }
    }

    // 4. Try REPLACE with OLD ETAG
    console.log('Attempting REPLACE with OLD ETAG (should fail)...');
    try {
        // We try to replace the CURRENT item (which has 'modified') with a new value
        // But we pass the OLD ETAG as condition
        const toReplace = { ...updated, testValue: 'replaced-attempt' };
        
        // For replace, options usually take accessCondition in older sdk or just ifMatch in newer
        // Let's try what we think works for v4
        const replaceOptions = {
            ifMatch: created._etag // OLD ETAG
        };

        await container.item(created.id, 'debug-org').replace(toReplace, replaceOptions);
        console.log('❌ FAILURE: Replace SUCCEEDED! ETag check was ignored.');
    } catch (err) {
         if (err.code === 412) {
            console.log('✅ SUCCESS: Replace failed with 412 Precondition Failed (etag check).');
        } else {
            console.log('❓ ERROR (Replace): Failed with unexpected code:', err.code, err.message);
        }
    }

    // Cleanup
    await container.item(created.id, 'debug-org').delete();
}

testPatchEtag().catch(console.error);
