/**
 * Track Allocation Service
 * Handles the percentage split logic for Tri-Channel workflow:
 * - ICSR Track allocation
 * - AOI Track allocation
 * - No Case Track allocation
 */

const cosmosService = require("./cosmosService");
const adminConfigService = require("./adminConfigService");
const Study = require("../models/Study");

class TrackAllocationService {
  /**
   * Valid workflow tracks
   */
  static VALID_TRACKS = ["ICSR", "AOI", "NoCase"];

  /**
   * Default destinations for each track when auto-passing
   */
  static DEFAULT_DESTINATIONS = {
    ICSR: "data_entry",
    AOI: "aoi_assessment",
    NoCase: "reporting",
  };

  /**
   * Get studies in a specific track and sub-status
   * @param {string} organizationId - Organization ID
   * @param {string} trackType - 'ICSR', 'AOI', or 'NoCase'
   * @param {string} subStatus - 'triage', 'allocation', or 'assessment'
   * @returns {Promise<Array>} Studies matching criteria
   */
  async getStudiesInTrack(organizationId, trackType, subStatus) {
    if (!TrackAllocationService.VALID_TRACKS.includes(trackType)) {
      throw new Error(`Invalid track type: ${trackType}`);
    }

    const userTag = trackType === "NoCase" ? "No Case" : trackType;

    let subStatusCondition = "c.subStatus = @subStatus";
    if (subStatus === "triage") {
      subStatusCondition =
        "(c.subStatus = @subStatus OR NOT IS_DEFINED(c.subStatus) OR c.subStatus = null)";
    }

    const query = `
      SELECT * FROM c 
      WHERE c.organizationId = @orgId 
      AND (
          c.workflowTrack = @track 
          OR (
            (NOT IS_DEFINED(c.workflowTrack) OR c.workflowTrack = null) 
            AND (c.userTag = @userTag OR LOWER(c.userTag) = LOWER(@userTag))
          )
      )
      AND ${subStatusCondition}
      ORDER BY c.updatedAt DESC
    `;

    const studies = await cosmosService.queryItems("studies", query, [
      { name: "@orgId", value: organizationId },
      { name: "@track", value: trackType },
      { name: "@userTag", value: userTag },
      { name: "@subStatus", value: subStatus },
    ]);

    return studies;
  }

  /**
   * Get allocation percentage for a specific track from workflow config
   * @param {string} organizationId - Organization ID
   * @param {string} trackType - Track type
   * @returns {Promise<number>} Allocation percentage (0-100)
   */
  async getTrackAllocationPercentage(organizationId, trackType) {
    try {
      const workflowConfig = await adminConfigService.getConfig(
        organizationId,
        "workflow",
      );

      if (workflowConfig && workflowConfig.configData) {
        const configKey = `${trackType.toLowerCase()}AllocationPercentage`;
        if (typeof workflowConfig.configData[configKey] !== "undefined") {
          return parseFloat(workflowConfig.configData[configKey]);
        }
      }
    } catch (err) {
      console.warn(
        `Failed to fetch allocation percentage for ${trackType}:`,
        err,
      );
    }

    // Default to 10% if not configured
    return 10;
  }

  /**
   * Move studies from triage to allocation phase within a track
   * @param {string} organizationId - Organization ID
   * @param {string} trackType - 'ICSR', 'AOI', or 'NoCase'
   * @param {object} user - User performing the action
   * @param {number} count - Optional. Number of cases to move (default: all)
   * @returns {Promise<object>} Results of the operation
   */
  async moveToAllocation(organizationId, trackType, user, count = null) {
    let studies = await this.getStudiesInTrack(
      organizationId,
      trackType,
      "triage",
    );

    // If count is specified, limit the number of studies to process
    if (
      count !== null &&
      count !== undefined &&
      count > 0 &&
      count < studies.length
    ) {
      // Shuffle for random selection when count is specified
      studies = studies.sort(() => 0.5 - Math.random()).slice(0, count);
    }

    const results = { moved: 0, errors: 0, total: studies.length, details: [] };

    const userName = user.getFullName
      ? user.getFullName()
      : `${user.firstName} ${user.lastName}`;

    for (const studyData of studies) {
      try {
        const study = new Study(studyData);
        study.progressSubStatus("allocation", user.id, userName);

        await cosmosService.updateItem(
          "studies",
          study.id,
          organizationId,
          study.toJSON(),
        );

        results.moved++;
        results.details.push({ id: study.id, status: "success" });
      } catch (err) {
        console.error(`Error moving study ${studyData.id} to allocation:`, err);
        results.errors++;
        results.details.push({
          id: studyData.id,
          status: "error",
          message: err.message,
        });
      }
    }

    return results;
  }

  /**
   * Allocate studies within a specific track based on percentage
   * @param {string} organizationId - Organization ID
   * @param {string} trackType - 'ICSR', 'AOI', or 'NoCase'
   * @param {number} retainPercentage - Percentage to retain for manual assessment (0-100)
   * @param {object} user - User performing the allocation
   * @returns {Promise<object>} Results of the allocation
   */
  async allocateTrack(organizationId, trackType, retainPercentage, user) {
    if (!TrackAllocationService.VALID_TRACKS.includes(trackType)) {
      throw new Error(`Invalid track type: ${trackType}`);
    }

    // Query studies in this track's allocation phase
    const studies = await this.getStudiesInTrack(
      organizationId,
      trackType,
      "allocation",
    );

    if (studies.length === 0) {
      return {
        total: 0,
        retained: 0,
        autoPassed: 0,
        errors: 0,
        message: "No studies found in allocation phase",
      };
    }

    // Calculate split
    const countToRetain = Math.ceil(studies.length * (retainPercentage / 100));

    // Shuffle for random selection
    const shuffled = studies.sort(() => 0.5 - Math.random());

    const toRetain = shuffled.slice(0, countToRetain);
    const toAutoPass = shuffled.slice(countToRetain);

    const results = {
      total: studies.length,
      retained: 0,
      autoPassed: 0,
      errors: 0,
      details: [],
    };

    const userName = user.getFullName
      ? user.getFullName()
      : `${user.firstName} ${user.lastName}`;

    // Process retained (move to assessment)
    for (const studyData of toRetain) {
      try {
        const study = new Study(studyData);
        study.progressSubStatus("assessment", user.id, userName);
        study.isAutoPassed = false;

        await cosmosService.updateItem(
          "studies",
          study.id,
          organizationId,
          study.toJSON(),
        );

        results.retained++;
        results.details.push({
          id: study.id,
          pmid: study.pmid,
          action: "retained",
          status: "success",
        });
      } catch (err) {
        console.error(`Error retaining study ${studyData.id}:`, err);
        results.errors++;
        results.details.push({
          id: studyData.id,
          action: "retained",
          status: "error",
          message: err.message,
        });
      }
    }

    // Process auto-passed (mark and move to destination)
    const destination = TrackAllocationService.DEFAULT_DESTINATIONS[trackType];

    for (const studyData of toAutoPass) {
      try {
        const study = new Study(studyData);
        study.markAsAutoPassed(destination);

        // Add auto-pass comment
        study.addComment({
          userId: user.id,
          userName: userName,
          text: `Auto-passed from ${trackType} allocation to ${destination}`,
          type: "allocation_auto_pass",
        });

        await cosmosService.updateItem(
          "studies",
          study.id,
          organizationId,
          study.toJSON(),
        );

        results.autoPassed++;
        results.details.push({
          id: study.id,
          pmid: study.pmid,
          action: "auto_passed",
          destination: destination,
          status: "success",
        });
      } catch (err) {
        console.error(`Error auto-passing study ${studyData.id}:`, err);
        results.errors++;
        results.details.push({
          id: studyData.id,
          action: "auto_passed",
          status: "error",
          message: err.message,
        });
      }
    }

    return results;
  }

  /**
   * Route a study from assessment to a specific destination
   * @param {string} organizationId - Organization ID
   * @param {string} studyId - Study ID
   * @param {string} destination - 'data_entry', 'medical_review', or 'reporting'
   * @param {object} user - User performing the action
   * @param {string} previousTrack - Optional. The track this study is coming from (if rerouting).
   * @param {string} comments - Optional. Comments if the action is a rejection.
   * @returns {Promise<object>} Result of the operation
   */
  async routeStudy(
    organizationId,
    studyId,
    destination,
    user,
    previousTrack = null,
    comments = null,
  ) {
    const studyData = await cosmosService.getItem(
      "studies",
      studyId,
      organizationId,
    );

    if (!studyData) {
      throw new Error("Study not found");
    }

    const study = new Study(studyData);

    if (study.subStatus !== "assessment") {
      throw new Error("Study must be in assessment phase to route");
    }

    const userName = user.getFullName
      ? user.getFullName()
      : `${user.firstName} ${user.lastName}`;
    study.routeFromAssessment(
      destination,
      user.id,
      userName,
      previousTrack,
      comments,
    );

    await cosmosService.updateItem(
      "studies",
      study.id,
      organizationId,
      study.toJSON(),
    );

    return {
      success: true,
      studyId: study.id,
      destination: destination,
      previousTrack: study.workflowTrack,
    };
  }

  /**
   * Get summary statistics for all tracks
   * @param {string} organizationId - Organization ID
   * @returns {Promise<object>} Track statistics
   */
  async getTrackStatistics(organizationId) {
    const stats = {};

    for (const track of TrackAllocationService.VALID_TRACKS) {
      stats[track] = {
        triage: 0,
        allocation: 0,
        assessment: 0,
      };

      const userTag = track === "NoCase" ? "No Case" : track;

      // Group by subStatus to catch all cases including unexpected states
      // and handle case-insensitivity for track detection
      const query = `
          SELECT c.subStatus, COUNT(1) as count 
          FROM c 
          WHERE c.organizationId = @orgId 
          AND (
            c.workflowTrack = @track 
            OR LOWER(c.workflowTrack) = LOWER(@track) 
            OR (
                (NOT IS_DEFINED(c.workflowTrack) OR c.workflowTrack = null) 
                AND (c.userTag = @userTag OR LOWER(c.userTag) = LOWER(@userTag))
            )
          )
          AND (NOT IS_DEFINED(c.assignedTo) OR c.assignedTo = null OR c.assignedTo = "")
          GROUP BY c.subStatus
        `;

      try {
        const results = await cosmosService.queryItems("studies", query, [
          { name: "@orgId", value: organizationId },
          { name: "@track", value: track },
          { name: "@userTag", value: userTag },
        ]);

        for (const row of results) {
          // Map null/undefined subStatus to 'triage'
          // Map 'reporting' to 'assessment' for NoCase track if that's where they end up
          let statusKey = row.subStatus || "triage";

          // Accumulate counts (handling duplicated keys if mapping merges them)
          stats[track][statusKey] = (stats[track][statusKey] || 0) + row.count;
        }
      } catch (error) {
        console.error(
          `Error fetching stats for track ${track}: ${error.message}`,
        );
      }
    }

    return stats;
  }
}

module.exports = new TrackAllocationService();
