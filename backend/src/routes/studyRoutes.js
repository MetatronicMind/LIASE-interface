const express = require("express");
const { body, validationResult } = require("express-validator");
const { v4: uuidv4 } = require("uuid");

const cosmosService = require("../services/cosmosService");
const cacheService = require("../services/cacheService");
const Study = require("../models/Study");
const Drug = require("../models/Drug");
const pubmedService = require("../services/pubmedService");
const studyCreationService = require("../services/studyCreationService");
const adminConfigService = require("../services/adminConfigService");
const trackAllocationService = require("../services/trackAllocationService");
const { authorizePermission } = require("../middleware/authorization");
const { auditLogger, auditAction } = require("../middleware/audit");
const upload = require("../middleware/upload");

const router = express.Router();

// Apply audit logging to all routes
router.use(auditLogger());

// Test endpoint for multer
router.post(
  "/test-upload",
  authorizePermission("studies", "write"),
  (req, res, next) => {
    console.log("Test upload endpoint hit");
    const multerUpload = upload.single("file");
    multerUpload(req, res, (err) => {
      if (err) {
        console.error("Test upload multer error:", err);
        return res
          .status(400)
          .json({ error: err.message, multerWorking: false });
      }
      console.log("Test upload multer success, file:", req.file);
      next();
    });
  },
  async (req, res) => {
    res.json({
      success: true,
      multerWorking: true,
      fileReceived: !!req.file,
      fileDetails: req.file
        ? {
            originalname: req.file.originalname,
            size: req.file.size,
            mimetype: req.file.mimetype,
          }
        : null,
    });
  },
);

// Helper function to get only changed fields between two objects
function getChangedFields(beforeObj, afterObj) {
  const changes = {};

  if (!beforeObj && !afterObj) return changes;

  // If no before object, everything is new/added
  if (!beforeObj) {
    Object.keys(afterObj || {}).forEach((key) => {
      changes[key] = {
        before: undefined,
        after: afterObj[key],
      };
    });
    return changes;
  }

  if (!afterObj) return {}; // Should probably handle deletion similarly if needed, but for now empty is fine as partial update?
  // Actually, if afterObj becomes null, maybe we should track all deletions?
  // But usually updateR3FormData merges, so afterObj won't be null unless explicitly unset.

  // Compare all keys from both objects
  const allKeys = new Set([
    ...Object.keys(beforeObj),
    ...Object.keys(afterObj),
  ]);

  for (const key of allKeys) {
    const beforeValue = beforeObj[key];
    const afterValue = afterObj[key];

    // Check if values are different
    if (JSON.stringify(beforeValue) !== JSON.stringify(afterValue)) {
      changes[key] = {
        before: beforeValue,
        after: afterValue,
      };
    }
  }

  return changes;
}

// Get all studies in organization
router.get("/", authorizePermission("studies", "read"), async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      search,
      status,
      drugName,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    let targetOrgId = req.user.organizationId;
    if (req.user.isSuperAdmin() && req.query.organizationId) {
      targetOrgId = req.query.organizationId;
    }

    // Optimization: Check Cache
    const cacheKey = `studies:${targetOrgId}:list:${JSON.stringify({
      page,
      limit,
      search,
      status,
      drugName,
      sortBy,
      sortOrder,
    })}`;

    const cachedResult = await cacheService.get(cacheKey);
    if (cachedResult) {
      // console.log('Serving studies from cache');
      return res.json(cachedResult);
    }

    let query = "SELECT DISTINCT * FROM c WHERE c.organizationId = @orgId";
    const parameters = [{ name: "@orgId", value: targetOrgId }];

    // Add filters
    if (status && status !== "all") {
      query += " AND c.status = @status";
      parameters.push({ name: "@status", value: status });
    }

    if (drugName) {
      query += " AND CONTAINS(UPPER(c.drugName), UPPER(@drugName))";
      parameters.push({ name: "@drugName", value: drugName });
    }

    if (search) {
      query +=
        " AND (CONTAINS(UPPER(c.title), UPPER(@search)) OR CONTAINS(UPPER(c.pmid), UPPER(@search)) OR CONTAINS(UPPER(c.adverseEvent), UPPER(@search)))";
      parameters.push({ name: "@search", value: search });
    }

    // Add sorting
    query += ` ORDER BY c.${sortBy} ${sortOrder.toUpperCase()}`;

    // Add pagination
    const offset = (page - 1) * limit;
    query += ` OFFSET ${offset} LIMIT ${limit}`;

    const studies = await cosmosService.queryItems(
      "studies",
      query,
      parameters,
    );

    const result = {
      studies,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: studies.length,
      },
    };

    // Cache the result for 1 minute
    await cacheService.set(cacheKey, result, 60);

    res.json(result);
  } catch (error) {
    console.error("Error fetching studies:", error);
    res.status(500).json({
      error: "Failed to fetch studies",
      message: error.message,
    });
  }
});

// Get studies for QA approval (studies awaiting triage classification approval)
router.get(
  "/QA-pending",
  authorizePermission("studies", "read"),
  async (req, res) => {
    try {
      console.log("GET /QA-pending request received");
      const { page = 1, limit = 50, search, status = "pending" } = req.query;

      let targetOrgId = req.user.organizationId;
      if (req.user.isSuperAdmin() && req.query.organizationId) {
        targetOrgId = req.query.organizationId;
      }
      console.log("Target Org ID:", targetOrgId);

      let query =
        "SELECT * FROM c WHERE c.organizationId = @orgId AND c.status = 'qc_triage'";
      const parameters = [{ name: "@orgId", value: targetOrgId }];

      // Filter by qaApprovalStatus based on status query param
      // This separates items in "QC Allocation" (pending) from "QC Triage" (manual_qc)
      if (status === "manual_qc") {
        query += " AND c.qaApprovalStatus = 'manual_qc'";
      } else {
        // Default to pending for QC Allocation page
        query +=
          " AND (c.qaApprovalStatus = 'pending' OR NOT IS_DEFINED(c.qaApprovalStatus))";
      }

      // Filter by userTag if provided
      if (req.query.userTag) {
        query += " AND c.userTag = @userTag";
        parameters.push({ name: "@userTag", value: req.query.userTag });
      }

      // Filter by excludeUserTag if provided
      if (req.query.excludeUserTag) {
        query += " AND c.userTag != @excludeUserTag";
        parameters.push({
          name: "@excludeUserTag",
          value: req.query.excludeUserTag,
        });
      }

      if (search) {
        query +=
          " AND (CONTAINS(UPPER(c.title), UPPER(@search)) OR CONTAINS(UPPER(c.pmid), UPPER(@search)))";
        parameters.push({ name: "@search", value: search });
      }

      console.log("Executing query:", query);
      console.log("Parameters:", JSON.stringify(parameters));

      // Fetch all matching items to sort in memory (avoids composite index requirement)
      const allStudies = await cosmosService.queryItems(
        "studies",
        query,
        parameters,
      );
      console.log("Studies found:", allStudies.length);

      // Sort by updatedAt DESC
      allStudies.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

      // Apply pagination in memory
      const offset = (page - 1) * parseInt(limit);
      const studies = allStudies.slice(offset, offset + parseInt(limit));

      res.json({
        success: true,
        data: studies,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: allStudies.length,
        },
      });
    } catch (error) {
      console.error("QC pending studies fetch error:", error);
      res.status(500).json({
        error: "Failed to fetch QC pending studies",
        message: error.message,
      });
    }
  },
);

// Bulk process QC items
router.post(
  "/QA/bulk-process",
  authorizePermission("studies", "write"),
  async (req, res) => {
    try {
      // Find all studies pending QA approval (matches the QA page view)
      const query =
        "SELECT * FROM c WHERE c.organizationId = @orgId AND c.qaApprovalStatus = @status";
      const parameters = [
        { name: "@orgId", value: req.user.organizationId },
        { name: "@status", value: "pending" },
      ];

      const studies = await cosmosService.queryItems(
        "studies",
        query,
        parameters,
      );

      // Fetch workflow config to get the QC percentage
      let targetPercentage = 100; // Default to 100% if not found
      try {
        const workflowConfig = await adminConfigService.getConfig(
          req.user.organizationId,
          "workflow",
        );
        if (
          workflowConfig &&
          workflowConfig.configData &&
          workflowConfig.configData.transitions
        ) {
          // Find the transition that feeds into QC (Triage -> QC Triage)
          // We use this same percentage to determine how many to RELEASE from QC
          const transition = workflowConfig.configData.transitions.find(
            (t) => t.to === "qc_triage",
          );
          if (transition && transition.qcPercentage) {
            targetPercentage = parseFloat(transition.qcPercentage);
          }
        }
      } catch (err) {
        console.warn("Failed to fetch workflow config for bulk process:", err);
      }

      // Calculate how many items to process (MOVE OUT) based on the percentage
      // The QC Percentage (e.g. 25%) is the amount to KEEP in QC.
      // So we want to process (100 - 25) = 75% of the items.
      const percentageToMove = Math.max(0, 100 - targetPercentage);
      const countToProcess = Math.ceil(
        studies.length * (percentageToMove / 100),
      );

      // Randomly select the items to process (move out of QC)
      // We shuffle the array and take the first N items
      const shuffledStudies = studies.sort(() => 0.5 - Math.random());
      const studiesToProcess = shuffledStudies.slice(0, countToProcess);
      const studiesToKeep = shuffledStudies.slice(countToProcess);

      console.log(
        `Bulk Process: Found ${studies.length} pending items. QC % (Keep): ${targetPercentage}%. Moving: ${percentageToMove}%. Processing ${studiesToProcess.length} items. Keeping ${studiesToKeep.length} items for manual QC.`,
      );

      const results = {
        processed: 0,
        kept: 0,
        errors: 0,
        skipped: 0,
        details: [],
      };

      // Process the items to be auto-approved
      for (const studyData of studiesToProcess) {
        try {
          const study = new Study(studyData);
          let nextStageId = null;

          // Determine next stage based on tag
          if (study.userTag === "ICSR") {
            nextStageId = "data_entry";
          } else if (study.userTag === "AOI") {
            nextStageId = "aoi_assessment";
          } else if (study.userTag === "No Case") {
            nextStageId = "reporting";
          }

          if (nextStageId) {
            const beforeValue = {
              status: study.status,
              qaApprovalStatus: study.qaApprovalStatus,
            };

            study.status = nextStageId;
            study.qaApprovalStatus = "approved"; // Mark as approved since we are moving it out of QC
            study.qaApprovedBy = req.user.id;
            study.qaApprovedAt = new Date().toISOString();
            study.qaComments = "Auto approved QC";

            const afterValue = {
              status: study.status,
              qaApprovalStatus: study.qaApprovalStatus,
            };

            await cosmosService.updateItem(
              "studies",
              study.id,
              req.user.organizationId,
              study.toJSON(),
            );

            await auditAction(
              req.user,
              "bulk_approve",
              "study",
              study.id,
              `Auto approved QC - moved to ${nextStageId}`,
              {
                studyId: study.id,
                classification: study.userTag,
                nextStage: nextStageId,
              },
              beforeValue,
              afterValue,
            );

            results.processed++;
            results.details.push({
              id: study.id,
              status: "success",
              nextStage: nextStageId,
              action: "auto_approved",
            });
          } else {
            // Skip if no tag or unknown tag
            results.errors++;
            results.details.push({
              id: study.id,
              status: "skipped",
              reason: "Unknown tag or no tag",
            });
          }
        } catch (err) {
          console.error(`Error processing study ${studyData.id}:`, err);
          results.errors++;
          results.details.push({
            id: studyData.id,
            status: "error",
            message: err.message,
          });
        }
      }

      // Process the items to be kept for manual QC
      for (const studyData of studiesToKeep) {
        try {
          const study = new Study(studyData);
          const beforeValue = { qaApprovalStatus: study.qaApprovalStatus };

          // Update status to manual_qc so they show up in QC Triage page
          study.qaApprovalStatus = "manual_qc";
          study.qaComments = "Selected for QC Triage";

          const afterValue = { qaApprovalStatus: study.qaApprovalStatus };

          await cosmosService.updateItem(
            "studies",
            study.id,
            req.user.organizationId,
            study.toJSON(),
          );

          await auditAction(
            req.user,
            "update",
            "study",
            study.id,
            `Selected for QC Triage (Manual QC)`,
            { studyId: study.id, classification: study.userTag },
            beforeValue,
            afterValue,
          );

          results.kept++;
          results.details.push({
            id: study.id,
            status: "kept",
            action: "manual_qc",
          });
        } catch (err) {
          console.error(
            `Error updating study for manual QC ${studyData.id}:`,
            err,
          );
          results.errors++;
          results.details.push({
            id: studyData.id,
            status: "error",
            message: err.message,
          });
        }
      }

      res.json({
        success: true,
        message: `Processed ${results.processed} studies (Auto Approved). Kept ${results.kept} studies for Manual QC.`,
        results,
      });
    } catch (error) {
      console.error("Error in bulk QC process:", error);
      res.status(500).json({
        error: "Failed to process QC items",
        message: error.message,
      });
    }
  },
);

// Process No Case QC items
router.post(
  "/QA/process-no-case",
  authorizePermission("studies", "write"),
  async (req, res) => {
    try {
      // Find all No Case studies pending QA approval
      const query =
        "SELECT * FROM c WHERE c.organizationId = @orgId AND c.status = 'qc_triage' AND c.userTag = 'No Case' AND (c.qaApprovalStatus = 'pending' OR NOT IS_DEFINED(c.qaApprovalStatus))";
      const parameters = [{ name: "@orgId", value: req.user.organizationId }];

      const studies = await cosmosService.queryItems(
        "studies",
        query,
        parameters,
      );

      // Default sampling percentage (default 10%)
      let targetPercentage = 10;
      try {
        const workflowConfig = await adminConfigService.getConfig(
          req.user.organizationId,
          "workflow",
        );
        if (workflowConfig && workflowConfig.configData) {
          // Check for specific No Case setting
          if (
            typeof workflowConfig.configData.noCaseQcPercentage !== "undefined"
          ) {
            targetPercentage = parseFloat(
              workflowConfig.configData.noCaseQcPercentage,
            );
          } else if (workflowConfig.configData.transitions) {
            // Fallback to general Triage -> QC Triage transition
            const transition = workflowConfig.configData.transitions.find(
              (t) => t.to === "qc_triage",
            );
            if (transition && transition.qcPercentage) {
              targetPercentage = parseFloat(transition.qcPercentage);
            }
          }
        }
      } catch (err) {
        console.warn("Failed to fetch workflow config for bulk process:", err);
      }

      // Calculate sample size for Reclassification (Send back to Triage)
      const countToReclassify = Math.ceil(
        studies.length * (targetPercentage / 100),
      );
      // Shuffle
      const shuffledStudies = studies.sort(() => 0.5 - Math.random());
      const studiesToReclassify = shuffledStudies.slice(0, countToReclassify);
      const studiesToApprove = shuffledStudies.slice(countToReclassify);

      const results = {
        reclassified: 0,
        approved: 0,
        errors: 0,
      };

      // Process Reclassification (Sample -> Triage)
      for (const studyData of studiesToReclassify) {
        try {
          const study = new Study(studyData);
          const beforeValue = {
            status: study.status,
            userTag: study.userTag,
            qaApprovalStatus: study.qaApprovalStatus,
          };

          study.status = "triage";
          study.userTag = null;
          study.qaApprovalStatus = "rejected";
          study.qaComments = "Random QC Check - Sent for Reclassification";

          const afterValue = {
            status: study.status,
            userTag: study.userTag,
            qaApprovalStatus: study.qaApprovalStatus,
          };

          await cosmosService.updateItem(
            "studies",
            study.id,
            req.user.organizationId,
            study.toJSON(),
          );

          await auditAction(
            req.user,
            "update",
            "study",
            study.id,
            `No Case QC Sample - Sent to Triage`,
            { studyId: study.id, from: "qc_triage", to: "triage" },
            beforeValue,
            afterValue,
          );
          results.reclassified++;
        } catch (err) {
          console.error(`Error reclassifying study ${studyData.id}:`, err);
          results.errors++;
        }
      }

      // Process Approval (Rest -> Reporting)
      for (const studyData of studiesToApprove) {
        try {
          const study = new Study(studyData);
          const beforeValue = {
            status: study.status,
            qaApprovalStatus: study.qaApprovalStatus,
          };

          study.status = "reporting";
          study.qaApprovalStatus = "approved";
          study.qaApprovedBy = req.user.id;
          study.qaApprovedAt = new Date().toISOString();
          study.qaComments = "Auto approved No Case";

          const afterValue = {
            status: study.status,
            qaApprovalStatus: study.qaApprovalStatus,
          };

          await cosmosService.updateItem(
            "studies",
            study.id,
            req.user.organizationId,
            study.toJSON(),
          );

          await auditAction(
            req.user,
            "bulk_approve",
            "study",
            study.id,
            `Auto approved No Case`,
            { studyId: study.id },
            beforeValue,
            afterValue,
          );
          results.approved++;
        } catch (err) {
          console.error(`Error approving study ${studyData.id}:`, err);
          results.errors++;
        }
      }

      res.json({
        success: true,
        message: `Processed ${studies.length} items. ${results.reclassified} sent to Triage, ${results.approved} approved.`,
        results,
      });
    } catch (error) {
      console.error("Error processing No Case studies:", error);
      res.status(500).json({ error: error.message });
    }
  },
);

// Get studies with completed R3 forms awaiting QC R3 approval
router.get(
  "/QC-r3-pending",
  authorizePermission("QC", "read"),
  async (req, res) => {
    try {
      const { page = 1, limit = 50, search } = req.query;

      let targetOrgId = req.user.organizationId;
      if (req.user.isSuperAdmin() && req.query.organizationId) {
        targetOrgId = req.query.organizationId;
      }

      let query =
        "SELECT * FROM c WHERE c.organizationId = @orgId AND c.r3FormStatus = @r3Status AND c.qcR3Status = @qcR3Status";
      const parameters = [
        { name: "@orgId", value: targetOrgId },
        { name: "@r3Status", value: "completed" },
        { name: "@qcR3Status", value: "pending" },
      ];

      if (search) {
        query +=
          " AND (CONTAINS(UPPER(c.title), UPPER(@search)) OR CONTAINS(UPPER(c.pmid), UPPER(@search)))";
        parameters.push({ name: "@search", value: search });
      }

      query += " ORDER BY c.r3FormCompletedAt DESC";
      const offset = (page - 1) * limit;
      query += ` OFFSET ${offset} LIMIT ${limit}`;

      const studies = await cosmosService.queryItems(
        "studies",
        query,
        parameters,
      );

      res.json({
        success: true,
        data: studies,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: studies.length,
        },
      });
    } catch (error) {
      console.error("QC R3 pending studies fetch error:", error);
      res.status(500).json({
        error: "Failed to fetch QC R3 pending studies",
        message: error.message,
      });
    }
  },
);

// Get studies for data entry (ICSR classified only)
router.get(
  "/data-entry",
  authorizePermission("studies", "read"),
  async (req, res) => {
    try {
      const { page = 1, limit = 50, search } = req.query;

      console.log(
        "Data entry request - User organization ID:",
        req.user.organizationId,
      );
      console.log("Data entry request - Query params:", {
        page,
        limit,
        search,
      });

      // Test query to find the specific study mentioned in the issue
      const testQuery = "SELECT * FROM c WHERE c.pmid = @pmid";
      const testParams = [{ name: "@pmid", value: "39234674" }];
      const testResult = await cosmosService.queryItems(
        "studies",
        testQuery,
        testParams,
      );
      console.log("Test query for PMID 39234674:", {
        found: testResult.length > 0,
        count: testResult.length || 0,
        studyOrgId: testResult[0]?.organizationId,
        studyUserTag: testResult[0]?.userTag,
        studyEffectiveClassification: testResult[0]?.effectiveClassification,
      });

      // Query for studies that are manually tagged as ICSR, QC approved, AND have incomplete R3 forms
      // INCLUDES revoked studies (they need to be fixed by Data Entry)
      // ALSO INCLUDES studies with status = 'data_entry' (New Workflow)
      // EXCLUDES studies that have been revoked to Triage (qaApprovalStatus = 'pending')
      let query =
        "SELECT * FROM c WHERE c.organizationId = @orgId AND (c.status = @statusDataEntry OR (c.userTag = @userTag AND c.qaApprovalStatus = @qaStatus AND (c.r3FormStatus = @statusNotStarted OR c.r3FormStatus = @statusInProgress) AND (c.medicalReviewStatus != @completed OR c.medicalReviewStatus = @revoked OR NOT IS_DEFINED(c.medicalReviewStatus))))";
      const parameters = [
        { name: "@orgId", value: req.user.organizationId },
        { name: "@statusDataEntry", value: "data_entry" },
        { name: "@userTag", value: "ICSR" },
        { name: "@qaStatus", value: "approved" },
        { name: "@statusNotStarted", value: "not_started" },
        { name: "@statusInProgress", value: "in_progress" },
        { name: "@completed", value: "completed" },
        { name: "@revoked", value: "revoked" },
      ];

      console.log("Data entry query:", query);
      console.log("Data entry parameters:", parameters);

      // Debug: Let's see what studies exist for this organization
      const debugQuery =
        "SELECT c.id, c.organizationId, c.userTag, c.pmid FROM c WHERE c.organizationId = @orgId";
      const debugParams = [{ name: "@orgId", value: req.user.organizationId }];
      const debugResult = await cosmosService.queryItems(
        "studies",
        debugQuery,
        debugParams,
      );
      console.log(
        `Debug: Found ${debugResult.length || 0} total studies for org ${req.user.organizationId}`,
      );
      if (debugResult.length > 0) {
        console.log(
          "Debug: Sample studies:",
          debugResult.slice(0, 3).map((s) => ({
            id: s.id,
            pmid: s.pmid,
            userTag: s.userTag,
          })),
        );
      }

      // Debug: Let's see what studies exist with ICSR tag regardless of organization
      const icsrDebugQuery =
        "SELECT c.id, c.organizationId, c.userTag, c.pmid FROM c WHERE c.userTag = @userTag";
      const icsrDebugParams = [{ name: "@userTag", value: "ICSR" }];
      const icsrDebugResult = await cosmosService.queryItems(
        "studies",
        icsrDebugQuery,
        icsrDebugParams,
      );
      console.log(
        `Debug: Found ${icsrDebugResult.length || 0} total ICSR studies across all organizations`,
      );
      if (icsrDebugResult.length > 0) {
        console.log(
          "Debug: ICSR studies by org:",
          icsrDebugResult.reduce((acc, s) => {
            acc[s.organizationId] = (acc[s.organizationId] || 0) + 1;
            return acc;
          }, {}),
        );
      }

      // Debug: Let's check the specific study mentioned in the logs
      const specificStudyQuery =
        "SELECT c.id, c.organizationId, c.userTag, c.pmid FROM c WHERE c.pmid = @pmid";
      const specificStudyParams = [{ name: "@pmid", value: "39234674" }];
      const specificStudyResult = await cosmosService.queryItems(
        "studies",
        specificStudyQuery,
        specificStudyParams,
      );
      console.log(
        `Debug: Found specific study 39234674:`,
        specificStudyResult[0] || "NOT FOUND",
      );

      // Debug: Let's test the exact same conditions as the main query but with more detail
      const exactTestQuery =
        "SELECT c.id, c.organizationId, c.userTag, c.pmid FROM c WHERE c.organizationId = @orgId AND c.userTag = @userTag";
      const exactTestParams = [
        { name: "@orgId", value: req.user.organizationId },
        { name: "@userTag", value: "ICSR" },
      ];
      const exactTestResult = await cosmosService.queryItems(
        "studies",
        exactTestQuery,
        exactTestParams,
      );
      console.log(
        `Debug: Exact match test found ${exactTestResult.length || 0} studies`,
      );
      if (exactTestResult.length > 0) {
        console.log(
          "Debug: Exact match results:",
          exactTestResult.map((s) => ({
            id: s.id,
            pmid: s.pmid,
            orgId: s.organizationId,
            userTag: s.userTag,
          })),
        );
      }

      if (search) {
        query +=
          " AND (CONTAINS(UPPER(c.title), UPPER(@search)) OR CONTAINS(UPPER(c.pmid), UPPER(@search)))";
        parameters.push({ name: "@search", value: search });
      }

      query += " ORDER BY c.createdAt DESC";

      const offset = (parseInt(page) - 1) * parseInt(limit);
      query += ` OFFSET ${offset} LIMIT ${limit}`;

      const result = await cosmosService.queryItems(
        "studies",
        query,
        parameters,
      );

      console.log("Data entry query result count:", result.length || 0);
      if (result.length > 0) {
        console.log("First study sample:", {
          id: result[0].id,
          pmid: result[0].pmid,
          title: result[0].title?.substring(0, 50) + "...",
          userTag: result[0].userTag,
          organizationId: result[0].organizationId,
        });
      }

      await auditAction(
        req.user,
        "list",
        "study",
        "data_entry",
        "Retrieved ICSR studies for data entry",
        { page, limit, search },
      );

      res.json({
        success: true,
        data: result || [],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          hasMore: result?.length === parseInt(limit),
        },
        debug: {
          userOrgId: req.user.organizationId,
          queryParams: { page, limit, search },
          resultCount: result?.length || 0,
          testQuery:
            testResult.length > 0
              ? {
                  found: true,
                  studyOrgId: testResult[0].organizationId,
                  studyUserTag: testResult[0].userTag,
                  studyEffectiveClassification:
                    testResult[0].effectiveClassification,
                  orgIdMatch:
                    testResult[0].organizationId === req.user.organizationId,
                }
              : { found: false },
        },
      });
    } catch (error) {
      console.error("Data entry studies fetch error:", error);
      res.status(500).json({
        error: "Failed to fetch data entry studies",
        message: error.message,
      });
    }
  },
);

// Get studies for Medical Reviewer (ICSR with completed R3 forms and QC R3 approval)
router.get(
  "/medical-examiner",
  authorizePermission("studies", "read"),
  async (req, res) => {
    try {
      const {
        page = 1,
        limit = 50,
        search,
        status = "all", // all, pending, completed, revoked
      } = req.query;

      let targetOrgId = req.user.organizationId;
      if (req.user.isSuperAdmin() && req.query.organizationId) {
        targetOrgId = req.query.organizationId;
      }

      let query =
        "SELECT * FROM c WHERE c.organizationId = @orgId AND c.userTag = @userTag AND (c.qaApprovalStatus = @qaStatus OR c.qaApprovalStatus = @qaStatusNA) AND c.r3FormStatus = @formStatus AND c.qcR3Status = @qcR3Status";
      const parameters = [
        { name: "@orgId", value: targetOrgId },
        { name: "@userTag", value: "ICSR" },
        { name: "@qaStatus", value: "approved" },
        { name: "@qaStatusNA", value: "not_applicable" },
        { name: "@formStatus", value: "completed" },
        { name: "@qcR3Status", value: "approved" },
      ];

      // Add medical review status filter
      if (status !== "all") {
        if (status === "pending") {
          query +=
            " AND (c.medicalReviewStatus = @medicalStatus1 OR c.medicalReviewStatus = @medicalStatus2)";
          parameters.push(
            { name: "@medicalStatus1", value: "not_started" },
            { name: "@medicalStatus2", value: "in_progress" },
          );
        } else {
          query += " AND c.medicalReviewStatus = @medicalStatus";
          parameters.push({ name: "@medicalStatus", value: status });
        }
      }

      if (search) {
        query +=
          " AND (CONTAINS(UPPER(c.title), UPPER(@search)) OR CONTAINS(UPPER(c.pmid), UPPER(@search)))";
        parameters.push({ name: "@search", value: search });
      }

      query += " ORDER BY c.qcR3ApprovedAt DESC";

      const offset = (parseInt(page) - 1) * parseInt(limit);
      query += ` OFFSET ${offset} LIMIT ${limit}`;

      const result = await cosmosService.queryItems(
        "studies",
        query,
        parameters,
      );

      await auditAction(
        req.user,
        "list",
        "study",
        "medical_examiner",
        "Retrieved completed ICSR studies for medical examination",
        { page, limit, search },
      );

      res.json({
        success: true,
        data: result || [],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          hasMore: result?.length === parseInt(limit),
        },
      });
    } catch (error) {
      console.error("Medical Reviewer studies fetch error:", error);
      res.status(500).json({
        error: "Failed to fetch Medical Reviewer studies",
        message: error.message,
      });
    }
  },
);

// Get specific study
router.get(
  "/:studyId",
  authorizePermission("studies", "read"),
  async (req, res) => {
    try {
      const study = await cosmosService.getItem(
        "studies",
        req.params.studyId,
        req.user.organizationId,
      );

      if (!study) {
        return res.status(404).json({
          error: "Study not found",
        });
      }

      res.json(study);
    } catch (error) {
      console.error("Error fetching study:", error);
      res.status(500).json({
        error: "Failed to fetch study",
        message: error.message,
      });
    }
  },
);

// Create new study
router.post(
  "/",
  authorizePermission("studies", "write"),
  [
    body("pmid").matches(/^\d+$/),
    body("title").isLength({ min: 10 }),
    body("journal").isLength({ min: 3 }),
    body("publicationDate").isISO8601(),
    body("abstract").isLength({ min: 50 }),
    body("drugName").isLength({ min: 2 }),
    body("adverseEvent").isLength({ min: 5 }),
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

      const studyData = {
        ...req.body,
        organizationId: req.user.organizationId,
        createdBy: req.user.id,
      };

      // Generate unique study IDs for each case if not provided
      if (!studyData.id) {
        const drugName = studyData.drugName || "Unknown";
        const sponsor = studyData.sponsor || studyData.clientName || "Unknown";

        const innPrefix = drugName.substring(0, 4);
        const clientPrefix = sponsor.substring(0, 4);
        const randomNum = Math.floor(10000 + Math.random() * 90000); // 5 random digits

        studyData.id = `${innPrefix}_${clientPrefix}_${randomNum}`;
      }

      // Validate study data
      const validationErrors = Study.validate(studyData);
      if (validationErrors.length > 0) {
        return res.status(400).json({
          error: "Study validation failed",
          details: validationErrors,
        });
      }

      // Check if PMID already exists in organization
      const existingStudies = await cosmosService.queryItems(
        "studies",
        "SELECT * FROM c WHERE c.organizationId = @orgId AND c.pmid = @pmid",
        [
          { name: "@orgId", value: req.user.organizationId },
          { name: "@pmid", value: studyData.pmid },
        ],
      );

      if (existingStudies.length > 0) {
        return res.status(409).json({
          error: "Study with this PMID already exists in your organization",
        });
      }

      // Create study instance
      const study = new Study(studyData);

      // Save to database
      const createdStudy = await cosmosService.createItem(
        "studies",
        study.toJSON(),
      );

      // Create audit log
      await auditAction(
        req.user,
        "create",
        "study",
        createdStudy.id,
        `Created new study: PMID ${study.pmid}`,
        {
          pmid: study.pmid,
          drugName: study.drugName,
          adverseEvent: study.adverseEvent,
        },
      );

      res.status(201).json({
        message: "Study created successfully",
        study: createdStudy,
      });
    } catch (error) {
      console.error("Error creating study:", error);
      res.status(500).json({
        error: "Failed to create study",
        message: error.message,
      });
    }
  },
);

// Update study
router.put(
  "/:studyId",
  authorizePermission("studies", "write"),
  async (req, res) => {
    try {
      const { studyId } = req.params;
      const updates = req.body;

      // Remove sensitive fields
      delete updates.id;
      delete updates.organizationId;
      delete updates.createdAt;
      delete updates.createdBy;
      delete updates.comments; // Comments should be updated via separate endpoint

      // Check if study exists
      const existingStudy = await cosmosService.getItem(
        "studies",
        studyId,
        req.user.organizationId,
      );
      if (!existingStudy) {
        return res.status(404).json({
          error: "Study not found",
        });
      }

      // If userTag is being updated, use the Study model to handle it properly
      if (updates.userTag) {
        const beforeValue = {
          userTag: existingStudy.userTag,
          justification: existingStudy.justification,
          listedness: existingStudy.listedness,
          seriousness: existingStudy.seriousness,
          fullTextAvailability: existingStudy.fullTextAvailability,
        };

        const study = new Study(existingStudy);

        let workflowHandled = false;

        // --- NEW WORKFLOW LOGIC START ---
        // Implementation of the "Mixed Batch" & "Three Types" logic
        if (study.workflowStage) {
          const decision = updates.userTag; // "ICSR", "AOI", "No Case"
          let nextStageId = null;
          let nextStatus = null;
          let nextSubStatus = null;
          let nextClassification = null;

          // Logic for ICSR Assessment
          if (study.workflowStage === "ASSESSMENT_ICSR") {
            if (decision === "ICSR") {
              nextStageId = "DATA_ENTRY";
              nextStatus = "Data Entry";
              nextSubStatus = "processing";
              nextClassification = "Probable ICSR";
            } else if (decision === "AOI") {
              nextStageId = "TRIAGE_QUEUE_AOI"; // Re-queue
              nextStatus = "Under Triage Review";
              nextSubStatus = "triage";
              nextClassification = "Probable AOI";
              study.workflowTrack = "AOI"; // Switch track
            } else {
              // No Case
              nextStageId = "TRIAGE_QUEUE_NO_CASE"; // Re-queue
              nextStatus = "Under Triage Review";
              nextSubStatus = "triage";
              nextClassification = "No Case";
              study.workflowTrack = "NoCase"; // Switch track
            }
          }
          // Logic for AOI Assessment
          else if (study.workflowStage === "ASSESSMENT_AOI") {
            if (decision === "AOI") {
              nextStageId = "REPORTING"; // Or COMPLETED
              nextStatus = "Reporting";
              nextSubStatus = "archived";
              nextClassification = "Probable AOI";
            } else if (decision === "ICSR") {
              nextStageId = "TRIAGE_QUEUE_ICSR"; // Upgrade
              nextStatus = "Under Triage Review";
              nextSubStatus = "triage";
              nextClassification = "Probable ICSR";
              study.workflowTrack = "ICSR";
            } else {
              // No Case
              nextStageId = "TRIAGE_QUEUE_NO_CASE"; // Downgrade
              nextStatus = "Under Triage Review";
              nextSubStatus = "triage";
              nextClassification = "No Case";
              study.workflowTrack = "NoCase";
            }
          }
          // Logic for No Case Assessment
          else if (study.workflowStage === "ASSESSMENT_NO_CASE") {
            if (decision === "No Case") {
              nextStageId = "COMPLETED";
              nextStatus = "Completed";
              nextSubStatus = "archived";
              nextClassification = "No Case";
            } else if (decision === "ICSR") {
              nextStageId = "TRIAGE_QUEUE_ICSR"; // Upgrade
              nextStatus = "Under Triage Review";
              nextSubStatus = "triage";
              nextClassification = "Probable ICSR";
              study.workflowTrack = "ICSR";
            } else {
              // AOI
              nextStageId = "TRIAGE_QUEUE_AOI"; // Upgrade
              nextStatus = "Under Triage Review";
              nextSubStatus = "triage";
              nextClassification = "Probable AOI";
              study.workflowTrack = "AOI";
            }
          }

          if (nextStageId) {
            study.workflowStage = nextStageId;
            study.status = nextStatus;
            study.subStatus = nextSubStatus;
            study.icsrClassification = nextClassification;

            // Release Assignment
            study.assignedTo = null;
            study.batchId = null;
            study.allocatedAt = null;
            study.lockedAt = null;

            // Manual update of classification fields
            study.userTag = updates.userTag;
            study.classifiedBy = req.user.id;
            study.updatedAt = new Date().toISOString();

            // Log comment
            study.addComment({
              userId: req.user.id,
              userName: req.user.name,
              text: `Assessment completed: ${decision}. Moved to ${nextStatus}.`,
              type: "system",
            });

            workflowHandled = true;
          }
        }
        // --- NEW WORKFLOW LOGIC END ---

        let debugInfo = {};
        if (!workflowHandled) {
          let nextStage = null;
          try {
            const workflowConfig = await adminConfigService.getConfig(
              req.user.organizationId,
              "workflow",
            );

            debugInfo.hasConfig = !!workflowConfig;
            debugInfo.orgId = req.user.organizationId;

            if (
              workflowConfig &&
              workflowConfig.configData &&
              workflowConfig.configData.transitions
            ) {
              // Determine current status ID
              let currentStatus = study.status;

              // Handle legacy statuses - map them to the initial workflow stage
              const legacyStatuses = [
                "Pending Review",
                "Pending",
                "Under Triage Review",
              ];
              if (legacyStatuses.includes(currentStatus)) {
                currentStatus = "triage"; // Default fallback
                const initialStage = workflowConfig.configData.stages.find(
                  (s) => s.type === "initial",
                );
                if (initialStage) {
                  currentStatus = initialStage.id;
                }
              }

              debugInfo.currentStatus = currentStatus;
              debugInfo.originalStatus = study.status;
              debugInfo.availableTransitions =
                workflowConfig.configData.transitions.map(
                  (t) => `${t.from} -> ${t.to}`,
                );

              // Find transition from current status
              // We search in reverse order to prioritize the most recently added transition
              const transition = [...workflowConfig.configData.transitions]
                .reverse()
                .find((t) => t.from === currentStatus);

              debugInfo.transition = transition;

              // Check for ICSR Bypass - REMOVED per requirements (ICSRs don't bypass)
              // Original logic for checking bypassQcForIcsr has been removed.

              if (!nextStage && transition) {
                // Standard transition logic - always follow the configured transition
                // The QC Sampling logic is now handled in the bulk process endpoint
                nextStage = workflowConfig.configData.stages.find(
                  (s) => s.id === transition.to,
                );
                debugInfo.nextStage = nextStage;
              }
            }
          } catch (err) {
            console.warn(
              "Failed to fetch workflow config during classification:",
              err,
            );
            debugInfo.error = err.message;
          }

          study.updateUserTag(
            updates.userTag,
            req.user.id,
            req.user.name,
            nextStage,
          );
        }

        // Update additional classification fields if provided
        if (updates.justification !== undefined)
          study.justification = updates.justification;
        if (updates.listedness !== undefined)
          study.listedness = updates.listedness;
        if (updates.seriousness !== undefined)
          study.seriousness = updates.seriousness;
        if (updates.fullTextAvailability !== undefined)
          study.fullTextAvailability = updates.fullTextAvailability;
        if (updates.fullTextSource !== undefined)
          study.fullTextSource = updates.fullTextSource;

        const afterValue = {
          userTag: study.userTag,
          justification: study.justification,
          listedness: study.listedness,
          seriousness: study.seriousness,
          fullTextAvailability: study.fullTextAvailability,
          fullTextSource: study.fullTextSource,
        };

        // Save updated study with qaApprovalStatus set to pending
        const updatedStudy = await cosmosService.updateItem(
          "studies",
          studyId,
          req.user.organizationId,
          study.toJSON(),
        );

        await auditAction(
          req.user,
          "update",
          "study",
          studyId,
          `Updated study classification to ${updates.userTag}`,
          { pmid: study.pmid },
          beforeValue,
          afterValue,
        );

        return res.json({
          success: true,
          message: "Study classification updated successfully",
          study: updatedStudy,
          debug: debugInfo,
        });
      }

      // Capture before values for regular updates
      const beforeValue = {};
      Object.keys(updates).forEach((key) => {
        beforeValue[key] = existingStudy[key];
      });

      // Regular update for other fields
      const updatedStudy = await cosmosService.updateItem(
        "studies",
        studyId,
        req.user.organizationId,
        updates,
      );

      // Capture after values
      const afterValue = {};
      Object.keys(updates).forEach((key) => {
        afterValue[key] = updatedStudy[key];
      });

      // Create audit log
      await auditAction(
        req.user,
        "update",
        "study",
        studyId,
        `Updated study: PMID ${updatedStudy.pmid}`,
        { updates: Object.keys(updates), pmid: updatedStudy.pmid },
        beforeValue,
        afterValue,
      );

      res.json({
        message: "Study updated successfully",
        study: updatedStudy,
      });
    } catch (error) {
      console.error("Error updating study:", error);
      res.status(500).json({
        error: "Failed to update study",
        message: error.message,
      });
    }
  },
);

// Add comment to study
router.post(
  "/:studyId/comments",
  authorizePermission("studies", "write"),
  [
    body("comment").isLength({ min: 1 }),
    body("type")
      .optional()
      .isIn(["review", "approval", "rejection", "general"]),
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

      const { studyId } = req.params;
      const { comment, type = "general" } = req.body;

      // Get existing study
      const study = await cosmosService.getItem(
        "studies",
        studyId,
        req.user.organizationId,
      );
      if (!study) {
        return res.status(404).json({
          error: "Study not found",
        });
      }

      // Create study instance and add comment
      const studyInstance = new Study(study);
      const newComment = studyInstance.addComment({
        userId: req.user.id,
        userName: new (require("../models/User"))(req.user).getFullName(),
        text: comment,
        type,
      });

      // Update study in database
      const updatedStudy = await cosmosService.updateItem(
        "studies",
        studyId,
        req.user.organizationId,
        {
          comments: studyInstance.comments,
          updatedAt: studyInstance.updatedAt,
        },
      );

      // Create audit log with comment content
      await auditAction(
        req.user,
        "comment",
        "study",
        studyId,
        `Commented "${comment}" in ${type} section for study ${study.pmid}`,
        { commentType: type, pmid: study.pmid },
        null,
        { commentText: comment, commentType: type },
      );

      res.status(201).json({
        message: "Comment added successfully",
        comment: newComment,
        study: updatedStudy,
      });
    } catch (error) {
      console.error("Error adding comment:", error);
      res.status(500).json({
        error: "Failed to add comment",
        message: error.message,
      });
    }
  },
);

// Add field comment to study
router.post(
  "/:studyId/field-comments",
  authorizePermission("studies", "write"),
  [body("fieldKey").isLength({ min: 1 }), body("comment").isLength({ min: 1 })],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: "Validation failed",
          details: errors.array(),
        });
      }

      const { studyId } = req.params;
      const { fieldKey, comment } = req.body;

      // Get existing study
      const study = await cosmosService.getItem(
        "studies",
        studyId,
        req.user.organizationId,
      );
      if (!study) {
        return res.status(404).json({
          error: "Study not found",
        });
      }

      // Create study instance and add field comment
      const studyInstance = new Study(study);
      const newFieldComment = studyInstance.addFieldComment(
        fieldKey,
        comment,
        req.user.id,
        new (require("../models/User"))(req.user).getFullName(),
      );

      // Update study in database
      const updatedStudy = await cosmosService.updateItem(
        "studies",
        studyId,
        req.user.organizationId,
        {
          fieldComments: studyInstance.fieldComments,
          comments: studyInstance.comments, // Also update general comments as addFieldComment adds a system comment
          updatedAt: studyInstance.updatedAt,
        },
      );

      // Create audit log
      await auditAction(
        req.user,
        "comment",
        "study",
        studyId,
        `Added field comment to study PMID ${study.pmid} for field ${fieldKey}: "${comment}"`,
        { fieldKey, pmid: study.pmid },
        null,
        { commentText: comment, fieldKey },
      );

      res.status(201).json({
        message: "Field comment added successfully",
        fieldComment: newFieldComment,
        study: updatedStudy,
      });
    } catch (error) {
      console.error("Error adding field comment:", error);
      res.status(500).json({
        error: "Failed to add field comment",
        message: error.message,
      });
    }
  },
);

// Update study status
router.patch(
  "/:studyId/status",
  authorizePermission("studies", "write"),
  [body("status").isString(), body("reviewDetails").optional().isObject()],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: "Validation failed",
          details: errors.array(),
        });
      }

      const { studyId } = req.params;
      const { status, reviewDetails = {} } = req.body;

      // Get existing study
      const study = await cosmosService.getItem(
        "studies",
        studyId,
        req.user.organizationId,
      );
      if (!study) {
        return res.status(404).json({
          error: "Study not found",
        });
      }

      // Create study instance and update status
      const studyInstance = new Study(study);
      studyInstance.updateStatus(
        status,
        req.user.id,
        new (require("../models/User"))(req.user).getFullName(),
      );

      if (Object.keys(reviewDetails).length > 0) {
        studyInstance.updateReviewDetails(reviewDetails);
      }

      // Update study in database
      const updatedStudy = await cosmosService.updateItem(
        "studies",
        studyId,
        req.user.organizationId,
        studyInstance.toJSON(),
      );

      // Create audit log
      await auditAction(
        req.user,
        status === "Approved"
          ? "approve"
          : status === "Rejected"
            ? "reject"
            : "update",
        "study",
        studyId,
        `${status === "Approved" ? "Approved" : status === "Rejected" ? "Rejected" : "Updated status of"} study PMID ${study.pmid}`,
        { newStatus: status, previousStatus: study.status },
      );

      res.json({
        message: "Study status updated successfully",
        study: updatedStudy,
      });
    } catch (error) {
      console.error("Error updating study status:", error);
      res.status(500).json({
        error: "Failed to update study status",
        message: error.message,
      });
    }
  },
);

// Delete study
router.delete(
  "/:studyId",
  authorizePermission("studies", "delete"),
  async (req, res) => {
    try {
      const { studyId } = req.params;

      // Check if study exists
      const study = await cosmosService.getItem(
        "studies",
        studyId,
        req.user.organizationId,
      );
      if (!study) {
        return res.status(404).json({
          error: "Study not found",
        });
      }

      // Delete study
      await cosmosService.deleteItem(
        "studies",
        studyId,
        req.user.organizationId,
      );

      // Create audit log
      await auditAction(
        req.user,
        "delete",
        "study",
        studyId,
        `Deleted study: PMID ${study.pmid}`,
        { pmid: study.pmid, drugName: study.drugName },
      );

      res.json({
        message: "Study deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting study:", error);
      res.status(500).json({
        error: "Failed to delete study",
        message: error.message,
      });
    }
  },
);

// Get study statistics
router.get(
  "/stats/summary",
  authorizePermission("studies", "read"),
  async (req, res) => {
    try {
      let targetOrgId = req.user.organizationId;
      if (req.user.isSuperAdmin() && req.query.organizationId) {
        targetOrgId = req.query.organizationId;
      }

      const filterDateStr = req.query.date;

      // Optimization: Check Cache
      const cacheKey = `stats:summary:${targetOrgId}${filterDateStr ? ":" + filterDateStr : ""}`;
      const cachedResult = await cacheService.get(cacheKey);

      if (cachedResult) {
        // console.log('Serving stats summary from cache');
        return res.json(cachedResult);
      }

      const stats = {
        total: 0,
        pendingReview: 0,
        underReview: 0,
        approved: 0,
        rejected: 0,
        qaStats: {
          pending: 0,
          approvedManual: 0,
          approvedAuto: 0,
          rejected: 0,
          manualQc: 0,
        },
        medicalReviewStats: {
          notStarted: 0,
          inProgress: 0,
          completed: 0,
        },
        r3Stats: {
          notStarted: 0,
          inProgress: 0,
          completed: 0,
        },
        counts: {
          users: 0,
          medicalReviewers: 0,
          drugs: 0,
          qaReviewed: 0,
        },
        tagStats: {
          icsr: 0,
          aoi: 0,
          noCase: 0,
        },
        processedToday: 0,
        // New statistics for Calendar Dashboard
        dateStats: {
          selectedDate: null,
          totalCreated: 0,
          totalReportsCreated: 0,
          aiClassification: {
            icsr: 0,
            aoi: 0,
            noCase: 0,
            other: 0,
          },
          priorityQueue: {
            probableIcsr: 0,
            probableAoi: 0,
            probableIcsrAoi: 0,
            manualReview: 0,
            noCase: 0,
          },
          triageClassification: {
            icsr: 0,
            aoi: 0,
            noCase: 0,
            unclassified: 0,
          },
        },
        workflowStats: {
          triage: 0,
          qcAllocation: 0,
          qcTriage: 0,
          dataEntry: 0,
          qcDataEntry: 0,
          medicalReview: 0,
          completed: 0,
          // New Track Stats
          icsrTriage: 0,
          icsrAssessment: 0,
          aoiTriage: 0,
          aoiAssessment: 0,
          noCaseTriage: 0,
          noCaseAssessment: 0,
          reportsCreated: 0,
        },
        byDrug: {},
        byMonth: {},
        byUser: {},
      };

      // Fetch all required data in parallel
      const [studies, users, drugs, reports] = await Promise.all([
        cosmosService.getStudiesByOrganization(targetOrgId),
        cosmosService.getUsersByOrganization(targetOrgId),
        cosmosService.getDrugsByOrganization(targetOrgId),
        cosmosService.queryItems(
          "Reports",
          "SELECT * FROM c WHERE c.organizationId = @orgId",
          [{ name: "@orgId", value: targetOrgId }],
        ),
      ]);

      stats.total = studies.length;
      stats.counts.users = users.length;
      stats.counts.medicalReviewers = users.filter(
        (u) =>
          u.role === "medical_reviewer" ||
          u.roles?.includes("medical_reviewer"),
      ).length;
      stats.counts.drugs = drugs.length;

      // Create user map for resolving IDs to names
      const userMap = users.reduce((acc, user) => {
        acc[user.id] = user.firstName
          ? `${user.firstName} ${user.lastName || ""}`.trim()
          : user.name || user.email;
        return acc;
      }, {});

      const today = new Date();
      const todayStr = today.toDateString();

      // Date for filtering
      stats.dateStats.selectedDate = filterDateStr || null;

      studies.forEach((study) => {
        // Tag stats
        if (study.userTag === "ICSR") stats.tagStats.icsr++;
        else if (study.userTag === "AOI") stats.tagStats.aoi++;
        else if (study.userTag === "No Case") stats.tagStats.noCase++;

        // Processed Today (using updatedAt)
        if (study.updatedAt) {
          const updatedDate = new Date(study.updatedAt);
          if (updatedDate.toDateString() === todayStr) {
            stats.processedToday++;
          }
        }

        // Check date filter for workflow stats
        let includeInWorkflow = true;
        if (filterDateStr) {
          // Default to excluding unless we find a match
          includeInWorkflow = false;

          // Check createdAt
          if (study.createdAt) {
            const cDate = new Date(study.createdAt);
            const cYMD = cDate.toISOString().split("T")[0];
            if (cYMD === filterDateStr) {
              includeInWorkflow = true;
            }
          }
        }

        // --- Workflow Stats ---
        // Only count towards workflow stats if no date filter is applied, OR if the study matches the date filter
        if (includeInWorkflow) {
          // Triage: Not yet user tagged
          if (
            !study.userTag &&
            (study.status === "Pending Review" ||
              study.status === "Pending" ||
              study.status === "Under Triage Review")
          ) {
            stats.workflowStats.triage++;
          }
          // QC Allocation: Tagged but awaiting QC assignment/action (pending)
          else if (
            study.userTag &&
            (!study.qaApprovalStatus || study.qaApprovalStatus === "pending")
          ) {
            stats.workflowStats.qcAllocation++;
          }
          // QC Triage: Currently in QC status (manual_qc)
          else if (study.qaApprovalStatus === "manual_qc") {
            stats.workflowStats.qcTriage++;
          }
          // Data Entry / QC Data Entry / Medical Review flow
          else if (
            study.userTag === "ICSR" &&
            study.qaApprovalStatus === "approved"
          ) {
            // Check R3 QC Status
            if (study.qcR3Status === "pending") {
              stats.workflowStats.qcDataEntry++;
            } else if (study.qcR3Status === "approved") {
              // Moved to Medical Review?
              if (
                study.medicalReviewStatus === "completed" ||
                study.status === "Approved"
              ) {
                stats.workflowStats.completed++;
              } else {
                stats.workflowStats.medicalReview++;
              }
            } else {
              // Not pending R3 QC, not approved R3 QC -> Must be in Data Entry (or R3 rejected)
              // Unless it's completed without R3 (legacy?)
              if (study.status === "Approved") {
                stats.workflowStats.completed++;
              } else {
                stats.workflowStats.dataEntry++;
              }
            }
          }
          // Completed (Catch-all for other flows)
          else if (
            study.status === "Approved" ||
            study.medicalReviewStatus === "completed"
          ) {
            stats.workflowStats.completed++;
          }

          // --- New Track Stats ---
          if (study.workflowTrack) {
            const track = study.workflowTrack;
            const sub = study.subStatus;

            // Check for reporting status first
            if (
              sub === "reporting" ||
              study.status === "Ready for Report" ||
              study.status === "No Case Confirmed"
            ) {
              stats.workflowStats.reportsCreated++;
            } else if (track === "ICSR") {
              if (sub === "triage") stats.workflowStats.icsrTriage++;
              else if (sub === "assessment")
                stats.workflowStats.icsrAssessment++;
            } else if (track === "AOI") {
              if (sub === "triage") stats.workflowStats.aoiTriage++;
              else if (sub === "assessment")
                stats.workflowStats.aoiAssessment++;
            } else if (track === "NoCase") {
              if (sub === "triage") stats.workflowStats.noCaseTriage++;
              else if (sub === "assessment")
                stats.workflowStats.noCaseAssessment++;
            }
          }
        }

        // --- Date Specific Stats ---
        if (filterDateStr && study.createdAt) {
          const createdDate = new Date(study.createdAt);
          // Format to YYYY-MM-DD
          const createdYMD = createdDate.toISOString().split("T")[0];

          if (createdYMD === filterDateStr) {
            stats.dateStats.totalCreated++;

            // AI Classification Snapshot for this date
            // Priority: icsrClassification field > aiInferenceData.icsrPrediction
            const aiClass = (
              study.icsrClassification ||
              study.aiInferenceData?.icsrPrediction ||
              ""
            ).toLowerCase();
            if (aiClass.includes("icsr"))
              stats.dateStats.aiClassification.icsr++;
            else if (aiClass.includes("aoi"))
              stats.dateStats.aiClassification.aoi++;
            else if (aiClass.includes("no case") || aiClass.includes("nocase"))
              stats.dateStats.aiClassification.noCase++;
            else stats.dateStats.aiClassification.other++;

            // Priority Queue Calculation
            const rawIcsr_pq =
              study.icsrClassification ||
              study.ICSR_classification ||
              study.aiInferenceData?.ICSR_classification ||
              study.aiInferenceData?.icsrPrediction ||
              "";

            const normalize_pq = (val) => {
              if (!val) return "";
              return val
                .replace(/^Classification:\s*/i, "")
                .replace(/^\d+\.\s*/, "")
                .trim();
            };

            const icsr_pq = normalize_pq(rawIcsr_pq);

            let finalStatus = "Other";

            if (
              icsr_pq === "Article requires manual review" ||
              icsr_pq === "Manual Review"
            ) {
              finalStatus = "Manual Review";
            } else if (icsr_pq === "Probable ICSR/AOI") {
              finalStatus = "Probable ICSR/AOI";
            } else if (icsr_pq === "Probable ICSR") {
              finalStatus = "Probable ICSR";
            } else if (icsr_pq === "No Case") {
              finalStatus = "No Case";
            } else if (icsr_pq === "Probable AOI") {
              finalStatus = "Probable AOI";
            }

            if (finalStatus === "Probable ICSR")
              stats.dateStats.priorityQueue.probableIcsr++;
            else if (finalStatus === "Probable AOI")
              stats.dateStats.priorityQueue.probableAoi++;
            else if (finalStatus === "Probable ICSR/AOI")
              stats.dateStats.priorityQueue.probableIcsrAoi++;
            else if (finalStatus === "Manual Review")
              stats.dateStats.priorityQueue.manualReview++;
            else if (finalStatus === "No Case")
              stats.dateStats.priorityQueue.noCase++;

            // Triage Classification Snapshot for this date
            const userClass = (study.userTag || "unclassified").toLowerCase();
            if (userClass === "icsr")
              stats.dateStats.triageClassification.icsr++;
            else if (userClass === "aoi")
              stats.dateStats.triageClassification.aoi++;
            else if (userClass === "no case" || userClass === "nocase")
              stats.dateStats.triageClassification.noCase++;
            else stats.dateStats.triageClassification.unclassified++;
          }
        }

        // Count by status
        switch (study.status) {
          case "Pending Review":
          case "Pending":
          case "Under Triage Review":
            stats.pendingReview++;
            break;
          case "Under Review":
            stats.underReview++;
            break;
          case "Approved":
            stats.approved++;
            break;
          case "Rejected":
            stats.rejected++;
            break;
        }

        // QA Stats
        if (study.qaApprovalStatus === "approved") {
          stats.counts.qaReviewed++; // Count approved as reviewed
          if (study.qaComments === "Auto approved QC") {
            stats.qaStats.approvedAuto++;
          } else {
            stats.qaStats.approvedManual++;
          }
        } else if (study.qaApprovalStatus === "rejected") {
          stats.counts.qaReviewed++; // Count rejected as reviewed
          stats.qaStats.rejected++;
        } else if (study.qaApprovalStatus === "manual_qc") {
          stats.qaStats.manualQc++;
        } else {
          stats.qaStats.pending++;
        }

        // Medical Review Stats
        if (study.medicalReviewStatus === "completed") {
          stats.medicalReviewStats.completed++;
        } else if (study.medicalReviewStatus === "in_progress") {
          stats.medicalReviewStats.inProgress++;
        } else {
          stats.medicalReviewStats.notStarted++;
        }

        // R3 Stats
        if (study.r3FormStatus === "completed") {
          stats.r3Stats.completed++;
        } else if (study.r3FormStatus === "in_progress") {
          stats.r3Stats.inProgress++;
        } else {
          stats.r3Stats.notStarted++;
        }

        // Count by drug
        if (study.drugName) {
          stats.byDrug[study.drugName] =
            (stats.byDrug[study.drugName] || 0) + 1;
        }

        // Count by month
        if (study.createdAt) {
          const month = new Date(study.createdAt).toISOString().slice(0, 7); // YYYY-MM
          stats.byMonth[month] = (stats.byMonth[month] || 0) + 1;
        }

        // Count by user
        if (study.createdBy) {
          let creatorName = "Unknown";
          if (typeof study.createdBy === "object") {
            creatorName =
              study.createdBy.name || study.createdBy.email || "Unknown";
          } else {
            // Try to resolve ID to name, otherwise use the ID/string
            creatorName = userMap[study.createdBy] || study.createdBy;
          }

          if (creatorName) {
            stats.byUser[creatorName] = (stats.byUser[creatorName] || 0) + 1;
          }
        }
      });

      // Reports Stats - Count reports created on selected date
      if (reports && reports.length > 0) {
        reports.forEach((report) => {
          let includeInWorkflow = true;
          if (filterDateStr && report.createdAt) {
            const createdDate = new Date(report.createdAt);
            const createdYMD = createdDate.toISOString().split("T")[0];
            if (createdYMD === filterDateStr) {
              stats.dateStats.totalReportsCreated++;
            } else {
              includeInWorkflow = false;
            }
          }

          /* 
           * Removing this as "Reports Created" in workflow stats should reflect 
           * studies in the "Reporting" stage, not the total count of Report documents.
           *
          if (includeInWorkflow) {
            stats.workflowStats.reportsCreated++;
          }
          */
        });
      }

      // Fallback for drugs count: if no configured drugs, use unique drugs found in studies
      if (stats.counts.drugs === 0 && Object.keys(stats.byDrug).length > 0) {
        stats.counts.drugs = Object.keys(stats.byDrug).length;
      }

      // Cache the result for 5 minutes (300 seconds) - Stats don't change as fast as lists
      await cacheService.set(cacheKey, stats, 300);

      res.json(stats);
    } catch (error) {
      console.error("Error fetching study statistics:", error);
      res.status(500).json({
        error: "Failed to fetch study statistics",
        message: error.message,
      });
    }
  },
);

// Job tracking routes
router.get(
  "/jobs/:jobId/status",
  authorizePermission("studies", "read"),
  async (req, res) => {
    try {
      const { jobId } = req.params;
      const status = studyCreationService.getJobStatus(jobId);

      if (!status) {
        return res.status(404).json({ error: "Job not found" });
      }

      // Only return job data if it belongs to the requesting user
      if (status.userId !== req.user.id) {
        return res.status(403).json({ error: "Access denied" });
      }

      res.json(status);
    } catch (error) {
      console.error("Error getting job status:", error);
      res.status(500).json({
        error: "Failed to get job status",
        message: error.message,
      });
    }
  },
);

router.get(
  "/jobs/active",
  authorizePermission("studies", "read"),
  async (req, res) => {
    try {
      const activeJobs = studyCreationService.getUserActiveJobs(req.user.id);
      res.json({ jobs: activeJobs });
    } catch (error) {
      console.error("Error getting active jobs:", error);
      res.status(500).json({
        error: "Failed to get active jobs",
        message: error.message,
      });
    }
  },
);

// Update study user tag
router.patch(
  "/:id/tag",
  authorizePermission("studies", "write"),
  [
    body("userTag")
      .isIn(["ICSR", "AOI", "No Case"])
      .withMessage("User tag must be ICSR, AOI, or No Case"),
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

      const { id } = req.params;
      const { userTag } = req.body;

      // Get the study
      const existingStudy = await cosmosService.getItem(
        "studies",
        id,
        req.user.organizationId,
      );
      if (!existingStudy) {
        return res.status(404).json({ error: "Study not found" });
      }

      // Create Study instance and update tag
      const study = new Study(existingStudy);
      study.updateUserTag(userTag, req.user.id, req.user.name);

      // Save to database
      await cosmosService.updateItem(
        "studies",
        id,
        req.user.organizationId,
        study.toJSON(),
      );

      await auditAction(
        req.user,
        "update",
        "study",
        id,
        `Updated tag for study ${id} to ${userTag}`,
        { studyId: id, userTag, previousTag: existingStudy.userTag },
        { userTag: existingStudy.userTag },
        { userTag: userTag },
      );

      res.json({
        message: "Study tag updated successfully",
        study: study.toJSON(),
      });
    } catch (error) {
      console.error("Error updating study tag:", error);
      res.status(500).json({
        error: "Failed to update study tag",
        message: error.message,
      });
    }
  },
);

// Get R3 form data for a study
router.get(
  "/:id/r3-form-data",
  authorizePermission("studies", "read"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { pmid, drug_code, drugname, client } = req.query;

      console.log("R3 form data request:", {
        id,
        pmid,
        drug_code,
        drugname,
        client,
      });

      if (!pmid || !drugname) {
        return res.status(400).json({
          error: "Missing required parameters: pmid, drugname",
        });
      }

      // Call external API to get R3 field data
      const axios = require("axios");

      // Get configured endpoint (Dynamic Configuration Support)
      let r3BaseUrl = "http://20.246.204.3/get_r3_fields/";
      try {
        const sysConfig = await adminConfigService.getConfig(
          req.user.organizationId,
          "system_config",
        );
        if (
          sysConfig &&
          sysConfig.configData &&
          sysConfig.configData.r3XmlEndpoint
        ) {
          r3BaseUrl = sysConfig.configData.r3XmlEndpoint;
        }
      } catch (e) {
        console.warn(
          "Failed to load system config for R3 endpoint:",
          e.message,
        );
      }

      // Construct API URL
      let apiUrl;
      try {
        const url = new URL(r3BaseUrl);
        url.searchParams.append("PMID", pmid);
        url.searchParams.append("drugname", drugname);
        apiUrl = url.toString();
      } catch (e) {
        // Fallback if URL parsing fails
        console.error("Invalid R3 endpoint URL:", r3BaseUrl);
        apiUrl = `http://20.246.204.3/get_r3_fields/?PMID=${pmid}&drugname=${drugname}`;
      }

      console.log("Calling external R3 API:", apiUrl);

      const response = await axios.get(apiUrl, { timeout: 50000 });

      console.log(
        "R3 API response received:",
        response.data ? "Data received" : "No data",
      );

      await auditAction(
        req.user,
        "fetch",
        "study",
        "r3_form_data",
        `Fetched R3 form data for study ${id}`,
        { pmid, drug_code, drugname, client },
      );

      res.json({
        success: true,
        data: response.data,
      });
    } catch (error) {
      console.error("R3 form data fetch error:", error.message);
      if (error.response) {
        console.error(
          "External API error response:",
          error.response.status,
          error.response.data,
        );
      }
      res.status(500).json({
        error: "Failed to fetch R3 form data",
        message: error.message,
      });
    }
  },
);

// Update R3 form data for a study
router.put(
  "/:id/r3-form",
  authorizePermission("studies", "write"),
  [body("formData").isObject().withMessage("Form data must be an object")],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res
          .status(400)
          .json({ error: "Validation failed", details: errors.array() });
      }

      const { id } = req.params;
      const { formData } = req.body;

      // Get the study
      const studyData = await cosmosService.getItem(
        "studies",
        id,
        req.user.organizationId,
      );
      if (!studyData) {
        return res.status(404).json({ error: "Study not found" });
      }

      // Capture before value (deep copy to avoid reference issues)
      const beforeValue = studyData.r3FormData
        ? JSON.parse(JSON.stringify(studyData.r3FormData))
        : null;

      const study = new Study(studyData);
      study.updateR3FormData(formData, req.user.id, req.user.name);

      // Capture after value (deep copy to avoid reference issues)
      const afterValue = study.r3FormData
        ? JSON.parse(JSON.stringify(study.r3FormData))
        : null;

      // Get only the changed fields
      const changedFields = getChangedFields(beforeValue, afterValue);

      // Save updated study
      await cosmosService.updateItem(
        "studies",
        id,
        req.user.organizationId,
        study.toJSON(),
      );

      // Log changes for debugging
      console.log("R3 Form Update - Changed Fields:", {
        changedFieldCount: Object.keys(changedFields).length,
        changedFieldNames: Object.keys(changedFields),
      });

      // Unwrap changed fields for audit log
      const auditBefore = {};
      const auditAfter = {};
      const changeDetails = [];

      const formatVal = (v) => {
        if (v === null || v === undefined) return "empty";
        if (v === "") return '""';
        let s = typeof v === "object" ? JSON.stringify(v) : String(v);
        if (s.length > 20) return s.substring(0, 17) + "...";
        return s;
      };

      Object.keys(changedFields).forEach((key) => {
        const before = changedFields[key].before;
        const after = changedFields[key].after;

        auditBefore[key] = before;
        auditAfter[key] = after;

        if (before !== undefined && before !== null && before !== "") {
          changeDetails.push(
            `${key}: "${formatVal(before)}" -> "${formatVal(after)}"`,
          );
        } else {
          changeDetails.push(`${key}: "${formatVal(after)}"`);
        }
      });

      await auditAction(
        req.user,
        "update",
        "study",
        id,
        `Updated R3 form fields for study ${id}`,
        { studyId: id, pmid: study.pmid },
        auditBefore,
        auditAfter,
      );

      res.json({
        success: true,
        message: "R3 form data updated successfully",
        study: study.toJSON(),
      });
    } catch (error) {
      console.error("R3 form update error:", error);
      res.status(500).json({
        error: "Failed to update R3 form data",
        message: error.message,
      });
    }
  },
);

// Complete R3 form for a study
router.post(
  "/:id/r3-form/complete",
  authorizePermission("studies", "write"),
  async (req, res) => {
    try {
      const { id } = req.params;

      // Get the study
      const studyData = await cosmosService.getItem(
        "studies",
        id,
        req.user.organizationId,
      );
      if (!studyData) {
        return res.status(404).json({ error: "Study not found" });
      }

      // Get workflow settings
      const workflowConfig = await adminConfigService.getConfig(
        req.user.organizationId,
        "workflow",
      );
      const workflowSettings =
        workflowConfig && workflowConfig.configData
          ? workflowConfig.configData
          : { qcDataEntry: true, medicalReview: true };

      // Capture before R3 form data (deep copy)
      const beforeR3FormData = studyData.r3FormData
        ? JSON.parse(JSON.stringify(studyData.r3FormData))
        : null;
      const beforeStatus = {
        r3FormStatus: studyData.r3FormStatus,
        r3FormCompletedBy: studyData.r3FormCompletedBy,
        r3FormCompletedAt: studyData.r3FormCompletedAt,
        qcR3Status: studyData.qcR3Status,
      };

      const study = new Study(studyData);
      study.completeR3Form(req.user.id, req.user.name, workflowSettings);

      // Capture after R3 form data (deep copy)
      const afterR3FormData = study.r3FormData
        ? JSON.parse(JSON.stringify(study.r3FormData))
        : null;
      const afterStatus = {
        r3FormStatus: study.r3FormStatus,
        r3FormCompletedBy: study.r3FormCompletedBy,
        r3FormCompletedAt: study.r3FormCompletedAt,
        qcR3Status: study.qcR3Status,
      };

      // Get only the changed R3 form fields
      const changedR3Fields = getChangedFields(
        beforeR3FormData,
        afterR3FormData,
      );

      // Unwrap changed R3 fields
      const r3AuditBefore = {};
      const r3AuditAfter = {};
      const changeDetails = [];

      const formatVal = (v) => {
        if (v === null || v === undefined) return "empty";
        if (v === "") return '""';
        let s = typeof v === "object" ? JSON.stringify(v) : String(v);
        if (s.length > 20) return s.substring(0, 17) + "...";
        return s;
      };

      Object.keys(changedR3Fields).forEach((key) => {
        const before = changedR3Fields[key].before;
        const after = changedR3Fields[key].after;

        r3AuditBefore[key] = before;
        r3AuditAfter[key] = after;

        if (before !== undefined && before !== null && before !== "") {
          changeDetails.push(
            `${key}: "${formatVal(before)}" -> "${formatVal(after)}"`,
          );
        } else {
          changeDetails.push(`${key}: "${formatVal(after)}"`);
        }
      });

      // Combine status changes with R3 field changes
      const finalBeforeValue = {
        ...beforeStatus,
        ...r3AuditBefore,
      };

      const finalAfterValue = {
        ...afterStatus,
        ...r3AuditAfter,
      };

      // Save updated study
      await cosmosService.updateItem(
        "studies",
        id,
        req.user.organizationId,
        study.toJSON(),
      );

      let detailsStr = `Completed R3 form for study ${id}`;

      await auditAction(
        req.user,
        "complete",
        "study",
        id,
        detailsStr,
        { studyId: id, pmid: study.pmid },
        finalBeforeValue,
        finalAfterValue,
      );

      res.json({
        success: true,
        message: "R3 form completed successfully",
        study: study.toJSON(),
      });
    } catch (error) {
      console.error("R3 form completion error:", error);
      res.status(500).json({
        error: "Failed to complete R3 form",
        message: error.message,
      });
    }
  },
);

// Update study classification
router.put(
  "/:id",
  authorizePermission("studies", "write"),
  [
    body("userTag")
      .optional()
      .isIn(["ICSR", "AOI", "No Case"])
      .withMessage("Invalid classification tag"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res
          .status(400)
          .json({ error: "Validation failed", details: errors.array() });
      }

      const { id } = req.params;
      const {
        userTag,
        justification,
        listedness,
        seriousness,
        fullTextAvailability,
        fullTextSource,
      } = req.body;

      console.log("Update Study Request Body:", {
        id,
        userTag,
        justification,
        fullTextAvailability,
        fullTextSource,
        fullTextSourceType: typeof fullTextSource,
      });

      // Get the study
      const studyData = await cosmosService.getItem(
        "studies",
        id,
        req.user.organizationId,
      );
      if (!studyData) {
        return res.status(404).json({ error: "Study not found" });
      }

      const beforeValue = {
        userTag: studyData.userTag,
        status: studyData.status,
        justification: studyData.justification,
        listedness: studyData.listedness,
        seriousness: studyData.seriousness,
        fullTextAvailability: studyData.fullTextAvailability,
        fullTextSource: studyData.fullTextSource || null,
      };

      const study = new Study(studyData);

      // Update additional fields if provided
      if (justification !== undefined) study.justification = justification;
      if (listedness !== undefined) study.listedness = listedness;
      if (seriousness !== undefined) study.seriousness = seriousness;
      if (fullTextAvailability !== undefined)
        study.fullTextAvailability = fullTextAvailability;
      if (fullTextSource !== undefined) study.fullTextSource = fullTextSource;

      let debugInfo = {};

      if (userTag) {
        // Fetch workflow config to determine next stage
        let nextStage = null;
        try {
          const workflowConfig = await adminConfigService.getConfig(
            req.user.organizationId,
            "workflow",
          );

          debugInfo.hasConfig = !!workflowConfig;
          debugInfo.orgId = req.user.organizationId;

          if (
            workflowConfig &&
            workflowConfig.configData &&
            workflowConfig.configData.transitions
          ) {
            // Determine current status ID
            let currentStatus = study.status;

            // Handle legacy statuses - map them to the initial workflow stage
            const legacyStatuses = [
              "Pending Review",
              "Pending",
              "Under Triage Review",
            ];
            if (legacyStatuses.includes(currentStatus)) {
              currentStatus = "triage"; // Default fallback
              const initialStage = workflowConfig.configData.stages.find(
                (s) => s.type === "initial",
              );
              if (initialStage) {
                currentStatus = initialStage.id;
              }
            }

            debugInfo.currentStatus = currentStatus;
            debugInfo.originalStatus = study.status;
            debugInfo.availableTransitions =
              workflowConfig.configData.transitions.map(
                (t) => `${t.from} -> ${t.to}`,
              );

            // Find transition from current status
            // We search in reverse order to prioritize the most recently added transition
            const transition = [...workflowConfig.configData.transitions]
              .reverse()
              .find((t) => t.from === currentStatus);

            debugInfo.transition = transition;

            // Check for ICSR Bypass - REMOVED per requirements (ICSRs don't bypass)
            // Original logic for checking bypassQcForIcsr has been removed.

            // Only use standard transition if nextStage wasn't already set by bypass logic
            if (!nextStage && transition) {
              // Standard transition logic - always follow the configured transition
              // The QC Sampling logic is now handled in the bulk process endpoint
              nextStage = workflowConfig.configData.stages.find(
                (s) => s.id === transition.to,
              );
              debugInfo.nextStage = nextStage;
            }
          }
        } catch (err) {
          console.warn(
            "Failed to fetch workflow config during classification:",
            err,
          );
          debugInfo.error = err.message;
        }

        study.updateUserTag(userTag, req.user.id, req.user.name, nextStage);
      }

      const afterValue = {
        userTag: study.userTag,
        status: study.status,
        justification: study.justification,
        listedness: study.listedness,
        seriousness: study.seriousness,
        fullTextAvailability: study.fullTextAvailability,
        fullTextSource: study.fullTextSource || null,
      };

      // Save updated study
      await cosmosService.updateItem(
        "studies",
        id,
        req.user.organizationId,
        study.toJSON(),
      );

      await auditAction(
        req.user,
        "update",
        "study",
        id,
        `Updated study classification to ${userTag}`,
        { studyId: id, pmid: study.pmid },
        beforeValue,
        afterValue,
      );

      res.json({
        success: true,
        message: "Study updated successfully",
        study: study.toJSON(),
        debug: debugInfo,
      });
    } catch (error) {
      console.error("Study update error:", error);
      res.status(500).json({
        error: "Failed to update study",
        message: error.message,
      });
    }
  },
);

// Update existing studies with ICSR classification from Pending to Under Triage Review
router.put(
  "/update-icsr-status",
  authorizePermission("studies", "write"),
  async (req, res) => {
    try {
      // Query for studies with ICSR classification but still in Pending status
      const query = `
        SELECT * FROM c 
        WHERE c.organizationId = @orgId 
        AND (c.status = @pendingStatus OR c.status = @pendingReviewStatus)
        AND (c.icsrClassification != null OR c.confirmedPotentialICSR = true)
      `;
      const parameters = [
        { name: "@orgId", value: req.user.organizationId },
        { name: "@pendingStatus", value: "Pending" },
        { name: "@pendingReviewStatus", value: "Pending Review" },
      ];

      const studiesWithICSR = await cosmosService.queryItems(
        "studies",
        query,
        parameters,
      );

      if (!studiesWithICSR || studiesWithICSR.length === 0) {
        return res.json({
          message:
            "No studies found with ICSR classification in Pending status",
          updatedCount: 0,
        });
      }

      let updatedCount = 0;
      const updateResults = [];

      // Update each study
      for (const studyData of studiesWithICSR) {
        try {
          // Update the status
          studyData.status = "Under Triage Review";
          studyData.updatedAt = new Date().toISOString();

          // Add a comment about the status change
          if (!studyData.comments) {
            studyData.comments = [];
          }

          studyData.comments.push({
            id: uuidv4(),
            userId: req.user.id,
            userName: req.user.name || req.user.email,
            text: 'Status automatically updated to "Under Triage Review" due to ICSR classification',
            type: "system",
            createdAt: new Date().toISOString(),
          });

          // Update the study in the database
          const updatedStudy = await cosmosService.replaceItem(
            "studies",
            studyData.id,
            studyData,
          );
          updatedCount++;

          updateResults.push({
            pmid: studyData.pmid,
            id: studyData.id,
            previousStatus: "Pending",
            newStatus: "Under Triage Review",
            icsrClassification: studyData.icsrClassification,
            confirmedPotentialICSR: studyData.confirmedPotentialICSR,
          });

          console.log(
            `Updated study ${studyData.id} (PMID: ${studyData.pmid}) status to "Under Triage Review"`,
          );
        } catch (updateError) {
          console.error(`Failed to update study ${studyData.id}:`, updateError);
          updateResults.push({
            pmid: studyData.pmid,
            id: studyData.id,
            error: updateError.message,
          });
        }
      }

      // Log the action
      await auditAction(
        req.user,
        "studies_bulk_update",
        `Updated ${updatedCount} studies with ICSR classification from Pending to Under Triage Review`,
        {
          totalFound: studiesWithICSR.length,
          updatedCount,
          updateResults,
        },
      );

      res.json({
        message: `Successfully updated ${updatedCount} out of ${studiesWithICSR.length} studies`,
        updatedCount,
        totalFound: studiesWithICSR.length,
        updateResults,
      });
    } catch (error) {
      console.error("Error updating ICSR studies status:", error);
      res.status(500).json({
        error: "Failed to update studies status",
        message: error.message,
      });
    }
  },
);

// QC Approval/Rejection endpoints
router.post(
  "/:id/QA/approve",
  authorizePermission("studies", "write"),
  [
    body("comments")
      .optional()
      .isString()
      .withMessage("Comments must be a string"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res
          .status(400)
          .json({ error: "Validation failed", details: errors.array() });
      }

      const { id } = req.params;
      const { comments } = req.body;

      // Get the study
      const studyData = await cosmosService.getItem(
        "studies",
        id,
        req.user.organizationId,
      );
      if (!studyData) {
        return res.status(404).json({ error: "Study not found" });
      }

      const beforeValue = {
        qaApprovalStatus: studyData.qaApprovalStatus,
        qaApprovedBy: studyData.qaApprovedBy,
        qaApprovedAt: studyData.qaApprovedAt,
      };

      const study = new Study(studyData);
      study.approveClassification(req.user.id, req.user.name, comments);

      const afterValue = {
        qaApprovalStatus: study.qaApprovalStatus,
        qaApprovedBy: study.qaApprovedBy,
        qaApprovedAt: study.qaApprovedAt,
      };

      // Save updated study
      await cosmosService.updateItem(
        "studies",
        id,
        req.user.organizationId,
        study.toJSON(),
      );

      await auditAction(
        req.user,
        "approve",
        "study",
        id,
        `Approved classification for study ${id}${comments ? ' with comment: "' + comments + '"' : ""}`,
        { studyId: id, classification: study.userTag, pmid: study.pmid },
        beforeValue,
        afterValue,
      );

      res.json({
        success: true,
        message: "Classification approved successfully",
        study: study.toJSON(),
      });
    } catch (error) {
      console.error("QC approval error:", error);
      res.status(500).json({
        error: "Failed to approve classification",
        message: error.message,
      });
    }
  },
);

router.post(
  "/:id/QA/reject",
  authorizePermission("studies", "write"),
  [
    body("reason")
      .isString()
      .isLength({ min: 1 })
      .withMessage("Rejection reason is required"),
    body("targetStage").optional().isString(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res
          .status(400)
          .json({ error: "Validation failed", details: errors.array() });
      }

      const { id } = req.params;
      const { reason, targetStage } = req.body;

      // Get the study
      const studyData = await cosmosService.getItem(
        "studies",
        id,
        req.user.organizationId,
      );
      if (!studyData) {
        return res.status(404).json({ error: "Study not found" });
      }

      const beforeValue = {
        qaApprovalStatus: studyData.qaApprovalStatus,
        qaApprovedBy: studyData.qaApprovedBy,
        qaApprovedAt: studyData.qaApprovedAt,
      };

      const study = new Study(studyData);
      study.rejectClassification(
        req.user.id,
        req.user.name,
        reason,
        targetStage,
      );

      const afterValue = {
        qaApprovalStatus: study.qaApprovalStatus,
        qaApprovedBy: study.qaApprovedBy,
        qaApprovedAt: study.qaApprovedAt,
      };

      // Save updated study
      await cosmosService.updateItem(
        "studies",
        id,
        req.user.organizationId,
        study.toJSON(),
      );

      await auditAction(
        req.user,
        "reject",
        "study",
        "QC_classification",
        `Rejected classification for study ${id} with reason: "${reason}"`,
        { studyId: id, classification: study.userTag, reason, targetStage },
        beforeValue,
        afterValue,
      );

      res.json({
        success: true,
        message: "Classification rejected successfully",
        study: study.toJSON(),
      });
    } catch (error) {
      console.error("QC rejection error:", error);
      res.status(500).json({
        error: "Failed to reject classification",
        message: error.message,
      });
    }
  },
);

// QC R3 XML Approval/Rejection endpoints
router.post(
  "/:id/QC/r3/approve",
  authorizePermission("QC", "approve"),
  [
    body("comments")
      .optional()
      .isString()
      .withMessage("Comments must be a string"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res
          .status(400)
          .json({ error: "Validation failed", details: errors.array() });
      }

      const { id } = req.params;
      const { comments } = req.body;

      // Get the study
      const studyData = await cosmosService.getItem(
        "studies",
        id,
        req.user.organizationId,
      );
      if (!studyData) {
        return res.status(404).json({ error: "Study not found" });
      }

      // Get workflow settings
      const workflowConfig = await adminConfigService.getConfig(
        req.user.organizationId,
        "workflow",
      );
      const workflowSettings =
        workflowConfig && workflowConfig.configData
          ? workflowConfig.configData
          : { qcDataEntry: true, medicalReview: true };

      const beforeValue = {
        qcR3Status: studyData.qcR3Status,
        qcR3ApprovedBy: studyData.qcR3ApprovedBy,
        qcR3ApprovedAt: studyData.qcR3ApprovedAt,
      };

      const study = new Study(studyData);
      study.approveR3Form(
        req.user.id,
        req.user.name,
        comments,
        workflowSettings,
      );

      const afterValue = {
        qcR3Status: study.qcR3Status,
        qcR3ApprovedBy: study.qcR3ApprovedBy,
        qcR3ApprovedAt: study.qcR3ApprovedAt,
      };

      // Save updated study
      await cosmosService.updateItem(
        "studies",
        id,
        req.user.organizationId,
        study.toJSON(),
      );

      await auditAction(
        req.user,
        "approve",
        "study",
        id,
        `Approved R3 XML form for study ${id}${comments ? ': "' + comments + '"' : ""}`,
        { studyId: id, pmid: study.pmid },
        beforeValue,
        afterValue,
      );

      res.json({
        success: true,
        message: "R3 XML form approved successfully",
        study: study.toJSON(),
      });
    } catch (error) {
      console.error("QC R3 approval error:", error);
      res.status(500).json({
        error: "Failed to approve R3 form",
        message: error.message,
      });
    }
  },
);

router.post(
  "/:id/QC/r3/reject",
  authorizePermission("QC", "reject"),
  [
    body("reason")
      .isString()
      .isLength({ min: 1 })
      .withMessage("Rejection reason is required"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res
          .status(400)
          .json({ error: "Validation failed", details: errors.array() });
      }

      const { id } = req.params;
      const { reason } = req.body;

      // Get the study
      const studyData = await cosmosService.getItem(
        "studies",
        id,
        req.user.organizationId,
      );
      if (!studyData) {
        return res.status(404).json({ error: "Study not found" });
      }

      const beforeValue = {
        qcR3Status: studyData.qcR3Status,
        qcR3RejectedBy: studyData.qcR3RejectedBy,
        qcR3RejectedAt: studyData.qcR3RejectedAt,
        qcR3RejectionReason: studyData.qcR3RejectionReason,
        r3FormStatus: studyData.r3FormStatus,
      };

      const study = new Study(studyData);
      study.rejectR3Form(req.user.id, req.user.name, reason);

      const afterValue = {
        qcR3Status: study.qcR3Status,
        qcR3RejectedBy: study.qcR3RejectedBy,
        qcR3RejectedAt: study.qcR3RejectedAt,
        qcR3RejectionReason: study.qcR3RejectionReason,
        r3FormStatus: study.r3FormStatus,
      };

      // Save updated study
      await cosmosService.updateItem(
        "studies",
        id,
        req.user.organizationId,
        study.toJSON(),
      );

      await auditAction(
        req.user,
        "reject",
        "study",
        id,
        `Rejected R3 XML form for study ${id}: "${reason}"`,
        { studyId: id, pmid: study.pmid, reason },
        beforeValue,
        afterValue,
      );

      res.json({
        success: true,
        message: "R3 XML form rejected successfully",
        study: study.toJSON(),
      });
    } catch (error) {
      console.error("QC R3 rejection error:", error);
      res.status(500).json({
        error: "Failed to reject R3 form",
        message: error.message,
      });
    }
  },
);

// Medical Reviewer endpoints
router.post(
  "/:id/field-comment",
  authorizePermission("medical_examiner", "comment_fields"),
  [
    body("fieldKey")
      .isString()
      .isLength({ min: 1 })
      .withMessage("Field key is required"),
    body("comment")
      .isString()
      .isLength({ min: 1 })
      .withMessage("Comment is required"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res
          .status(400)
          .json({ error: "Validation failed", details: errors.array() });
      }

      const { id } = req.params;
      const { fieldKey, comment } = req.body;

      // Get the study
      const studyData = await cosmosService.getItem(
        "studies",
        id,
        req.user.organizationId,
      );
      if (!studyData) {
        return res.status(404).json({ error: "Study not found" });
      }

      const study = new Study(studyData);
      const fieldComment = study.addFieldComment(
        fieldKey,
        comment,
        req.user.id,
        req.user.name,
      );

      // Save updated study
      await cosmosService.updateItem(
        "studies",
        id,
        req.user.organizationId,
        study.toJSON(),
      );

      // Format field name for more readable audit log
      const formattedFieldName = fieldKey
        .replace(/([A-Z])/g, " $1") // insert space before capital
        .replace(/_/g, " ") // replace underscore with space
        .replace(/\b\w/g, (c) => c.toUpperCase()) // capitalize first letter of each word
        .trim();

      await auditAction(
        req.user,
        "comment",
        "study",
        id,
        `Commented on this field (${formattedFieldName})`,
        { studyId: id, fieldKey, pmid: study.pmid, commentText: comment },
        null,
        { fieldKey, commentText: comment },
      );

      res.json({
        success: true,
        message: "Field comment added successfully",
        fieldComment: fieldComment,
      });
    } catch (error) {
      console.error("Field comment error:", error);
      res.status(500).json({
        error: "Failed to add field comment",
        message: error.message,
      });
    }
  },
);

router.put(
  "/:id/field-value",
  authorizePermission("medical_examiner", "edit_fields"),
  [
    body("fieldKey")
      .isString()
      .isLength({ min: 1 })
      .withMessage("Field key is required"),
    body("value").isString().withMessage("Value must be a string"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res
          .status(400)
          .json({ error: "Validation failed", details: errors.array() });
      }

      const { id } = req.params;
      const { fieldKey, value } = req.body;

      // Get the study
      const studyData = await cosmosService.getItem(
        "studies",
        id,
        req.user.organizationId,
      );
      if (!studyData) {
        return res.status(404).json({ error: "Study not found" });
      }

      const study = new Study(studyData);

      // Capture previous value before update (for audit log)
      let oldValue;
      if (["listedness", "seriousness"].includes(fieldKey)) {
        oldValue = study[fieldKey];
      } else {
        oldValue = study.r3FormData ? study.r3FormData[fieldKey] : undefined;
      }

      study.updateFieldValue(fieldKey, value, req.user.id, req.user.name);

      // Save updated study
      await cosmosService.updateItem(
        "studies",
        id,
        req.user.organizationId,
        study.toJSON(),
      );

      // Format field name
      const formattedFieldName = fieldKey
        .replace(/([A-Z])/g, " $1")
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase()) // capitalize first letter of each word
        .trim();

      await auditAction(
        req.user,
        "edit",
        "study",
        "field_value",
        `Edited this field (${formattedFieldName}) from "${oldValue || "empty"}" to "${value}"`,
        { studyId: id, fieldKey, value },
        { [fieldKey]: oldValue },
        { [fieldKey]: value },
      );

      res.json({
        success: true,
        message: "Field value updated successfully",
      });
    } catch (error) {
      console.error("Field update error:", error);
      res.status(500).json({
        error: "Failed to update field value",
        message: error.message,
      });
    }
  },
);

router.post(
  "/:id/revoke",
  (req, res, next) => {
    // Allow if user has medical_examiner revoke permission OR data_entry write permission
    // This allows both Medical Examiners to revoke to Data Entry, and Data Entry to revoke to Triage
    const hasMedicalRevoke =
      req.user.hasPermission &&
      req.user.hasPermission("medical_examiner", "revoke_studies");
    const hasDataEntryWrite =
      req.user.hasPermission && req.user.hasPermission("data_entry", "write");

    if (hasMedicalRevoke || hasDataEntryWrite) {
      return next();
    }

    return res.status(403).json({
      error:
        "Permission denied. Requires medical_examiner.revoke_studies OR data_entry.write",
      code: "PERMISSION_DENIED",
    });
  },
  [
    body("reason")
      .isString()
      .isLength({ min: 1 })
      .withMessage("Revocation reason is required"),
    body("targetStage").optional().isString(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res
          .status(400)
          .json({ error: "Validation failed", details: errors.array() });
      }

      const { id } = req.params;
      const { reason, targetStage } = req.body;

      console.log(
        `[Revoke] Request for study ${id}. Reason: ${reason}, Target: ${targetStage}`,
      );

      // Get the study
      const studyData = await cosmosService.getItem(
        "studies",
        id,
        req.user.organizationId,
      );
      if (!studyData) {
        return res.status(404).json({ error: "Study not found" });
      }

      const study = new Study(studyData);
      study.revokeStudy(req.user.id, req.user.name, reason, targetStage);

      // Save updated study
      await cosmosService.updateItem(
        "studies",
        id,
        req.user.organizationId,
        study.toJSON(),
      );

      await auditAction(
        req.user,
        "revoke",
        "study",
        "medical_revocation",
        `Revoked study ${study.pmid} back to ${targetStage || "Data Entry"}`,
        { studyId: id, pmid: study.pmid, reason, targetStage },
      );

      res.json({
        success: true,
        message: `Study revoked successfully and returned to ${targetStage || "Data Entry"}`,
      });
    } catch (error) {
      console.error("Study revocation error:", error);
      res.status(500).json({
        error: "Failed to revoke study",
        message: error.message,
      });
    }
  },
);

router.post(
  "/:id/medical-review/complete",
  authorizePermission("medical_examiner", "write"),
  async (req, res) => {
    try {
      const { id } = req.params;

      // Get the study
      const studyData = await cosmosService.getItem(
        "studies",
        id,
        req.user.organizationId,
      );
      if (!studyData) {
        return res.status(404).json({ error: "Study not found" });
      }

      const study = new Study(studyData);
      study.completeMedicalReview(req.user.id, req.user.name);

      // Save updated study
      await cosmosService.updateItem(
        "studies",
        id,
        req.user.organizationId,
        study.toJSON(),
      );

      await auditAction(
        req.user,
        "complete",
        "study",
        "medical_review",
        `Completed medical review for study ${study.pmid}`,
        { studyId: id, pmid: study.pmid },
      );

      res.json({
        success: true,
        message: "Medical review completed successfully",
      });
    } catch (error) {
      console.error("Medical review completion error:", error);
      res.status(500).json({
        error: "Failed to complete medical review",
        message: error.message,
      });
    }
  },
);

// Allocate a case to the current user
router.post(
  "/allocate-case",
  authorizePermission("studies", "read"),
  async (req, res) => {
    try {
      const userId = req.user.id;
      const organizationId = req.user.organizationId;
      const today = new Date().toISOString().split("T")[0];

      // Fetch Triage Configuration for Priority
      const triageConfig = await adminConfigService.getConfig(
        organizationId,
        "triage",
      );
      const priorityQueue = triageConfig?.configData?.priorityQueue || [
        "Probable ICSR",
        "Probable AOI",
        "Probable ICSR/AOI",
        "No Case",
        "Manual Review",
      ];

      // Helper to determine study type (consistent with allocate-batch)
      const getStudyType = (study) => {
        const icsr =
          study.icsrClassification ||
          study.ICSR_classification ||
          study.aiInferenceData?.ICSR_classification ||
          "";
        const aoi =
          study.aoiClassification ||
          study.AOI_classification ||
          study.aiInferenceData?.AOI_classification ||
          "";
        const userTag = study.userTag || "";
        const icsrLower = String(icsr).toLowerCase();
        const aoiLower = String(aoi).toLowerCase();
        const userTagLower = String(userTag).toLowerCase();

        // Trust User Tag first if present
        if (userTagLower.includes("icsr") && userTagLower.includes("aoi"))
          return "Probable ICSR/AOI";
        if (userTagLower.includes("icsr")) return "Probable ICSR";
        if (userTagLower.includes("aoi")) return "Probable AOI";
        if (userTagLower === "no case") return "No Case";

        if (icsrLower.includes("manual review")) return "Manual Review";
        if (icsrLower.includes("probable icsr/aoi")) return "Probable ICSR/AOI";

        const isProbableICSR =
          icsrLower.includes("probable") ||
          icsrLower === "yes" ||
          icsrLower.includes("yes (icsr)") ||
          icsrLower.includes("potential");
        const isProbableAOI =
          aoiLower.includes("probable") ||
          aoiLower === "yes" ||
          aoiLower.includes("yes (aoi)") ||
          aoiLower.includes("potential");

        if (isProbableICSR && isProbableAOI) return "Probable ICSR/AOI";
        if (isProbableICSR) return "Probable ICSR";
        if (isProbableAOI) return "Probable AOI";
        if (userTag === "No Case" || icsrLower === "no case") return "No Case";

        return "Manual Review";
      };

      const getPriority = (study) => {
        if (study.priority === "high") return -1;
        const type = getStudyType(study);
        let index = priorityQueue.indexOf(type);
        if (index === -1 && type === "Probable ICSR/AOI") {
          const indexICSR = priorityQueue.indexOf("Probable ICSR");
          const indexAOI = priorityQueue.indexOf("Probable AOI");
          if (indexICSR !== -1 && indexAOI !== -1)
            index = Math.min(indexICSR, indexAOI);
          else if (indexICSR !== -1) index = indexICSR;
          else if (indexAOI !== -1) index = indexAOI;
        }
        return index === -1 ? 999 : index;
      };

      // 1. Check if user already has a locked case
      const query =
        "SELECT * FROM c WHERE c.organizationId = @orgId AND c.assignedTo = @userId";
      const parameters = [
        { name: "@orgId", value: organizationId },
        { name: "@userId", value: userId },
      ];

      const existingCases = await cosmosService.queryItems(
        "studies",
        query,
        parameters,
      );

      if (existingCases && existingCases.length > 0) {
        return res.json({
          success: true,
          message: "You are already working on a case",
          case: existingCases[0],
        });
      }

      // 2. Find and lock a new case using Priority Queue
      // Only allocate studies that should be in ICSR Triage based on icsrClassification
      let allocatedCase = null;
      let attempts = 0;
      const MAX_ATTEMPTS = 3;

      while (!allocatedCase && attempts < MAX_ATTEMPTS) {
        attempts++;
        const findParams = [
          { name: "@orgId", value: organizationId },
          { name: "@today", value: today },
          { name: "@userId", value: userId },
        ];

        // Step 2x: Prioritize cases previously classified by this user (Rejected/Returned)
        // This ensures users fix their own errors or re-classify their own cases first.
        // Filter for ICSR Triage cases only
        const myReturnedCasesQuery = `
            SELECT TOP 1 * FROM c 
            WHERE c.organizationId = @orgId 
            AND STARTSWITH(c.createdAt, @today)
            AND c.classifiedBy = @userId
            AND (NOT IS_DEFINED(c.assignedTo) OR c.assignedTo = null) 
            AND (c.status = "Pending Review" OR c.status = "Under Triage Review" OR c.status = "triage")
            AND (
              CONTAINS(LOWER(c.icsrClassification), "probable icsr/aoi") OR 
              CONTAINS(LOWER(c.icsrClassification), "probable icsr") OR 
              CONTAINS(LOWER(c.icsrClassification), "article requires manual review") OR
              NOT IS_DEFINED(c.icsrClassification)
            )
        `;

        let availableCases = [];
        try {
          // Add userId param for this query
          const myCasesParams = findParams;
          const myCases = await cosmosService.queryItems(
            "studies",
            myReturnedCasesQuery,
            myCasesParams,
          );

          if (myCases && myCases.length > 0) {
            availableCases = myCases;
            console.log(
              `[Allocation] Found returned case ${myCases[0].id} for user ${userId}`,
            );
          }
        } catch (err) {
          console.warn("My returned cases query failed", err);
        }

        if (!availableCases || availableCases.length === 0) {
          // Step 2a: Try to find High Priority cases specifically first (Probable/Potential/Tagged)
          // This ensures we priority allocate them even if they are buried behind 1000+ Manual Review cases
          // We use LOWER() for case-insensitive matching
          const highPriorityQuery = `
                SELECT TOP 50 * FROM c 
                WHERE c.organizationId = @orgId 
                AND STARTSWITH(c.createdAt, @today)
                AND (NOT IS_DEFINED(c.assignedTo) OR c.assignedTo = null) 
                AND (c.status = "Pending Review" OR c.status = "Under Triage Review" OR c.status = "triage")
                AND (NOT IS_DEFINED(c.classifiedBy) OR c.classifiedBy = null OR c.classifiedBy = @userId)
                AND (
                  CONTAINS(LOWER(c.icsrClassification), "probable icsr/aoi") OR 
                  CONTAINS(LOWER(c.icsrClassification), "probable icsr") OR 
                  CONTAINS(LOWER(c.icsrClassification), "article requires manual review") OR
                  CONTAINS(LOWER(c.icsrClassification), "potential") OR 
                  CONTAINS(LOWER(c.userTag), "icsr") OR
                  NOT IS_DEFINED(c.icsrClassification)
                )
            `;

          try {
            availableCases = await cosmosService.queryItems(
              "studies",
              highPriorityQuery,
              findParams,
            );
          } catch (err) {
            console.warn(
              "High priority query failed, falling back to standard query",
              err,
            );
          }
        }

        if (!availableCases || availableCases.length === 0) {
          // Step 2b: Fallback to general query if no high priority cases found
          // Filter for ICSR Triage cases only
          const fetchLimit = 100;
          const findQuery = `SELECT TOP ${fetchLimit} * FROM c WHERE c.organizationId = @orgId AND STARTSWITH(c.createdAt, @today) AND (NOT IS_DEFINED(c.assignedTo) OR c.assignedTo = null) AND (NOT IS_DEFINED(c.classifiedBy) OR c.classifiedBy = null OR c.classifiedBy = @userId) AND (c.status = "Pending Review" OR c.status = "Under Triage Review")`;
          availableCases = await cosmosService.queryItems(
            "studies",
            findQuery,
            findParams,
          );
        }

        if (!availableCases || availableCases.length === 0) {
          if (attempts === 1) {
            return res.status(404).json({
              success: false,
              message: "No available cases at the moment.",
            });
          }
          break; // If subsequent attempts fail to find cases, stop
        }

        // Sort by priority
        availableCases.sort((a, b) => getPriority(a) - getPriority(b));

        // Try to allocate one of the available cases in priority order.
        // We try all fetched cases to maximize chance of success without re-fetching.
        const casesToTry = availableCases;

        for (const caseToLock of casesToTry) {
          try {
            const operations = [
              { op: "set", path: "/assignedTo", value: userId },
              { op: "set", path: "/lockedAt", value: new Date().toISOString() },
              {
                op: "set",
                path: "/updatedAt",
                value: new Date().toISOString(),
              },
            ];

            // Optimistic concurrency: ensure assignedTo is still null/undefined
            // The SDK expects the condition using 'from' as alias. Do not use 'WHERE' or 'SELECT'.
            const filterPredicate =
              "NOT IS_DEFINED(from.assignedTo) OR from.assignedTo = null";

            // Use etag for strong consistency check
            allocatedCase = await cosmosService.patchItem(
              "studies",
              caseToLock.id,
              organizationId,
              operations,
              filterPredicate,
              caseToLock._etag, // Pass etag
            );
            break; // Successfully allocated
          } catch (err) {
            if (err.statusCode === 412) {
              console.log(
                `Race condition encountered for case ${caseToLock.id}, user collision avoided. Trying next candidate.`,
              );
              continue; // Try next case
            }
            throw err;
          }
        }
      }

      if (allocatedCase) {
        res.json({
          success: true,
          message: "Case allocated successfully",
          case: allocatedCase,
        });
      } else {
        // If we exhausted attempts or cases ran out during retry
        res.status(409).json({
          success: false,
          message: "System busy optimizing allocation. Please try again.",
        });
      }
    } catch (error) {
      console.error("Allocation error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  },
);

// Allocate a batch of cases (10) to the current user
router.post(
  "/allocate-batch",
  authorizePermission("studies", "read"),
  async (req, res) => {
    try {
      const userId = req.user.id;
      const organizationId = req.user.organizationId;
      const today = new Date().toISOString().split("T")[0];

      // Fetch Triage Configuration
      const triageConfig = await adminConfigService.getConfig(
        organizationId,
        "triage",
      );
      const batchSize = triageConfig?.configData?.batchSize || 10;
      const priorityQueue = triageConfig?.configData?.priorityQueue || [
        "Probable ICSR",
        "Probable AOI",
        "Probable ICSR/AOI",
        "No Case",
        "Manual Review",
      ];

      // Helper to determine study type based on classifications
      const getStudyType = (study) => {
        // Check multiple fields for classification to ensure we catch all data variations
        const icsr =
          study.icsrClassification ||
          study.ICSR_classification ||
          study.aiInferenceData?.ICSR_classification ||
          "";
        const aoi =
          study.aoiClassification ||
          study.AOI_classification ||
          study.aiInferenceData?.AOI_classification ||
          "";
        const userTag = study.userTag || "";

        const icsrLower = String(icsr).toLowerCase();
        const aoiLower = String(aoi).toLowerCase();

        // Explicit Manual Review check
        if (icsrLower.includes("manual review")) return "Manual Review";

        // Explicit Combined check - if the text says "Probable ICSR/AOI", trust it
        if (icsrLower.includes("probable icsr/aoi")) return "Probable ICSR/AOI";

        // Check for "Probable" OR "Yes" (some AI models return Yes/No)
        const isProbableICSR =
          icsrLower.includes("probable") ||
          icsrLower === "yes" ||
          icsrLower.includes("yes (icsr)");
        const isProbableAOI =
          aoiLower.includes("probable") ||
          aoiLower === "yes" ||
          aoiLower.includes("yes (aoi)");

        // Potential checks
        const isPotentialICSR = icsrLower.includes("potential");
        const isPotentialAOI = aoiLower.includes("potential");

        if (isProbableICSR && isProbableAOI) return "Probable ICSR/AOI";
        if (isProbableICSR) return "Probable ICSR";
        if (isProbableAOI) return "Probable AOI";

        if (isPotentialICSR && isPotentialAOI) return "Potential ICSR/AOI";
        if (isPotentialICSR) return "Potential ICSR";
        if (isPotentialAOI) return "Potential AOI";

        if (userTag === "No Case" || icsrLower === "no case") return "No Case";

        return "Manual Review";
      };

      // Helper to get priority index (lower is higher priority)
      const getPriority = (study) => {
        if (study.priority === "high") return -1;
        const type = getStudyType(study);
        let index = priorityQueue.indexOf(type);

        // Fallback logic:
        // If type is "Probable ICSR/AOI" and it's not in the queue,
        // check if "Probable ICSR" or "Probable AOI" is in the queue and use the best priority.
        // This ensures that if the user only has "Probable ICSR" in their list, it still catches combined cases.
        if (index === -1 && type === "Probable ICSR/AOI") {
          const indexICSR = priorityQueue.indexOf("Probable ICSR");
          const indexAOI = priorityQueue.indexOf("Probable AOI");

          if (indexICSR !== -1 && indexAOI !== -1) {
            index = Math.min(indexICSR, indexAOI); // Take the higher priority (lower index)
          } else if (indexICSR !== -1) {
            index = indexICSR;
          } else if (indexAOI !== -1) {
            index = indexAOI;
          }
        }

        return index === -1 ? 999 : index;
      };

      // 1. Check if user already has locked cases
      const query =
        "SELECT * FROM c WHERE c.organizationId = @orgId AND c.assignedTo = @userId";
      const parameters = [
        { name: "@orgId", value: organizationId },
        { name: "@userId", value: userId },
      ];

      const existingCases = await cosmosService.queryItems(
        "studies",
        query,
        parameters,
      );

      if (existingCases && existingCases.length > 0) {
        // If user already has cases, return them (resume session)
        // Sort them by priority as well to maintain order
        existingCases.sort((a, b) => getPriority(a) - getPriority(b));

        return res.json({
          success: true,
          message: "Resuming triage session",
          cases: existingCases,
        });
      }

      // 2. Find available cases
      // Fetch a large number of items to ensure we find the high priority ones even if they are deep in the DB
      const fetchLimit = 1000;

      // Step 2a: Prioritize cases classified by this user (Rejected/Returned)
      // Filter for ICSR Triage cases only
      const myReturnedCasesQuery = `
            SELECT * FROM c 
            WHERE c.organizationId = @orgId 
            AND STARTSWITH(c.createdAt, @today)
            AND c.classifiedBy = @userId
            AND (NOT IS_DEFINED(c.assignedTo) OR c.assignedTo = null) 
            AND (c.status = "Pending Review" OR c.status = "Under Triage Review" OR c.status = "triage")
            AND (
              CONTAINS(LOWER(c.icsrClassification), "probable icsr/aoi") OR 
              CONTAINS(LOWER(c.icsrClassification), "probable icsr") OR 
              CONTAINS(LOWER(c.icsrClassification), "article requires manual review") OR
              NOT IS_DEFINED(c.icsrClassification)
            )
      `;

      let availableCases = [];

      try {
        const myCasesParams = [
          { name: "@orgId", value: organizationId },
          { name: "@userId", value: userId },
          { name: "@today", value: today },
        ];
        const myCases = await cosmosService.queryItems(
          "studies",
          myReturnedCasesQuery,
          myCasesParams,
        );
        if (myCases && myCases.length > 0) {
          console.log(
            `[Batch Allocation] Found ${myCases.length} returned cases for user ${userId}`,
          );
          // Give returned cases TOP priority (priority = -2 to beat high priority -1)
          const returnedCases = myCases.map((c) => ({
            ...c,
            _isReturned: true,
          }));
          availableCases = [...availableCases, ...returnedCases];
        }
      } catch (err) {
        console.warn("My returned cases query failed in batch allocation", err);
      }

      // Step 2b: Standard fetch
      // Filter for ICSR Triage cases only
      const findQuery = `
        SELECT TOP ${fetchLimit} * FROM c 
        WHERE c.organizationId = @orgId 
        AND STARTSWITH(c.createdAt, @today)
        AND (NOT IS_DEFINED(c.assignedTo) OR c.assignedTo = null) 
        AND (NOT IS_DEFINED(c.classifiedBy) OR c.classifiedBy = null OR c.classifiedBy = @userId) 
        AND (c.status = "Pending Review" OR c.status = "Under Triage Review" OR c.status = "triage")
        AND (
          CONTAINS(LOWER(c.icsrClassification), "probable icsr/aoi") OR 
          CONTAINS(LOWER(c.icsrClassification), "probable icsr") OR 
          CONTAINS(LOWER(c.icsrClassification), "article requires manual review") OR
          NOT IS_DEFINED(c.icsrClassification)
        )
      `;
      const findParams = [
        { name: "@orgId", value: organizationId },
        { name: "@userId", value: userId },
        { name: "@today", value: today },
      ];

      const standardCases = await cosmosService.queryItems(
        "studies",
        findQuery,
        findParams,
      );
      if (standardCases && standardCases.length > 0) {
        // Avoid duplicates if a case was found in both queries
        const existingIds = new Set(availableCases.map((c) => c.id));
        const newCases = standardCases.filter((c) => !existingIds.has(c.id));
        availableCases = [...availableCases, ...newCases];
      }

      if (!availableCases || availableCases.length === 0) {
        return res.status(404).json({
          success: false,
          message: "No available cases at the moment.",
        });
      }

      // 3. Sort by priority
      // Modify getPriority to account for returned cases
      const originalGetPriority = getPriority;
      const enhancedGetPriority = (study) => {
        if (study._isReturned) return -2; // Highest priority
        return originalGetPriority(study);
      };

      availableCases.sort(
        (a, b) => enhancedGetPriority(a) - enhancedGetPriority(b),
      );

      // 5. Lock them
      const lockedCases = [];
      // Iterate through ALL available cases until we fill the batch
      // This ensures that even if some cases are taken by others during the process,
      // the user still gets their requested number of cases (if available).
      for (const study of availableCases) {
        if (lockedCases.length >= batchSize) {
          break;
        }

        try {
          const operations = [
            { op: "set", path: "/assignedTo", value: userId },
            { op: "set", path: "/lockedAt", value: new Date().toISOString() },
            { op: "set", path: "/updatedAt", value: new Date().toISOString() },
          ];

          const filterPredicate =
            "NOT IS_DEFINED(from.assignedTo) OR from.assignedTo = null";

          // Use etag for strong consistency check + filterPredicate as backup
          const updated = await cosmosService.patchItem(
            "studies",
            study.id,
            organizationId,
            operations,
            filterPredicate,
            study._etag, // Pass etag for optimistic concurrency control
          );
          lockedCases.push(updated);
        } catch (err) {
          if (err.statusCode === 412) {
            // Race condition - case already taken or modified. Skip it and try next one.
            continue;
          }
          console.error(`Error locking case ${study.id}:`, err);
        }
      }

      if (lockedCases.length === 0) {
        return res.status(409).json({
          success: false,
          message: "System busy optimizing allocation. Please try again.",
        });
      }

      res.json({
        success: true,
        message: "Cases allocated successfully",
        cases: lockedCases,
      });
    } catch (error) {
      console.error("Batch allocation error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  },
);

// Release all cases assigned to user
router.post(
  "/release-batch",
  authorizePermission("studies", "read"),
  async (req, res) => {
    try {
      const userId = req.user.id;
      const organizationId = req.user.organizationId;

      const query =
        "SELECT * FROM c WHERE c.organizationId = @orgId AND c.assignedTo = @userId";
      const parameters = [
        { name: "@orgId", value: organizationId },
        { name: "@userId", value: userId },
      ];

      const assignedCases = await cosmosService.queryItems(
        "studies",
        query,
        parameters,
      );

      for (const study of assignedCases) {
        study.assignedTo = null;
        study.lockedAt = null;
        study.updatedAt = new Date().toISOString();
        await cosmosService.updateItem(
          "studies",
          study.id,
          organizationId,
          study,
        );
      }

      res.json({ success: true, message: "Cases released successfully" });
    } catch (error) {
      console.error("Batch release error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  },
);

// =============== AOI ALLOCATION ENDPOINTS ===============

// Allocate AOI cases for quality check
router.post(
  "/allocate-aoi-batch",
  authorizePermission("studies", "read"),
  async (req, res) => {
    try {
      const userId = req.user.id;
      const organizationId = req.user.organizationId;

      // Fetch Allocation Configuration
      const allocationConfig = await adminConfigService.getConfig(
        organizationId,
        "allocation",
      );
      const batchSize = allocationConfig?.configData?.aoiBatchSize || 10;

      // 1. Check if user already has locked cases
      const query =
        "SELECT * FROM c WHERE c.organizationId = @orgId AND c.assignedTo = @userId AND c.status = @status";
      const parameters = [
        { name: "@orgId", value: organizationId },
        { name: "@userId", value: userId },
        { name: "@status", value: "aoi_allocation" },
      ];

      const existingCases = await cosmosService.queryItems(
        "studies",
        query,
        parameters,
      );

      if (existingCases && existingCases.length > 0) {
        // If user already has cases, return them
        return res.json({
          success: true,
          message: "Resuming AOI allocation session",
          cases: existingCases,
        });
      }

      // 2. Find available AOI Allocation cases (status = aoi_allocation, not assigned)
      const findQuery = `
        SELECT TOP ${batchSize} * FROM c 
        WHERE c.organizationId = @orgId 
        AND c.status = @status
        AND (NOT IS_DEFINED(c.assignedTo) OR c.assignedTo = null)
      `;
      const findParams = [
        { name: "@orgId", value: organizationId },
        { name: "@status", value: "aoi_allocation" },
      ];

      const availableCases = await cosmosService.queryItems(
        "studies",
        findQuery,
        findParams,
      );

      if (!availableCases || availableCases.length === 0) {
        return res.status(404).json({
          success: false,
          message: "No AOI cases available for allocation",
        });
      }

      // 3. Try to lock the cases
      const lockedCases = [];
      for (const caseToLock of availableCases) {
        try {
          const operations = [
            { op: "set", path: "/assignedTo", value: userId },
            { op: "set", path: "/lockedAt", value: new Date().toISOString() },
            { op: "set", path: "/updatedAt", value: new Date().toISOString() },
          ];

          const filterPredicate =
            "NOT IS_DEFINED(from.assignedTo) OR from.assignedTo = null";

          const allocatedCase = await cosmosService.patchItem(
            "studies",
            caseToLock.id,
            organizationId,
            operations,
            filterPredicate,
            caseToLock._etag,
          );
          lockedCases.push(allocatedCase);
        } catch (err) {
          if (err.statusCode === 412) {
            console.log(
              `Race condition for AOI case ${caseToLock.id}, trying next`,
            );
            continue;
          }
          throw err;
        }
      }

      if (lockedCases.length === 0) {
        return res
          .status(409)
          .json({ success: false, message: "System busy. Please try again." });
      }

      res.json({
        success: true,
        message: "AOI cases allocated successfully",
        cases: lockedCases,
      });
    } catch (error) {
      console.error("AOI batch allocation error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  },
);

// =============== NO CASE ALLOCATION ENDPOINTS ===============

// Allocate No Case studies for quality check
router.post(
  "/allocate-no-case-batch",
  authorizePermission("studies", "read"),
  async (req, res) => {
    try {
      const userId = req.user.id;
      const organizationId = req.user.organizationId;

      // Fetch Allocation Configuration
      const allocationConfig = await adminConfigService.getConfig(
        organizationId,
        "allocation",
      );
      const batchSize = allocationConfig?.configData?.noCaseBatchSize || 10;

      // 1. Check if user already has locked cases
      const query =
        "SELECT * FROM c WHERE c.organizationId = @orgId AND c.assignedTo = @userId AND c.status = @status";
      const parameters = [
        { name: "@orgId", value: organizationId },
        { name: "@userId", value: userId },
        { name: "@status", value: "no_case_allocation" },
      ];

      const existingCases = await cosmosService.queryItems(
        "studies",
        query,
        parameters,
      );

      if (existingCases && existingCases.length > 0) {
        // If user already has cases, return them
        return res.json({
          success: true,
          message: "Resuming No Case allocation session",
          cases: existingCases,
        });
      }

      // 2. Find available No Case Allocation studies (status = no_case_allocation, not assigned)
      const findQuery = `
        SELECT TOP ${batchSize} * FROM c 
        WHERE c.organizationId = @orgId 
        AND c.status = @status
        AND (NOT IS_DEFINED(c.assignedTo) OR c.assignedTo = null)
      `;
      const findParams = [
        { name: "@orgId", value: organizationId },
        { name: "@status", value: "no_case_allocation" },
      ];

      const availableCases = await cosmosService.queryItems(
        "studies",
        findQuery,
        findParams,
      );

      if (!availableCases || availableCases.length === 0) {
        return res.status(404).json({
          success: false,
          message: "No Case studies are not available for allocation",
        });
      }

      // 3. Try to lock the cases
      const lockedCases = [];
      for (const caseToLock of availableCases) {
        try {
          const operations = [
            { op: "set", path: "/assignedTo", value: userId },
            { op: "set", path: "/lockedAt", value: new Date().toISOString() },
            { op: "set", path: "/updatedAt", value: new Date().toISOString() },
          ];

          const filterPredicate =
            "NOT IS_DEFINED(from.assignedTo) OR from.assignedTo = null";

          const allocatedCase = await cosmosService.patchItem(
            "studies",
            caseToLock.id,
            organizationId,
            operations,
            filterPredicate,
            caseToLock._etag,
          );
          lockedCases.push(allocatedCase);
        } catch (err) {
          if (err.statusCode === 412) {
            console.log(
              `Race condition for No Case ${caseToLock.id}, trying next`,
            );
            continue;
          }
          throw err;
        }
      }

      if (lockedCases.length === 0) {
        return res
          .status(409)
          .json({ success: false, message: "System busy. Please try again." });
      }

      res.json({
        success: true,
        message: "No Case studies allocated successfully",
        cases: lockedCases,
      });
    } catch (error) {
      console.error("No Case batch allocation error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  },
);

// Lock a specific case (for legacy view)
router.post(
  "/lock-case/:id",
  authorizePermission("studies", "read"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const organizationId = req.user.organizationId;

      const beforeAudit = {
        assignedTo: null,
        lockedAt: null,
      };

      // 1. Check if user already has a locked case (optional - maybe we allow multiple locks in legacy view?
      // For strict safety, let's enforce one case at a time even in legacy view)
      const query =
        "SELECT * FROM c WHERE c.organizationId = @orgId AND c.assignedTo = @userId AND c.id != @currentId";
      const parameters = [
        { name: "@orgId", value: organizationId },
        { name: "@userId", value: userId },
        { name: "@currentId", value: id },
      ];

      const existingCases = await cosmosService.queryItems(
        "studies",
        query,
        parameters,
      );

      if (existingCases && existingCases.length > 0) {
        // If they have another case locked, we could either:
        // A) Block them
        // B) Auto-release the old one and lock the new one
        // Let's go with B for better UX in legacy view
        const oldCase = existingCases[0];
        oldCase.assignedTo = null;
        oldCase.lockedAt = null;
        await cosmosService.updateItem(
          "studies",
          oldCase.id,
          organizationId,
          oldCase,
        );
      }

      // 2. Get the target case
      const study = await cosmosService.getItem("studies", id, organizationId);

      if (!study) {
        return res
          .status(404)
          .json({ success: false, message: "Case not found" });
      }

      // 3. Check if it's already locked by someone else
      if (study.assignedTo && study.assignedTo !== userId) {
        return res.status(409).json({
          success: false,
          message: "Case is already locked by another user",
        });
      }

      beforeAudit.assignedTo = study.assignedTo ?? null;
      beforeAudit.lockedAt = study.lockedAt ?? null;

      // 4. Lock it
      study.assignedTo = userId;
      study.lockedAt = new Date().toISOString();
      study.updatedAt = new Date().toISOString();

      const updatedCase = await cosmosService.updateItem(
        "studies",
        id,
        organizationId,
        study,
      );

      await auditAction(
        req.user,
        "update",
        "study",
        id,
        `Locked the case for study ${id}`,
        { studyId: id, pmid: study.pmid },
        beforeAudit,
        {
          assignedTo: updatedCase.assignedTo ?? null,
          lockedAt: updatedCase.lockedAt ?? null,
        },
      );

      res.json({
        success: true,
        message: "Case locked successfully",
        study: updatedCase,
      });
    } catch (error) {
      console.error("Lock error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  },
);

// Release a case
router.post(
  "/release-case/:id",
  authorizePermission("studies", "read"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const organizationId = req.user.organizationId;

      const study = await cosmosService.getItem("studies", id, organizationId);

      if (!study) {
        return res
          .status(404)
          .json({ success: false, message: "Case not found" });
      }

      // Only allow release if assigned to current user
      if (study.assignedTo !== userId) {
        return res.status(403).json({
          success: false,
          message: "You are not assigned to this case",
        });
      }

      const beforeAudit = {
        assignedTo: study.assignedTo ?? null,
        lockedAt: study.lockedAt ?? null,
      };

      study.assignedTo = null;
      study.lockedAt = null;
      study.updatedAt = new Date().toISOString();

      await cosmosService.updateItem("studies", id, organizationId, study);

      await auditAction(
        req.user,
        "update",
        "study",
        id,
        `Released the case for study ${id}`,
        { studyId: id, pmid: study.pmid },
        beforeAudit,
        { assignedTo: null, lockedAt: null },
      );

      res.json({ success: true, message: "Case released successfully" });
    } catch (error) {
      console.error("Release error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  },
);

module.exports = router;

// Ingest studies from PubMed for a given drug
router.post(
  "/ingest/pubmed",
  authorizePermission("studies", "write"),
  [
    body("drugId").optional().isString(),
    body("query").optional().isString().isLength({ min: 3 }),
    body("maxResults").optional().isInt({ min: 1, max: 200 }),
    body("adverseEvent").optional().isString(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res
          .status(400)
          .json({ error: "Validation failed", details: errors.array() });
      }

      const { drugId, query, maxResults = 50, adverseEvent } = req.body;

      let searchQuery = query;
      if (drugId) {
        const drug = await cosmosService.getItem(
          "drugs",
          drugId,
          req.user.organizationId,
        );
        if (!drug) {
          return res.status(404).json({ error: "Drug not found" });
        }
        // Default PubMed query: drug name + RSI + optional filters
        searchQuery = searchQuery || `${drug.name} adverse events`;
      }

      if (!searchQuery) {
        return res
          .status(400)
          .json({ error: "Either drugId or query is required" });
      }

      // 1) Search PubMed to get PMIDs
      const ids = await pubmedService.search(searchQuery, { maxResults });

      if (!ids || ids.length === 0) {
        return res.status(200).json({
          message: "No articles found for the search query",
          jobId: null,
          totalFound: 0,
        });
      }

      // 2) Start asynchronous study creation job
      const jobId = uuidv4();
      let drugName = "Unknown";
      let sponsor = "Unknown";

      if (drugId) {
        const drug = await cosmosService.getItem(
          "drugs",
          drugId,
          req.user.organizationId,
        );
        if (drug) {
          drugName = drug.name;
          sponsor = drug.manufacturer || "Unknown";
        }
      }

      await studyCreationService.startStudyCreationJob(
        jobId,
        ids,
        {
          drugName: drugName,
          sponsor: sponsor,
          adverseEvent: adverseEvent || "Not specified",
        },
        req.user.id,
        req.user.organizationId,
      );

      await auditAction(
        req.user,
        "ingest",
        "study",
        "pubmed_async",
        `Started async processing of ${ids.length} studies from PubMed`,
        { query: searchQuery, jobId, total: ids.length },
      );

      // Return job ID immediately so user can track progress
      return res.status(202).json({
        message: `Started processing ${ids.length} articles from PubMed`,
        jobId: jobId,
        totalFound: ids.length,
        status: "processing",
        trackingUrl: `/api/studies/jobs/${jobId}/status`,
      });
    } catch (error) {
      console.error("PubMed ingestion error:", error);
      return res.status(500).json({
        error: "Failed to ingest from PubMed",
        message: error.message,
      });
    }
  },
);

// AOI Assessment endpoint
router.put(
  "/:id/aoi-assessment",
  authorizePermission("studies", "write"),
  [
    body("listedness")
      .optional()
      .isIn(["Yes", "No"])
      .withMessage("Listedness must be Yes or No"),
    body("seriousness")
      .optional()
      .isIn(["Yes", "No"])
      .withMessage("Seriousness must be Yes or No"),
    body("comments").optional().isString(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res
          .status(400)
          .json({ error: "Validation failed", details: errors.array() });
      }

      const { id } = req.params;
      const { listedness, seriousness, comments } = req.body;

      // Get the study
      const studyData = await cosmosService.getItem(
        "studies",
        id,
        req.user.organizationId,
      );
      if (!studyData) {
        return res.status(404).json({ error: "Study not found" });
      }

      // Verify it's an AOI case
      if (studyData.userTag !== "AOI") {
        return res
          .status(400)
          .json({ error: "Study must be classified as AOI for assessment" });
      }

      const beforeValue = {
        listedness: studyData.listedness,
        seriousness: studyData.seriousness,
        aoiComments: studyData.aoiComments,
      };

      // Update AOI assessment fields
      if (listedness) studyData.listedness = listedness;
      if (seriousness) studyData.seriousness = seriousness;
      if (comments) studyData.aoiComments = comments;

      studyData.aoiAssessedBy = req.user.id;
      studyData.aoiAssessedAt = new Date().toISOString();
      studyData.updatedAt = new Date().toISOString();

      const afterValue = {
        listedness: studyData.listedness,
        seriousness: studyData.seriousness,
        aoiComments: studyData.aoiComments,
      };

      // Save updated study
      await cosmosService.updateItem(
        "studies",
        id,
        req.user.organizationId,
        studyData,
      );

      // Log to audit trail
      await auditAction(
        req.user,
        "update",
        "study",
        id,
        `AOI Assessment: Listedness=${listedness}, Seriousness=${seriousness}`,
        { pmid: studyData.pmid },
        beforeValue,
        afterValue,
      );

      return res.json({
        success: true,
        message: "AOI assessment saved successfully",
        study: studyData,
      });
    } catch (error) {
      console.error("AOI assessment error:", error);
      return res.status(500).json({
        error: "Failed to save AOI assessment",
        message: error.message,
      });
    }
  },
);

// Upload PDF attachment to a study
router.post(
  "/:id/attachments",
  authorizePermission("studies", "write"),
  (req, res, next) => {
    console.log("Upload endpoint hit - Before multer");
    console.log("Request headers:", req.headers);
    console.log("Request params:", req.params);

    // Wrap multer middleware with error handling
    const multerUpload = upload.array("files", 5);
    multerUpload(req, res, (err) => {
      if (err) {
        console.error("Multer error occurred:", {
          message: err.message,
          code: err.code,
          field: err.field,
          stack: err.stack,
        });

        if (
          err.message ===
          "Only PDF, JPEG, PNG, DOC, DOCX, MSG, and EML files are allowed"
        ) {
          return res.status(400).json({
            error:
              "Only PDF, JPEG, PNG, DOC, DOCX, MSG, and EML files are allowed",
          });
        }
        if (err.code === "LIMIT_FILE_SIZE") {
          return res
            .status(400)
            .json({ error: "File too large. Maximum size is 10MB per file" });
        }
        if (err.code === "LIMIT_FILE_COUNT") {
          return res
            .status(400)
            .json({ error: "Too many files. Maximum is 5 files per upload" });
        }
        if (err.code === "LIMIT_UNEXPECTED_FILE") {
          return res
            .status(400)
            .json({ error: "Unexpected field in file upload" });
        }
        return res
          .status(400)
          .json({ error: err.message || "File upload error" });
      }

      console.log("Multer processed successfully");
      console.log("Files received:", req.files?.length || 0);
      next();
    });
  },
  async (req, res) => {
    try {
      const { id } = req.params;
      const files = req.files;
      const { receiptDate } = req.body;

      console.log(`Upload request for study ${id}:`, {
        filesCount: files?.length || 0,
        fileDetails: files?.map((f) => ({
          name: f.originalname,
          size: f.size,
          type: f.mimetype,
        })),
        userId: req.user?.id,
        organizationId: req.user?.organizationId,
        receiptDate,
      });

      if (!files || files.length === 0) {
        console.error("No files in request");
        return res.status(400).json({ error: "No files uploaded" });
      }

      // Get the study
      const studyData = await cosmosService.getItem(
        "studies",
        id,
        req.user.organizationId,
      );
      if (!studyData) {
        console.error(
          `Study not found: ${id} for organization ${req.user.organizationId}`,
        );
        return res.status(404).json({ error: "Study not found" });
      }

      const uploadedAttachments = [];

      // Process each file
      for (const file of files) {
        console.log(
          `Processing file: ${file.originalname}, size: ${file.size}, type: ${file.mimetype}`,
        );

        // Convert buffer to base64 for storage in Cosmos DB
        const base64Data = file.buffer.toString("base64");

        const attachment = {
          id: uuidv4(),
          fileName: file.originalname,
          fileSize: file.size,
          fileType: file.mimetype,
          uploadedBy: req.user.id,
          receiptDate: receiptDate || null,
          uploadedByName:
            `${req.user.firstName || ""} ${req.user.lastName || ""}`.trim() ||
            req.user.username,
          uploadedAt: new Date().toISOString(),
          data: base64Data, // Store as base64 blob
        };

        // Initialize attachments array if it doesn't exist
        if (!studyData.attachments) {
          studyData.attachments = [];
        }

        studyData.attachments.push(attachment);
        uploadedAttachments.push({
          id: attachment.id,
          fileName: attachment.fileName,
          fileSize: attachment.fileSize,
          receiptDate: attachment.receiptDate,
          uploadedAt: attachment.uploadedAt,
        });
      }

      studyData.updatedAt = new Date().toISOString();

      // Save updated study with attachments
      console.log(`Saving ${files.length} attachments to study ${id}`);
      await cosmosService.updateItem(
        "studies",
        id,
        req.user.organizationId,
        studyData,
      );

      // Log to audit trail
      await auditAction(
        req.user,
        "upload",
        "study_attachment",
        id,
        `Uploaded ${files.length} PDF attachment(s)`,
        {
          pmid: studyData.pmid,
          files: uploadedAttachments.map((a) => a.fileName),
        },
      );

      console.log(`Successfully uploaded ${files.length} files to study ${id}`);
      return res.json({
        success: true,
        message: `${files.length} file(s) uploaded successfully`,
        attachments: uploadedAttachments,
      });
    } catch (error) {
      console.error("PDF upload error details:", {
        message: error.message,
        name: error.name,
        stack: error.stack,
        studyId: req.params.id,
        userId: req.user?.id,
      });
      return res.status(500).json({
        error: "Failed to upload attachments",
        message: error.message,
        details:
          process.env.NODE_ENV === "development" ? error.stack : undefined,
      });
    }
  },
);

// Get attachment by ID
router.get(
  "/:id/attachments/:attachmentId",
  authorizePermission("studies", "read"),
  async (req, res) => {
    try {
      const { id, attachmentId } = req.params;

      // Get the study
      const studyData = await cosmosService.getItem(
        "studies",
        id,
        req.user.organizationId,
      );
      if (!studyData) {
        return res.status(404).json({ error: "Study not found" });
      }

      // Find the attachment
      const attachment = studyData.attachments?.find(
        (a) => a.id === attachmentId,
      );
      if (!attachment) {
        return res.status(404).json({ error: "Attachment not found" });
      }

      // Convert base64 back to buffer
      const buffer = Buffer.from(attachment.data, "base64");

      // Set response headers
      res.setHeader("Content-Type", attachment.fileType);
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${attachment.fileName}"`,
      );
      res.setHeader("Content-Length", buffer.length);

      return res.send(buffer);
    } catch (error) {
      console.error("Download attachment error:", error);
      return res.status(500).json({
        error: "Failed to download attachment",
        message: error.message,
      });
    }
  },
);

// Delete attachment by ID
router.delete(
  "/:id/attachments/:attachmentId",
  authorizePermission("studies", "write"),
  async (req, res) => {
    try {
      const { id, attachmentId } = req.params;

      // Get the study
      const studyData = await cosmosService.getItem(
        "studies",
        id,
        req.user.organizationId,
      );
      if (!studyData) {
        return res.status(404).json({ error: "Study not found" });
      }

      // Find the attachment
      const attachmentIndex = studyData.attachments?.findIndex(
        (a) => a.id === attachmentId,
      );
      if (attachmentIndex === -1 || attachmentIndex === undefined) {
        return res.status(404).json({ error: "Attachment not found" });
      }

      const deletedAttachment = studyData.attachments[attachmentIndex];

      // Remove the attachment
      studyData.attachments.splice(attachmentIndex, 1);
      studyData.updatedAt = new Date().toISOString();

      // Save updated study
      await cosmosService.updateItem(
        "studies",
        id,
        req.user.organizationId,
        studyData,
      );

      // Log to audit trail
      await auditAction(
        req.user,
        "delete",
        "study_attachment",
        id,
        `Deleted PDF attachment: ${deletedAttachment.fileName}`,
        { pmid: studyData.pmid, fileName: deletedAttachment.fileName },
      );

      return res.json({
        success: true,
        message: "Attachment deleted successfully",
      });
    } catch (error) {
      console.error("Delete attachment error:", error);
      return res
        .status(500)
        .json({ error: "Failed to delete attachment", message: error.message });
    }
  },
);
