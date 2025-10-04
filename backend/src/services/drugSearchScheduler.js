const cron = require('node-cron');
const cosmosService = require('./cosmosService');
const pubmedService = require('./pubmedService');
const externalApiService = require('./externalApiService');
const DrugSearchConfig = require('../models/DrugSearchConfig');
const Study = require('../models/Study');

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

          // Filter out drugs with PMIDs that already exist in the database
          let filteredDrugs = [];
          if (results.drugs && results.drugs.length > 0) {
            console.log(`🔍 Checking ${results.drugs.length} drugs for existing PMIDs in database`);
            
            for (const drug of results.drugs) {
              if (!drug.pmid) {
                console.log(`Skipping drug without PMID: ${drug.drugName || 'Unknown'}`);
                continue;
              }

              // Check if study with this PMID already exists
              const existingStudies = await cosmosService.queryItems('studies', 
                'SELECT * FROM c WHERE c.pmid = @pmid AND c.organizationId = @orgId',
                [
                  { name: '@pmid', value: drug.pmid },
                  { name: '@orgId', value: config.organizationId }
                ]
              );

              if (existingStudies.length > 0) {
                console.log(`⏭️ Skipping duplicate PMID: ${drug.pmid} - already exists in database`);
              } else {
                filteredDrugs.push(drug);
                console.log(`✅ PMID ${drug.pmid} is new, will process`);
              }
            }
            
            console.log(`📊 Filtered results: ${filteredDrugs.length}/${results.drugs.length} new drugs (${results.drugs.length - filteredDrugs.length} duplicates skipped)`);
          }

          // Send to external API if configured and we have new drugs
          let externalApiSuccess = null;
          let studiesCreated = 0;
          
          if (config.sendToExternalApi && filteredDrugs.length > 0) {
            try {
              console.log(`📤 Sending ${filteredDrugs.length} NEW results to external API for ${config.name}`);
              const apiResults = await externalApiService.sendDrugData(filteredDrugs, {
                query: config.query,
                sponsor: config.sponsor,
                frequency: config.frequency,
                configId: config.id,
                configName: config.name
              });
              
              externalApiSuccess = true;
              console.log(`✅ External API call successful for ${config.name}`);

              // Create studies from AI inference results (if any)
              if (apiResults && apiResults.results && apiResults.results.length > 0) {
                console.log(`🔄 Creating ${apiResults.results.length} studies from AI inference results`);
                
                for (const aiResult of apiResults.results) {
                  try {
                    if (!aiResult.pmid || !aiResult.aiInference) {
                      console.log(`Skipping result without PMID or AI inference data`);
                      continue;
                    }

                    // Check if study already exists
                    const existingStudies = await cosmosService.queryItems('studies', 
                      'SELECT * FROM c WHERE c.pmid = @pmid AND c.organizationId = @orgId',
                      [
                        { name: '@pmid', value: aiResult.pmid },
                        { name: '@orgId', value: config.organizationId }
                      ]
                    );

                    if (existingStudies.length > 0) {
                      console.log(`Skipping duplicate PMID: ${aiResult.pmid} - already exists in database`);
                      continue;
                    }

                    console.log(`Creating new study for PMID: ${aiResult.pmid}`);

                    // Handle different result formats from different API services
                    const originalDrug = aiResult.originalDrug || aiResult.originalItem || {};

                    // Create study from AI inference data
                    const study = Study.fromAIInference(
                      aiResult.aiInference,
                      originalDrug,
                      config.organizationId,
                      config.userId
                    );

                    // Update status based on ICSR classification or confirmed potential ICSR
                    if (study.icsrClassification || study.confirmedPotentialICSR) {
                      study.status = 'Study in Process';
                      console.log(`Setting status to 'Study in Process' for PMID ${aiResult.pmid} due to ICSR classification`);
                    }

                    // Store study in database
                    const createdStudy = await cosmosService.createItem('studies', study.toJSON());
                    studiesCreated++;
                    console.log(`✅ Successfully created study in database for PMID: ${aiResult.pmid}, ID: ${createdStudy.id} with status: ${createdStudy.status}`);

                  } catch (studyError) {
                    console.error(`❌ Error creating study for PMID ${aiResult.pmid}:`, studyError);
                    // Continue with other studies
                  }
                }

                console.log(`📚 Created ${studiesCreated} studies from scheduled search for ${config.name}`);
              }
              
            } catch (error) {
              console.error(`❌ External API call failed for ${config.name}:`, error);
              externalApiSuccess = false;
            }
          } else if (config.sendToExternalApi && results.drugs && results.drugs.length > 0 && filteredDrugs.length === 0) {
            console.log(`⏭️ All ${results.drugs.length} drugs are duplicates - skipping external API call for ${config.name}`);
            externalApiSuccess = true; // Consider this successful since no processing was needed
          } else if (config.sendToExternalApi) {
            console.log(`ℹ️ No drugs found to send to external API for ${config.name}`);
            externalApiSuccess = true; // No drugs to process is also considered successful
          }

          // Update the configuration with run stats
          config.updateAfterRun(results.totalFound, externalApiSuccess);
          await cosmosService.updateItem('drugSearchConfigs', config.id, config.organizationId, config.toObject());

          console.log(`✅ Successfully completed search for ${config.name}`);
          console.log(`   📊 Found: ${results.totalFound} total, ${filteredDrugs ? filteredDrugs.length : 0} new, ${studiesCreated} studies created`);
          console.log(`   ⏰ Next run: ${config.nextRunAt}`);
          totalSuccess++;

        } catch (error) {
          console.error(`❌ Error processing config ${configData.id}:`, error);
          totalErrors++;
          
          // Still try to update the config to record the failure
          try {
            const config = DrugSearchConfig.fromObject(configData);
            config.updateAfterRun(0, false); // Record failed run
            await cosmosService.updateItem('drugSearchConfigs', config.id, config.organizationId, config.toObject());
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