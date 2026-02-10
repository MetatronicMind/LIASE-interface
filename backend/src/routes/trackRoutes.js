/**
 * Track Routes
 * API endpoints for Tri-Channel Workflow management
 */

const express = require("express");
const trackAllocationService = require("../services/trackAllocationService");
const cosmosService = require("../services/cosmosService");
const Study = require("../models/Study");
const { authorizePermission } = require("../middleware/authorization");
const { auditLogger, auditAction } = require("../middleware/audit");

const router = express.Router();

// Apply audit logging to all routes
router.use(auditLogger());

/**
 * GET /track/statistics
 * Get summary statistics for all tracks
 */
router.get(
  "/statistics",
  authorizePermission("studies", "read"),
  async (req, res) => {
    try {
      let targetOrgId = req.user.organizationId;
      if (
        req.user.isSuperAdmin &&
        req.user.isSuperAdmin() &&
        req.query.organizationId
      ) {
        targetOrgId = req.query.organizationId;
      }

      const statistics =
        await trackAllocationService.getTrackStatistics(targetOrgId);

      res.json({
        success: true,
        data: statistics,
      });
    } catch (error) {
      console.error("Error fetching track statistics:", error);
      res.status(500).json({
        error: "Failed to fetch track statistics",
        message: error.message,
      });
    }
  },
);

/**
 * GET /track/:trackType/triage
 * Get studies in a specific track's triage phase
 */
router.get(
  "/:trackType/triage",
  authorizePermission("triage", "read"),
  async (req, res) => {
    try {
      const { trackType } = req.params;
      const { page = 1, limit = 50, search } = req.query;

      // Validate track type
      const validTracks = ["ICSR", "AOI", "NoCase"];
      if (!validTracks.includes(trackType)) {
        return res.status(400).json({
          error: "Invalid track type",
          validTracks,
        });
      }

      let targetOrgId = req.user.organizationId;
      if (
        req.user.isSuperAdmin &&
        req.user.isSuperAdmin() &&
        req.query.organizationId
      ) {
        targetOrgId = req.query.organizationId;
      }

      let query = `
        SELECT * FROM c 
        WHERE c.organizationId = @orgId 
        AND c.workflowTrack = @track 
        AND c.subStatus = 'triage'
      `;
      const parameters = [
        { name: "@orgId", value: targetOrgId },
        { name: "@track", value: trackType },
      ];

      if (search) {
        query += ` AND (CONTAINS(UPPER(c.title), UPPER(@search)) OR CONTAINS(UPPER(c.pmid), UPPER(@search)))`;
        parameters.push({ name: "@search", value: search });
      }

      query += " ORDER BY c.updatedAt DESC";

      const allStudies = await cosmosService.queryItems(
        "studies",
        query,
        parameters,
      );

      // Apply pagination
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
      console.error(`Error fetching ${req.params.trackType} triage:`, error);
      res.status(500).json({
        error: "Failed to fetch triage studies",
        message: error.message,
      });
    }
  },
);

/**
 * GET /track/:trackType/allocation
 * Get studies in a specific track's allocation phase
 */
router.get(
  "/:trackType/allocation",
  authorizePermission("QA", "read"),
  async (req, res) => {
    try {
      const { trackType } = req.params;
      const { page = 1, limit = 50, search } = req.query;

      const validTracks = ["ICSR", "AOI", "NoCase"];
      if (!validTracks.includes(trackType)) {
        return res.status(400).json({
          error: "Invalid track type",
          validTracks,
        });
      }

      let targetOrgId = req.user.organizationId;
      if (
        req.user.isSuperAdmin &&
        req.user.isSuperAdmin() &&
        req.query.organizationId
      ) {
        targetOrgId = req.query.organizationId;
      }

      let query = `
        SELECT * FROM c 
        WHERE c.organizationId = @orgId 
        AND c.workflowTrack = @track 
        AND c.subStatus = 'allocation'
      `;
      const parameters = [
        { name: "@orgId", value: targetOrgId },
        { name: "@track", value: trackType },
      ];

      if (search) {
        query += ` AND (CONTAINS(UPPER(c.title), UPPER(@search)) OR CONTAINS(UPPER(c.pmid), UPPER(@search)))`;
        parameters.push({ name: "@search", value: search });
      }

      query += " ORDER BY c.updatedAt DESC";

      const allStudies = await cosmosService.queryItems(
        "studies",
        query,
        parameters,
      );

      const offset = (page - 1) * parseInt(limit);
      const studies = allStudies.slice(offset, offset + parseInt(limit));

      // Get configured allocation percentage
      const allocationPercentage =
        await trackAllocationService.getTrackAllocationPercentage(
          targetOrgId,
          trackType,
        );

      res.json({
        success: true,
        data: studies,
        allocationPercentage,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: allStudies.length,
        },
      });
    } catch (error) {
      console.error(
        `Error fetching ${req.params.trackType} allocation:`,
        error,
      );
      res.status(500).json({
        error: "Failed to fetch allocation studies",
        message: error.message,
      });
    }
  },
);

/**
 * GET /track/:trackType/assessment
 * Get studies in a specific track's assessment phase (retained for manual review)
 */
router.get(
  "/:trackType/assessment",
  authorizePermission("QC", "read"),
  async (req, res) => {
    try {
      const { trackType } = req.params;
      const { page = 1, limit = 50, search } = req.query;

      const validTracks = ["ICSR", "AOI", "NoCase"];
      if (!validTracks.includes(trackType)) {
        return res.status(400).json({
          error: "Invalid track type",
          validTracks,
        });
      }

      let targetOrgId = req.user.organizationId;
      if (
        req.user.isSuperAdmin &&
        req.user.isSuperAdmin() &&
        req.query.organizationId
      ) {
        targetOrgId = req.query.organizationId;
      }

      let query = `
        SELECT * FROM c 
        WHERE c.organizationId = @orgId 
        AND c.workflowTrack = @track 
        AND c.subStatus = 'assessment'
        AND c.isAutoPassed = false
      `;
      const parameters = [
        { name: "@orgId", value: targetOrgId },
        { name: "@track", value: trackType },
      ];

      if (search) {
        query += ` AND (CONTAINS(UPPER(c.title), UPPER(@search)) OR CONTAINS(UPPER(c.pmid), UPPER(@search)))`;
        parameters.push({ name: "@search", value: search });
      }

      query += " ORDER BY c.updatedAt DESC";

      const allStudies = await cosmosService.queryItems(
        "studies",
        query,
        parameters,
      );

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
      console.error(
        `Error fetching ${req.params.trackType} assessment:`,
        error,
      );
      res.status(500).json({
        error: "Failed to fetch assessment studies",
        message: error.message,
      });
    }
  },
);

/**
 * POST /track/:trackType/move-to-allocation
 * Move studies from triage to allocation phase within a track
 * @body {number} count - Optional. Number of cases to move (default: all)
 */
router.post(
  "/:trackType/move-to-allocation",
  authorizePermission("QA", "write"),
  async (req, res) => {
    try {
      const { trackType } = req.params;
      const { count } = req.body;

      const validTracks = ["ICSR", "AOI", "NoCase"];
      if (!validTracks.includes(trackType)) {
        return res.status(400).json({
          error: "Invalid track type",
          validTracks,
        });
      }

      const results = await trackAllocationService.moveToAllocation(
        req.user.organizationId,
        trackType,
        req.user,
        count, // Pass optional count to limit number of cases
      );

      await auditAction(
        req.user,
        "track_allocate",
        "study",
        trackType,
        `Moved ${results.moved} studies from ${trackType} triage to allocation`,
        { trackType, requestedCount: count, ...results },
      );

      res.json({
        success: true,
        message: `Moved ${results.moved} studies to allocation phase`,
        results,
      });
    } catch (error) {
      console.error(`Error moving to allocation:`, error);
      res.status(500).json({
        error: "Failed to move studies to allocation",
        message: error.message,
      });
    }
  },
);

/**
 * POST /track/:trackType/allocate
 * Process allocation split for a specific track
 */
router.post(
  "/:trackType/allocate",
  authorizePermission("QA", "write"),
  async (req, res) => {
    try {
      const { trackType } = req.params;
      const { retainPercentage } = req.body;

      const validTracks = ["ICSR", "AOI", "NoCase"];
      if (!validTracks.includes(trackType)) {
        return res.status(400).json({
          error: "Invalid track type",
          validTracks,
        });
      }

      // Use provided percentage or fetch from config
      let percentage = retainPercentage;
      if (typeof percentage === "undefined") {
        percentage = await trackAllocationService.getTrackAllocationPercentage(
          req.user.organizationId,
          trackType,
        );
      }

      // Validate percentage
      if (percentage < 0 || percentage > 100) {
        return res.status(400).json({
          error: "Invalid percentage",
          message: "Retain percentage must be between 0 and 100",
        });
      }

      const results = await trackAllocationService.allocateTrack(
        req.user.organizationId,
        trackType,
        percentage,
        req.user,
      );

      await auditAction(
        req.user,
        "track_allocate",
        "study",
        trackType,
        `${trackType} allocation: ${results.retained} retained, ${results.autoPassed} auto-passed`,
        {
          trackType,
          retainPercentage: percentage,
          ...results,
        },
      );

      res.json({
        success: true,
        message: `Processed ${results.total} studies. ${results.retained} retained for assessment, ${results.autoPassed} auto-passed.`,
        results,
      });
    } catch (error) {
      console.error(`Error processing allocation:`, error);
      res.status(500).json({
        error: "Failed to process allocation",
        message: error.message,
      });
    }
  },
);

/**
 * POST /track/route/:studyId
 * Route a study from assessment to a destination
 */
router.post(
  "/route/:studyId",
  authorizePermission("studies", "write"),
  async (req, res) => {
    try {
      const { studyId } = req.params;
      const { destination } = req.body;

      const validDestinations = ["data_entry", "medical_review", "reporting"];
      if (!validDestinations.includes(destination)) {
        return res.status(400).json({
          error: "Invalid destination",
          validDestinations,
        });
      }

      const result = await trackAllocationService.routeStudy(
        req.user.organizationId,
        studyId,
        destination,
        req.user,
      );

      await auditAction(
        req.user,
        "track_route",
        "study",
        studyId,
        `Routed study from ${result.previousTrack} assessment to ${destination}`,
        { ...result },
      );

      res.json({
        success: true,
        message: `Study routed to ${destination}`,
        result,
      });
    } catch (error) {
      console.error(`Error routing study:`, error);
      res.status(500).json({
        error: "Failed to route study",
        message: error.message,
      });
    }
  },
);

/**
 * POST /track/assign/:studyId
 * Assign a study to a workflow track
 */
router.post(
  "/assign/:studyId",
  authorizePermission("studies", "write"),
  async (req, res) => {
    try {
      const { studyId } = req.params;
      const { track } = req.body;

      const validTracks = ["ICSR", "AOI", "NoCase"];
      if (!validTracks.includes(track)) {
        return res.status(400).json({
          error: "Invalid track",
          validTracks,
        });
      }

      const studyData = await cosmosService.getItem(
        "studies",
        studyId,
        req.user.organizationId,
      );

      if (!studyData) {
        return res.status(404).json({ error: "Study not found" });
      }

      const study = new Study(studyData);
      const beforeValue = {
        workflowTrack: study.workflowTrack,
        subStatus: study.subStatus,
      };

      const userName = req.user.getFullName
        ? req.user.getFullName()
        : `${req.user.firstName} ${req.user.lastName}`;

      study.setWorkflowTrack(track, req.user.id, userName);

      await cosmosService.updateItem(
        "studies",
        study.id,
        req.user.organizationId,
        study.toJSON(),
      );

      const afterValue = {
        workflowTrack: study.workflowTrack,
        subStatus: study.subStatus,
      };

      await auditAction(
        req.user,
        "track_assign",
        "study",
        studyId,
        `Assigned study to ${track} track`,
        { previousTrack: beforeValue.workflowTrack, newTrack: track },
        beforeValue,
        afterValue,
      );

      res.json({
        success: true,
        message: `Study assigned to ${track} track`,
        study: study.toJSON(),
      });
    } catch (error) {
      console.error(`Error assigning study to track:`, error);
      res.status(500).json({
        error: "Failed to assign study to track",
        message: error.message,
      });
    }
  },
);

/**
 * POST /track/:trackType/allocate-batch
 * Allocate a batch of cases for triage assessment (like the original triage page)
 */
router.post(
  "/:trackType/allocate-batch",
  authorizePermission("triage", "write"),
  async (req, res) => {
    try {
      const { trackType } = req.params;
      const { batchSize = 10 } = req.body;

      const validTracks = ["ICSR", "AOI", "NoCase"];
      if (!validTracks.includes(trackType)) {
        return res.status(400).json({
          error: "Invalid track type",
          validTracks,
        });
      }

      const targetOrgId = req.user.organizationId;
      const userId = req.user.id;
      const today = new Date().toISOString().split("T")[0];

      // Build query based on track type using strictly icsrClassification
      // Use FIFO (Oldest first) for allocation queues
      let query;
      let parameters = [{ name: "@orgId", value: targetOrgId }];

      // SIMPLIFIED LOGIC: Use ONLY icsrClassification as the source of truth
      // BUT exclude items that have already been manually classified (userTag is set)
      // AND exclude items already assigned
      const baseQuery = `
          SELECT * FROM c 
          WHERE c.organizationId = @orgId 
          AND (NOT IS_DEFINED(c.assignedTo) OR c.assignedTo = null)
          AND (NOT IS_DEFINED(c.userTag) OR c.userTag = null)
      `;

      if (trackType === "ICSR") {
        query = `
            ${baseQuery}
            AND (
                c.icsrClassification = 'Probable ICSR' 
                OR c.icsrClassification = 'Probable ICSR/AOI'
                OR c.icsrClassification = 'Article requires manual review'
            )
            ORDER BY c.createdAt ASC
        `;
      } else if (trackType === "AOI") {
        query = `
            ${baseQuery}
            AND c.icsrClassification = 'Probable AOI'
            ORDER BY c.createdAt ASC
        `;
      } else if (trackType === "NoCase") {
        query = `
            ${baseQuery}
            AND c.icsrClassification = 'No Case'
            ORDER BY c.createdAt ASC
        `;
      }

      const allStudies = await cosmosService.queryItems(
        "studies",
        query,
        parameters,
      );

      // Take up to batchSize studies from the filtered list
      const casesToAllocate = allStudies.slice(0, parseInt(batchSize));
      const batchId = uuidv4();
      const allocatedAt = new Date().toISOString();

      // Lock the studies to this user and set workflowTrack
      const allocatedCases = [];
      for (const studyData of casesToAllocate) {
        try {
          studyData.assignedTo = userId;
          studyData.batchId = batchId;
          studyData.allocatedAt = allocatedAt;
          studyData.status = "Under Assessment"; // UI Status

          // Set workflowTrack and stage
          studyData.workflowTrack = trackType;

          if (trackType === "ICSR") {
            studyData.workflowStage = "ASSESSMENT_ICSR";
          } else if (trackType === "AOI") {
            studyData.workflowStage = "ASSESSMENT_AOI";
          } else {
            studyData.workflowStage = "ASSESSMENT_NO_CASE";
          }

          // Legacy field support
          studyData.subStatus = "assessment";

          // Clear any previous temporary locks if strictly re-allocating (though query filters out assigned)
          studyData.lockedAt = allocatedAt;

          await cosmosService.updateItem(
            "studies",
            studyData.id,
            targetOrgId,
            studyData,
          );

          allocatedCases.push(studyData);
        } catch (err) {
          console.error(`Error locking study ${studyData.id}: `, err);
        }
      }

      await auditAction(
        req.user,
        "track_allocate",
        "study",
        trackType,
        `Allocated ${allocatedCases.length} ${trackType} cases for triage`,
        { trackType, batchSize, allocated: allocatedCases.length },
      );

      res.json({
        success: true,
        message: `Allocated ${allocatedCases.length} cases for ${trackType} triage`,
        cases: allocatedCases,
        count: allocatedCases.length,
      });
    } catch (error) {
      console.error(
        `Error allocating batch for ${req.params.trackType}: `,
        error,
      );
      res.status(500).json({
        error: "Failed to allocate cases",
        message: error.message,
      });
    }
  },
);

/**
 * POST /track/:trackType/release-batch
 * Release all locked cases (exit triage without completing)
 */
router.post(
  "/:trackType/release-batch",
  authorizePermission("triage", "write"),
  async (req, res) => {
    try {
      const { trackType } = req.params;

      const validTracks = ["ICSR", "AOI", "NoCase"];
      if (!validTracks.includes(trackType)) {
        return res.status(400).json({
          error: "Invalid track type",
          validTracks,
        });
      }

      const targetOrgId = req.user.organizationId;
      const userId = req.user.id;

      // Find studies locked by this user in this track
      const query = `
                SELECT * FROM c 
                WHERE c.organizationId = @orgId 
                AND c.workflowTrack = @track 
                AND c.subStatus = 'triage'
                AND c.assignedTo = @userId
            `;
      const parameters = [
        { name: "@orgId", value: targetOrgId },
        { name: "@track", value: trackType },
        { name: "@userId", value: userId },
      ];

      const lockedStudies = await cosmosService.queryItems(
        "studies",
        query,
        parameters,
      );

      let released = 0;
      for (const studyData of lockedStudies) {
        try {
          studyData.assignedTo = null;
          studyData.lockedAt = null;

          await cosmosService.updateItem(
            "studies",
            studyData.id,
            targetOrgId,
            studyData,
          );

          released++;
        } catch (err) {
          console.error(`Error releasing study ${studyData.id}: `, err);
        }
      }

      await auditAction(
        req.user,
        "track_allocate",
        "study",
        trackType,
        `Released ${released} ${trackType} cases from triage`,
        { trackType, released },
      );

      res.json({
        success: true,
        message: `Released ${released} cases`,
        released,
      });
    } catch (error) {
      console.error(
        `Error releasing batch for ${req.params.trackType}: `,
        error,
      );
      res.status(500).json({
        error: "Failed to release cases",
        message: error.message,
      });
    }
  },
);

module.exports = router;
