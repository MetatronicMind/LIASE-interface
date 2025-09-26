
const express = require('express');
const { body, validationResult } = require('express-validator');

const cosmosService = require('../services/cosmosService');
const jobTrackingService = require('../services/jobTrackingService');
const { drugDiscoveryQueue, searchConfigQueue, generalQueue } = require('../services/requestQueue');
const Drug = require('../models/Drug');
const DrugSearchConfig = require('../models/DrugSearchConfig');
const Study = require('../models/Study');
const { authorizePermission } = require('../middleware/authorization');
const { auditLogger, auditAction } = require('../middleware/audit');
const pubmedService = require('../services/pubmedService');
const clinicalTrialsService = require('../services/clinicalTrialsService');
const externalApiService = require('../services/externalApiService');
const drugSearchScheduler = require('../services/drugSearchScheduler');

const router = express.Router();

// Basic test route at the very top
router.get('/basic-test', (req, res) => {
  res.json({ message: 'Basic drugRoutes test working' });
});

// Test endpoint to verify routes are working
router.get('/test', (req, res) => {
  console.log('Test endpoint hit');
  res.json({ message: 'Drug routes are working', timestamp: new Date().toISOString() });
});

// Queue status endpoint for monitoring
router.get('/queue-status', (req, res) => {
  res.json({
    drugDiscovery: drugDiscoveryQueue.getStatus(),
    searchConfig: searchConfigQueue.getStatus(),
    general: generalQueue.getStatus(),
    timestamp: new Date().toISOString()
  });
});

// ===============================
// JOB TRACKING ROUTES
// ===============================

// Get job status by ID
router.get('/jobs/:jobId',
  authorizePermission('drugs', 'read'),
  async (req, res) => {
    try {
      const job = await jobTrackingService.getJob(req.params.jobId);
      
      // Verify user owns this job (if user is authenticated)
      if (req.user && job.userId !== req.user.id) {
        return res.status(403).json({
          error: 'Access denied to this job'
        });
      }
      
      res.json(job);
    } catch (error) {
      if (error.message.includes('not found')) {
        return res.status(404).json({
          error: 'Job not found',
          message: error.message
        });
      }
      
      console.error('Error getting job status:', error);
      res.status(500).json({
        error: 'Failed to get job status',
        message: error.message
      });
    }
  }
);

// Get all jobs for current user
router.get('/jobs',
  async (req, res) => {
    try {
      const { limit = 50 } = req.query;
      
      if (!req.user) {
        return res.status(401).json({
          error: 'Authentication required'
        });
      }
      
      const jobs = await jobTrackingService.getUserJobs(req.user.id, parseInt(limit));
      
      res.json({
        jobs,
        total: jobs.length,
        limit: parseInt(limit)
      });
    } catch (error) {
      console.error('Error getting user jobs:', error);
      res.status(500).json({
        error: 'Failed to get jobs',
        message: error.message
      });
    }
  }
);

// Get external API health status
router.get('/api-health',
  async (req, res) => {
    try {
      const healthStatus = externalApiService.getHealthStatus();
      const connectionTest = await externalApiService.testConnection();
      
      res.json({
        ...healthStatus,
        connectionTest
      });
    } catch (error) {
      console.error('Error getting API health status:', error);
      res.status(500).json({
        error: 'Failed to get API health status',
        message: error.message
      });
    }
  }
);

// Debug endpoint to check user permissions
router.get('/user-info', (req, res) => {
  console.log('User info endpoint hit');
  if (!req.user) {
    return res.json({ error: 'No user authenticated', user: null });
  }
  
  res.json({
    user: {
      id: req.user.id,
      username: req.user.username,
      role: req.user.role,
      permissions: req.user.permissions,
      hasWritePermission: req.user.hasPermission('drugs', 'write'),
      hasCreatePermission: req.user.hasPermission('drugs', 'create')
    }
  });
});

// Simple discover test endpoint without any dependencies
router.get('/discover-test', (req, res) => {
  console.log('Discover test endpoint hit');
  res.json({
    totalFound: 1,
    drugs: [{
      drugName: 'Test Drug',
      pmid: '12345',
      title: 'Test Title',
      abstract: 'Test abstract',
      authors: ['Test Author'],
      journal: 'Test Journal',
      publicationDate: '2024-01-01',
      relevantText: 'Test text',
      confidence: 90
    }],
    searchDate: new Date().toISOString(),
    searchParams: req.query
  });
});

// Test AI inference API connection
router.get('/external-api/test', async (req, res) => {
  try {
    console.log('Testing AI inference API connection...');
    const isConnected = await externalApiService.testConnection();
    
    res.json({
      success: true,
      connected: isConnected,
      message: isConnected ? 'AI inference API connection successful' : 'AI inference API connection failed',
      timestamp: new Date().toISOString(),
      apiUrls: [
        'http://20.75.201.207/get_AI_inference/',
        'http://20.75.201.207/get_AI_inference2/',
        'http://20.75.201.207/get_AI_inference3/'
      ]
    });
  } catch (error) {
    console.error('AI inference API test error:', error);
    res.status(500).json({
      success: false,
      connected: false,
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Scheduler management routes
router.get('/scheduler/status', 
  authorizePermission('drugs', 'read'),
  async (req, res) => {
    try {
      const status = drugSearchScheduler.getStatus();
      res.json(status);
    } catch (error) {
      console.error('Error getting scheduler status:', error);
      res.status(500).json({
        error: 'Failed to get scheduler status',
        message: error.message
      });
    }
  }
);

router.post('/scheduler/trigger', 
  authorizePermission('drugs', 'write'),
  async (req, res) => {
    try {
      console.log('Manual scheduler trigger requested by user:', req.user.id);
      const result = await drugSearchScheduler.triggerRun();
      
      await auditAction(req, 'scheduler_manual_trigger', 'success', {
        result: result
      });
      
      res.json({
        message: 'Scheduled search run triggered successfully',
        result: result
      });
    } catch (error) {
      console.error('Error triggering scheduler:', error);
      
      await auditAction(req, 'scheduler_manual_trigger', 'failed', {
        error: error.message
      });
      
      res.status(500).json({
        error: 'Failed to trigger scheduled run',
        message: error.message
      });
    }
  }
);

router.get('/scheduler/due-configs', 
  authorizePermission('drugs', 'read'),
  async (req, res) => {
    try {
      const dueConfigs = await drugSearchScheduler.getDueConfigurations();
      res.json({
        dueConfigs: dueConfigs,
        count: dueConfigs.length
      });
    } catch (error) {
      console.error('Error getting due configurations:', error);
      res.status(500).json({
        error: 'Failed to get due configurations',
        message: error.message
      });
    }
  }
);

router.use(auditLogger());

// Get all drugs in organization
router.get('/',
  authorizePermission('drugs', 'read'),
  async (req, res) => {
    try {
      const { page = 1, limit = 50, search, status, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
      
      let query = 'SELECT * FROM c WHERE c.organizationId = @orgId';
      const parameters = [{ name: '@orgId', value: req.user.organizationId }];

      // Add filters
      if (status && status !== 'all') {
        query += ' AND c.status = @status';
        parameters.push({ name: '@status', value: status });
      }

      if (search) {
        query += ' AND (CONTAINS(UPPER(c.name), UPPER(@search)) OR CONTAINS(UPPER(c.manufacturer), UPPER(@search)) OR CONTAINS(UPPER(c.rsi), UPPER(@search)))';
        parameters.push({ name: '@search', value: search });
      }

      // Add sorting
      query += ` ORDER BY c.${sortBy} ${sortOrder.toUpperCase()}`;

      // Add pagination
      const offset = (page - 1) * limit;
      query += ` OFFSET ${offset} LIMIT ${limit}`;

      const drugs = await cosmosService.queryItems('drugs', query, parameters);

      res.json({
        drugs,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: drugs.length
        }
      });

    } catch (error) {
      console.error('Error fetching drugs:', error);
      res.status(500).json({
        error: 'Failed to fetch drugs',
        message: error.message
      });
    }
  }
);

// Discover drugs from PubMed (MUST come before /:drugId route)
router.get('/discover',
  authorizePermission('drugs', 'read'), // Temporarily disabled for testing
  async (req, res) => {
    let jobId = null;
    
    try {
      console.log('=== DRUG DISCOVERY ROUTE CALLED ===');
      console.log('🔥🔥🔥 NEW UPDATED ROUTE IS RUNNING 🔥🔥🔥');
      console.log('Request query params:', req.query);
      console.log('User info:', { userId: req.user?.userId, organizationId: req.user?.organizationId });
      
      const { 
        query = 'drug',
        sponsor = '',
        frequency = 'custom',
        maxResults = 1000, // Increased default limit
        dateFrom, 
        dateTo,
        includeAdverseEvents = true,
        includeSafety = true 
      } = req.query;

      const searchParams = {
        query,
        sponsor,
        frequency,
        maxResults: parseInt(maxResults),
        dateFrom,
        dateTo,
        includeAdverseEvents: includeAdverseEvents === 'true',
        includeSafety: includeSafety === 'true'
      };

      console.log('Discovery route called with params:', searchParams);

      console.log('🚀 NEW ASYNC JOB CREATION CODE RUNNING 🚀');
      
      // Create job for tracking progress
      const job = await jobTrackingService.createJob(
        'drug_discovery',
        req.user.id,
        req.user.organizationId,
        {
          totalSteps: 100, // We'll estimate steps based on process
          searchParams,
          phase: 'starting'
        }
      );
      jobId = job.id;

      console.log(`Created job ${jobId} for drug discovery`);

      console.log('🎯 RETURNING JOBID TO FRONTEND IMMEDIATELY:', jobId);

      // Return jobId immediately so frontend can start tracking progress
      res.status(202).json({
        message: 'Drug discovery started',
        jobId: jobId,
        status: 'started'
      });

      // Continue processing asynchronously with queue management
      drugDiscoveryQueue.add(
        () => processDiscoveryJob(jobId, searchParams, req.user, auditAction),
        'high' // High priority for user-initiated discoveries
      ).catch(error => {
        console.error(`Queued discovery job ${jobId} failed:`, error);
      });

      return; // Exit early, processing continues in background





      // Update job progress - PubMed search completed
      await jobTrackingService.updateJob(jobId, {
        progress: 30,
        currentStep: 2,
        message: `Found ${results.totalFound} studies from PubMed`,
        metadata: { 
          ...job.metadata, 
          phase: 'pubmed_completed',
          studiesFound: results.totalFound
        }
      });

      // Send PMIDs and titles to external API if we have results
      let studiesCreated = 0;
      if (results.drugs && results.drugs.length > 0) {
        try {
          // Update job - starting AI inference
          await jobTrackingService.updateJob(jobId, {
            progress: 40,
            currentStep: 3,
            message: `Starting AI inference for ${results.drugs.length} studies...`,
            metadata: { ...job.metadata, phase: 'ai_inference' }
          });

          console.log('Sending drug data to external API...');
          const externalApiResponse = await externalApiService.sendDrugData(
            results.drugs, 
            { query, sponsor, frequency }
          );
          console.log('External API response:', externalApiResponse);
          
          // Add external API response to results
          results.externalApiResponse = externalApiResponse;

          // Update job - AI inference completed
          await jobTrackingService.updateJob(jobId, {
            progress: 70,
            currentStep: 4,
            message: `AI inference completed. Processing ${externalApiResponse.results?.length || 0} results...`,
            metadata: { 
              ...job.metadata, 
              phase: 'processing_ai_results',
              aiResultsCount: externalApiResponse.results?.length || 0
            }
          });

          // Process AI inference results and create studies
          if (externalApiResponse.success && externalApiResponse.results && externalApiResponse.results.length > 0) {
            console.log(`=== Processing AI Inference Results ===`);
            const totalAiResults = externalApiResponse.results.length;
            
            for (let i = 0; i < externalApiResponse.results.length; i++) {
              const aiResult = externalApiResponse.results[i];
              try {
                console.log(`Creating study for PMID: ${aiResult.pmid} (${i + 1}/${totalAiResults})`);
                
                // Update progress for each study being created
                const studyProgress = 70 + Math.round((i / totalAiResults) * 25);
                await jobTrackingService.updateJob(jobId, {
                  progress: studyProgress,
                  currentStep: 4,
                  message: `Creating study ${i + 1}/${totalAiResults} (PMID: ${aiResult.pmid})...`,
                  metadata: { 
                    ...job.metadata, 
                    phase: 'creating_studies',
                    currentStudy: i + 1,
                    totalStudies: totalAiResults
                  }
                });
                
                // Create study from AI inference data
                const study = Study.fromAIInference(
                  aiResult.aiInference,
                  aiResult.originalDrug,
                  req.user.organizationId,
                  req.user.id
                );
                
                // Store study in database
                const createdStudy = await cosmosService.createItem('studies', study.toJSON());
                studiesCreated++;
                console.log(`Successfully created study in database for PMID: ${aiResult.pmid}, ID: ${createdStudy.id}`);
                
              } catch (studyError) {
                console.error(`Error creating study for PMID ${aiResult.pmid}:`, studyError);
                // Continue with other studies
              }
            }
            
            console.log(`=== Study Creation Complete ===`);
            console.log(`Successfully created ${studiesCreated} studies from AI inference data`);
          }

        } catch (error) {
          console.error('External API call failed:', error);
          // Don't fail the whole request if external API fails
          results.externalApiError = error.message;
          
          await jobTrackingService.updateJob(jobId, {
            progress: 90,
            message: `AI inference failed: ${error.message}`,
            metadata: { ...job.metadata, phase: 'ai_inference_failed' }
          });
        }
      } else {
        // No studies found - still successful
        await jobTrackingService.updateJob(jobId, {
          progress: 90,
          message: 'No studies found to process with AI inference',
          metadata: { ...job.metadata, phase: 'no_studies_found' }
        });
      }

      // Complete the job successfully
      await jobTrackingService.completeJob(jobId, {
        totalFound: results.totalFound,
        studiesCreated,
        externalApiSuccess: results.externalApiResponse?.success || false,
        searchParams
      }, `Discovery completed: Found ${results.totalFound} studies, created ${studiesCreated} study records`);

      await auditAction(req, 'drug_discovery', 'success', {
        jobId,
        discoveredCount: results.totalFound,
        studiesCreated,
        searchParams
      });

      console.log('Sending successful response to frontend');
      res.json({
        ...results,
        jobId,
        studiesCreated
      });
      
    } catch (error) {
      console.error('=== DRUG DISCOVERY ERROR ===');
      console.error('Error type:', error.constructor.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      
      // Fail the job if one was created
      if (jobId) {
        try {
          await jobTrackingService.failJob(jobId, error.message);
        } catch (jobError) {
          console.error('Error updating job status:', jobError);
        }
      }
      
      await auditAction(req, 'drug_discovery', 'failed', {
        jobId,
        error: error.message
      });

      console.log('Sending error response to frontend');
      res.status(500).json({
        error: 'Drug discovery failed',
        message: error.message,
        jobId
      });
    }
  }
);

// ===============================
// DRUG SEARCH CONFIGURATION ROUTES (MUST BE BEFORE /:drugId)
// ===============================

// Get all drug search configurations for user
router.get('/search-configs',
  authorizePermission('drugs', 'read'),
  async (req, res) => {
    try {
      console.log('GET /search-configs - Starting request');
      const { page = 1, limit = 50, active = 'all' } = req.query;
      
      // Build query filter
      let filter = {
        organizationId: req.user.organizationId,
        userId: req.user.id
      };
      
      console.log('Query filter:', filter);
      
      if (active === 'true') {
        filter.isActive = true;
      } else if (active === 'false') {
        filter.isActive = false;
      }
      
      console.log('Final filter:', filter);
      
      // Build SQL query
      let queryParts = ['SELECT * FROM c WHERE c.organizationId = @organizationId AND c.userId = @userId'];
      let parameters = [
        { name: '@organizationId', value: filter.organizationId },
        { name: '@userId', value: filter.userId }
      ];
      
      if (filter.hasOwnProperty('isActive')) {
        queryParts.push('AND c.isActive = @isActive');
        parameters.push({ name: '@isActive', value: filter.isActive });
      }
      
      const sqlQuery = queryParts.join(' ');
      console.log('SQL Query:', sqlQuery);
      console.log('Parameters:', parameters);
      
      const configs = await cosmosService.queryItems('drugSearchConfigs', sqlQuery, parameters);
      
      console.log('Raw configs from DB:', configs.length, configs);
      
      const configObjects = configs.map(config => DrugSearchConfig.fromObject(config));
      
      console.log('Processed config objects:', configObjects.length);
      const response = {
        configs: configObjects.map(c => c.toObject()),
        total: configs.length,
        page: parseInt(page),
        limit: parseInt(limit)
      };
      
      console.log('Sending response:', response);
      res.json(response);
    } catch (error) {
      console.error('Error fetching drug search configs:', error);
      res.status(500).json({
        error: 'Failed to fetch drug search configurations',
        message: error.message
      });
    }
  }
);

// Debug route to test configuration data
router.post('/search-configs/debug',
  authorizePermission('drugs', 'write'),
  async (req, res) => {
    try {
      console.log('Debug route - received data:', JSON.stringify(req.body, null, 2));
      console.log('User info:', { id: req.user.id, organizationId: req.user.organizationId });
      
      res.json({
        message: 'Debug successful',
        receivedData: req.body,
        userInfo: { id: req.user.id, organizationId: req.user.organizationId }
      });
    } catch (error) {
      console.error('Debug route error:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Create new drug search configuration
router.post('/search-configs',
  [
    body('name').isLength({ min: 1, max: 100 }).withMessage('Name must be 1-100 characters'),
    body('query').isLength({ min: 1, max: 200 }).withMessage('Query must be 1-200 characters'),
    body('sponsor').optional({ nullable: true }).custom(value => {
      if (value && value.length > 100) {
        throw new Error('Sponsor must be max 100 characters');
      }
      return true;
    }),
    body('frequency').isIn(['daily', 'weekly', 'monthly', 'custom']).withMessage('Invalid frequency'),
    body('customFrequencyHours').optional().isInt({ min: 1, max: 8760 }).withMessage('Custom frequency must be 1-8760 hours'),
    body('maxResults').optional().isInt({ min: 1, max: 10000 }).withMessage('Max results must be 1-10000'),
    body('includeAdverseEvents').optional().isBoolean().withMessage('Include adverse events must be boolean'),
    body('includeSafety').optional().isBoolean().withMessage('Include safety must be boolean'),
    body('sendToExternalApi').optional().isBoolean().withMessage('Send to external API must be boolean'),
    body('dateFrom').optional({ nullable: true }).custom(value => {
      if (value && !value.match(/^\d{4}\/\d{2}\/\d{2}$/)) {
        throw new Error('Date from must be in YYYY/MM/DD format');
      }
      return true;
    }),
    body('dateTo').optional({ nullable: true }).custom(value => {
      if (value && !value.match(/^\d{4}\/\d{2}\/\d{2}$/)) {
        throw new Error('Date to must be in YYYY/MM/DD format');
      }
      return true;
    })
  ],
  authorizePermission('drugs', 'write'),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.error('Validation errors:', errors.array());
        console.error('Request body:', req.body);
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array(),
          receivedData: req.body
        });
      }
      
      const configData = {
        ...req.body,
        organizationId: req.user.organizationId,
        userId: req.user.id,
        createdBy: req.user.id
      };
      
      const config = new DrugSearchConfig(configData);
      
      // Validate the configuration
      const validationErrors = config.validate();
      if (validationErrors.length > 0) {
        console.error('DrugSearchConfig validation errors:', validationErrors);
        console.error('Config data used:', configData);
        return res.status(400).json({
          error: 'Configuration validation failed',
          details: validationErrors,
          configData: configData
        });
      }
      
      // Set initial next run time if not manual
      if (config.frequency !== 'manual') {
        config.nextRunAt = config.calculateNextRun();
      }
      
      await cosmosService.createItem('drugSearchConfigs', config.toObject());
      
      await auditAction(
        req.user,
        'create',
        'drug_search_config',
        config.id,
        `Created drug search configuration: ${config.name}`,
        {
          configId: config.id,
          name: config.name,
          query: config.query,
          frequency: config.frequency
        }
      );
      
      res.status(201).json({
        message: 'Drug search configuration created successfully',
        config: config.toObject()
      });
    } catch (error) {
      console.error('Error creating drug search config:', error);
      
      await auditAction(
        req.user,
        'create',
        'drug_search_config',
        null,
        `Failed to create drug search configuration: ${error.message}`,
        { error: error.message }
      );
      
      res.status(500).json({
        error: 'Failed to create drug search configuration',
        message: error.message
      });
    }
  }
);

// Manually trigger a drug search configuration
router.post('/search-configs/:configId/run',
  authorizePermission('drugs', 'write'),
  async (req, res) => {
    try {
      const config = await cosmosService.getItem('drugSearchConfigs', req.params.configId, req.user.organizationId);
      
      if (!config) {
        return res.status(404).json({
          error: 'Drug search configuration not found'
        });
      }
      
      // Verify user owns this config
      if (config.userId !== req.user.id) {
        return res.status(403).json({
          error: 'Access denied to this configuration'
        });
      }
      
      const configObject = DrugSearchConfig.fromObject(config);
      
      console.log('🚀 SEARCH CONFIG RUN - NEW ASYNC JOB CREATION 🚀');
      
      // Create job for tracking progress
      const job = await jobTrackingService.createJob(
        'drug_discovery',
        req.user.id,
        req.user.organizationId,
        {
          totalSteps: 100,
          searchParams: {
            query: configObject.query,
            sponsor: configObject.sponsor,
            frequency: configObject.frequency,
            maxResults: configObject.maxResults || 50,
            includeAdverseEvents: configObject.includeAdverseEvents,
            includeSafety: configObject.includeSafety
          },
          phase: 'starting',
          configId: req.params.configId,
          configName: configObject.name
        }
      );
      const jobId = job.id;

      console.log(`🎯 RETURNING JOBID TO FRONTEND FOR CONFIG RUN: ${jobId}`);

      // Return jobId immediately so frontend can start tracking progress
      res.status(202).json({
        message: `Drug search started for config "${configObject.name}"`,
        jobId: jobId,
        status: 'started',
        configName: configObject.name
      });

      // Continue processing asynchronously with queue management
      searchConfigQueue.add(
        () => processSearchConfigJob(jobId, configObject, req.user, auditAction),
        'high' // High priority for user-initiated searches
      ).catch(error => {
        console.error(`Queued search config job ${jobId} failed:`, error);
      });

      return; // Exit early, processing continues in background
    } catch (error) {
      console.error('Error running drug search config:', error);
      
      await auditAction(
        req.user,
        'run',
        'drug_search_config',
        req.params.configId,
        `Failed to execute drug search configuration: ${error.message}`,
        {
          configId: req.params.configId,
          error: error.message
        }
      );
      
      res.status(500).json({
        error: 'Failed to run drug search',
        message: error.message
      });
    }
  }
);

// Get specific drug search configuration
router.get('/search-configs/:configId',
  authorizePermission('drugs', 'read'),
  async (req, res) => {
    try {
      const config = await cosmosService.getItem('drugSearchConfigs', req.params.configId, req.user.organizationId);
      
      if (!config) {
        return res.status(404).json({
          error: 'Drug search configuration not found'
        });
      }
      
      // Verify user owns this config
      if (config.userId !== req.user.id) {
        return res.status(403).json({
          error: 'Access denied to this configuration'
        });
      }
      
      const configObject = DrugSearchConfig.fromObject(config);
      res.json(configObject.toObject());
    } catch (error) {
      console.error('Error fetching drug search config:', error);
      res.status(500).json({
        error: 'Failed to fetch drug search configuration',
        message: error.message
      });
    }
  }
);

// Update drug search configuration
router.put('/search-configs/:configId',
  [
    body('name').optional().isLength({ min: 1, max: 100 }).withMessage('Name must be 1-100 characters'),
    body('query').optional().isLength({ min: 1, max: 200 }).withMessage('Query must be 1-200 characters'),
    body('sponsor').optional().isLength({ max: 100 }).withMessage('Sponsor must be max 100 characters'),
    body('frequency').optional().isIn(['daily', 'weekly', 'monthly', 'custom', 'manual']).withMessage('Invalid frequency'),
    body('customFrequencyHours').optional().isInt({ min: 1, max: 8760 }).withMessage('Custom frequency must be 1-8760 hours')
  ],
  authorizePermission('drugs', 'update'),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }
      
      const existingConfig = await cosmosService.getItem('drugSearchConfigs', req.params.configId, req.user.organizationId);
      
      if (!existingConfig) {
        return res.status(404).json({
          error: 'Drug search configuration not found'
        });
      }
      
      // Verify user owns this config
      if (existingConfig.userId !== req.user.id) {
        return res.status(403).json({
          error: 'Access denied to this configuration'
        });
      }
      
      // Update the configuration
      const updatedData = {
        ...existingConfig,
        ...req.body,
        updatedAt: new Date().toISOString()
      };
      
      const config = new DrugSearchConfig(updatedData);
      
      // Recalculate next run if frequency changed
      if (req.body.frequency && req.body.frequency !== existingConfig.frequency) {
        config.nextRunAt = config.calculateNextRun();
      }
      
      const validationErrors = config.validate();
      if (validationErrors.length > 0) {
        return res.status(400).json({
          error: 'Configuration validation failed',
          details: validationErrors
        });
      }
      
      await cosmosService.updateItem('drugSearchConfigs', config.id, config.toObject());
      
      await auditAction(
        req.user,
        'update',
        'drug_search_config',
        config.id,
        `Updated drug search configuration: ${config.name}`,
        {
          configId: config.id,
          changes: req.body
        }
      );
      
      res.json({
        message: 'Drug search configuration updated successfully',
        config: config.toObject()
      });
    } catch (error) {
      console.error('Error updating drug search config:', error);
      
      await auditAction(
        req.user,
        'update',
        'drug_search_config',
        req.params.configId,
        `Failed to update drug search configuration: ${error.message}`,
        {
          configId: req.params.configId,
          error: error.message
        }
      );
      
      res.status(500).json({
        error: 'Failed to update drug search configuration',
        message: error.message
      });
    }
  }
);

// Delete drug search configuration
router.delete('/search-configs/:configId',
  authorizePermission('drugs', 'delete'),
  async (req, res) => {
    try {
      const existingConfig = await cosmosService.getItem('drugSearchConfigs', req.params.configId, req.user.organizationId);
      
      if (!existingConfig) {
        return res.status(404).json({
          error: 'Drug search configuration not found'
        });
      }
      
      // Verify user owns this config
      if (existingConfig.userId !== req.user.id) {
        return res.status(403).json({
          error: 'Access denied to this configuration'
        });
      }
      
      await cosmosService.deleteItem('drugSearchConfigs', req.params.configId, req.user.organizationId);
      
      await auditAction(
        req.user,
        'delete',
        'drug_search_config',
        req.params.configId,
        `Deleted drug search configuration: ${existingConfig.name}`,
        {
          configId: req.params.configId,
          name: existingConfig.name
        }
      );
      
      res.json({
        message: 'Drug search configuration deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting drug search config:', error);
      
      await auditAction(
        req.user,
        'delete',
        'drug_search_config',
        req.params.configId,
        `Failed to delete drug search configuration: ${error.message}`,
        {
          configId: req.params.configId,
          error: error.message
        }
      );
      
      res.status(500).json({
        error: 'Failed to delete drug search configuration',
        message: error.message
      });
    }
  }
);

// Get specific drug
router.get('/:drugId',
  authorizePermission('drugs', 'read'),
  async (req, res) => {
    try {
      const drug = await cosmosService.getItem('drugs', req.params.drugId, req.user.organizationId);
      
      if (!drug) {
        return res.status(404).json({
          error: 'Drug not found'
        });
      }

      res.json(drug);

    } catch (error) {
      console.error('Error fetching drug:', error);
      res.status(500).json({
        error: 'Failed to fetch drug',
        message: error.message
      });
    }
  }
);

// Create new drug
router.post('/',
  authorizePermission('drugs', 'write'),
  [
    body('name').isLength({ min: 2 }),
    body('manufacturer').isLength({ min: 2 }),
    body('query').isLength({ min: 3 }),
    body('rsi').isLength({ min: 1 }),
    body('nextSearchDate').isISO8601()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const drugData = {
        ...req.body,
        organizationId: req.user.organizationId,
        createdBy: req.user.id
      };

      // Validate drug data
      const validationErrors = Drug.validate(drugData);
      if (validationErrors.length > 0) {
        return res.status(400).json({
          error: 'Drug validation failed',
          details: validationErrors
        });
      }

      // Check if drug name already exists in organization
      const existingDrugs = await cosmosService.queryItems(
        'drugs',
        'SELECT * FROM c WHERE c.organizationId = @orgId AND UPPER(c.name) = UPPER(@name)',
        [
          { name: '@orgId', value: req.user.organizationId },
          { name: '@name', value: drugData.name }
        ]
      );

      if (existingDrugs.length > 0) {
        return res.status(409).json({
          error: 'Drug with this name already exists in your organization'
        });
      }

      // Create drug instance
      const drug = new Drug(drugData);
      
      // Save to database
      const createdDrug = await cosmosService.createItem('drugs', drug.toJSON());

      // Create audit log
      await auditAction(
        req.user,
        'create',
        'drug',
        createdDrug.id,
        `Created new drug: ${drug.name}`,
        { manufacturer: drug.manufacturer, rsi: drug.rsi }
      );

      res.status(201).json({
        message: 'Drug created successfully',
        drug: createdDrug
      });

    } catch (error) {
      console.error('Error creating drug:', error);
      res.status(500).json({
        error: 'Failed to create drug',
        message: error.message
      });
    }
  }
);

// Update drug
router.put('/:drugId',
  authorizePermission('drugs', 'write'),
  [
    body('name').optional().isLength({ min: 2 }),
    body('manufacturer').optional().isLength({ min: 2 }),
    body('query').optional().isLength({ min: 3 }),
    body('rsi').optional().isLength({ min: 1 }),
    body('nextSearchDate').optional().isISO8601(),
    body('status').optional().isIn(['Active', 'Inactive', 'Suspended'])
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { drugId } = req.params;
      const updates = req.body;

      // Remove sensitive fields
      delete updates.id;
      delete updates.organizationId;
      delete updates.createdAt;
      delete updates.createdBy;

      // Check if drug exists
      const existingDrug = await cosmosService.getItem('drugs', drugId, req.user.organizationId);
      if (!existingDrug) {
        return res.status(404).json({
          error: 'Drug not found'
        });
      }

      // Check if name is being changed and if it's unique
      if (updates.name && updates.name !== existingDrug.name) {
        const duplicateDrugs = await cosmosService.queryItems(
          'drugs',
          'SELECT * FROM c WHERE c.organizationId = @orgId AND UPPER(c.name) = UPPER(@name)',
          [
            { name: '@orgId', value: req.user.organizationId },
            { name: '@name', value: updates.name }
          ]
        );

        if (duplicateDrugs.length > 0) {
          return res.status(409).json({
            error: 'Drug with this name already exists in your organization'
          });
        }
      }

      // Validate updates
      const tempDrug = { ...existingDrug, ...updates };
      const validationErrors = Drug.validate(tempDrug);
      if (validationErrors.length > 0) {
        return res.status(400).json({
          error: 'Validation failed',
          details: validationErrors
        });
      }

      // Update drug
      const updatedDrug = await cosmosService.updateItem(
        'drugs',
        drugId,
        req.user.organizationId,
        updates
      );

      // Create audit log
      await auditAction(
        req.user,
        'update',
        'drug',
        drugId,
        `Updated drug: ${updatedDrug.name}`,
        { updates: Object.keys(updates) }
      );

      res.json({
        message: 'Drug updated successfully',
        drug: updatedDrug
      });

    } catch (error) {
      console.error('Error updating drug:', error);
      res.status(500).json({
        error: 'Failed to update drug',
        message: error.message
      });
    }
  }
);

// Delete drug
router.delete('/:drugId',
  authorizePermission('drugs', 'delete'),
  async (req, res) => {
    try {
      const { drugId } = req.params;

      // Check if drug exists
      const drug = await cosmosService.getItem('drugs', drugId, req.user.organizationId);
      if (!drug) {
        return res.status(404).json({
          error: 'Drug not found'
        });
      }

      // Check if drug is referenced in any studies
      const relatedStudies = await cosmosService.queryItems(
        'studies',
        'SELECT c.id FROM c WHERE c.organizationId = @orgId AND UPPER(c.drugName) = UPPER(@drugName)',
        [
          { name: '@orgId', value: req.user.organizationId },
          { name: '@drugName', value: drug.name }
        ]
      );

      if (relatedStudies.length > 0) {
        return res.status(400).json({
          error: 'Cannot delete drug that is referenced in studies',
          relatedStudies: relatedStudies.length
        });
      }

      // Delete drug
      await cosmosService.deleteItem('drugs', drugId, req.user.organizationId);

      // Create audit log
      await auditAction(
        req.user,
        'delete',
        'drug',
        drugId,
        `Deleted drug: ${drug.name}`,
        { manufacturer: drug.manufacturer, rsi: drug.rsi }
      );

      res.json({
        message: 'Drug deleted successfully'
      });

    } catch (error) {
      console.error('Error deleting drug:', error);
      res.status(500).json({
        error: 'Failed to delete drug',
        message: error.message
      });
    }
  }
);

// Bulk operations
router.post('/bulk/status',
  authorizePermission('drugs', 'write'),
  [
    body('drugIds').isArray({ min: 1 }),
    body('status').isIn(['Active', 'Inactive', 'Suspended'])
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { drugIds, status } = req.body;
      const results = [];
      const failures = [];

      for (const drugId of drugIds) {
        try {
          const drug = await cosmosService.getItem('drugs', drugId, req.user.organizationId);
          if (drug) {
            await cosmosService.updateItem(
              'drugs',
              drugId,
              req.user.organizationId,
              { status, updatedAt: new Date().toISOString() }
            );
            results.push(drugId);
          } else {
            failures.push({ drugId, error: 'Drug not found' });
          }
        } catch (error) {
          failures.push({ drugId, error: error.message });
        }
      }

      // Create audit log
      await auditAction(
        req.user,
        'update',
        'drug',
        'bulk',
        `Bulk status update: ${results.length} drugs set to ${status}`,
        { updatedCount: results.length, failedCount: failures.length }
      );

      res.json({
        message: `Bulk status update completed`,
        results: {
          updated: results.length,
          failed: failures.length
        },
        failures
      });

    } catch (error) {
      console.error('Error in bulk status update:', error);
      res.status(500).json({
        error: 'Bulk status update failed',
        message: error.message
      });
    }
  }
);

// Search for specific drug in PubMed
router.get('/search/:drugName',
  authorizePermission('drugs', 'read'),
  async (req, res) => {
    try {
      const { drugName } = req.params;
      const { 
        maxResults = 20, 
        includeAdverseEvents = true,
        includeSafety = true,
        includeToxicity = false
      } = req.query;

      const pmids = await pubmedService.searchDrugs(drugName, {
        maxResults: parseInt(maxResults),
        includeAdverseEvents: includeAdverseEvents === 'true',
        includeSafety: includeSafety === 'true',
        includeToxicity: includeToxicity === 'true'
      });

      let articles = [];
      if (pmids.length > 0) {
        articles = await pubmedService.fetchDetails(pmids);
      }

      await auditAction(req, 'drug_search', 'success', {
        drugName,
        foundArticles: articles.length,
        searchParams: req.query
      });

      res.json({
        drugName,
        pmids,
        articles,
        totalFound: articles.length,
        query: pubmedService.generateDrugQuery(drugName, req.query)
      });
    } catch (error) {
      console.error('Drug search error:', error);
      
      await auditAction(req, 'drug_search', 'failed', {
        drugName: req.params.drugName,
        error: error.message
      });

      res.status(500).json({
        error: 'Drug search failed',
        message: error.message
      });
    }
  }
);

// Get drug summary (PubMed + Clinical Trials)
router.get('/summary/:drugName',
  authorizePermission('drugs', 'read'),
  async (req, res) => {
    try {
      const { drugName } = req.params;
      const { maxResults = 20 } = req.query;

      // Get both PubMed and clinical trials data in parallel
      const [pubmedSummary, clinicalTrialsSummary] = await Promise.all([
        pubmedService.getDrugSummary(drugName, { maxResults: parseInt(maxResults) }),
        clinicalTrialsService.getDrugStudySummary(drugName, { maxResults: 10 })
      ]);

      await auditAction(req, 'drug_summary', 'success', {
        drugName,
        pubmedArticles: pubmedSummary.articles.length,
        clinicalTrials: clinicalTrialsSummary.totalStudies
      });

      res.json({
        drugName,
        pubmedData: pubmedSummary,
        clinicalTrialsData: clinicalTrialsSummary,
        generatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Drug summary error:', error);
      
      await auditAction(req, 'drug_summary', 'failed', {
        drugName: req.params.drugName,
        error: error.message
      });

      res.status(500).json({
        error: 'Drug summary failed',
        message: error.message
      });
    }
  }
);

// Import drug from discovery results
router.post('/import',
  // authorizePermission('drugs', 'create'), // Temporarily disabled for testing
  [
    body('drugName').notEmpty().withMessage('Drug name is required'),
    body('pmid').notEmpty().withMessage('PMID is required'),
    body('manufacturer').optional(),
    body('description').optional()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { drugName, pmid, manufacturer, description, relevantText } = req.body;

      // Generate RSI and query
      const rsi = `RSI-${drugName.toUpperCase().replace(/\s+/g, '-')}-${Date.now().toString().slice(-6)}`;
      const query = pubmedService.generateDrugQuery(drugName);

      // Create drug object
      const drugData = {
        organizationId: req.user.organizationId,
        name: drugName,
        manufacturer: manufacturer || 'Unknown',
        query,
        rsi,
        nextSearchDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
        status: 'Active',
        description: description || relevantText || `Imported from PubMed article ${pmid}`,
        sourceData: {
          pmid,
          relevantText,
          importDate: new Date().toISOString(),
          importedBy: req.user.id
        },
        createdBy: req.user.id
      };

      const drug = new Drug(drugData);
      await cosmosService.createItem('drugs', drug.toJSON());

      await auditAction(req, 'drug_import', 'success', {
        drugName,
        pmid,
        rsi,
        drugId: drug.id
      });

      res.status(201).json({
        message: 'Drug imported successfully',
        drug: drug.toJSON()
      });
    } catch (error) {
      console.error('Drug import error:', error);
      
      await auditAction(req, 'drug_import', 'failed', {
        drugName: req.body.drugName,
        error: error.message
      });

      res.status(500).json({
        error: 'Drug import failed',
        message: error.message
      });
    }
  }
);

// ===============================
// DRUG SEARCH CONFIGURATION ROUTES
// ===============================

// Test route to verify drug routes are working (no auth required)
router.get('/test-no-auth', (req, res) => {
  res.json({ message: 'Drug routes working - no auth required' });
});

// Test route to verify drug routes are working (with auth but no permission check)

// Async function to process drug discovery job
async function processDiscoveryJob(jobId, searchParams, user, auditAction) {
  try {
    const {
      query = 'drug', 
      sponsor = '', 
      frequency = 'custom',
      maxResults = 1000,
      dateFrom, 
      dateTo,
      includeAdverseEvents = true,
      includeSafety = true
    } = searchParams;

    console.log(`Processing discovery job ${jobId} asynchronously`);

    // Validate date parameters if provided
    if (dateFrom && !/^\d{4}\/\d{2}\/\d{2}$/.test(dateFrom)) {
      await jobTrackingService.failJob(jobId, 'Invalid dateFrom format. Use YYYY/MM/DD format');
      return;
    }
    if (dateTo && !/^\d{4}\/\d{2}\/\d{2}$/.test(dateTo)) {
      await jobTrackingService.failJob(jobId, 'Invalid dateTo format. Use YYYY/MM/DD format');
      return;
    }

    // Update job progress - starting PubMed search
    await jobTrackingService.updateJob(jobId, {
      progress: 10,
      currentStep: 1,
      message: 'Starting PubMed search...',
      metadata: { phase: 'pubmed_search' }
    });

    // Call the improved discoverDrugs method with new parameters
    console.log('About to call pubmedService.discoverDrugs');
    
    const results = await pubmedService.discoverDrugs(searchParams);

    console.log('Discovery completed successfully, returning results:', {
      totalFound: results.totalFound,
      drugsLength: results.drugs?.length || 0
    });

    // Update job progress - PubMed search completed
    await jobTrackingService.updateJob(jobId, {
      progress: 30,
      currentStep: 2,
      message: `Found ${results.totalFound} studies from PubMed`,
      metadata: { 
        phase: 'pubmed_completed',
        studiesFound: results.totalFound
      }
    });

    // Send PMIDs and titles to external API if we have results
    let studiesCreated = 0;
    if (results.drugs && results.drugs.length > 0) {
      try {
        // Update job - starting AI inference
        await jobTrackingService.updateJob(jobId, {
          progress: 40,
          currentStep: 3,
          message: `Starting AI inference for ${results.drugs.length} studies...`,
          metadata: { phase: 'ai_inference' }
        });

        console.log('Sending drug data to external API...');
        const externalApiResponse = await externalApiService.sendDrugData(
          results.drugs, 
          { query, sponsor, frequency }
        );
        console.log('External API response:', externalApiResponse);
        
        // Add external API response to results
        results.externalApiResponse = externalApiResponse;

        // Update job - AI inference completed
        await jobTrackingService.updateJob(jobId, {
          progress: 70,
          currentStep: 4,
          message: `AI inference completed. Processing ${externalApiResponse.results?.length || 0} results...`,
          metadata: { 
            phase: 'processing_ai_results',
            aiResultsCount: externalApiResponse.results?.length || 0
          }
        });

        // Process AI inference results and create studies
        if (externalApiResponse.success && externalApiResponse.results && externalApiResponse.results.length > 0) {
          console.log(`=== Processing AI Inference Results ===`);
          const totalAiResults = externalApiResponse.results.length;
          
          for (let i = 0; i < externalApiResponse.results.length; i++) {
            const aiResult = externalApiResponse.results[i];
            try {
              console.log(`Creating study for PMID: ${aiResult.pmid} (${i + 1}/${totalAiResults})`);
              
              // Update progress for each study being created
              const studyProgress = 70 + Math.round((i / totalAiResults) * 25);
              await jobTrackingService.updateJob(jobId, {
                progress: studyProgress,
                currentStep: 4,
                message: `Creating study ${i + 1}/${totalAiResults} (PMID: ${aiResult.pmid})...`,
                metadata: { 
                  phase: 'creating_studies',
                  currentStudy: i + 1,
                  totalStudies: totalAiResults
                }
              });
              
              // Create study from AI inference data
              const study = Study.fromAIInference(
                aiResult.aiInference,
                aiResult.originalDrug,
                user.organizationId,
                user.id
              );
              
              // Store study in database
              const savedStudy = await cosmosService.createItem('studies', study.toObject());
              studiesCreated++;
              
              console.log(`Successfully created study ${savedStudy.id} for PMID ${aiResult.pmid}`);
              
            } catch (studyError) {
              console.error(`Error creating study for PMID ${aiResult.pmid}:`, studyError);
              // Continue with other studies
            }
          }
        } else {
          console.log('No valid AI inference results to process');
        }
      } catch (apiError) {
        console.error('Error in AI inference or study creation:', apiError);
      }
    } else {
      // Update job - no studies found
      await jobTrackingService.updateJob(jobId, {
        progress: 90,
        currentStep: 4,
        message: 'No studies found to process with AI inference',
        metadata: { phase: 'no_studies_found' }
      });
    }

    // Complete the job successfully
    await jobTrackingService.completeJob(jobId, {
      totalFound: results.totalFound,
      studiesCreated,
      externalApiSuccess: results.externalApiResponse?.success || false,
      searchParams
    }, `Discovery completed: Found ${results.totalFound} studies, created ${studiesCreated} study records`);

    // Audit action would be called here if we had the request object
    console.log(`Audit: job ${jobId} completed successfully`);

    console.log(`Job ${jobId} completed successfully: ${studiesCreated} studies created`);

  } catch (error) {
    console.error(`Job ${jobId} failed:`, error);
    
    try {
      await jobTrackingService.failJob(jobId, error.message);
    } catch (jobError) {
      console.error('Error updating job status:', jobError);
    }
    
    // Audit action would be called here if we had the request object  
    console.log(`Audit: job ${jobId} failed:`, error.message);
  }
}

// Async function to process search config job in background
async function processSearchConfigJob(jobId, configObject, user, auditAction) {
  try {
    console.log(`🔄 Processing search config job ${jobId} asynchronously`);

    // Update job progress - starting search
    await jobTrackingService.updateJob(jobId, {
      progress: 10,
      currentStep: 1,
      message: `Starting drug search for config "${configObject.name}"...`,
      metadata: { phase: 'starting_search', configName: configObject.name }
    });

    // Run the actual drug search using the configuration parameters
    console.log('Running drug search with config:', {
      name: configObject.name,
      query: configObject.query,
      sponsor: configObject.sponsor,
      frequency: configObject.frequency
    });

    const results = await pubmedService.discoverDrugs({
      query: configObject.query,
      sponsor: configObject.sponsor,
      frequency: configObject.frequency,
      maxResults: configObject.maxResults || 50,
      includeAdverseEvents: configObject.includeAdverseEvents,
      includeSafety: configObject.includeSafety
    });

    // Update job progress - PubMed search completed
    await jobTrackingService.updateJob(jobId, {
      progress: 30,
      currentStep: 2,
      message: `Found ${results.totalFound} studies from PubMed`,
      metadata: { 
        phase: 'pubmed_completed',
        studiesFound: results.totalFound
      }
    });

    // Send to external API if configured and process AI inference
    let externalApiSuccess = null;
    let studiesCreated = 0;
    
    if (configObject.sendToExternalApi && results.drugs && results.drugs.length > 0) {
      try {
        // Update job - starting AI inference
        await jobTrackingService.updateJob(jobId, {
          progress: 40,
          currentStep: 3,
          message: `Starting AI inference for ${results.drugs.length} studies...`,
          metadata: { phase: 'ai_inference' }
        });

        console.log('=== Starting AI Inference Process ===');
        console.log('Drugs to send to AI API:', results.drugs.map(d => ({ pmid: d.pmid, drugName: d.drugName, title: d.title })));
        console.log('Search parameters:', {
          query: configObject.query,
          sponsor: configObject.sponsor,
          frequency: configObject.frequency
        });
        
        const aiResponse = await externalApiService.sendDrugData(results.drugs, {
          query: configObject.query,
          sponsor: configObject.sponsor,
          frequency: configObject.frequency
        });
        
        console.log('AI API Response:', JSON.stringify(aiResponse, null, 2));
        externalApiSuccess = aiResponse.success;

        // Update job - AI inference completed
        await jobTrackingService.updateJob(jobId, {
          progress: 70,
          currentStep: 4,
          message: `AI inference completed. Processing ${aiResponse.results?.length || 0} results...`,
          metadata: { 
            phase: 'processing_ai_results',
            aiResultsCount: aiResponse.results?.length || 0
          }
        });
        
        // Process AI inference results and create studies
        if (aiResponse.success && aiResponse.results && aiResponse.results.length > 0) {
          console.log(`=== Processing AI Inference Results ===`);
          console.log(`Processing ${aiResponse.results.length} AI inference results...`);
          const totalAiResults = aiResponse.results.length;
          
          for (let i = 0; i < aiResponse.results.length; i++) {
            const aiResult = aiResponse.results[i];
            try {
              console.log(`Creating study for PMID: ${aiResult.pmid} (${i + 1}/${totalAiResults})`);

              // Update progress for each study being created
              const studyProgress = 70 + Math.round((i / totalAiResults) * 25);
              await jobTrackingService.updateJob(jobId, {
                progress: studyProgress,
                currentStep: 4,
                message: `Creating study ${i + 1}/${totalAiResults} (PMID: ${aiResult.pmid})...`,
                metadata: { 
                  phase: 'creating_studies',
                  currentStudy: i + 1,
                  totalStudies: totalAiResults
                }
              });
              
              console.log(`AI inference data:`, JSON.stringify(aiResult.aiInference, null, 2));
              
              // Create study from AI inference data
              const study = Study.fromAIInference(
                aiResult.aiInference,
                aiResult.originalDrug,
                user.organizationId,
                user.id
              );
              
              console.log(`Study object created:`, JSON.stringify(study.toJSON(), null, 2));
              
              // Store study in database
              const createdStudy = await cosmosService.createItem('studies', study.toJSON());
              studiesCreated++;
              console.log(`Successfully created study in database for PMID: ${aiResult.pmid}, ID: ${createdStudy.id}`);
              
            } catch (studyError) {
              console.error(`Error creating study for PMID ${aiResult.pmid}:`, studyError);
              console.error(`Study error stack:`, studyError.stack);
              // Continue with other studies
            }
          }
          
          console.log(`=== Study Creation Complete ===`);
          console.log(`Successfully created ${studiesCreated} studies from AI inference data`);
        } else {
          console.log('=== No AI Results to Process ===');
          console.log('AI Response success:', aiResponse.success);
          console.log('AI Results length:', aiResponse.results ? aiResponse.results.length : 'undefined');
        }
        
      } catch (error) {
        console.error('External API call failed:', error);
        externalApiSuccess = false;
      }
    } else {
      // Update job - no AI processing needed
      await jobTrackingService.updateJob(jobId, {
        progress: 90,
        currentStep: 4,
        message: 'Skipping AI inference (not configured or no studies found)',
        metadata: { phase: 'skipping_ai' }
      });
    }
    
    // Update the configuration with run stats
    configObject.updateAfterRun(results.totalFound, externalApiSuccess);
    
    try {
      console.log('About to update config with ID:', configObject.id);
      await cosmosService.updateItem('drugSearchConfigs', configObject.id, configObject.toObject());
      console.log('Successfully updated configuration stats');
    } catch (updateError) {
      console.error('Failed to update configuration stats:', updateError.message);
      // Continue execution even if update fails - the search was successful
    }

    // Audit the successful execution
    await auditAction(
      user,
      'run',
      'drug_search_config',
      configObject.id,
      `Executed drug search configuration: ${configObject.name}`,
      {
        configId: configObject.id,
        resultsFound: results.totalFound,
        externalApiSuccess,
        studiesCreated
      }
    );

    // Complete the job successfully
    await jobTrackingService.completeJob(jobId, {
      totalFound: results.totalFound,
      studiesCreated,
      externalApiSuccess,
      configId: configObject.id,
      configName: configObject.name
    }, `Config "${configObject.name}" completed: Found ${results.totalFound} studies, created ${studiesCreated} study records`);

    console.log(`Search config job ${jobId} completed successfully: ${studiesCreated} studies created`);

  } catch (error) {
    console.error(`Search config job ${jobId} failed:`, error);
    
    try {
      await jobTrackingService.failJob(jobId, error.message);
    } catch (jobError) {
      console.error('Error updating job status:', jobError);
    }

    // Audit the failed execution
    try {
      await auditAction(
        user,
        'run',
        'drug_search_config',
        configObject.id,
        `Failed to execute drug search configuration: ${error.message}`,
        {
          configId: configObject.id,
          error: error.message
        }
      );
    } catch (auditError) {
      console.error('Error auditing failed job:', auditError);
    }
  }
}

module.exports = router;
