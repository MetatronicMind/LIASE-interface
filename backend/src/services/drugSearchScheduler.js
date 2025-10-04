const cron = require('node-cron');
const cosmosService = require('./cosmosService');
const pubmedService = require('./pubmedService');
const externalApiService = require('./externalApiService');
const DrugSearchConfig = require('../models/DrugSearchConfig');

class DrugSearchScheduler {
  constructor() {
    this.isRunning = false;
    this.cronJob = null;
    this.runHistory = [];
  }

  // Start the scheduler - runs every minute for testing
  start() {
    if (this.cronJob) {
      console.log('Drug search scheduler is already running');
      return;
    }

    console.log('Starting drug search scheduler - will run every minute (FOR TESTING)');
    
    // FOR TESTING: Schedule to run every minute instead of every 12 hours
    // TODO: Change back to '0 0,12 * * *' after testing
    this.cronJob = cron.schedule('* * * * *', async () => {
      await this.runScheduledSearches();
    }, {
      scheduled: true,
      timezone: "UTC"
    });

    console.log('Drug search scheduler started successfully - checking every minute');
  }

  // Stop the scheduler
  stop() {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
      console.log('Drug search scheduler stopped');
    }
  }

  // Run all due scheduled searches
  async runScheduledSearches() {
    if (this.isRunning) {
      console.log('Scheduled search run already in progress, skipping...');
      return;
    }

    this.isRunning = true;
    const runStartTime = new Date();
    let totalProcessed = 0;
    let totalSuccess = 0;
    let totalErrors = 0;

    try {
      console.log(`=== CHECKING FOR DUE SEARCHES AT ${runStartTime.toISOString()} ===`);

      // Get all active drug search configurations
      const allConfigs = await cosmosService.queryItems('drugSearchConfigs', 
        'SELECT * FROM c WHERE c.isActive = @isActive',
        [{ name: '@isActive', value: true }]
      );

      console.log(`Found ${allConfigs.length} active drug search configurations`);

      // Check which ones are due
      let dueCount = 0;
      const now = new Date();

      // Process each configuration
      for (const configData of allConfigs) {
        try {
          const config = DrugSearchConfig.fromObject(configData);
          
          // Check if this config is due for a run
          const isDue = config.isDueForRun();
          const nextRun = config.nextRunAt ? new Date(config.nextRunAt) : null;
          
          if (!isDue) {
            console.log(`Config ${config.name} (${config.id}) not due for run yet. Next run: ${config.nextRunAt} (in ${nextRun ? Math.round((nextRun - now) / 60000) : 'unknown'} minutes)`);
            continue;
          }

          dueCount++;
          totalProcessed++;
          
          console.log(`🔥 RUNNING SCHEDULED SEARCH for: ${config.name} (${config.id})`);
          console.log(`   Query: ${config.query}, Sponsor: ${config.sponsor}, Frequency: ${config.frequency}`);
          console.log(`   Was due at: ${config.nextRunAt}`);

          // Calculate date range from config if it's custom, otherwise let service handle it
          const dateRange = config.frequency === 'custom' ? {
            dateFrom: config.dateFrom,
            dateTo: config.dateTo
          } : {};

          // Run the drug discovery with higher limits for scheduled searches
          const results = await pubmedService.discoverDrugs({
            query: config.query,
            sponsor: config.sponsor,
            frequency: config.frequency,
            maxResults: config.maxResults || 1000, // Default to higher limit for scheduled searches
            includeAdverseEvents: config.includeAdverseEvents,
            includeSafety: config.includeSafety,
            ...dateRange
          });

          console.log(`✅ Found ${results.totalFound} results for ${config.name}`);

          // Send to external API if configured
          let externalApiSuccess = null;
          if (config.sendToExternalApi && results.drugs && results.drugs.length > 0) {
            try {
              console.log(`📤 Sending ${results.drugs.length} results to external API for ${config.name}`);
              await externalApiService.sendDrugData(results.drugs, {
                query: config.query,
                sponsor: config.sponsor,
                frequency: config.frequency,
                configId: config.id,
                configName: config.name
              });
              externalApiSuccess = true;
              console.log(`✅ External API call successful for ${config.name}`);
            } catch (error) {
              console.error(`❌ External API call failed for ${config.name}:`, error);
              externalApiSuccess = false;
            }
          }

          // Update the configuration with run stats
          config.updateAfterRun(results.totalFound, externalApiSuccess);
          await cosmosService.updateItem('drugSearchConfigs', config.id, config.toObject(), config.organizationId);

          console.log(`✅ Successfully completed search for ${config.name}. Next run: ${config.nextRunAt}`);
          totalSuccess++;

        } catch (error) {
          console.error(`❌ Error processing config ${configData.id}:`, error);
          totalErrors++;
          
          // Still try to update the config to record the failure
          try {
            const config = DrugSearchConfig.fromObject(configData);
            config.updateAfterRun(0, false); // Record failed run
            await cosmosService.updateItem('drugSearchConfigs', config.id, config.toObject(), config.organizationId);
          } catch (updateError) {
            console.error(`Failed to update config after error:`, updateError);
          }
        }
      }

      const runEndTime = new Date();
      const runDuration = runEndTime - runStartTime;

      const runSummary = {
        startTime: runStartTime.toISOString(),
        endTime: runEndTime.toISOString(),
        duration: runDuration,
        totalProcessed,
        totalSuccess,
        totalErrors,
        totalConfigs: allConfigs.length,
        dueConfigs: dueCount
      };

      if (dueCount > 0) {
        console.log(`=== SCHEDULED DRUG SEARCH RUN COMPLETED ===`);
        console.log(`Duration: ${runDuration}ms`);
        console.log(`Total configs: ${allConfigs.length}`);
        console.log(`Due configs: ${dueCount}`);
        console.log(`Processed: ${totalProcessed}`);
        console.log(`Successful: ${totalSuccess}`);
        console.log(`Errors: ${totalErrors}`);
      } else {
        console.log(`=== No searches due at ${runStartTime.toISOString()} ===`);
      }

      // Store run history (keep last 50 runs)
      this.runHistory.unshift(runSummary);
      if (this.runHistory.length > 50) {
        this.runHistory = this.runHistory.slice(0, 50);
      }

      return runSummary;

    } catch (error) {
      console.error('❌ Critical error in scheduled drug search run:', error);
      totalErrors++;
    } finally {
      this.isRunning = false;
    }
  }

  // Manually trigger a scheduled run (for testing)
  async triggerRun() {
    console.log('Manually triggering scheduled drug search run...');
    return await this.runScheduledSearches();
  }

  // Get scheduler status
  getStatus() {
    return {
      isSchedulerRunning: !!this.cronJob,
      isCurrentlyRunning: this.isRunning,
      lastRun: this.runHistory.length > 0 ? this.runHistory[0] : null,
      totalRuns: this.runHistory.length,
      runHistory: this.runHistory.slice(0, 10) // Last 10 runs
    };
  }

  // Get due configurations (for debugging)
  async getDueConfigurations() {
    try {
      const allConfigs = await cosmosService.queryItems('drugSearchConfigs', 
        'SELECT * FROM c WHERE c.isActive = @isActive',
        [{ name: '@isActive', value: true }]
      );

      const dueConfigs = allConfigs.filter(configData => {
        const config = DrugSearchConfig.fromObject(configData);
        return config.isDueForRun();
      });

      return dueConfigs.map(config => ({
        id: config.id,
        name: config.name,
        query: config.query,
        sponsor: config.sponsor,
        frequency: config.frequency,
        lastRunAt: config.lastRunAt,
        nextRunAt: config.nextRunAt,
        isDue: DrugSearchConfig.fromObject(config).isDueForRun()
      }));
    } catch (error) {
      console.error('Error getting due configurations:', error);
      throw error;
    }
  }
}

// Create singleton instance
const drugSearchScheduler = new DrugSearchScheduler();

module.exports = drugSearchScheduler;