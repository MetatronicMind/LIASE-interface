const cron = require('node-cron');
const cosmosService = require('./cosmosService');
const pubmedService = require('./pubmedService');
const externalApiService = require('./externalApiService');
const emailSenderService = require('./emailSenderService');
const userService = require('./userService');
const DrugSearchConfig = require('../models/DrugSearchConfig');
const Study = require('../models/Study');

class DrugSearchScheduler {
  constructor() {
    this.isRunning = false;
    this.cronJob = null;
    this.runHistory = [];
  }

  // Start the scheduler - runs every 12 hours
  start() {
    if (this.cronJob) {
      console.log('Drug search scheduler is already running');
      return;
    }

    console.log('Starting drug search scheduler - TEST MODE (Every minute)');
    
    // TEST MODE: Run every minute so we can catch the 3 PM IST test case
    // Original: '0 0,12 * * *' (Every 12 hours)
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
                configName: config.name,
                organizationId: config.organizationId
              });
              
              externalApiSuccess = true;
              console.log(`✅ External API call successful for ${config.name}`);

              // Create a map of successful AI results by PMID
              const aiResultsMap = new Map();
              if (apiResults && apiResults.results && apiResults.results.length > 0) {
                apiResults.results.forEach(result => {
                  if (result.pmid && result.aiInference) {
                    aiResultsMap.set(result.pmid, result);
                  }
                });
                console.log(`🔄 Creating studies for ${filteredDrugs.length} drugs (${aiResultsMap.size} with AI inference)`);
              } else {
                console.log(`⚠ No AI inference results returned, will create studies with PubMed data only`);
              }
              
              // Initialize counters for email notification
              let countProbableICSRs = 0;
              let countProbableAOIs = 0;
              let countProbableICSRsOrAOIs = 0;
              let countNoCase = 0;
              let successfulPmids = [];

              // Process ALL filtered drugs and create studies (with or without AI inference)
              for (const drug of filteredDrugs) {
                try {
                  if (!drug.pmid) {
                    console.log(`Skipping drug without PMID: ${drug.drugName || 'Unknown'}`);
                    continue;
                  }

                  // Double-check for duplicates
                  const existingStudies = await cosmosService.queryItems('studies', 
                    'SELECT * FROM c WHERE c.pmid = @pmid AND c.organizationId = @orgId',
                    [
                      { name: '@pmid', value: drug.pmid },
                      { name: '@orgId', value: config.organizationId }
                    ]
                  );

                  if (existingStudies.length > 0) {
                    console.log(`Skipping duplicate PMID: ${drug.pmid}`);
                    continue;
                  }

                  console.log(`Creating study for PMID: ${drug.pmid}`);

                  // Check if we have AI inference for this drug
                  const aiResult = aiResultsMap.get(drug.pmid);

                  if (!aiResult || !aiResult.aiInference) {
                    throw new Error(`No AI inference data available for PMID: ${drug.pmid}`);
                  }

                  console.log(`✓ Creating study WITH AI inference for PMID: ${drug.pmid}`);
                  // Create study from AI inference data
                  const originalDrug = aiResult.originalDrug || aiResult.originalItem || drug;
                  const study = Study.fromAIInference(
                    aiResult.aiInference,
                    originalDrug,
                    config.organizationId,
                    config.userId
                  );

                  // Update status based on ICSR classification or confirmed potential ICSR
                  if (study.icsrClassification || study.confirmedPotentialICSR) {
                    study.status = 'Under Triage Review';
                    console.log(`Setting status to 'Under Triage Review' for PMID ${drug.pmid} due to ICSR classification`);
                  }

                  // Store study in database
                  const createdStudy = await cosmosService.createItem('studies', study.toJSON());
                  studiesCreated++;
                  successfulPmids.push(drug.pmid);
                  console.log(`✅ Successfully created study in database for PMID: ${drug.pmid}, ID: ${createdStudy.id} with status: ${createdStudy.status}`);

                  // Update counters for email notification
                  const isICSR = study.icsrClassification && (study.icsrClassification.toLowerCase().includes('yes') || study.icsrClassification.toLowerCase().includes('probable'));
                  const isAOI = study.aoiClassification && (study.aoiClassification.toLowerCase().includes('yes') || study.aoiClassification.toLowerCase().includes('probable'));
                  
                  if (isICSR) countProbableICSRs++;
                  if (isAOI) countProbableAOIs++;
                  if (isICSR || isAOI) countProbableICSRsOrAOIs++;
                  if (!isICSR && !isAOI) countNoCase++;

                } catch (studyError) {
                  console.error(`❌ Error creating study for PMID ${drug.pmid}:`, studyError);
                  throw studyError; // Fail fast - no fallback studies
                }
              }

              console.log(`📚 Created ${studiesCreated} studies from scheduled search for ${config.name}`);
              
              // Send email notification
              if (results.totalFound > 0) {
                try {
                  // Get organization name
                  const organization = await cosmosService.getItem('organizations', config.organizationId, config.organizationId);
                  const clientName = organization ? organization.name : 'Unknown Client';
                  
                  // Get user email
                  const user = await userService.getUserById(config.userId, config.organizationId);
                  const userEmail = user ? user.email : null;
                  
                  if (userEmail) {
                    const dateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-');
                    const subject = `${config.inn || config.query}_${clientName}_${dateStr}_Articles ready for review`;
                    
                    const emailBody = `
Please find attached list of PMIDS for any further information.

Please find below details of Literature articles Reviewed by LIASE tool.

INN Name: ${config.inn || config.query}

Total number of Literature hits in PubMed: ${results.totalFound}

Total number of Literature articles reviewed by LIASE: ${studiesCreated}

Number of Lit. articles categorised as “probable ICSRs/AOI” by LIASE: ${countProbableICSRsOrAOIs}

Number of Lit. articles categorised as “Probable ICSRs” by LIASE: ${countProbableICSRs}

Number of Lit. articles categorised as “Probable AOIs” by LIASE: ${countProbableAOIs}

Number of Lit. articles categorised as “No case” by LIASE: ${countNoCase}
                    `;
                    
                    // Create attachment with PMIDs
                    const pmidList = successfulPmids.join('\n');
                    const attachments = [{
                      filename: 'PMID_List.txt',
                      content: pmidList
                    }];

                    await emailSenderService.sendEmail(config.organizationId, {
                      to: [userEmail],
                      subject: subject,
                      bodyPlain: emailBody,
                      bodyHtml: emailBody.replace(/\n/g, '<br>'),
                      attachments: attachments,
                      priority: 'high'
                    });
                    console.log(`📧 Notification email sent to ${userEmail}`);
                  } else {
                    console.log(`⚠️ Could not find user email for notification: ${config.userId}`);
                  }
                } catch (emailError) {
                  console.error(`❌ Failed to send notification email:`, emailError);
                }
              }
              
            } catch (error) {
              console.error(`❌ External API call failed for ${config.name}:`, error);
              // FAIL THE ENTIRE JOB - DO NOT CREATE FALLBACK STUDIES
              throw new Error(`AI inference failed: ${error.message}. Cannot create studies without AI data.`);
            }
          } else if (config.sendToExternalApi && results.drugs && results.drugs.length > 0 && filteredDrugs.length === 0) {
            console.log(`⏭️ All ${results.drugs.length} drugs are duplicates - skipping external API call for ${config.name}`);
            externalApiSuccess = true; // Consider this successful since no processing was needed
          } else if (config.sendToExternalApi) {
            console.log(`ℹ️ No drugs found to send to external API for ${config.name}`);
            externalApiSuccess = true; // No drugs to process is also considered successful
          }

          // Update the configuration with run stats
          const pmids = results.drugs ? results.drugs.map(d => d.pmid).filter(p => p) : [];
          config.updateAfterRun(results.totalFound, externalApiSuccess, pmids);
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