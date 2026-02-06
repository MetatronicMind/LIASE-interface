const cosmosService = require('./cosmosService');
const Study = require('../models/Study');
const pubmedService = require('./pubmedService');
const externalApiService = require('./externalApiService');
const notificationService = require('./notificationService');
const adminConfigService = require('./adminConfigService');

class StudyCreationService {
  constructor() {
    this.activeJobs = new Map(); // Track active study creation jobs
    this.jobResults = new Map(); // Store job results
  }

  /**
   * Start an asynchronous study creation job
   * @param {String} jobId - Unique identifier for this job
   * @param {Array} pmids - Array of PubMed IDs to process
   * @param {Object} params - Study creation parameters
   * @param {String} userId - User ID who initiated the job
   * @param {String} organizationId - Organization ID
   * @returns {String} Job ID for tracking
   */
  async startStudyCreationJob(jobId, pmids, params, userId, organizationId) {
    if (this.activeJobs.has(jobId)) {
      throw new Error('Job with this ID is already running');
    }

    const jobData = {
      jobId,
      status: 'started',
      total: pmids.length,
      processed: 0,
      created: 0,
      skipped: 0,
      errors: 0,
      startTime: new Date(),
      userId,
      organizationId,
      params
    };

    this.activeJobs.set(jobId, jobData);

    // Fetch workflow config to determine initial status
    let initialStatus = 'Pending Review';
    try {
      const workflowConfig = await adminConfigService.getConfig(organizationId, 'workflow');
      if (workflowConfig && workflowConfig.configData && workflowConfig.configData.stages) {
        const initialStage = workflowConfig.configData.stages.find(s => s.type === 'initial');
        if (initialStage) {
          initialStatus = initialStage.id;
        }
      }
    } catch (error) {
      console.warn('Failed to fetch workflow config, using default status:', error);
    }

    // Start processing asynchronously - don't await
    this.processStudiesAsync(jobId, pmids, params, userId, organizationId, initialStatus)
      .catch(error => {
        console.error(`Study creation job ${jobId} failed:`, error);
        jobData.status = 'failed';
        jobData.error = error.message;
        jobData.endTime = new Date();
      });

    return jobId;
  }

  /**
   * Process studies asynchronously in batches
   */
  async processStudiesAsync(jobId, pmids, params, userId, organizationId, initialStatus = 'Pending Review') {
    const jobData = this.activeJobs.get(jobId);
    const batchSize = 10; // Process 10 studies at a time
    const created = [];
    const skipped = [];
    const errors = [];

    try {
      jobData.status = 'processing';
      
      // Send initial notification
      notificationService.notifyInfo(
        `Started processing ${pmids.length} studies`, 
        { jobId, userId, total: pmids.length }
      );

      // Process PMIDs in batches to avoid overwhelming the system
      for (let i = 0; i < pmids.length; i += batchSize) {
        const batch = pmids.slice(i, i + batchSize);
        
        try {
          // Fetch article details for this batch
          const articles = await pubmedService.fetchDetails(batch);
          
          // Process each article in the batch
          for (const article of articles) {
            try {
              await this.processSingleStudy(article, params, userId, organizationId, created, skipped, initialStatus);
              jobData.processed++;
            } catch (error) {
              console.error(`Error processing study ${article.pmid}:`, error);
              errors.push({ pmid: article.pmid, error: error.message });
              jobData.errors++;
            }
            
            // Update job progress
            jobData.created = created.length;
            jobData.skipped = skipped.length;
            
            // Send progress notification
            notificationService.notifyProgress(
              `Processing studies: ${jobData.processed}/${jobData.total}`,
              {
                current: jobData.processed,
                total: jobData.total,
                percentage: Math.round((jobData.processed / jobData.total) * 100)
              },
              { jobId, userId, created: created.length, skipped: skipped.length, errors: errors.length }
            );
          }
        } catch (error) {
          console.error(`Error processing batch starting at ${i}:`, error);
          errors.push({ batch: i, error: error.message });
          jobData.errors++;
        }

        // Small delay between batches to prevent overwhelming the system
        if (i + batchSize < pmids.length) {
          await this.delay(500); // 500ms delay between batches
        }
      }

      // Job completed successfully
      jobData.status = 'completed';
      jobData.endTime = new Date();
      jobData.results = { created, skipped, errors };

      // Store results for later retrieval
      this.jobResults.set(jobId, {
        ...jobData,
        duration: jobData.endTime - jobData.startTime
      });

      console.log(`Study creation job ${jobId} completed: ${created.length} created, ${skipped.length} skipped, ${errors.length} errors`);
      
      // Send completion notification
      notificationService.notifySuccess(
        `Study creation completed: ${created.length} created, ${skipped.length} skipped`,
        { jobId, userId, created: created.length, skipped: skipped.length, errors: errors.length }
      );

    } catch (error) {
      jobData.status = 'failed';
      jobData.error = error.message;
      jobData.endTime = new Date();
      console.error(`Study creation job ${jobId} failed:`, error);
    } finally {
      // Clean up active job (keep in results for retrieval)
      this.activeJobs.delete(jobId);
    }
  }

  /**
   * Process a single study creation
   */
  async processSingleStudy(article, params, userId, organizationId, created, skipped, initialStatus = 'Pending Review') {
    if (!article?.pmid) {
      return;
    }

    const drugName = params.drugName || 'Unknown';
    const sponsor = params.sponsor || 'Unknown';

    // Check if study already exists (checking PMID + Drug + Sponsor combination)
    const existing = await cosmosService.queryItems(
      'studies',
      'SELECT VALUE COUNT(1) FROM c WHERE c.organizationId = @orgId AND c.pmid = @pmid AND c.drugName = @drugName AND c.sponsor = @sponsor',
      [
        { name: '@orgId', value: organizationId },
        { name: '@pmid', value: article.pmid },
        { name: '@drugName', value: drugName },
        { name: '@sponsor', value: sponsor }
      ]
    );

    const count = Array.isArray(existing) ? existing[0] : 0;
    if (count > 0) {
      skipped.push(article.pmid);
      return;
    }

    // Get AI inference data for this study
    let aiInferenceData = null;
    try {
      console.log(`Getting AI inference for PMID: ${article.pmid}`);
      const aiResponse = await externalApiService.sendDrugData([{
        pmid: article.pmid,
        drugName: params.drugName || 'Unknown',
        title: article.title
      }], {
        sponsor: params.sponsor || 'Unknown',
        query: params.drugName
      });

      if (aiResponse.success && aiResponse.results && aiResponse.results.length > 0) {
        aiInferenceData = aiResponse.results[0].aiInference;
        console.log(`AI inference successful for PMID: ${article.pmid}`);
      } else {
        console.warn(`No AI inference data received for PMID: ${article.pmid}`);
      }
    } catch (error) {
      console.error(`Error getting AI inference for PMID ${article.pmid}:`, error);
      // Continue without AI data
    }

    // Generate unique study IDs for each case
    // Format: first four letters of the INN_ first 4 letters of Client Name _ random number
    // Example: Dexa_Synt_38532 for INN = Dexamethosone , Client = Synt
    const innPrefix = (drugName || 'Unkn').substring(0, 4);
    const clientPrefix = (sponsor || 'Unkn').substring(0, 4);
    const randomNum = Math.floor(10000 + Math.random() * 90000); // 5 random digits
    
    const customId = `${innPrefix}_${clientPrefix}_${randomNum}`;

    // Map AI inference data to study fields
    const studyData = {
      id: customId,
      organizationId,
      pmid: article.pmid,
      title: article.title || 'Untitled',
      authors: article.authors || [],
      journal: article.journal || '',
      publicationDate: article.publicationDate || new Date().toISOString(),
      abstract: article.abstract || '',
      drugName: params.drugName || 'Unknown',
      adverseEvent: params.adverseEvent || 'Not specified',
      status: initialStatus,
      createdBy: userId,
      createdAt: new Date().toISOString()
    };

    // Add AI inference data if available
    if (aiInferenceData) {
      studyData.aiInferenceData = aiInferenceData; // Store raw AI response
      
      // Map specific AI inference fields
      studyData.doi = aiInferenceData.DOI;
      studyData.specialCase = aiInferenceData.special_case;
      studyData.countryOfFirstAuthor = aiInferenceData.Country_of_first_author;
      studyData.countryOfOccurrence = aiInferenceData.Country_of_occurrence;
      studyData.patientDetails = aiInferenceData.Patient_details;
      studyData.keyEvents = aiInferenceData.Key_events ? aiInferenceData.Key_events.split(',').map(e => e.trim()) : [];
      studyData.relevantDates = aiInferenceData.Relevant_dates;
      studyData.administeredDrugs = aiInferenceData.Administered_drugs ? aiInferenceData.Administered_drugs.split(',').map(d => d.trim()) : [];
      studyData.attributability = aiInferenceData.Attributability;
      studyData.drugEffect = aiInferenceData.Drug_effect;
      studyData.summary = aiInferenceData.Summary;
      studyData.identifiableHumanSubject = aiInferenceData.Identifiable_human_subject === 'Yes';
      studyData.textType = aiInferenceData.Text_type;
      studyData.authorPerspective = aiInferenceData.Author_perspective;
      studyData.confirmedPotentialICSR = aiInferenceData.Confirmed_potential_ICSR === 'Yes';
      studyData.icsrClassification = aiInferenceData.ICSR_classification;
      studyData.substanceGroup = aiInferenceData.Substance_group;
      studyData.vancouverCitation = aiInferenceData.Vancouver_citation;
      studyData.leadAuthor = aiInferenceData.Lead_author;
      studyData.serious = aiInferenceData.Serious === 'Yes';
      studyData.testSubject = aiInferenceData.Test_subject;
      studyData.aoiDrugEffect = aiInferenceData.AOI_drug_effect;
      studyData.approvedIndication = aiInferenceData.Approved_indication;
      studyData.aoiClassification = aiInferenceData.AOI_classification;
      studyData.justification = aiInferenceData.Justification;
      studyData.listedness = aiInferenceData.Listedness;
      studyData.seriousness = aiInferenceData.Seriousness;
      studyData.clientName = aiInferenceData.Client_name;
      studyData.sponsor = aiInferenceData.Sponsor || params.sponsor;
    }

    // Route study based on icsrClassification
    await this.routeStudyBasedOnClassification(studyData, organizationId);

    // Create new study with all data
    const study = new Study(studyData);

    await cosmosService.createItem('studies', study.toJSON());
    created.push(study.toJSON());
    
    console.log(`Study created successfully for PMID: ${article.pmid} with ${aiInferenceData ? 'AI inference data' : 'basic data only'}`);
  }

  /**
   * Route study based on icsrClassification
   * - Probable ICSR/AOI, Probable ICSR, Article requires manual review → ICSR Triage
   * - Probable AOI → Split based on allocation percentage
   * - No Case → Split based on allocation percentage
   */
  async routeStudyBasedOnClassification(studyData, organizationId) {
    const icsrClassification = (studyData.icsrClassification || '').toLowerCase();
    
    // Fetch allocation config
    let allocationConfig = null;
    try {
      const config = await adminConfigService.getConfig(organizationId, 'allocation');
      allocationConfig = config?.configData || {};
    } catch (error) {
      console.warn('Failed to fetch allocation config, using defaults:', error);
    }

    const aoiAllocationPercentage = allocationConfig?.aoiAllocationPercentage || 10;
    const noCaseAllocationPercentage = allocationConfig?.noCaseAllocationPercentage || 10;

    // ICSR Triage: Probable ICSR/AOI, Probable ICSR, or Article requires manual review
    if (
      icsrClassification.includes('probable icsr/aoi') ||
      icsrClassification.includes('probable icsr') ||
      icsrClassification.includes('article requires manual review')
    ) {
      // Keep in triage (default status)
      studyData.routingTarget = 'icsr_triage';
      console.log(`Study routed to ICSR Triage based on icsrClassification: ${studyData.icsrClassification}`);
      return;
    }

    // AOI Allocation/Assessment: Probable AOI
    if (icsrClassification.includes('probable aoi')) {
      const random = Math.random() * 100;
      if (random < aoiAllocationPercentage) {
        // Route to AOI Allocation
        studyData.status = 'aoi_allocation';
        studyData.routingTarget = 'aoi_allocation';
        console.log(`Study routed to AOI Allocation (${aoiAllocationPercentage}% sampling)`);
      } else {
        // Route directly to AOI Assessment
        studyData.status = 'aoi_assessment';
        studyData.routingTarget = 'aoi_assessment';
        studyData.userTag = 'AOI'; // Auto-tag as AOI
        studyData.qaApprovalStatus = 'not_applicable'; // Bypass QC
        console.log(`Study automatically routed to AOI Assessment`);
      }
      return;
    }

    // No Case Allocation/Assessment: No Case
    if (icsrClassification.includes('no case')) {
      const random = Math.random() * 100;
      if (random < noCaseAllocationPercentage) {
        // Route to No Case Allocation
        studyData.status = 'no_case_allocation';
        studyData.routingTarget = 'no_case_allocation';
        console.log(`Study routed to No Case Allocation (${noCaseAllocationPercentage}% sampling)`);
      } else {
        // Route directly to No Case Assessment (Reports)
        studyData.status = 'reporting';
        studyData.routingTarget = 'reporting';
        studyData.userTag = 'No Case'; // Auto-tag as No Case
        studyData.qaApprovalStatus = 'not_applicable'; // Bypass QC
        console.log(`Study automatically routed to No Case Assessment (Reports)`);
      }
      return;
    }

    // Default: Keep in triage for manual review
    studyData.routingTarget = 'icsr_triage';
    console.log(`Study routed to ICSR Triage (default route)`);
  }

  /**
   * Get job status and progress
   */
  getJobStatus(jobId) {
    const activeJob = this.activeJobs.get(jobId);
    const completedJob = this.jobResults.get(jobId);
    
    if (activeJob) {
      return {
        ...activeJob,
        isActive: true,
        progress: activeJob.total > 0 ? Math.round((activeJob.processed / activeJob.total) * 100) : 0
      };
    }
    
    if (completedJob) {
      return {
        ...completedJob,
        isActive: false,
        progress: 100
      };
    }
    
    return null;
  }

  /**
   * Get all active jobs for a user
   */
  getUserActiveJobs(userId) {
    const userJobs = [];
    for (const [jobId, jobData] of this.activeJobs.entries()) {
      if (jobData.userId === userId) {
        userJobs.push({
          ...jobData,
          progress: jobData.total > 0 ? Math.round((jobData.processed / jobData.total) * 100) : 0
        });
      }
    }
    return userJobs;
  }

  /**
   * Clean up old completed jobs (keep only last 50 per user)
   */
  cleanupOldJobs() {
    if (this.jobResults.size > 200) { // Keep at most 200 total jobs
      const oldestEntries = Array.from(this.jobResults.entries())
        .sort((a, b) => a[1].endTime - b[1].endTime)
        .slice(0, this.jobResults.size - 150);
      
      for (const [jobId] of oldestEntries) {
        this.jobResults.delete(jobId);
      }
    }
  }

  /**
   * Utility function for delays
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = new StudyCreationService();