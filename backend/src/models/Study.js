const { v4: uuidv4 } = require("uuid");

class Study {
  constructor({
    id = uuidv4(),
    organizationId,
    pmid,
    title,
    authors = [],
    journal,
    publicationDate,
    abstract,
    drugName,
    adverseEvent,
    status = "Pending Review",
    reviewDetails = {},
    comments = [],
    attachments = [],
    createdAt = new Date().toISOString(),
    updatedAt = new Date().toISOString(),
    createdBy,
    reviewedBy = null,
    approvedBy = null,
    approvedAt = null,
    // AI Inference fields
    aiInferenceData = null,
    doi = null,
    specialCase = null,
    countryOfFirstAuthor = null,
    countryOfOccurrence = null,
    patientDetails = null,
    keyEvents = null,
    relevantDates = null,
    administeredDrugs = [],
    attributability = null,
    drugEffect = null,
    summary = null,
    identifiableHumanSubject = null,
    textType = null,
    authorPerspective = null,
    confirmedPotentialICSR = null,
    icsrClassification = null,
    substanceGroup = null,
    vancouverCitation = null,
    leadAuthor = null,
    serious = null,
    testSubject = null,
    aoiDrugEffect = null,
    approvedIndication = null,
    aoiClassification = null,
    justification = null,
    clientName = null,
    sponsor = null,
    userTag = null, // Manual user classification: 'ICSR', 'AOI', 'No Case'
    qaApprovalStatus = "pending", // pending, approved, rejected
    qaApprovedBy = null,
    qaApprovedAt = null,
    qaRejectedBy = null,
    qaRejectedAt = null,
    qaComments = null,
    // Source Track for cross-track routing
    sourceTrack = null,
    sourceTrackTimestamp = null,
    // R3 Form data fields
    r3FormData = null, // JSON object to store R3 form data
    r3FormStatus = "not_started", // not_started, in_progress, completed
    r3FormCompletedBy = null,
    r3FormCompletedAt = null,
    // QC R3 XML Review fields
    qcR3Status = "not_applicable", // not_applicable, pending, approved, rejected
    qcR3ApprovedBy = null,
    qcR3ApprovedAt = null,
    qcR3RejectedBy = null,
    qcR3RejectedAt = null,
    qcR3Comments = null,
    // AOI Assessment fields
    listedness = null, // 'Yes', 'No'
    seriousness = null, // 'Yes', 'No'
    fullTextAvailability = null, // 'Yes', 'No'
    fullTextSource = null,
    aoiAssessedBy = null,
    aoiAssessedAt = null,
    // Medical Reviewer fields
    medicalReviewStatus = "not_started", // not_started, in_progress, completed, revoked
    medicalReviewedBy = null,
    medicalReviewedAt = null,
    reviews = [],
    // Allocation fields
    assignedTo = null,
    lockedAt = null,
    priority = "normal", // 'normal', 'high'
    classifiedBy = null,
    fieldComments = [], // Array of field-level comments
    revokedBy = null,
    revokedAt = null,
    revocationReason = null,
    // Tri-Channel Workflow fields
    workflowTrack = null, // 'ICSR', 'AOI', 'NoCase' - which parallel track this study belongs to
    subStatus = "triage", // 'triage', 'allocation', 'assessment' - position within track lifecycle
    isAutoPassed = false, // Whether this case bypassed manual assessment via percentage split
    workflowStage = null, // Granular stage from WorkflowStage enum
    batchId = null, // ID for the batch allocation
    allocatedAt = null, // Timestamp when allocated
    lastQueueStage = null, // Breadcrumb for reject-back routing
  }) {
    this.id = id;
    this.organizationId = organizationId;
    this.pmid = pmid;
    this.title = title;
    this.authors = authors;
    this.journal = journal;
    this.publicationDate = publicationDate;
    this.abstract = abstract;
    this.drugName = drugName;
    this.adverseEvent = adverseEvent;
    this.status = status; // Pending Review, Under Review, Approved, Rejected
    this.reviewDetails = {
      severity: "",
      causality: "",
      expectedness: "",
      outcomes: [],
      recommendations: "",
      ...reviewDetails,
    };
    this.comments = comments;
    this.attachments = attachments;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.createdBy = createdBy;
    this.reviewedBy = reviewedBy;
    this.approvedBy = approvedBy;
    this.approvedAt = approvedAt;
    this.type = "study";

    // AI Inference data
    this.aiInferenceData = aiInferenceData; // Store raw AI response
    this.doi = doi;
    this.specialCase = specialCase;
    this.countryOfFirstAuthor = countryOfFirstAuthor;
    this.countryOfOccurrence = countryOfOccurrence;
    this.patientDetails = patientDetails;
    this.keyEvents = keyEvents;
    this.relevantDates = relevantDates;
    this.administeredDrugs = administeredDrugs;
    this.attributability = attributability;
    this.drugEffect = drugEffect;
    this.summary = summary;
    this.identifiableHumanSubject = identifiableHumanSubject;
    this.textType = textType;
    this.authorPerspective = authorPerspective;
    this.confirmedPotentialICSR = confirmedPotentialICSR;
    this.icsrClassification = icsrClassification;
    this.substanceGroup = substanceGroup;
    this.vancouverCitation = vancouverCitation;
    this.leadAuthor = leadAuthor;
    this.serious = serious;
    this.testSubject = testSubject;
    this.aoiDrugEffect = aoiDrugEffect;
    this.approvedIndication = approvedIndication;
    this.aoiClassification = aoiClassification;
    this.justification = justification;
    this.clientName = clientName;
    this.sponsor = sponsor;
    this.userTag = userTag; // Manual user classification
    this.priority = priority;
    this.classifiedBy = classifiedBy;

    // QC workflow fields
    this.qaApprovalStatus = qaApprovalStatus;
    this.qaApprovedBy = qaApprovedBy;
    this.qaApprovedAt = qaApprovedAt;
    this.qaRejectedBy = qaRejectedBy;
    this.qaRejectedAt = qaRejectedAt;
    this.qaComments = qaComments;
    this.sourceTrack = sourceTrack;
    this.sourceTrackTimestamp = sourceTrackTimestamp;

    // R3 Form data
    this.r3FormData = r3FormData;
    this.r3FormStatus = r3FormStatus;
    this.r3FormCompletedBy = r3FormCompletedBy;
    this.r3FormCompletedAt = r3FormCompletedAt;

    // QC R3 XML Review fields
    this.qcR3Status = qcR3Status;
    this.qcR3ApprovedBy = qcR3ApprovedBy;
    this.qcR3ApprovedAt = qcR3ApprovedAt;
    this.qcR3RejectedBy = qcR3RejectedBy;
    this.qcR3RejectedAt = qcR3RejectedAt;
    this.qcR3Comments = qcR3Comments;

    // AOI Assessment fields
    this.listedness = listedness;
    this.seriousness = seriousness;
    this.fullTextAvailability = fullTextAvailability;
    this.fullTextSource = fullTextSource;
    this.aoiAssessedBy = aoiAssessedBy;
    this.aoiAssessedAt = aoiAssessedAt;

    // Medical Reviewer fields
    this.medicalReviewStatus = medicalReviewStatus;
    this.medicalReviewedBy = medicalReviewedBy;
    this.medicalReviewedAt = medicalReviewedAt;
    this.assignedTo = assignedTo;
    this.lockedAt = lockedAt;
    this.fieldComments = fieldComments || [];
    this.revokedBy = revokedBy;
    this.revokedAt = revokedAt;
    this.revocationReason = revocationReason;

    // Tri-Channel Workflow fields
    this.workflowTrack = workflowTrack;
    this.subStatus = subStatus;
    this.isAutoPassed = isAutoPassed;
    this.workflowStage = workflowStage;
    this.batchId = batchId;
    this.allocatedAt = allocatedAt;
    this.lastQueueStage = lastQueueStage;
  }

  addComment(comment) {
    const newComment = {
      id: uuidv4(),
      userId: comment.userId,
      userName: comment.userName,
      comment: comment.text,
      timestamp: new Date().toISOString(),
      type: comment.type || "review",
    };
    this.comments.push(newComment);
    this.updatedAt = new Date().toISOString();
    return newComment;
  }

  updateStatus(newStatus, userId, userName) {
    this.status = newStatus;
    this.updatedAt = new Date().toISOString();

    if (newStatus === "Under Review") {
      this.reviewedBy = userId;
    } else if (newStatus === "Approved") {
      this.approvedBy = userId;
      this.approvedAt = new Date().toISOString();
    }

    // Add status change comment
    this.addComment({
      userId,
      userName,
      text: `Status changed to ${newStatus}`,
      type: "system",
    });
  }

  updateReviewDetails(details) {
    this.reviewDetails = {
      ...this.reviewDetails,
      ...details,
    };
    this.updatedAt = new Date().toISOString();
  }

  updateUserTag(tag, userId, userName, nextStage = null) {
    const validTags = ["ICSR", "AOI", "No Case"];
    if (!validTags.includes(tag)) {
      throw new Error(`Invalid tag. Must be one of: ${validTags.join(", ")}`);
    }

    const previousTag = this.userTag;
    this.userTag = tag;
    this.classifiedBy = userId;

    // Clear assignment/lock when classification is submitted
    // This allows the user to pick up a new case immediately
    this.assignedTo = null;
    this.lockedAt = null;

    if (nextStage) {
      this.status = nextStage.id;
      this.subStatus = "assessment"; // Move to assessment phase

      // If moving to a QC stage, set approval status to pending
      if (
        nextStage.id.includes("qc") ||
        nextStage.label.toLowerCase().includes("qc")
      ) {
        this.qaApprovalStatus = "pending";
        this.addComment({
          userId,
          userName,
          text: `Manual classification updated to "${tag}". Moving to ${nextStage.label}.`,
          type: "system",
        });
      } else {
        // If skipping QC, ensure we don't get stuck in pending
        this.qaApprovalStatus = "not_applicable";
        this.addComment({
          userId,
          userName,
          text: `Manual classification updated to "${tag}". Moving to ${nextStage.label}.`,
          type: "system",
        });
      }
    } else {
      // Legacy behavior
      this.qaApprovalStatus = "pending"; // Reset QC approval when tag changes
      this.addComment({
        userId,
        userName,
        text: `Manual classification updated from "${previousTag || "None"}" to "${tag}". Awaiting QC approval.`,
        type: "system",
      });
    }

    this.updatedAt = new Date().toISOString();
  }

  // QC Workflow Methods
  approveClassification(userId, userName, comments = null) {
    if (this.qaApprovalStatus === "approved") {
      throw new Error("Classification is already approved");
    }

    this.qaApprovalStatus = "approved";
    this.qaApprovedBy = userId;
    this.qaApprovedAt = new Date().toISOString();
    this.qaComments = comments;
    this.updatedAt = new Date().toISOString();

    // Add approval comment
    this.addComment({
      userId,
      userName,
      text: `Classification "${this.userTag}" approved by QC${comments ? ". Comments: " + comments : ""}`,
      type: "QC_approval",
    });
  }

  rejectClassification(userId, userName, reason, targetStage) {
    if (!reason) {
      throw new Error("Rejection reason is required");
    }

    const previousTag = this.userTag;
    this.qaApprovalStatus = "rejected";
    this.qaRejectedBy = userId;
    this.qaRejectedAt = new Date().toISOString();
    this.qaComments = reason;
    this.updatedAt = new Date().toISOString();

    // Assign back to original user with high priority
    if (this.classifiedBy || this.reviewedBy) {
      this.assignedTo = this.classifiedBy || this.reviewedBy;
      this.priority = "high";
      this.lockedAt = new Date().toISOString(); // Auto-lock for them
    } else {
      this.priority = "high"; // High priority for pool if no user known
    }

    // If targetStage is provided, update status
    if (targetStage) {
      this.status = targetStage;
    } else {
      // Default to Pending Review (Triage) if no stage specified
      this.status = "Pending Review";
    }

    // Clear the userTag so the study goes back to Triage for re-classification
    this.userTag = null;
    this.subStatus = "triage"; // Reset to triage phase

    // Add rejection comment
    this.addComment({
      userId,
      userName,
      text: `Classification "${previousTag}" rejected by QC. Reason: ${reason}. Study returned to ${targetStage || "Triage"} for re-classification.`,
      type: "QC_rejection",
    });
  }

  // QC R3 XML Review Methods
  approveR3Form(
    userId,
    userName,
    comments = null,
    workflowSettings = { qcDataEntry: true, medicalReview: true },
  ) {
    if (this.qcR3Status === "approved") {
      throw new Error("R3 form is already approved by QC");
    }

    if (this.r3FormStatus !== "completed") {
      throw new Error("R3 form must be completed before QC approval");
    }

    this.qcR3Status = "approved";
    this.qcR3ApprovedBy = userId;
    this.qcR3ApprovedAt = new Date().toISOString();
    this.qcR3Comments = comments;
    this.updatedAt = new Date().toISOString();

    // Ensure overall QA approval is set if it wasn't already (fixes legacy/buggy states)
    if (
      this.qaApprovalStatus !== "approved" &&
      this.qaApprovalStatus !== "not_applicable"
    ) {
      this.qaApprovalStatus = "approved";
      if (!this.qaApprovedBy) {
        this.qaApprovedBy = userId;
        this.qaApprovedAt = new Date().toISOString();
      }
    }

    const medicalReviewEnabled = workflowSettings.medicalReview !== false;

    if (medicalReviewEnabled) {
      this.status = "medical_review";
      // Add approval comment
      this.addComment({
        userId,
        userName,
        text: `R3 XML form approved by QC. Ready for Medical Reviewer${comments ? ". Comments: " + comments : ""}`,
        type: "qc_r3_approval",
      });
    } else {
      // Medical Review Disabled - Auto complete Medical Review
      this.medicalReviewStatus = "completed";
      this.medicalReviewedBy = "system";
      this.medicalReviewedAt = new Date().toISOString();
      this.status = "reporting";

      this.addComment({
        userId,
        userName,
        text: `R3 XML form approved by QC. Medical Review skipped (disabled). Ready for Reports.${comments ? " Comments: " + comments : ""}`,
        type: "qc_r3_approval",
      });
    }
  }

  rejectR3Form(userId, userName, reason) {
    if (!reason) {
      throw new Error("Rejection reason is required");
    }

    this.qcR3Status = "rejected";
    this.qcR3RejectedBy = userId;
    this.qcR3RejectedAt = new Date().toISOString();
    this.qcR3Comments = reason;
    this.r3FormStatus = "in_progress"; // Reset to allow data entry to fix
    this.updatedAt = new Date().toISOString();

    // Assign back to Data Entry user with high priority
    if (this.r3FormCompletedBy) {
      this.assignedTo = this.r3FormCompletedBy;
      this.priority = "high";
      this.lockedAt = new Date().toISOString();
    } else {
      this.priority = "high";
    }

    // Add rejection comment
    this.addComment({
      userId,
      userName,
      text: `R3 XML form rejected by QC. Reason: ${reason}. Returned to Data Entry for corrections.`,
      type: "qc_r3_rejection",
    });
  }

  // Medical Reviewer Methods
  addFieldComment(fieldKey, comment, userId, userName) {
    const { v4: uuidv4 } = require("uuid");
    const fieldComment = {
      id: uuidv4(),
      fieldKey,
      comment,
      userId,
      userName,
      createdAt: new Date().toISOString(),
    };

    this.fieldComments.push(fieldComment);
    this.updatedAt = new Date().toISOString();

    // Add general comment about field comment
    this.addComment({
      userId,
      userName,
      text: `Added comment to field ${fieldKey}: ${comment}`,
      type: "field_comment",
    });

    return fieldComment;
  }

  updateFieldValue(fieldKey, newValue, userId, userName) {
    // Check if this is a top-level classification field
    if (["listedness", "seriousness"].includes(fieldKey)) {
      const oldValue = this[fieldKey];
      this[fieldKey] = newValue;
      this.updatedAt = new Date().toISOString();

      this.addComment({
        userId,
        userName,
        text: `Updated ${fieldKey} from "${oldValue || "empty"}" to "${newValue}"`,
        type: "field_edit",
      });
      return;
    }

    if (!this.r3FormData) {
      this.r3FormData = {};
    }

    const oldValue = this.r3FormData[fieldKey];
    this.r3FormData[fieldKey] = newValue;
    this.updatedAt = new Date().toISOString();

    // Add comment about field edit
    this.addComment({
      userId,
      userName,
      text: `Updated field ${fieldKey} from "${oldValue || "empty"}" to "${newValue}"`,
      type: "field_edit",
    });
  }

  revokeStudy(userId, userName, reason, targetStage) {
    if (!reason) {
      throw new Error("Revocation reason is required");
    }

    // Reset medical review status so it can be reviewed again after Data Entry fixes
    this.medicalReviewStatus = "not_started";
    this.revokedBy = userId;
    this.revokedAt = new Date().toISOString();
    this.revocationReason = reason;
    this.priority = "high"; // Always high priority on revocation

    // If no target stage provided, default based on current state
    if (!targetStage) {
      if (
        this.workflowStage === "DATA_ENTRY" ||
        this.status === "data_entry" ||
        this.subStatus === "data_entry"
      ) {
        // Default revamp from Data Entry -> Triage
        targetStage = "triage";
      }
    }

    // Update the main status field if a target stage is provided
    if (targetStage) {
      // Normalize 'triage' to 'Pending Review' to ensure it's picked up by allocation logic
      if (targetStage === "triage") {
        this.status = "Pending Review";
        this.subStatus = "triage";
      } else {
        this.status = targetStage;
      }
    }

    // Handle specific stage logic
    if (targetStage === "triage") {
      // Assign back to the person who classified it (if available), otherwise the revoker
      this.assignedTo = this.classifiedBy || userId;
      this.lockedAt = new Date().toISOString();

      // If revoking to triage, we reset QA approval status completely
      // This removes it from QC queue and allows re-classification in Triage
      this.qaApprovalStatus = null;
      this.qaApprovedBy = null;
      this.qaApprovedAt = null;
      this.r3FormStatus = "not_started";
    } else if (targetStage === "qc_triage") {
      // If revoking to QC triage, we set status to pending so it appears in QC queue
      this.qaApprovalStatus = "pending";
      this.qaApprovedBy = null;
      this.qaApprovedAt = null;
      this.r3FormStatus = "not_started";
    } else if (targetStage === "qc_data_entry") {
      // Revoke to QC Data Entry (e.g. from Medical Review)
      this.status = "qc_data_entry";
      this.qcR3Status = "pending"; // Reset to pending to appear in QC queue
      this.medicalReviewStatus = "not_started";
      // Do NOT reset r3FormStatus as it is already completed
    } else if (
      targetStage === "assessment" ||
      targetStage === "qc_allocation"
    ) {
      // Revoke to Assessment/Allocation (e.g. from Data Entry)

      const track = this.workflowTrack || "ICSR"; // Default to ICSR

      if (track === "ICSR") {
        this.status = "qc_allocation";
        this.subStatus = "assessment";
        this.qaApprovalStatus = "pending"; // Pending allocation/QC
      } else if (track === "AOI") {
        this.status = "aoi_assessment";
        this.subStatus = "assessment";
        this.isAutoPassed = false;
      } else if (track === "NoCase" || track === "No Case") {
        this.status = "no_case_assessment";
        this.subStatus = "assessment";
        this.isAutoPassed = false;
      }

      // Reset Data Entry / R3 progress
      this.r3FormStatus = "not_started";
      this.qcR3Status = "not_started";
      this.medicalReviewStatus = "not_started";
      this.qaApprovedAt = null; // Clear approval that moved it to Data Entry
    } else {
      // Default behavior (revoke to Data Entry)
      // Assign back to classifier if available, otherwise Data Entry user
      if (this.classifiedBy) {
        this.assignedTo = this.classifiedBy;
        this.lockedAt = new Date().toISOString();
      } else if (this.r3FormCompletedBy) {
        this.assignedTo = this.r3FormCompletedBy;
        this.lockedAt = new Date().toISOString();
      }

      this.status = "data_entry";
      this.r3FormStatus = "in_progress"; // Reset to allow data entry to fix
      this.qcR3Status = "not_started"; // Reset QC R3 status
    }

    this.updatedAt = new Date().toISOString();

    // Clear previous medical review data since it's being re-worked
    this.medicalReviewedBy = null;
    this.medicalReviewedAt = null;

    // Add revocation comment
    this.addComment({
      userId,
      userName,
      text: `Study revoked. Reason: ${reason}. Returned to ${targetStage || "Data Entry"} for corrections.`,
      type: "revocation",
    });
  }

  completeMedicalReview(userId, userName) {
    this.medicalReviewStatus = "completed";
    this.medicalReviewedBy = userId;
    this.medicalReviewedAt = new Date().toISOString();
    this.updatedAt = new Date().toISOString();
    this.status = "reporting";

    // Check if this was a resubmission after revocation
    const wasResubmitted =
      this.revokedBy !== null && this.revokedBy !== undefined;

    // Clear revocation tracking since study is now approved
    if (wasResubmitted) {
      this.revokedBy = null;
      this.revokedAt = null;
      this.revocationReason = null;
    }

    // Add completion comment
    this.addComment({
      userId,
      userName,
      text: "Medical review completed. Study approved for final processing.",
      type: "medical_approval",
    });
  }

  updateR3FormData(formData, userId, userName) {
    this.r3FormData = {
      ...this.r3FormData,
      ...formData,
    };
    this.r3FormStatus = "in_progress";
    this.updatedAt = new Date().toISOString();

    // Add form update comment
    this.addComment({
      userId,
      userName,
      text: "R3 form data updated",
      type: "system",
    });
  }

  completeR3Form(
    userId,
    userName,
    workflowSettings = { qcDataEntry: true, medicalReview: true },
  ) {
    this.r3FormStatus = "completed";
    this.r3FormCompletedBy = userId;
    this.r3FormCompletedAt = new Date().toISOString();
    this.updatedAt = new Date().toISOString();

    const qcEnabled = workflowSettings.qcDataEntry !== false;
    const medicalReviewEnabled = workflowSettings.medicalReview !== false;

    // Check if this study was previously revoked by Medical Reviewer
    const wasRevoked = this.revokedBy !== null && this.revokedBy !== undefined;

    if (qcEnabled) {
      // Set QC R3 status to pending - requires QC approval before Medical Reviewer
      this.qcR3Status = "pending";
      this.status = "qc_data_entry"; // Move to QC Data Entry stage

      // Add comment indicating R3 form completion
      if (wasRevoked) {
        this.addComment({
          userId,
          userName,
          text: "R3 form completed and resubmitted after Medical Reviewer revocation. Awaiting QC approval before medical re-review.",
          type: "resubmission",
        });
      } else {
        // First-time completion - add standard completion comment
        this.addComment({
          userId,
          userName,
          text: "R3 form completed. Awaiting QC approval before Medical Reviewer review.",
          type: "system",
        });
      }
    } else {
      // QC Disabled - Auto approve QC
      this.qcR3Status = "approved";
      this.qcR3ApprovedBy = "system";
      this.qcR3ApprovedAt = new Date().toISOString();
      this.qcR3Comments = "Auto-approved (QC Data Entry disabled)";

      if (medicalReviewEnabled) {
        // Move to Medical Review
        this.status = "medical_review";
        this.addComment({
          userId,
          userName,
          text: "R3 form completed. QC Data Entry skipped (disabled). Ready for Medical Reviewer.",
          type: "system",
        });
      } else {
        // Both disabled - Move to Reports
        this.medicalReviewStatus = "completed";
        this.medicalReviewedBy = "system";
        this.medicalReviewedAt = new Date().toISOString();
        this.status = "reporting";

        this.addComment({
          userId,
          userName,
          text: "R3 form completed. QC Data Entry and Medical Review skipped (disabled). Ready for Reports.",
          type: "system",
        });
      }
    }

    // Auto-tag as ICSR if not already tagged
    if (!this.userTag || this.userTag !== "ICSR") {
      const previousTag = this.userTag;
      this.userTag = "ICSR";

      // Add tag change comment
      this.addComment({
        userId,
        userName,
        text: `Study automatically classified as ICSR due to R3 form completion (previous: "${previousTag || "None"}")`,
        type: "system",
      });
    }
  }

  getEffectiveClassification() {
    // User tag overrides AI classification
    if (this.userTag) {
      return this.userTag;
    }

    // Fall back to AI classifications
    if (this.icsrClassification) {
      return "ICSR";
    }
    if (this.aoiClassification) {
      return "AOI";
    }

    return "No Case";
  }

  // Tri-Channel Workflow Methods

  /**
   * Set the workflow track for this study
   * @param {string} track - 'ICSR', 'AOI', or 'NoCase'
   * @param {string} userId - User ID making the change
   * @param {string} userName - User name making the change
   */
  setWorkflowTrack(track, userId, userName) {
    const validTracks = ["ICSR", "AOI", "NoCase"];
    if (!validTracks.includes(track)) {
      throw new Error(
        `Invalid track. Must be one of: ${validTracks.join(", ")}`,
      );
    }

    const previousTrack = this.workflowTrack;
    this.workflowTrack = track;
    this.subStatus = "triage"; // Reset to triage when track changes
    this.updatedAt = new Date().toISOString();

    this.addComment({
      userId,
      userName,
      text: `Workflow track set to "${track}" (previous: "${previousTrack || "None"}")`,
      type: "track_change",
    });
  }

  /**
   * Progress the study through the track lifecycle
   * @param {string} nextStatus - 'triage', 'allocation', or 'assessment'
   * @param {string} userId - User ID making the change
   * @param {string} userName - User name making the change
   */
  progressSubStatus(nextStatus, userId, userName) {
    const validStatuses = ["triage", "allocation", "assessment"];
    if (!validStatuses.includes(nextStatus)) {
      throw new Error(
        `Invalid sub-status. Must be one of: ${validStatuses.join(", ")}`,
      );
    }

    const previousStatus = this.subStatus;
    this.subStatus = nextStatus;
    this.updatedAt = new Date().toISOString();

    this.addComment({
      userId,
      userName,
      text: `Track progression: ${previousStatus} → ${nextStatus}`,
      type: "track_progress",
    });
  }

  /**
   * Route study from assessment phase to a destination
   * @param {string} destination - 'data_entry', 'medical_review', or 'reporting'
   * @param {string} userId - User ID making the change
   * @param {string} userName - User name making the change
   * @param {string} previousTrack - Optional. Previous track.
   * @param {string} comments - Optional. Comments if rejection.
   */
  routeFromAssessment(
    destination,
    userId,
    userName,
    previousTrack = null,
    comments = null,
  ) {
    const validDestinations = [
      "data_entry",
      "medical_review",
      "reporting",
      "aoi_assessment",
      "no_case_assessment",
      "icsr_triage",
      "icsr_assessment",
      "aoi_triage", // Added
      "no_case_triage", // Added
    ];

    if (!validDestinations.includes(destination)) {
      throw new Error(
        `Invalid destination. Must be one of: ${validDestinations.join(", ")}`,
      );
    }

    // Handle Rejection / Comments
    if (comments) {
      this.qaApprovalStatus = "rejected";
      this.qaRejectedBy = userId;
      this.qaRejectedAt = new Date().toISOString();
      this.qaComments = comments;
      this.priority = "high"; // Ensure it goes to top of queue

      this.addComment({
        userId,
        userName,
        text: `Rejected from Assessment. Reason: ${comments}`,
        type: "rejection",
      });
    } else {
      // Clear previous rejection status if moving forward without rejection
      // But only if we are moving forward (not back to triage without comments)
      // Actually, if we move to next stage, we should probably clear rejection status
      if (!destination.includes("triage")) {
        // If moving forward to Data Entry or beyond, consider it approved
        if (
          ["data_entry", "medical_review", "reporting"].includes(destination)
        ) {
          this.qaApprovalStatus = "approved";
          this.qaApprovedBy = userId;
          this.qaApprovedAt = new Date().toISOString();
        } else {
          this.qaApprovalStatus = "pending";
        }
      }
    }

    // Store previous track if provided
    if (previousTrack) {
      this.sourceTrack = previousTrack;
      this.sourceTrackTimestamp = new Date().toISOString();
    } else {
      // If simply moving forward in same track, keep sourceTrack?
      // Or clear it? Depends on if we want "original source".
      // For now, let's keep it if not explicitly overwritten.
    }

    if (this.subStatus !== "assessment") {
      // Allow if strictly re-routing, but warning: subStatus must catch logic issues
      // throw new Error("Study must be in assessment phase to route");
    }

    const previousStatus = this.status;
    this.updatedAt = new Date().toISOString();

    // Clear assignment and lock so it can be picked up by the next pool/stage
    this.assignedTo = null;
    this.lockedAt = null;

    // Mapping Logic
    switch (destination) {
      case "data_entry":
        this.workflowTrack = "ICSR";
        this.workflowStage = "DATA_ENTRY";
        this.subStatus = "data_entry";
        this.status = "data_entry";
        break;

      case "aoi_assessment":
        this.workflowTrack = "AOI";
        this.workflowStage = "ASSESSMENT_AOI";
        this.subStatus = "assessment";
        this.status = "Under Assessment";
        break;

      case "no_case_assessment":
        this.workflowTrack = "NoCase";
        this.workflowStage = "ASSESSMENT_NO_CASE";
        this.subStatus = "assessment";
        this.status = "Under Assessment";
        break;

      case "icsr_triage":
        this.workflowTrack = "ICSR";
        this.workflowStage = "TRIAGE_ICSR";
        this.subStatus = "triage";
        this.status = "Under Triage Review";
        break;

      case "icsr_assessment":
        this.workflowTrack = "ICSR";
        this.workflowStage = "ASSESSMENT_ICSR";
        this.subStatus = "assessment";
        this.status = "Under Assessment";
        break;

      case "aoi_triage":
        this.workflowTrack = "AOI";
        this.workflowStage = "TRIAGE_AOI";
        this.subStatus = "triage";
        this.status = "Under Triage Review";
        break;

      case "no_case_triage":
        this.workflowTrack = "NoCase";
        this.workflowStage = "TRIAGE_NO_CASE";
        this.subStatus = "triage";
        this.status = "Under Triage Review";
        break;

      case "reporting":
        // Logic for reporting state
        if (this.userTag === "AOI" || this.workflowTrack === "AOI") {
          this.workflowTrack = "AOI";
          this.workflowStage = "REPORTING";
          this.subStatus = "reporting";
          this.status = "Ready for Report";
        } else if (
          this.userTag === "No Case" ||
          this.workflowTrack === "NoCase"
        ) {
          this.workflowTrack = "NoCase";
          this.workflowStage = "REPORTING";
          this.subStatus = "reporting";
          this.status = "No Case Confirmed";
        } else {
          this.workflowStage = "REPORTING";
          this.subStatus = "reporting";
          this.status = "Ready for Report";
        }
        break;

      case "medical_review":
        this.workflowStage = "MEDICAL_REVIEW";
        this.subStatus = "medical_review";
        this.status = "Pending Medical Review";
        break;

      default:
        this.status = destination; // Fallback
    }

    // Clear assignment for next phase
    this.assignedTo = null;
    this.lockedAt = null;

    this.addComment({
      userId,
      userName,
      text: `Routed from ${this.workflowTrack} assessment to ${destination}`,
      type: "track_route",
    });
  }

  /**
   * Mark study as auto-passed during allocation
   * @param {string} destination - Target status after auto-pass
   */
  markAsAutoPassed(destination) {
    this.isAutoPassed = true;
    this.subStatus = "assessment"; // Mark as completed assessment phase
    this.status = destination;
    this.updatedAt = new Date().toISOString();
  }

  addAttachment(attachment) {
    const newAttachment = {
      id: uuidv4(),
      fileName: attachment.fileName,
      fileSize: attachment.fileSize,
      fileType: attachment.fileType,
      uploadedBy: attachment.uploadedBy,
      uploadedAt: new Date().toISOString(),
      url: attachment.url,
    };
    this.attachments.push(newAttachment);
    this.updatedAt = new Date().toISOString();
    return newAttachment;
  }

  toJSON() {
    return {
      id: this.id,
      organizationId: this.organizationId,
      pmid: this.pmid,
      title: this.title,
      authors: this.authors,
      journal: this.journal,
      publicationDate: this.publicationDate,
      abstract: this.abstract,
      drugName: this.drugName,
      adverseEvent: this.adverseEvent,
      status: this.status,
      reviewDetails: this.reviewDetails,
      comments: this.comments,
      attachments: this.attachments,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      createdBy: this.createdBy,
      reviewedBy: this.reviewedBy,
      approvedBy: this.approvedBy,
      approvedAt: this.approvedAt,
      type: this.type,

      // AI Inference data
      aiInferenceData: this.aiInferenceData,
      doi: this.doi,
      specialCase: this.specialCase,
      countryOfFirstAuthor: this.countryOfFirstAuthor,
      countryOfOccurrence: this.countryOfOccurrence,
      patientDetails: this.patientDetails,
      keyEvents: this.keyEvents,
      relevantDates: this.relevantDates,
      administeredDrugs: this.administeredDrugs,
      attributability: this.attributability,
      drugEffect: this.drugEffect,
      summary: this.summary,
      identifiableHumanSubject: this.identifiableHumanSubject,
      textType: this.textType,
      authorPerspective: this.authorPerspective,
      confirmedPotentialICSR: this.confirmedPotentialICSR,
      icsrClassification: this.icsrClassification,
      substanceGroup: this.substanceGroup,
      vancouverCitation: this.vancouverCitation,
      leadAuthor: this.leadAuthor,
      serious: this.serious,
      testSubject: this.testSubject,
      aoiDrugEffect: this.aoiDrugEffect,
      approvedIndication: this.approvedIndication,
      aoiClassification: this.aoiClassification,
      justification: this.justification,
      clientName: this.clientName,
      sponsor: this.sponsor,
      userTag: this.userTag,
      effectiveClassification: this.getEffectiveClassification(),
      classifiedBy: this.classifiedBy,

      // QC workflow fields
      qaApprovalStatus: this.qaApprovalStatus,
      qaApprovedBy: this.qaApprovedBy,
      qaApprovedAt: this.qaApprovedAt,
      qaRejectedBy: this.qaRejectedBy,
      qaRejectedAt: this.qaRejectedAt,
      qaComments: this.qaComments,

      // R3 Form data
      r3FormData: this.r3FormData,
      r3FormStatus: this.r3FormStatus,
      r3FormCompletedBy: this.r3FormCompletedBy,
      r3FormCompletedAt: this.r3FormCompletedAt,

      // QC R3 XML Review fields
      qcR3Status: this.qcR3Status,
      qcR3ApprovedBy: this.qcR3ApprovedBy,
      qcR3ApprovedAt: this.qcR3ApprovedAt,
      qcR3RejectedBy: this.qcR3RejectedBy,
      qcR3RejectedAt: this.qcR3RejectedAt,
      qcR3Comments: this.qcR3Comments,

      // AOI Assessment fields
      listedness: this.listedness,
      seriousness: this.seriousness,
      fullTextAvailability: this.fullTextAvailability,
      fullTextSource: this.fullTextSource,
      aoiAssessedBy: this.aoiAssessedBy,
      aoiAssessedAt: this.aoiAssessedAt,

      // Medical Reviewer fields
      medicalReviewStatus: this.medicalReviewStatus,
      medicalReviewedBy: this.medicalReviewedBy,
      medicalReviewedAt: this.medicalReviewedAt,
      fieldComments: this.fieldComments,
      revokedBy: this.revokedBy,
      revokedAt: this.revokedAt,
      revocationReason: this.revocationReason,

      // Allocation fields
      assignedTo: this.assignedTo,
      lockedAt: this.lockedAt,

      // Tri-Channel Workflow fields
      workflowTrack: this.workflowTrack,
      subStatus: this.subStatus,
      isAutoPassed: this.isAutoPassed,
      workflowStage: this.workflowStage,
      batchId: this.batchId,
      allocatedAt: this.allocatedAt,
      lastQueueStage: this.lastQueueStage,
    };
  }

  static validate(data) {
    const errors = [];

    if (!data.pmid || !/^\d+$/.test(data.pmid)) {
      errors.push("Valid PMID (numeric) is required");
    }

    if (!data.title || data.title.trim().length < 10) {
      errors.push("Title must be at least 10 characters long");
    }

    if (!data.journal || data.journal.trim().length < 3) {
      errors.push("Journal name must be at least 3 characters long");
    }

    if (!data.publicationDate) {
      errors.push("Publication date is required");
    } else {
      const pubDate = new Date(data.publicationDate);
      if (isNaN(pubDate.getTime())) {
        errors.push("Publication date must be a valid date");
      }
    }

    if (!data.abstract || data.abstract.trim().length < 50) {
      errors.push("Abstract must be at least 50 characters long");
    }

    if (!data.drugName || data.drugName.trim().length < 2) {
      errors.push("Drug name must be at least 2 characters long");
    }

    if (!data.adverseEvent || data.adverseEvent.trim().length < 5) {
      errors.push(
        "Adverse event description must be at least 5 characters long",
      );
    }

    // Status validation removed to support custom workflows
    /*
    if (data.status && !['Pending Review', 'Under Review', 'Approved', 'Rejected'].includes(data.status)) {
      errors.push('Status must be Pending Review, Under Review, Approved, or Rejected');
    }
    */

    if (!data.organizationId) {
      errors.push("Organization ID is required");
    }

    return errors;
  }

  static getSearchableFields() {
    return ["title", "authors", "journal", "drugName", "adverseEvent", "pmid"];
  }

  /**
   * Create a Study instance from AI inference data
   * @param {Object} aiData - AI inference response
   * @param {Object} originalDrug - Original drug data from PubMed
   * @param {String} organizationId - Organization ID
   * @param {String} createdBy - User ID who created this study
   * @returns {Study} Study instance
   */
  static fromAIInference(aiData, originalDrug, organizationId, createdBy) {
    // Create study from AI inference data ONLY
    const safeAiData = aiData || {};

    // Extract authors from Vancouver citation if available
    let authors = [];
    if (safeAiData.Vancouver_citation) {
      // Vancouver citation format: "Author1 A, Author2 B, Author3 C. Title. Journal. Year..."
      const citationParts = safeAiData.Vancouver_citation.split(".");
      if (citationParts.length > 0) {
        const authorsPart = citationParts[0];
        authors = authorsPart
          .split(",")
          .map((a) => a.trim())
          .filter((a) => a);
      }
    }
    // Fallback to Lead_author if no Vancouver citation
    if (authors.length === 0 && safeAiData.Lead_author) {
      authors = [safeAiData.Lead_author];
    }

    // Extract journal from Vancouver citation
    let journal = "";
    if (safeAiData.Vancouver_citation) {
      const citationParts = safeAiData.Vancouver_citation.split(".");
      if (citationParts.length >= 2) {
        journal = citationParts[citationParts.length - 2].trim(); // Journal is usually second to last
      }
    }

    return new Study({
      organizationId,
      createdBy,
      pmid: safeAiData.PMID || "Unknown PMID",
      title:
        originalDrug?.title ||
        safeAiData.Title ||
        safeAiData.title ||
        "Title not available",
      drugName:
        safeAiData.Drugname || safeAiData.drugName || "Drug name not available",
      adverseEvent: safeAiData.Adverse_event || "Not specified",
      abstract: safeAiData.Summary || "",
      publicationDate: safeAiData.pubdate || new Date().toISOString(),
      journal: journal,
      authors: authors,
      sponsor: safeAiData.Client_name || "Unknown",

      // AI Inference specific fields
      aiInferenceData: aiData,
      doi: aiData.DOI,
      specialCase: aiData.special_case,
      countryOfFirstAuthor: aiData.Country_of_first_author,
      countryOfOccurrence: aiData.Country_of_occurrence,
      patientDetails: aiData.Patient_details,
      keyEvents: aiData.Key_events,
      relevantDates: aiData.Relevant_dates,
      administeredDrugs: aiData.Administered_drugs
        ? aiData.Administered_drugs.split(", ")
        : [],
      attributability: aiData.Attributability,
      drugEffect: aiData.Drug_effect,
      summary: aiData.Summary,
      identifiableHumanSubject: aiData.Identifiable_human_subject,
      textType: aiData.Text_type,
      authorPerspective: aiData.Author_perspective,
      confirmedPotentialICSR: aiData.Confirmed_potential_ICSR,
      icsrClassification: aiData.ICSR_classification,
      substanceGroup: aiData.Substance_group,
      vancouverCitation: aiData.Vancouver_citation,
      leadAuthor: aiData.Lead_author,
      serious: aiData.Serious,
      testSubject: aiData.Test_subject,
      aoiDrugEffect: aiData.AOI_drug_effect,
      approvedIndication: aiData.Approved_indication,
      aoiClassification: aiData.AOI_classification,
      justification: aiData.Justification,
      clientName: aiData.Client_name,
    });
  }
}

module.exports = Study;
