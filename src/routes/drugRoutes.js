const express = require("express");
const { body, validationResult } = require("express-validator");

const cosmosService = require("../services/cosmosService");
const jobTrackingService = require("../services/jobTrackingService");
const {
  drugDiscoveryQueue,
  searchConfigQueue,
  generalQueue,
} = require("../services/requestQueue");
const Drug = require("../models/Drug");
const DrugSearchConfig = require("../models/DrugSearchConfig");
const Study = require("../models/Study");
const { authorizePermission } = require("../middleware/authorization");
const { auditLogger, auditAction } = require("../middleware/audit");
const pubmedService = require("../services/pubmedService");
const clinicalTrialsService = require("../services/clinicalTrialsService");
const externalApiService = require("../services/externalApiService");
const drugSearchScheduler = require("../services/drugSearchScheduler");
const articleRetryQueueService = require("../services/articleRetryQueueService");

const router = express.Router();

// Basic test route at the very top
router.get("/basic-test", (req, res) => {
  res.json({ message: "Basic drugRoutes test working" });
});

// Test endpoint to verify routes are working
router.get("/test", (req, res) => {
  console.log("Test endpoint hit");
  res.json({
    message: "Drug routes are working",
    timestamp: new Date().toISOString(),
  });
});

// Queue status endpoint for monitoring
router.get("/queue-status", (req, res) => {
  res.json({
    drugDiscovery: drugDiscoveryQueue.getStatus(),
    searchConfig: searchConfigQueue.getStatus(),
    general: generalQueue.getStatus(),
    timestamp: new Date().toISOString(),
  });
});

// ===============================
// JOB TRACKING ROUTES
// ===============================

// Get job status by ID
router.get(
  "/jobs/:jobId",
  authorizePermission("drugs", "read"),
  async (req, res) => {
    // Disable caching for job status to ensure real-time updates
    res.setHeader(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate",
    );
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");

    try {
      const job = await jobTrackingService.getJob(req.params.jobId);

      // Verify user owns this job (if user is authenticated)
      if (req.user && job.userId !== req.user.id) {
        return res.status(403).json({
          error: "Access denied to this job",
        });
      }

      res.json(job);
    } catch (error) {
      if (error.message.includes("not found")) {
        return res.status(404).json({
          error: "Job not found",
          message: error.message,
        });
      }

      console.error("Error getting job status:", error);
      res.status(500).json({
        error: "Failed to get job status",
        message: error.message,
      });
    }
  },
);

// Get all jobs for current user
router.get("/jobs", async (req, res) => {
  try {
    const { limit = 50 } = req.query;

    if (!req.user) {
      return res.status(401).json({
        error: "Authentication required",
      });
    }

    const jobs = await jobTrackingService.getUserJobs(
      req.user.id,
      parseInt(limit),
    );

    res.json({
      jobs,
      total: jobs.length,
      limit: parseInt(limit),
    });
  } catch (error) {
    console.error("Error getting user jobs:", error);
    res.status(500).json({
      error: "Failed to get jobs",
      message: error.message,
    });
  }
});

// ===============================
// ARTICLE RETRY QUEUE ROUTES
// ===============================

// Get retry queue status
router.get(
  "/retry-queue/status",
  authorizePermission("drugs", "read"),
  async (req, res) => {
    try {
      const status = articleRetryQueueService.getStatus();
      res.json({
        success: true,
        ...status,
      });
    } catch (error) {
      console.error("Error getting retry queue status:", error);
      res.status(500).json({
        error: "Failed to get retry queue status",
        message: error.message,
      });
    }
  },
);

// Manually trigger retry for all failed articles
router.post(
  "/retry-queue/retry-all",
  authorizePermission("drugs", "write"),
  async (req, res) => {
    try {
      const result = await articleRetryQueueService.retryAllFailed(
        req.user.organizationId,
      );

      await auditAction(
        req.user,
        "trigger",
        "retry_queue",
        "all",
        "Triggered retry for all failed articles",
        {
          jobsRetried: result.jobsRetried,
        },
      );

      res.json(result);
    } catch (error) {
      console.error("Error triggering retry:", error);

      await auditAction(
        req.user,
        "trigger",
        "retry_queue",
        "all",
        "Failed to trigger retry queue",
        {
          error: error.message,
        },
      );

      res.status(500).json({
        error: "Failed to trigger retry",
        message: error.message,
      });
    }
  },
);

// Manually trigger retry for a specific job
router.post(
  "/retry-queue/retry/:jobId",
  authorizePermission("drugs", "write"),
  async (req, res) => {
    try {
      const result = await articleRetryQueueService.manualRetry(
        req.params.jobId,
      );

      await auditAction(
        req.user,
        "trigger",
        "retry_queue",
        req.params.jobId,
        "Manually triggered retry for job",
        {
          jobId: req.params.jobId,
          result,
        },
      );

      res.json(result);
    } catch (error) {
      console.error("Error triggering manual retry:", error);

      await auditAction(
        req.user,
        "trigger",
        "retry_queue",
        req.params.jobId,
        "Failed to manually trigger retry for job",
        {
          jobId: req.params.jobId,
          error: error.message,
        },
      );

      res.status(500).json({
        error: "Failed to trigger manual retry",
        message: error.message,
      });
    }
  },
);

// Get external API health status (including batch processing)
router.get("/api-health", async (req, res) => {
  try {
    const comprehensiveHealthStatus =
      externalApiService.getComprehensiveHealthStatus();
    const legacyConnectionTest = await externalApiService.testConnection();
    const batchConnectionTest = await externalApiService.testBatchConnection();

    res.json({
      ...comprehensiveHealthStatus,
      connectionTests: {
        legacy: legacyConnectionTest,
        batch: batchConnectionTest,
      },
      recommendations: {
        optimalProcessingMethod:
          comprehensiveHealthStatus.overall.recommendedProcessingMethod,
        useBatchProcessing:
          comprehensiveHealthStatus.overall.performance.recommendBatch,
        reason:
          comprehensiveHealthStatus.batch.healthyEndpoints >=
          comprehensiveHealthStatus.legacy.healthyEndpoints
            ? "Batch processing has better endpoint availability"
            : "Legacy processing has better endpoint availability",
      },
    });
  } catch (error) {
    console.error("Error getting API health status:", error);
    res.status(500).json({
      error: "Failed to get API health status",
      message: error.message,
    });
  }
});

// Test batch processing endpoint
router.get("/test-batch-processing", async (req, res) => {
  try {
    const testDrugs = [
      {
        pmid: "40995636",
        drugName: "DEXAMETHASONE",
        title: "Test Study 1",
      },
      {
        pmid: "40190438",
        drugName: "ASPIRIN",
        title: "Test Study 2",
      },
      {
        pmid: "12345678",
        drugName: "IBUPROFEN",
        title: "Test Study 3",
      },
    ];

    console.log("[TEST] Testing batch processing with sample data...");

    const startTime = Date.now();
    const batchResult = await externalApiService.sendDrugDataBatchForced(
      testDrugs,
      { query: "test", sponsor: "TestSponsor", frequency: "manual" },
      {
        enableDetailedLogging: true,
        batchSize: 3,
        maxConcurrency: 2,
      },
    );
    const duration = Date.now() - startTime;

    res.json({
      success: true,
      testDuration: duration,
      batchResult,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Batch processing test failed:", error);
    res.status(500).json({
      error: "Batch processing test failed",
      message: error.message,
    });
  }
});

// Debug endpoint to check user permissions
router.get("/user-info", (req, res) => {
  console.log("User info endpoint hit");
  if (!req.user) {
    return res.json({ error: "No user authenticated", user: null });
  }

  res.json({
    user: {
      id: req.user.id,
      username: req.user.username,
      role: req.user.role,
      permissions: req.user.permissions,
      hasWritePermission: req.user.hasPermission("drugs", "write"),
      hasCreatePermission: req.user.hasPermission("drugs", "create"),
    },
  });
});

// Simple discover test endpoint without any dependencies
router.get("/discover-test", (req, res) => {
  console.log("Discover test endpoint hit");
  res.json({
    totalFound: 1,
    drugs: [
      {
        drugName: "Test Drug",
        pmid: "12345",
        title: "Test Title",
        abstract: "Test abstract",
        authors: ["Test Author"],
        journal: "Test Journal",
        publicationDate: "2024-01-01",
        relevantText: "Test text",
        confidence: 90,
      },
    ],
    searchDate: new Date().toISOString(),
    searchParams: req.query,
  });
});

// Test AI inference API connection
router.get("/external-api/test", async (req, res) => {
  try {
    console.log("Testing AI inference API connection...");
    const isConnected = await externalApiService.testConnection();

    res.json({
      success: true,
      connected: isConnected,
      message: isConnected
        ? "AI inference API connection successful"
        : "AI inference API connection failed",
      timestamp: new Date().toISOString(),
      apiUrls: [
        "http://20.242.200.176/get_AI_inference/",
        "http://20.246.204.143/get_AI_inference2/",
        "http://20.242.192.125/get_AI_inference3/",
      ],
    });
  } catch (error) {
    console.error("AI inference API test error:", error);
    res.status(500).json({
      success: false,
      connected: false,
      message: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// Scheduler management routes
router.get(
  "/scheduler/status",
  authorizePermission("drugs", "read"),
  async (req, res) => {
    try {
      const status = drugSearchScheduler.getStatus();
      res.json(status);
    } catch (error) {
      console.error("Error getting scheduler status:", error);
      res.status(500).json({
        error: "Failed to get scheduler status",
        message: error.message,
      });
    }
  },
);

router.post(
  "/scheduler/trigger",
  authorizePermission("drugs", "write"),
  async (req, res) => {
    try {
      console.log("Manual scheduler trigger requested by user:", req.user.id);
      const result = await drugSearchScheduler.triggerRun();

      await auditAction(req, "scheduler_manual_trigger", "success", {
        result: result,
      });

      res.json({
        message: "Scheduled search run triggered successfully",
        result: result,
      });
    } catch (error) {
      console.error("Error triggering scheduler:", error);

      await auditAction(req, "scheduler_manual_trigger", "failed", {
        error: error.message,
      });

      res.status(500).json({
        error: "Failed to trigger scheduled run",
        message: error.message,
      });
    }
  },
);

router.get(
  "/scheduler/due-configs",
  authorizePermission("drugs", "read"),
  async (req, res) => {
    try {
      const dueConfigs = await drugSearchScheduler.getDueConfigurations();
      res.json({
        dueConfigs: dueConfigs,
        count: dueConfigs.length,
      });
    } catch (error) {
      console.error("Error getting due configurations:", error);
      res.status(500).json({
        error: "Failed to get due configurations",
        message: error.message,
      });
    }
  },
);

router.use(auditLogger());

// Get all drugs in organization
router.get("/", authorizePermission("drugs", "read"), async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      search,
      status,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    let targetOrgId = req.user.organizationId;
    if (req.user.isSuperAdmin() && req.query.organizationId) {
      targetOrgId = req.query.organizationId;
    }

    let query = "SELECT * FROM c WHERE c.organizationId = @orgId";
    const parameters = [{ name: "@orgId", value: targetOrgId }];

    // Add filters
    if (status && status !== "all") {
      query += " AND c.status = @status";
      parameters.push({ name: "@status", value: status });
    }

    if (search) {
      query +=
        " AND (CONTAINS(UPPER(c.name), UPPER(@search)) OR CONTAINS(UPPER(c.manufacturer), UPPER(@search)) OR CONTAINS(UPPER(c.rsi), UPPER(@search)))";
      parameters.push({ name: "@search", value: search });
    }

    // Add sorting
    query += ` ORDER BY c.${sortBy} ${sortOrder.toUpperCase()}`;

    // Add pagination
    const offset = (page - 1) * limit;
    query += ` OFFSET ${offset} LIMIT ${limit}`;

    const drugs = await cosmosService.queryItems("drugs", query, parameters);

    res.json({
      drugs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: drugs.length,
      },
    });
  } catch (error) {
    console.error("Error fetching drugs:", error);
    res.status(500).json({
      error: "Failed to fetch drugs",
      message: error.message,
    });
  }
});

// Discover drugs from PubMed (MUST come before /:drugId route)
router.get(
  "/discover",
  authorizePermission("drugs", "read"), // Temporarily disabled for testing
  async (req, res) => {
    let jobId = null;

    try {
      console.log("=== DRUG DISCOVERY ROUTE CALLED ===");
      console.log("🔥🔥🔥 NEW UPDATED ROUTE IS RUNNING 🔥🔥🔥");
      console.log("Request query params:", req.query);
      console.log("User info:", {
        userId: req.user?.userId,
        organizationId: req.user?.organizationId,
      });

      const {
        query = "drug",
        sponsor = "",
        frequency = "custom",
        maxResults = 1000, // Increased default limit
        dateFrom,
        dateTo,
        includeAdverseEvents = true,
        includeSafety = true,
      } = req.query;

      const searchParams = {
        query,
        sponsor,
        frequency,
        maxResults: parseInt(maxResults),
        dateFrom,
        dateTo,
        includeAdverseEvents: includeAdverseEvents === "true",
        includeSafety: includeSafety === "true",
      };

      console.log("Discovery route called with params:", searchParams);

      console.log("🚀 NEW ASYNC JOB CREATION CODE RUNNING 🚀");

      // Create job for tracking progress
      const job = await jobTrackingService.createJob(
        "drug_discovery",
        req.user.id,
        req.user.organizationId,
        {
          totalSteps: 100, // We'll estimate steps based on process
          searchParams,
          phase: "starting",
        },
      );
      jobId = job.id;

      console.log(`Created job ${jobId} for drug discovery`);

      console.log("🎯 RETURNING JOBID TO FRONTEND IMMEDIATELY:", jobId);

      // Return jobId immediately so frontend can start tracking progress
      res.status(202).json({
        message: "Drug discovery started",
        jobId: jobId,
        status: "started",
      });

      // Continue processing asynchronously with queue management
      drugDiscoveryQueue
        .add(
          () => processDiscoveryJob(jobId, searchParams, req.user, auditAction),
          "high", // High priority for user-initiated discoveries
        )
        .catch((error) => {
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
          phase: "pubmed_completed",
          studiesFound: results.totalFound,
        },
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
            metadata: { ...job.metadata, phase: "ai_inference" },
          });

          console.log(
            "Sending drug data to external API with batch processing...",
          );

          // Create progress callback for real-time updates
          const progressCallback = async (progress) => {
            const aiProgress =
              40 + Math.round((progress.percentage / 100) * 30); // AI takes 40-70% of total progress

            await jobTrackingService.updateJob(jobId, {
              progress: aiProgress,
              currentStep: 3,
              message: `AI inference: ${progress.processed}/${progress.total} studies (${progress.percentage}%)...`,
              metadata: {
                ...job.metadata,
                phase: "ai_inference",
                aiProgress: progress,
              },
            });
          };

          const externalApiResponse = await externalApiService.sendDrugData(
            results.drugs,
            { query, sponsor, frequency },
            {
              enableDetailedLogging: true,
              progressCallback: progressCallback,
              batchSize: 16, // Process in batches of 16 for optimal performance
              maxConcurrency: 16, // Use increased concurrency limit
            },
          );

          console.log("External API batch processing response:", {
            success: externalApiResponse.success,
            method: externalApiResponse.processingMethod || "sequential",
            processedCount: externalApiResponse.processedCount,
            totalCount: externalApiResponse.totalCount,
            performance: externalApiResponse.performance,
          });

          // Add external API response to results
          results.externalApiResponse = externalApiResponse;

          // Update job - AI inference completed
          await jobTrackingService.updateJob(jobId, {
            progress: 70,
            currentStep: 4,
            message: `AI inference completed. Processing ${externalApiResponse.results?.length || 0} results...`,
            metadata: {
              ...job.metadata,
              phase: "processing_ai_results",
              aiResultsCount: externalApiResponse.results?.length || 0,
            },
          });

          // Process AI inference results and create studies
          // STRICT MODE: ALL articles MUST have AI inference
          if (
            !externalApiResponse.success ||
            !externalApiResponse.results ||
            externalApiResponse.results.length === 0
          ) {
            throw new Error(
              `AI inference failed or returned no results. Cannot create studies without AI data.`,
            );
          }

          const totalAiResults = externalApiResponse.results.length;

          // Verify 100% AI inference coverage
          if (totalAiResults < results.drugs.length) {
            const missingCount = results.drugs.length - totalAiResults;
            throw new Error(
              `AI inference incomplete: Only ${totalAiResults}/${results.drugs.length} articles processed. Missing ${missingCount} AI inferences. Cannot proceed.`,
            );
          }

          console.log(
            `=== Processing ${totalAiResults} AI inference results (100% coverage) ===`,
          );

          for (let i = 0; i < externalApiResponse.results.length; i++) {
            const aiResult = externalApiResponse.results[i];
            try {
              if (!aiResult || !aiResult.pmid || !aiResult.aiInference) {
                throw new Error(
                  `Invalid AI result at index ${i}: Missing pmid or aiInference data`,
                );
              }

              console.log(
                `Processing PMID: ${aiResult.pmid} (${i + 1}/${totalAiResults})`,
              );

              // Update progress for each study being processed
              const studyProgress = 70 + Math.round((i / totalAiResults) * 25);
              await jobTrackingService.updateJob(jobId, {
                progress: studyProgress,
                currentStep: 4,
                message: `Creating study ${i + 1}/${totalAiResults} (PMID: ${aiResult.pmid})...`,
                metadata: {
                  ...job.metadata,
                  phase: "creating_studies",
                  currentStudy: i + 1,
                  totalStudies: totalAiResults,
                },
              });

              // Check for duplicate PMID in the database
              const duplicateQuery =
                "SELECT * FROM c WHERE c.pmid = @pmid AND c.organizationId = @organizationId";
              const duplicateParams = [
                { name: "@pmid", value: aiResult.pmid },
                { name: "@organizationId", value: req.user.organizationId },
              ];
              const existingStudies = await cosmosService.queryItems(
                "studies",
                duplicateQuery,
                duplicateParams,
              );

              if (existingStudies && existingStudies.length > 0) {
                console.log(
                  `Skipping duplicate PMID: ${aiResult.pmid} - already exists in database`,
                );
                continue;
              }

              console.log(
                `✓ Creating study WITH AI inference for PMID: ${aiResult.pmid}`,
              );

              // Handle different result formats from different API services
              const originalDrug =
                aiResult.originalDrug || aiResult.originalItem || {};

              // Create study from AI inference data
              const study = Study.fromAIInference(
                aiResult.aiInference,
                originalDrug,
                req.user.organizationId,
                req.user.id,
              );

              // Update status based on ICSR classification or confirmed potential ICSR
              if (study.icsrClassification || study.confirmedPotentialICSR) {
                study.status = "Under Triage Review";
                console.log(
                  `Setting status to 'Under Triage Review' for PMID ${aiResult.pmid} due to ICSR classification`,
                );
              }

              // Store study in database
              const createdStudy = await cosmosService.createItem(
                "studies",
                study.toJSON(),
              );
              studiesCreated++;
              console.log(
                `✅ Successfully created study with AI data for PMID: ${aiResult.pmid}, ID: ${createdStudy.id}`,
              );
            } catch (studyError) {
              console.error(
                `❌ Error creating study for PMID ${aiResult.pmid}:`,
                studyError,
              );
              throw new Error(
                `Failed to create study for PMID ${aiResult.pmid}: ${studyError.message}`,
              );
            }
          }

          console.log(`=== Study Creation Complete ===`);
          console.log(
            `✅ Successfully created ${studiesCreated} studies with 100% AI inference coverage`,
          );
        } catch (error) {
          console.error("❌ External API call failed:", error);
          // FAIL THE ENTIRE JOB - DO NOT CREATE FALLBACK STUDIES
          throw new Error(
            `AI inference failed: ${error.message}. Cannot create studies without AI data.`,
          );
        }
      } else {
        // No drugs to process
        throw new Error("No drugs found to process");
      }

      // Complete the job successfully
      await jobTrackingService.completeJob(
        jobId,
        {
          totalFound: results.totalFound,
          studiesCreated,
          externalApiSuccess: results.externalApiResponse?.success || false,
          searchParams,
        },
        `Discovery completed: Found ${results.totalFound} studies, created ${studiesCreated} study records`,
      );

      await auditAction(req, "drug_discovery", "success", {
        jobId,
        discoveredCount: results.totalFound,
        studiesCreated,
        searchParams,
      });

      console.log("Sending successful response to frontend");
      res.json({
        ...results,
        jobId,
        studiesCreated,
      });
    } catch (error) {
      console.error("=== DRUG DISCOVERY ERROR ===");
      console.error("Error type:", error.constructor.name);
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);

      // Fail the job if one was created
      if (jobId) {
        try {
          await jobTrackingService.failJob(jobId, error.message);
        } catch (jobError) {
          console.error("Error updating job status:", jobError);
        }
      }

      await auditAction(req, "drug_discovery", "failed", {
        jobId,
        error: error.message,
      });

      console.log("Sending error response to frontend");
      res.status(500).json({
        error: "Drug discovery failed",
        message: error.message,
        jobId,
      });
    }
  },
);

// ===============================
// DRUG SEARCH CONFIGURATION ROUTES (MUST BE BEFORE /:drugId)
// ===============================

// Get all drug search configurations for user
router.get(
  "/search-configs",
  authorizePermission("drugs", "read"),
  async (req, res) => {
    try {
      console.log("GET /search-configs - Starting request");
      const { page = 1, limit = 50, active = "all" } = req.query;

      // Build query filter - organization-wide, not user-specific
      let targetOrgId = req.user.organizationId;
      if (req.user.isSuperAdmin() && req.query.organizationId) {
        targetOrgId = req.query.organizationId;
      }

      let filter = {
        organizationId: targetOrgId,
        // Removed userId filter - configs should be visible to all users in the organization
      };

      console.log("Query filter:", filter);

      if (active === "true") {
        filter.isActive = true;
      } else if (active === "false") {
        filter.isActive = false;
      }

      console.log("Final filter:", filter);

      // Build SQL query
      let queryParts = [
        "SELECT * FROM c WHERE c.organizationId = @organizationId",
      ];
      let parameters = [
        { name: "@organizationId", value: filter.organizationId },
      ];

      if (filter.hasOwnProperty("isActive")) {
        queryParts.push("AND c.isActive = @isActive");
        parameters.push({ name: "@isActive", value: filter.isActive });
      }

      const sqlQuery = queryParts.join(" ");
      console.log("SQL Query:", sqlQuery);
      console.log("Parameters:", parameters);

      const configs = await cosmosService.queryItems(
        "drugSearchConfigs",
        sqlQuery,
        parameters,
      );

      console.log("Raw configs from DB:", configs.length, configs);

      const configObjects = configs.map((config) =>
        DrugSearchConfig.fromObject(config),
      );

      console.log("Processed config objects:", configObjects.length);
      const response = {
        configs: configObjects.map((c) => c.toObject()),
        total: configs.length,
        page: parseInt(page),
        limit: parseInt(limit),
      };

      console.log("Sending response:", response);
      res.json(response);
    } catch (error) {
      console.error("Error fetching drug search configs:", error);
      res.status(500).json({
        error: "Failed to fetch drug search configurations",
        message: error.message,
      });
    }
  },
);

// Debug route to test configuration data
router.post(
  "/search-configs/debug",
  authorizePermission("drugs", "write"),
  async (req, res) => {
    try {
      console.log(
        "Debug route - received data:",
        JSON.stringify(req.body, null, 2),
      );
      console.log("User info:", {
        id: req.user.id,
        organizationId: req.user.organizationId,
      });

      res.json({
        message: "Debug successful",
        receivedData: req.body,
        userInfo: { id: req.user.id, organizationId: req.user.organizationId },
      });
    } catch (error) {
      console.error("Debug route error:", error);
      res.status(500).json({ error: error.message });
    }
  },
);

// Create new drug search configuration
router.post(
  "/search-configs",
  [
    body("name")
      .isLength({ min: 1, max: 100 })
      .withMessage("Name must be 1-100 characters"),
    body("query")
      .isLength({ min: 1, max: 200 })
      .withMessage("Query must be 1-200 characters"),
    body("sponsor")
      .notEmpty()
      .withMessage("Sponsor is required")
      .isLength({ max: 100 })
      .withMessage("Sponsor must be max 100 characters"),
    body("brandName")
      .optional()
      .isLength({ max: 100 })
      .withMessage("Brand name must be max 100 characters"),
    body("frequency")
      .isIn(["daily", "weekly", "monthly", "custom", "manual"])
      .withMessage("Invalid frequency"),
    body("customFrequencyHours")
      .optional()
      .isInt({ min: 1, max: 8760 })
      .withMessage("Custom frequency must be 1-8760 hours"),
    body("nextRunAt")
      .optional()
      .isISO8601()
      .withMessage("Next run at must be a valid ISO 8601 date"),
    body("maxResults")
      .optional()
      .isInt({ min: 1, max: 10000 })
      .withMessage("Max results must be 1-10000"),
    body("includeAdverseEvents")
      .optional()
      .isBoolean()
      .withMessage("Include adverse events must be boolean"),
    body("includeSafety")
      .optional()
      .isBoolean()
      .withMessage("Include safety must be boolean"),
    body("sendToExternalApi")
      .optional()
      .isBoolean()
      .withMessage("Send to external API must be boolean"),
    body("dateFrom")
      .optional({ nullable: true })
      .custom((value) => {
        // Accepting YYYY-MM-DD or YYYY/MM/DD or empty string
        if (!value) return true;
        if (value && !value.match(/^\d{4}[-\/]\d{2}[-\/]\d{2}$/)) {
          throw new Error(
            "Date from must be in YYYY-MM-DD or YYYY/MM/DD format",
          );
        }
        return true;
      }),
    body("dateTo")
      .optional({ nullable: true })
      .custom((value) => {
        // Accepting YYYY-MM-DD or YYYY/MM/DD or empty string
        if (!value) return true;
        if (value && !value.match(/^\d{4}[-\/]\d{2}[-\/]\d{2}$/)) {
          throw new Error("Date to must be in YYYY-MM-DD or YYYY/MM/DD format");
        }
        return true;
      }),
  ],
  authorizePermission("drugs", "write"),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.error("Validation errors:", errors.array());
        console.error("Request body:", req.body);
        return res.status(400).json({
          error: "Validation failed",
          details: errors.array(),
          receivedData: req.body,
        });
      }

      const configData = {
        ...req.body,
        organizationId: req.user.organizationId,
        userId: req.user.id,
        createdBy: req.user.id,
      };

      console.log("📝 Creating config with received data:", req.body);
      console.log(
        "📝 Final config data before DrugSearchConfig creation:",
        configData,
      );

      const config = new DrugSearchConfig(configData);

      // Validate the configuration
      const validationErrors = config.validate();
      if (validationErrors.length > 0) {
        console.error("DrugSearchConfig validation errors:", validationErrors);
        console.error("Config data used:", configData);
        return res.status(400).json({
          error: "Configuration validation failed",
          details: validationErrors,
          configData: configData,
        });
      }

      // Set initial next run time if not manual
      if (config.frequency !== "manual") {
        config.nextRunAt = config.calculateNextRun();
      }

      await cosmosService.createItem("drugSearchConfigs", config.toObject());

      await auditAction(
        req.user,
        "create",
        "drug_search_config",
        config.id,
        `Created drug search configuration: ${config.name}`,
        {
          configId: config.id,
          name: config.name,
          query: config.query,
          frequency: config.frequency,
        },
        null,
        config.toObject(),
      );

      res.status(201).json({
        message: "Drug search configuration created successfully",
        config: config.toObject(),
      });
    } catch (error) {
      console.error("Error creating drug search config:", error);

      await auditAction(
        req.user,
        "create",
        "drug_search_config",
        null,
        `Failed to create drug search configuration: ${error.message}`,
        { error: error.message },
      );

      res.status(500).json({
        error: "Failed to create drug search configuration",
        message: error.message,
      });
    }
  },
);

// Manually trigger a drug search configuration
router.post(
  "/search-configs/:configId/run",
  authorizePermission("drugs", "write"),
  async (req, res) => {
    try {
      const config = await cosmosService.getItem(
        "drugSearchConfigs",
        req.params.configId,
        req.user.organizationId,
      );

      if (!config) {
        return res.status(404).json({
          error: "Drug search configuration not found",
        });
      }

      // Allow access if user is admin/superadmin OR owns the config OR has explicit write permission
      const hasWritePermission =
        req.user.permissions?.drugs?.write === true ||
        (req.user.hasPermission && req.user.hasPermission("drugs", "write"));

      const isAdminOrOwner =
        req.user.role === "admin" ||
        req.user.role === "superadmin" ||
        config.userId === req.user.id ||
        hasWritePermission;

      if (!isAdminOrOwner) {
        return res.status(403).json({
          error: "Access denied to this configuration",
        });
      }

      const configObject = DrugSearchConfig.fromObject(config);

      console.log("🚀 SEARCH CONFIG RUN - NEW ASYNC JOB CREATION 🚀");
      console.log("🗓️ Config dates:", {
        dateFrom: configObject.dateFrom,
        dateTo: configObject.dateTo,
        frequency: configObject.frequency,
      });
      console.log("🗂️ Full config object:", {
        name: configObject.name,
        query: configObject.query,
        sponsor: configObject.sponsor,
        frequency: configObject.frequency,
        dateFrom: configObject.dateFrom,
        dateTo: configObject.dateTo,
      });

      // Create job for tracking progress
      const job = await jobTrackingService.createJob(
        "drug_discovery",
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
            includeSafety: configObject.includeSafety,
            dateFrom: configObject.dateFrom, // Add missing date parameters
            dateTo: configObject.dateTo, // Add missing date parameters
          },
          phase: "starting",
          configId: req.params.configId,
          configName: configObject.name,
        },
      );
      const jobId = job.id;

      console.log(`🎯 RETURNING JOBID TO FRONTEND FOR CONFIG RUN: ${jobId}`);

      // Return jobId immediately so frontend can start tracking progress
      res.status(202).json({
        message: `Drug search started for config "${configObject.name}"`,
        jobId: jobId,
        status: "started",
        configName: configObject.name,
      });

      // Continue processing asynchronously with queue management
      searchConfigQueue
        .add(
          () =>
            processSearchConfigJob(jobId, configObject, req.user, auditAction),
          "high", // High priority for user-initiated searches
        )
        .catch((error) => {
          console.error(`Queued search config job ${jobId} failed:`, error);
        });

      return; // Exit early, processing continues in background
    } catch (error) {
      console.error("Error running drug search config:", error);

      await auditAction(
        req.user,
        "run",
        "drug_search_config",
        req.params.configId,
        `Failed to execute drug search configuration: ${error.message}`,
        {
          configId: req.params.configId,
          error: error.message,
        },
      );

      res.status(500).json({
        error: "Failed to run drug search",
        message: error.message,
      });
    }
  },
);

// Get specific drug search configuration
router.get(
  "/search-configs/:configId",
  authorizePermission("drugs", "read"),
  async (req, res) => {
    try {
      const config = await cosmosService.getItem(
        "drugSearchConfigs",
        req.params.configId,
        req.user.organizationId,
      );

      if (!config) {
        return res.status(404).json({
          error: "Drug search configuration not found",
        });
      }

      // Allow read access to all users in the organization (no ownership check for GET)
      // Users can view all configs in their org, but can only modify their own (unless admin)

      const configObject = DrugSearchConfig.fromObject(config);
      res.json(configObject.toObject());
    } catch (error) {
      console.error("Error fetching drug search config:", error);
      res.status(500).json({
        error: "Failed to fetch drug search configuration",
        message: error.message,
      });
    }
  },
);

// Update drug search configuration
router.put(
  "/search-configs/:configId",
  [
    body("name")
      .optional()
      .isLength({ min: 1, max: 100 })
      .withMessage("Name must be 1-100 characters"),
    body("query")
      .optional()
      .isLength({ min: 1, max: 200 })
      .withMessage("Query must be 1-200 characters"),
    body("sponsor")
      .optional()
      .isLength({ max: 100 })
      .withMessage("Sponsor must be max 100 characters"),
    body("frequency")
      .optional()
      .isIn(["daily", "weekly", "monthly", "custom", "manual"])
      .withMessage("Invalid frequency"),
    body("customFrequencyHours")
      .optional()
      .isInt({ min: 1, max: 8760 })
      .withMessage("Custom frequency must be 1-8760 hours"),
  ],
  authorizePermission("drugs", "write"),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: "Validation failed",
          details: errors.array(),
        });
      }

      const existingConfig = await cosmosService.getItem(
        "drugSearchConfigs",
        req.params.configId,
        req.user.organizationId,
      );

      if (!existingConfig) {
        return res.status(404).json({
          error: "Drug search configuration not found",
        });
      }

      // Allow modification if user is admin/superadmin OR owns the config OR has explicit write permission
      // We check explicit permission here because authorizePermission middleware check at the route level
      // only verifies the capability, but this block was enforcing strict ownership. We want to allow
      // users with the 'write' permission to edit any config if they have the role.
      const hasWritePermission =
        req.user.permissions?.drugs?.write === true ||
        (req.user.hasPermission && req.user.hasPermission("drugs", "write"));

      const isAdminOrOwner =
        req.user.role === "admin" ||
        req.user.role === "superadmin" ||
        existingConfig.userId === req.user.id ||
        hasWritePermission;

      if (!isAdminOrOwner) {
        return res.status(403).json({
          error: "Access denied to this configuration",
        });
      }

      // Update the configuration
      const updatedData = {
        ...existingConfig,
        ...req.body,
        updatedAt: new Date().toISOString(),
      };

      const config = new DrugSearchConfig(updatedData);

      // Recalculate next run if frequency changed
      if (
        req.body.frequency &&
        req.body.frequency !== existingConfig.frequency
      ) {
        config.nextRunAt = config.calculateNextRun();
      }

      const validationErrors = config.validate();
      if (validationErrors.length > 0) {
        return res.status(400).json({
          error: "Configuration validation failed",
          details: validationErrors,
        });
      }

      await cosmosService.updateItem(
        "drugSearchConfigs",
        config.id,
        config.toObject(),
      );

      await auditAction(
        req.user,
        "update",
        "drug_search_config",
        config.id,
        `Updated drug search configuration: ${config.name}`,
        {
          configId: config.id,
          changes: req.body,
        },
        existingConfig,
        config.toObject(),
      );

      res.json({
        message: "Drug search configuration updated successfully",
        config: config.toObject(),
      });
    } catch (error) {
      console.error("Error updating drug search config:", error);

      await auditAction(
        req.user,
        "update",
        "drug_search_config",
        req.params.configId,
        `Failed to update drug search configuration: ${error.message}`,
        {
          configId: req.params.configId,
          error: error.message,
        },
      );

      res.status(500).json({
        error: "Failed to update drug search configuration",
        message: error.message,
      });
    }
  },
);

// Delete drug search configuration
router.delete(
  "/search-configs/:configId",
  authorizePermission("drugs", "delete"),
  async (req, res) => {
    try {
      const existingConfig = await cosmosService.getItem(
        "drugSearchConfigs",
        req.params.configId,
        req.user.organizationId,
      );

      if (!existingConfig) {
        return res.status(404).json({
          error: "Drug search configuration not found",
        });
      }

      // Allow deletion if user is admin/superadmin OR owns the config
      const isAdminOrOwner =
        req.user.role === "admin" ||
        req.user.role === "superadmin" ||
        existingConfig.userId === req.user.id;

      if (!isAdminOrOwner) {
        return res.status(403).json({
          error: "Access denied to this configuration",
        });
      }

      await cosmosService.deleteItem(
        "drugSearchConfigs",
        req.params.configId,
        req.user.organizationId,
      );

      await auditAction(
        req.user,
        "delete",
        "drug_search_config",
        req.params.configId,
        `Deleted drug search configuration: ${existingConfig.name}`,
        {
          configId: req.params.configId,
          name: existingConfig.name,
        },
      );

      res.json({
        message: "Drug search configuration deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting drug search config:", error);

      await auditAction(
        req.user,
        "delete",
        "drug_search_config",
        req.params.configId,
        `Failed to delete drug search configuration: ${error.message}`,
        {
          configId: req.params.configId,
          error: error.message,
        },
      );

      res.status(500).json({
        error: "Failed to delete drug search configuration",
        message: error.message,
      });
    }
  },
);

// Get specific drug
router.get(
  "/:drugId",
  authorizePermission("drugs", "read"),
  async (req, res) => {
    try {
      const drug = await cosmosService.getItem(
        "drugs",
        req.params.drugId,
        req.user.organizationId,
      );

      if (!drug) {
        return res.status(404).json({
          error: "Drug not found",
        });
      }

      res.json(drug);
    } catch (error) {
      console.error("Error fetching drug:", error);
      res.status(500).json({
        error: "Failed to fetch drug",
        message: error.message,
      });
    }
  },
);

// Create new drug
router.post(
  "/",
  authorizePermission("drugs", "write"),
  [
    body("name").isLength({ min: 2 }),
    body("manufacturer").isLength({ min: 2 }),
    body("query").isLength({ min: 3 }),
    body("rsi").isLength({ min: 1 }),
    body("nextSearchDate").isISO8601(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: "Validation failed",
          details: errors.array(),
        });
      }

      const drugData = {
        ...req.body,
        organizationId: req.user.organizationId,
        createdBy: req.user.id,
      };

      // Validate drug data
      const validationErrors = Drug.validate(drugData);
      if (validationErrors.length > 0) {
        return res.status(400).json({
          error: "Drug validation failed",
          details: validationErrors,
        });
      }

      // Check if drug name already exists in organization
      const existingDrugs = await cosmosService.queryItems(
        "drugs",
        "SELECT * FROM c WHERE c.organizationId = @orgId AND UPPER(c.name) = UPPER(@name)",
        [
          { name: "@orgId", value: req.user.organizationId },
          { name: "@name", value: drugData.name },
        ],
      );

      if (existingDrugs.length > 0) {
        return res.status(409).json({
          error: "Drug with this name already exists in your organization",
        });
      }

      // Create drug instance
      const drug = new Drug(drugData);

      // Save to database
      const createdDrug = await cosmosService.createItem(
        "drugs",
        drug.toJSON(),
      );

      // Create audit log
      await auditAction(
        req.user,
        "create",
        "drug",
        createdDrug.id,
        `Created new drug: ${drug.name}`,
        { manufacturer: drug.manufacturer, rsi: drug.rsi },
        null,
        createdDrug,
      );

      res.status(201).json({
        message: "Drug created successfully",
        drug: createdDrug,
      });
    } catch (error) {
      console.error("Error creating drug:", error);
      res.status(500).json({
        error: "Failed to create drug",
        message: error.message,
      });
    }
  },
);

// Update drug
router.put(
  "/:drugId",
  authorizePermission("drugs", "write"),
  [
    body("name").optional().isLength({ min: 2 }),
    body("manufacturer").optional().isLength({ min: 2 }),
    body("query").optional().isLength({ min: 3 }),
    body("rsi").optional().isLength({ min: 1 }),
    body("nextSearchDate").optional().isISO8601(),
    body("status").optional().isIn(["Active", "Inactive", "Suspended"]),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: "Validation failed",
          details: errors.array(),
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
      const existingDrug = await cosmosService.getItem(
        "drugs",
        drugId,
        req.user.organizationId,
      );
      if (!existingDrug) {
        return res.status(404).json({
          error: "Drug not found",
        });
      }

      // Check if name is being changed and if it's unique
      if (updates.name && updates.name !== existingDrug.name) {
        const duplicateDrugs = await cosmosService.queryItems(
          "drugs",
          "SELECT * FROM c WHERE c.organizationId = @orgId AND UPPER(c.name) = UPPER(@name)",
          [
            { name: "@orgId", value: req.user.organizationId },
            { name: "@name", value: updates.name },
          ],
        );

        if (duplicateDrugs.length > 0) {
          return res.status(409).json({
            error: "Drug with this name already exists in your organization",
          });
        }
      }

      // Validate updates
      const tempDrug = { ...existingDrug, ...updates };
      const validationErrors = Drug.validate(tempDrug);
      if (validationErrors.length > 0) {
        return res.status(400).json({
          error: "Validation failed",
          details: validationErrors,
        });
      }

      // Update drug
      const updatedDrug = await cosmosService.updateItem(
        "drugs",
        drugId,
        req.user.organizationId,
        updates,
      );

      // Create audit log
      await auditAction(
        req.user,
        "update",
        "drug",
        drugId,
        `Updated drug: ${updatedDrug.name}`,
        { updates: Object.keys(updates) },
        existingDrug,
        updatedDrug,
      );

      res.json({
        message: "Drug updated successfully",
        drug: updatedDrug,
      });
    } catch (error) {
      console.error("Error updating drug:", error);
      res.status(500).json({
        error: "Failed to update drug",
        message: error.message,
      });
    }
  },
);

// Delete drug
router.delete(
  "/:drugId",
  authorizePermission("drugs", "delete"),
  async (req, res) => {
    try {
      const { drugId } = req.params;

      // Check if drug exists
      const drug = await cosmosService.getItem(
        "drugs",
        drugId,
        req.user.organizationId,
      );
      if (!drug) {
        return res.status(404).json({
          error: "Drug not found",
        });
      }

      // Check if drug is referenced in any studies
      const relatedStudies = await cosmosService.queryItems(
        "studies",
        "SELECT c.id FROM c WHERE c.organizationId = @orgId AND UPPER(c.drugName) = UPPER(@drugName)",
        [
          { name: "@orgId", value: req.user.organizationId },
          { name: "@drugName", value: drug.name },
        ],
      );

      if (relatedStudies.length > 0) {
        return res.status(400).json({
          error: "Cannot delete drug that is referenced in studies",
          relatedStudies: relatedStudies.length,
        });
      }

      // Delete drug
      await cosmosService.deleteItem("drugs", drugId, req.user.organizationId);

      // Create audit log
      await auditAction(
        req.user,
        "delete",
        "drug",
        drugId,
        `Deleted drug: ${drug.name}`,
        { manufacturer: drug.manufacturer, rsi: drug.rsi },
      );

      res.json({
        message: "Drug deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting drug:", error);
      res.status(500).json({
        error: "Failed to delete drug",
        message: error.message,
      });
    }
  },
);

// Bulk operations
router.post(
  "/bulk/status",
  authorizePermission("drugs", "write"),
  [
    body("drugIds").isArray({ min: 1 }),
    body("status").isIn(["Active", "Inactive", "Suspended"]),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: "Validation failed",
          details: errors.array(),
        });
      }

      const { drugIds, status } = req.body;
      const results = [];
      const failures = [];

      for (const drugId of drugIds) {
        try {
          const drug = await cosmosService.getItem(
            "drugs",
            drugId,
            req.user.organizationId,
          );
          if (drug) {
            await cosmosService.updateItem(
              "drugs",
              drugId,
              req.user.organizationId,
              { status, updatedAt: new Date().toISOString() },
            );
            results.push(drugId);
          } else {
            failures.push({ drugId, error: "Drug not found" });
          }
        } catch (error) {
          failures.push({ drugId, error: error.message });
        }
      }

      // Create audit log
      await auditAction(
        req.user,
        "update",
        "drug",
        "bulk",
        `Bulk status update: ${results.length} drugs set to ${status}`,
        { updatedCount: results.length, failedCount: failures.length },
      );

      res.json({
        message: `Bulk status update completed`,
        results: {
          updated: results.length,
          failed: failures.length,
        },
        failures,
      });
    } catch (error) {
      console.error("Error in bulk status update:", error);
      res.status(500).json({
        error: "Bulk status update failed",
        message: error.message,
      });
    }
  },
);

// Search for specific drug in PubMed
router.get(
  "/search/:drugName",
  authorizePermission("drugs", "read"),
  async (req, res) => {
    try {
      const { drugName } = req.params;
      const {
        maxResults = 20,
        includeAdverseEvents = true,
        includeSafety = true,
        includeToxicity = false,
      } = req.query;

      const pmids = await pubmedService.searchDrugs(drugName, {
        maxResults: parseInt(maxResults),
        includeAdverseEvents: includeAdverseEvents === "true",
        includeSafety: includeSafety === "true",
        includeToxicity: includeToxicity === "true",
      });

      let articles = [];
      if (pmids.length > 0) {
        articles = await pubmedService.fetchDetails(pmids);
      }

      await auditAction(
        req.user,
        "search",
        "drug",
        drugName,
        `Searched for drug: ${drugName}`,
        {
          drugName,
          foundArticles: articles.length,
          searchParams: req.query,
        },
      );

      res.json({
        drugName,
        pmids,
        articles,
        totalFound: articles.length,
        query: pubmedService.generateDrugQuery(drugName, req.query),
      });
    } catch (error) {
      console.error("Drug search error:", error);

      await auditAction(req, "drug_search", "failed", {
        drugName: req.params.drugName,
        error: error.message,
      });

      res.status(500).json({
        error: "Drug search failed",
        message: error.message,
      });
    }
  },
);

// Get drug summary (PubMed + Clinical Trials)
router.get(
  "/summary/:drugName",
  authorizePermission("drugs", "read"),
  async (req, res) => {
    try {
      const { drugName } = req.params;
      const { maxResults = 20 } = req.query;

      // Get both PubMed and clinical trials data in parallel
      const [pubmedSummary, clinicalTrialsSummary] = await Promise.all([
        pubmedService.getDrugSummary(drugName, {
          maxResults: parseInt(maxResults),
        }),
        clinicalTrialsService.getDrugStudySummary(drugName, { maxResults: 10 }),
      ]);

      await auditAction(req, "drug_summary", "success", {
        drugName,
        pubmedArticles: pubmedSummary.articles.length,
        clinicalTrials: clinicalTrialsSummary.totalStudies,
      });

      res.json({
        drugName,
        pubmedData: pubmedSummary,
        clinicalTrialsData: clinicalTrialsSummary,
        generatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Drug summary error:", error);

      await auditAction(req, "drug_summary", "failed", {
        drugName: req.params.drugName,
        error: error.message,
      });

      res.status(500).json({
        error: "Drug summary failed",
        message: error.message,
      });
    }
  },
);

// Import drug from discovery results
router.post(
  "/import",
  // authorizePermission('drugs', 'create'), // Temporarily disabled for testing
  [
    body("drugName").notEmpty().withMessage("Drug name is required"),
    body("pmid").notEmpty().withMessage("PMID is required"),
    body("manufacturer").optional(),
    body("description").optional(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: "Validation failed",
          details: errors.array(),
        });
      }

      const { drugName, pmid, manufacturer, description, relevantText } =
        req.body;

      // Generate RSI and query
      const rsi = `RSI-${drugName.toUpperCase().replace(/\s+/g, "-")}-${Date.now().toString().slice(-6)}`;
      const query = pubmedService.generateDrugQuery(drugName);

      // Create drug object
      const drugData = {
        organizationId: req.user.organizationId,
        name: drugName,
        manufacturer: manufacturer || "Unknown",
        query,
        rsi,
        nextSearchDate: new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000,
        ).toISOString(), // 30 days from now
        status: "Active",
        description:
          description || relevantText || `Imported from PubMed article ${pmid}`,
        sourceData: {
          pmid,
          relevantText,
          importDate: new Date().toISOString(),
          importedBy: req.user.id,
        },
        createdBy: req.user.id,
      };

      const drug = new Drug(drugData);
      await cosmosService.createItem("drugs", drug.toJSON());

      await auditAction(req, "drug_import", "success", {
        drugName,
        pmid,
        rsi,
        drugId: drug.id,
      });

      res.status(201).json({
        message: "Drug imported successfully",
        drug: drug.toJSON(),
      });
    } catch (error) {
      console.error("Drug import error:", error);

      await auditAction(req, "drug_import", "failed", {
        drugName: req.body.drugName,
        error: error.message,
      });

      res.status(500).json({
        error: "Drug import failed",
        message: error.message,
      });
    }
  },
);

// ===============================
// DRUG SEARCH CONFIGURATION ROUTES
// ===============================

// Test route to verify drug routes are working (no auth required)
router.get("/test-no-auth", (req, res) => {
  res.json({ message: "Drug routes working - no auth required" });
});

// Test route to verify drug routes are working (with auth but no permission check)

// Async function to process drug discovery job - NOW WITH GUARANTEED ARTICLE PROCESSING
async function processDiscoveryJob(jobId, searchParams, user, auditAction) {
  try {
    const {
      query = "drug",
      sponsor = "",
      frequency = "custom",
      maxResults = 1000,
      dateFrom,
      dateTo,
      includeAdverseEvents = true,
      includeSafety = true,
    } = searchParams;

    console.log(`\n${"=".repeat(70)}`);
    console.log(
      `[DrugDiscovery] Processing job ${jobId} with GUARANTEED article processing`,
    );
    console.log(`${"=".repeat(70)}\n`);

    // Validate date parameters if provided
    if (dateFrom && !/^\d{4}\/\d{2}\/\d{2}$/.test(dateFrom)) {
      await jobTrackingService.failJob(
        jobId,
        "Invalid dateFrom format. Use YYYY/MM/DD format",
      );
      return;
    }
    if (dateTo && !/^\d{4}\/\d{2}\/\d{2}$/.test(dateTo)) {
      await jobTrackingService.failJob(
        jobId,
        "Invalid dateTo format. Use YYYY/MM/DD format",
      );
      return;
    }

    // Update job progress - starting PubMed search
    await jobTrackingService.updateJob(jobId, {
      progress: 10,
      currentStep: 1,
      message: "Starting PubMed search...",
      metadata: { phase: "pubmed_search" },
    });

    // Call the improved discoverDrugs method with new parameters
    console.log("[DrugDiscovery] Calling pubmedService.discoverDrugs...");

    const results = await pubmedService.discoverDrugs(searchParams);

    console.log("[DrugDiscovery] PubMed search completed:", {
      totalFound: results.totalFound,
      drugsLength: results.drugs?.length || 0,
    });

    // Update job progress - PubMed search completed
    await jobTrackingService.updateJob(jobId, {
      progress: 25,
      currentStep: 2,
      message: `Found ${results.totalFound} articles from PubMed. Starting AI processing...`,
      metadata: {
        phase: "pubmed_completed",
        studiesFound: results.totalFound,
        totalStudies: results.totalFound, // Ensure totalStudies is set
        searchParams: searchParams, // Preserve search params
      },
    });

    // Process articles with GUARANTEED study creation using retry queue
    let processResult = { studiesCreated: 0, failedArticles: [] };

    if (results.drugs && results.drugs.length > 0) {
      // Update job - starting AI inference with guaranteed processing
      await jobTrackingService.updateJob(jobId, {
        progress: 30,
        currentStep: 3,
        message: `Processing ${results.drugs.length} articles with AI inference (guaranteed mode)...`,
        metadata: {
          phase: "ai_inference_guaranteed",
          studiesFound: results.totalFound,
          totalStudies: results.totalFound,
          aiProcessed: 0,
          aiTotal: results.totalFound,
          searchParams: searchParams,
        },
      });

      console.log(
        `[DrugDiscovery] Using ArticleRetryQueue for GUARANTEED processing of ${results.drugs.length} articles`,
      );

      // Track counts per workflow track for live display
      const trackCounts = { ICSR: 0, AOI: 0, NoCase: 0 };

      // Use the retry queue service for guaranteed processing
      processResult =
        await articleRetryQueueService.processArticlesWithGuarantee(
          results.drugs,
          { query, sponsor, frequency },
          user.organizationId,
          user.id,
          {
            enableDetailedLogging: true,
            batchSize: 16,
            maxConcurrency: 16,
            // Called when AI analysis finishes for the batch
            onAiComplete: async (aiResultCount) => {
              await jobTrackingService.updateJob(jobId, {
                progress: 55,
                currentStep: 3,
                message: `AI analysis complete for ${aiResultCount} articles. Creating studies...`,
                metadata: {
                  phase: "study_creation",
                  studiesFound: results.totalFound,
                  totalStudies: results.totalFound,
                  aiProcessed: aiResultCount,
                  aiTotal: results.totalFound,
                  studiesCreated: 0,
                  currentStudy: 0,
                  duplicatesSkipped: 0,
                  trackCounts,
                  searchParams,
                },
              });
            },
            // Called after each individual study is saved to DB
            onStudyCreated: async (info) => {
              try {
                // Update track counts
                if (info.track === "ICSR") trackCounts.ICSR++;
                else if (info.track === "AOI") trackCounts.AOI++;
                else if (info.track === "NoCase") trackCounts.NoCase++;

                const progressPercent =
                  55 + Math.round((info.created / info.total) * 40);
                await jobTrackingService.updateJob(jobId, {
                  progress: progressPercent,
                  currentStep: 3,
                  message: `Creating studies: ${info.created}/${info.total} (PMID ${info.pmid})`,
                  metadata: {
                    phase: "study_creation",
                    studiesFound: results.totalFound,
                    totalStudies: results.totalFound,
                    aiProcessed: info.total,
                    aiTotal: info.total,
                    studiesCreated: info.created,
                    currentStudy: info.created,
                    duplicatesSkipped: info.duplicates,
                    trackCounts: { ...trackCounts },
                    searchParams,
                  },
                });
              } catch (err) {
                console.warn(
                  `[DrugDiscovery] onStudyCreated progress update failed:`,
                  err.message,
                );
              }
            },
            progressCallback: (() => {
              // Throttle: only persist to DB every 3 articles or every 2 s,
              // but ALWAYS update in-memory so polls return fresh data.
              let lastWriteTime = 0;
              let lastWrittenCount = 0;
              const INTERVAL_MS = 2000;
              const ITEM_INTERVAL = 3;

              return async (progress) => {
                try {
                  const progressPercent =
                    30 + Math.round((progress.processed / progress.total) * 25);
                  const updates = {
                    progress: progressPercent,
                    currentStep: 3,
                    message: `AI processing: ${progress.processed}/${progress.total} articles (${Math.round((progress.processed / progress.total) * 100)}%)...`,
                    metadata: {
                      phase: "ai_inference",
                      aiProgress: progress,
                      aiProcessed: progress.processed,
                      aiTotal: progress.total,
                      totalStudies: progress.total,
                      currentStudy: 0,
                      studiesFound: results.totalFound,
                      trackCounts: { ...trackCounts },
                      searchParams,
                    },
                  };

                  const now = Date.now();
                  const isFinal = progress.processed >= progress.total;
                  const elapsed = now - lastWriteTime;
                  const itemsDelta = progress.processed - lastWrittenCount;
                  const shouldPersist =
                    isFinal ||
                    elapsed >= INTERVAL_MS ||
                    itemsDelta >= ITEM_INTERVAL;

                  if (shouldPersist) {
                    lastWriteTime = now;
                    lastWrittenCount = progress.processed;
                    await jobTrackingService.updateJob(jobId, updates);
                  } else {
                    // In-memory only — polls see fresh data, DB write deferred
                    jobTrackingService.updateJobInMemory(jobId, updates);
                  }
                } catch (err) {
                  console.warn(
                    `[DrugDiscovery] progressCallback update failed:`,
                    err.message,
                  );
                }
              };
            })(),
          },
        );

      console.log(`[DrugDiscovery] Guaranteed processing result:`, {
        totalArticles: processResult.totalArticles,
        studiesCreated: processResult.studiesCreated,
        duplicatesSkipped: processResult.duplicatesSkipped,
        failedArticles: processResult.failedArticles.length,
        successRate: processResult.successRate,
      });

      // Update job with processing results
      await jobTrackingService.updateJob(jobId, {
        progress: 95,
        currentStep: 4,
        message: `Created ${processResult.studiesCreated} studies. ${processResult.failedArticles.length > 0 ? `${processResult.failedArticles.length} articles queued for background retry.` : "All articles processed successfully!"}`,
        metadata: {
          phase: "processing_complete",
          studiesCreated: processResult.studiesCreated,
          totalStudies: results.totalFound,
          studiesFound: results.totalFound,
          duplicatesSkipped: processResult.duplicatesSkipped || 0,
          failedArticles: processResult.failedArticles.length,
          successRate: processResult.successRate,
          trackCounts: trackCounts,
        },
      });
    } else {
      // Update job - no studies found
      await jobTrackingService.updateJob(jobId, {
        progress: 90,
        currentStep: 4,
        message: "No articles found to process with AI inference",
        metadata: { phase: "no_studies_found" },
      });
    }

    // Complete the job
    const finalMessage =
      processResult.failedArticles.length > 0
        ? `Discovery completed: Found ${results.totalFound} articles, created ${processResult.studiesCreated} studies. ${processResult.failedArticles.length} articles queued for background retry.`
        : `Discovery completed: Found ${results.totalFound} articles, created ${processResult.studiesCreated} studies. 100% success rate!`;

    await jobTrackingService.completeJob(
      jobId,
      {
        totalFound: results.totalFound,
        studiesCreated: processResult.studiesCreated,
        duplicatesSkipped: processResult.duplicatesSkipped || 0,
        failedArticles: processResult.failedArticles.length,
        successRate: processResult.successRate,
        trackCounts: trackCounts || { ICSR: 0, AOI: 0, NoCase: 0 },
        searchParams,
        queuedForRetry: processResult.failedArticles.length > 0,
      },
      finalMessage,
    );

    console.log(`\n${"=".repeat(70)}`);
    console.log(`[DrugDiscovery] Job ${jobId} COMPLETED`);
    console.log(`[DrugDiscovery] Articles found: ${results.totalFound}`);
    console.log(
      `[DrugDiscovery] Studies created: ${processResult.studiesCreated}`,
    );
    console.log(`[DrugDiscovery] Success rate: ${processResult.successRate}%`);
    if (processResult.failedArticles.length > 0) {
      console.log(
        `[DrugDiscovery] Queued for retry: ${processResult.failedArticles.length} articles`,
      );
    }
    console.log(`${"=".repeat(70)}\n`);
  } catch (error) {
    console.error(`[DrugDiscovery] Job ${jobId} failed:`, error);

    try {
      await jobTrackingService.failJob(jobId, error.message);
    } catch (jobError) {
      console.error("[DrugDiscovery] Error updating job status:", jobError);
    }

    console.log(`[DrugDiscovery] Audit: job ${jobId} failed:`, error.message);
  }
}

// Async function to process search config job in background - NOW WITH GUARANTEED PROCESSING
async function processSearchConfigJob(jobId, configObject, user, auditAction) {
  try {
    console.log(`\n${"=".repeat(70)}`);
    console.log(
      `[SearchConfig] Processing job ${jobId} with GUARANTEED article processing`,
    );
    console.log(`[SearchConfig] Config: ${configObject.name}`);
    console.log(`${"=".repeat(70)}\n`);

    // Update job progress - starting search
    await jobTrackingService.updateJob(jobId, {
      progress: 10,
      currentStep: 1,
      message: `Starting drug search for config "${configObject.name}"...`,
      metadata: { phase: "starting_search", configName: configObject.name },
    });

    // Run the actual drug search using the configuration parameters
    console.log("[SearchConfig] Running drug search with config:", {
      name: configObject.name,
      query: configObject.query,
      sponsor: configObject.sponsor,
      frequency: configObject.frequency,
      dateFrom: configObject.dateFrom,
      dateTo: configObject.dateTo,
    });

    const results = await pubmedService.discoverDrugs({
      query: configObject.query,
      sponsor: configObject.sponsor,
      frequency: configObject.frequency,
      maxResults: configObject.maxResults || 50,
      includeAdverseEvents: configObject.includeAdverseEvents,
      includeSafety: configObject.includeSafety,
      dateFrom: configObject.dateFrom,
      dateTo: configObject.dateTo,
      organizationId: user.organizationId,
    });

    // Update job progress - PubMed search completed
    await jobTrackingService.updateJob(jobId, {
      progress: 25,
      currentStep: 2,
      message: `Found ${results.totalFound} articles from PubMed. Starting AI processing...`,
      metadata: {
        phase: "pubmed_completed",
        studiesFound: results.totalFound,
      },
    });

    // Process articles with GUARANTEED study creation
    let processResult = {
      studiesCreated: 0,
      failedArticles: [],
      duplicatesSkipped: 0,
    };
    let externalApiSuccess = false;

    if (
      configObject.sendToExternalApi &&
      results.drugs &&
      results.drugs.length > 0
    ) {
      // Update job - starting AI inference with guaranteed processing
      await jobTrackingService.updateJob(jobId, {
        progress: 30,
        currentStep: 3,
        message: `Processing ${results.drugs.length} articles with AI inference (guaranteed mode)...`,
        metadata: { phase: "ai_inference_guaranteed" },
      });

      console.log(
        `[SearchConfig] Using ArticleRetryQueue for GUARANTEED processing of ${results.drugs.length} articles`,
      );

      // Use the retry queue service for guaranteed processing
      processResult =
        await articleRetryQueueService.processArticlesWithGuarantee(
          results.drugs,
          {
            query: configObject.query,
            sponsor: configObject.sponsor,
            frequency: configObject.frequency,
          },
          user.organizationId,
          user.id,
          {
            enableDetailedLogging: true,
            batchSize: 16,
            maxConcurrency: 16,
            progressCallback: async (progress) => {
              const progressPercent =
                30 + Math.round((progress.processed / progress.total) * 60);
              await jobTrackingService.updateJob(jobId, {
                progress: progressPercent,
                currentStep: 3,
                message: `AI processing: ${progress.processed}/${progress.total} articles (${Math.round((progress.processed / progress.total) * 100)}%)...`,
                metadata: {
                  phase: "ai_inference",
                  aiProgress: progress,
                  totalStudies: progress.total,
                  currentStudy: progress.processed,
                  studiesFound: results.totalFound,
                },
              });
            },
          },
        );

      externalApiSuccess = processResult.success;

      console.log(`[SearchConfig] Guaranteed processing result:`, {
        totalArticles: processResult.totalArticles,
        studiesCreated: processResult.studiesCreated,
        duplicatesSkipped: processResult.duplicatesSkipped,
        failedArticles: processResult.failedArticles.length,
        successRate: processResult.successRate,
      });

      // Update job with processing results
      await jobTrackingService.updateJob(jobId, {
        progress: 95,
        currentStep: 4,
        message: `Created ${processResult.studiesCreated} studies. ${processResult.failedArticles.length > 0 ? `${processResult.failedArticles.length} articles queued for background retry.` : "All articles processed successfully!"}`,
        metadata: {
          phase: "processing_complete",
          studiesCreated: processResult.studiesCreated,
          failedArticles: processResult.failedArticles.length,
          successRate: processResult.successRate,
        },
      });
    } else if (results.drugs && results.drugs.length > 0) {
      // No external API configured, but we have drugs
      console.log(
        "[SearchConfig] External API not configured, skipping AI processing",
      );
      await jobTrackingService.updateJob(jobId, {
        progress: 90,
        currentStep: 4,
        message: "External API not configured for this search config",
        metadata: { phase: "no_external_api" },
      });
    } else {
      // No drugs to process
      console.log("[SearchConfig] No articles found to process");
      await jobTrackingService.updateJob(jobId, {
        progress: 90,
        currentStep: 4,
        message: "No articles found to process",
        metadata: { phase: "no_articles_found" },
      });
    }

    // Update the configuration with run stats
    const pmids = results.drugs
      ? results.drugs.map((d) => d.pmid).filter((p) => p)
      : [];
    configObject.updateAfterRun(results.totalFound, externalApiSuccess, pmids);

    try {
      console.log("[SearchConfig] Updating config with ID:", configObject.id);
      await cosmosService.updateItem(
        "drugSearchConfigs",
        configObject.id,
        configObject.toObject(),
      );
      console.log("[SearchConfig] Successfully updated configuration stats");
    } catch (updateError) {
      console.error(
        "[SearchConfig] Failed to update configuration stats:",
        updateError.message,
      );
    }

    // Audit the successful execution
    await auditAction(
      user,
      "run",
      "drug_search_config",
      configObject.id,
      `Executed drug search configuration: ${configObject.name}`,
      {
        configId: configObject.id,
        resultsFound: results.totalFound,
        externalApiSuccess,
        studiesCreated: processResult.studiesCreated,
        failedArticles: processResult.failedArticles.length,
      },
    );

    // Complete the job
    const finalMessage =
      processResult.failedArticles.length > 0
        ? `Config "${configObject.name}" completed: Found ${results.totalFound} articles, created ${processResult.studiesCreated} studies. ${processResult.failedArticles.length} articles queued for background retry.`
        : `Config "${configObject.name}" completed: Found ${results.totalFound} articles, created ${processResult.studiesCreated} studies. 100% success rate!`;

    await jobTrackingService.completeJob(
      jobId,
      {
        totalFound: results.totalFound,
        studiesCreated: processResult.studiesCreated,
        duplicatesSkipped: processResult.duplicatesSkipped || 0,
        failedArticles: processResult.failedArticles.length,
        successRate: processResult.successRate,
        externalApiSuccess,
        configId: configObject.id,
        configName: configObject.name,
        queuedForRetry: processResult.failedArticles.length > 0,
        lastRunPmids: pmids,
      },
      finalMessage,
    );

    console.log(`\n${"=".repeat(70)}`);
    console.log(`[SearchConfig] Job ${jobId} COMPLETED`);
    console.log(`[SearchConfig] Config: ${configObject.name}`);
    console.log(`[SearchConfig] Articles found: ${results.totalFound}`);
    console.log(
      `[SearchConfig] Studies created: ${processResult.studiesCreated}`,
    );
    console.log(`[SearchConfig] Success rate: ${processResult.successRate}%`);
    if (processResult.failedArticles.length > 0) {
      console.log(
        `[SearchConfig] Queued for retry: ${processResult.failedArticles.length} articles`,
      );
    }
    console.log(`${"=".repeat(70)}\n`);
  } catch (error) {
    console.error(`[SearchConfig] Job ${jobId} failed:`, error);

    try {
      await jobTrackingService.failJob(jobId, error.message);
    } catch (jobError) {
      console.error("[SearchConfig] Error updating job status:", jobError);
    }

    // Audit the failed execution
    try {
      await auditAction(
        user,
        "run",
        "drug_search_config",
        configObject.id,
        `Failed to execute drug search configuration: ${error.message}`,
        {
          configId: configObject.id,
          error: error.message,
        },
      );
    } catch (auditError) {
      console.error("[SearchConfig] Error auditing failed job:", auditError);
    }
  }
}

module.exports = router;
