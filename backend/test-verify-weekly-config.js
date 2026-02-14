process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const cosmosService = require('./src/services/cosmosService');
const DrugSearchConfig = require('./src/models/DrugSearchConfig');
const drugSearchScheduler = require('./src/services/drugSearchScheduler');

// Mock or setup necessary services if needed. 
// Assuming environment variables are loaded or available via .env file or system.
require('dotenv').config({ path: '.env.local' });

async function runTest() {
    console.log('Starting Weekly Config Test...');

    // 1. Create or Find the Test Config
    const configName = "Weekly Test Config";
    const userId = "test-user-id";
    const organizationId = "test-org-id"; // We might need a valid org ID if cosmos enforces it, but usually query is by simple SQL first
    
    // We need to fetch existing configs to see if our test config exists
    const query = 'SELECT * FROM c WHERE c.name = @name';
    const parameters = [{ name: '@name', value: configName }];
    
    try {
        let existingConfigs = await cosmosService.queryItems('drugSearchConfigs', query, parameters);
        let config;

        if (existingConfigs.length > 0) {
            console.log('Found existing test config.');
            config = DrugSearchConfig.fromObject(existingConfigs[0]);
        } else {
            console.log('Creating new test config.');
            config = new DrugSearchConfig({
                name: configName,
                query: "Ibuprofen", // Simple query
                frequency: "weekly",
                isActive: true,
                organizationId: "test_org",
                userId: "test_user",
                sponsor: "TestSponsor",
                includeAdverseEvents: true,
                includeSafety: true
            });
            // We need to create it in DB
            await cosmosService.createItem('drugSearchConfigs', config.toObject());
            // Fetch it back to get the system generated attributes correctly? No, toObject should be fine, but let's grab the ID.
            // Actually config.id is generated in constructor if missing.
        }

        // 2. Set nextRunAt to 3 PM IST today.
        const now = new Date();
        const runTime = new Date(now);
        runTime.setHours(15, 0, 0, 0); // Set to 15:00:00 Local Time (IST)
        
        // Safety check: if 3 PM has already passed today, set for tomorrow? 
        // Or assume user knows what they are doing. The user said "set the time to be at 3 PM IST".
        // If it's already passed (e.g. 4 PM), setting it to 3 PM today makes it "due" immediately.
        
        config.frequency = 'weekly';
        config.isActive = true;
        config.nextRunAt = runTime.toISOString();
        
        console.log(`Setting nextRunAt to: ${config.nextRunAt} (Local: ${runTime.toString()})`);
        
        await cosmosService.updateItem('drugSearchConfigs', config.id, config.toObject());
        console.log('Config updated in database.');

        // 3. Initiate Check
        // The scheduler is a singleton instance
        const scheduler = drugSearchScheduler;
        
        console.log('Starting monitoring loop (checking every 30 seconds)...');
        console.log('The scheduler logic will be triggered manually every 30 seconds to simulate time passing/checks.');

        let checks = 0;
        const maxChecks = 120; // Run for ~60 minutes to accommodate waiting until 3 PM

        const interval = setInterval(async () => {
            checks++;
            console.log(`\n--- Check #${checks} at ${new Date().toISOString()} ---`);
            
            // We call runScheduledSearches logic manually. 
            // Warning: The real runScheduledSearches implementation fetches configs from DB.
            // so we rely on the DB state.
            
            await scheduler.runScheduledSearches();
            
            // Check if the config was updated (nextRunAt should be pushed forward if it ran)
            const updatedConfigs = await cosmosService.queryItems('drugSearchConfigs', query, parameters);
            if (updatedConfigs.length > 0) {
                const updatedConfig = DrugSearchConfig.fromObject(updatedConfigs[0]);
                console.log(`Config status: nextRunAt is ${updatedConfig.nextRunAt}`);
                
                // If nextRunAt is pushed significantly into the future (e.g. > 6 days), it ran.
                const nextRunDate = new Date(updatedConfig.nextRunAt);
                const diffDays = (nextRunDate - new Date()) / (1000 * 60 * 60 * 24);
                
                if (diffDays > 6) {
                    console.log('SUCCESS: The weekly config ran and nextRunAt was updated to next week!');
                    clearInterval(interval);
                    process.exit(0);
                } else {
                     console.log('Config has not run yet (or nextRunAt is not updated to next week).');
                }
            }
            
            if (checks >= maxChecks) {
                console.log('Timeout: Test finished without confirming run.');
                clearInterval(interval);
                process.exit(1);
            }

        }, 30 * 1000); // Check every 30 seconds

    } catch (error) {
        console.error('Error during test:', error);
    }
}

runTest();
