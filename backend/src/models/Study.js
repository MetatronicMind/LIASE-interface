const { v4: uuidv4 } = require('uuid');

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
    status = 'Pending Review',
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
    qaApprovalStatus = 'pending', // pending, approved, rejected
    qaApprovedBy = null,
    qaApprovedAt = null,
    qaRejectedBy = null,
    qaRejectedAt = null,
    qaComments = null,
    // R3 Form data fields
    r3FormData = null, // JSON object to store R3 form data
    r3FormStatus = 'not_started', // not_started, in_progress, completed
    r3FormCompletedBy = null,
    r3FormCompletedAt = null,
    // Medical Examiner fields
    medicalReviewStatus = 'not_started', // not_started, in_progress, completed, revoked
    medicalReviewedBy = null,
    medicalReviewedAt = null,
    fieldComments = [], // Array of field-level comments
    revokedBy = null,
    revokedAt = null,
    revocationReason = null
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
      severity: '',
      causality: '',
      expectedness: '',
      outcomes: [],
      recommendations: '',
      ...reviewDetails
    };
    this.comments = comments;
    this.attachments = attachments;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.createdBy = createdBy;
    this.reviewedBy = reviewedBy;
    this.approvedBy = approvedBy;
    this.approvedAt = approvedAt;
    this.type = 'study';
    
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
    
    // QA workflow fields
    this.qaApprovalStatus = qaApprovalStatus;
    this.qaApprovedBy = qaApprovedBy;
    this.qaApprovedAt = qaApprovedAt;
    this.qaRejectedBy = qaRejectedBy;
    this.qaRejectedAt = qaRejectedAt;
    this.qaComments = qaComments;
    
    // R3 Form data
    this.r3FormData = r3FormData;
    this.r3FormStatus = r3FormStatus;
    this.r3FormCompletedBy = r3FormCompletedBy;
    this.r3FormCompletedAt = r3FormCompletedAt;
    
    // Medical Examiner fields
    this.medicalReviewStatus = medicalReviewStatus;
    this.medicalReviewedBy = medicalReviewedBy;
    this.medicalReviewedAt = medicalReviewedAt;
    this.fieldComments = fieldComments || [];
    this.revokedBy = revokedBy;
    this.revokedAt = revokedAt;
    this.revocationReason = revocationReason;
  }

  addComment(comment) {
    const newComment = {
      id: uuidv4(),
      userId: comment.userId,
      userName: comment.userName,
      comment: comment.text,
      timestamp: new Date().toISOString(),
      type: comment.type || 'review'
    };
    this.comments.push(newComment);
    this.updatedAt = new Date().toISOString();
    return newComment;
  }

  updateStatus(newStatus, userId, userName) {
    this.status = newStatus;
    this.updatedAt = new Date().toISOString();
    
    if (newStatus === 'Under Review') {
      this.reviewedBy = userId;
    } else if (newStatus === 'Approved') {
      this.approvedBy = userId;
      this.approvedAt = new Date().toISOString();
    }

    // Add status change comment
    this.addComment({
      userId,
      userName,
      text: `Status changed to ${newStatus}`,
      type: 'system'
    });
  }

  updateReviewDetails(details) {
    this.reviewDetails = {
      ...this.reviewDetails,
      ...details
    };
    this.updatedAt = new Date().toISOString();
  }

  updateUserTag(tag, userId, userName) {
    const validTags = ['ICSR', 'AOI', 'No Case'];
    if (!validTags.includes(tag)) {
      throw new Error(`Invalid tag. Must be one of: ${validTags.join(', ')}`);
    }
    
    const previousTag = this.userTag;
    this.userTag = tag;
    this.qaApprovalStatus = 'pending'; // Reset QA approval when tag changes
    this.updatedAt = new Date().toISOString();
    
    // Add tag change comment
    this.addComment({
      userId,
      userName,
      text: `Manual classification updated from "${previousTag || 'None'}" to "${tag}". Awaiting QA approval.`,
      type: 'system'
    });
  }

  // QA Workflow Methods
  approveClassification(userId, userName, comments = null) {
    if (this.qaApprovalStatus === 'approved') {
      throw new Error('Classification is already approved');
    }
    
    this.qaApprovalStatus = 'approved';
    this.qaApprovedBy = userId;
    this.qaApprovedAt = new Date().toISOString();
    this.qaComments = comments;
    this.updatedAt = new Date().toISOString();
    
    // Add approval comment
    this.addComment({
      userId,
      userName,
      text: `Classification "${this.userTag}" approved by QA${comments ? '. Comments: ' + comments : ''}`,
      type: 'qa_approval'
    });
  }

  rejectClassification(userId, userName, reason) {
    if (!reason) {
      throw new Error('Rejection reason is required');
    }
    
    this.qaApprovalStatus = 'rejected';
    this.qaRejectedBy = userId;
    this.qaRejectedAt = new Date().toISOString();
    this.qaComments = reason;
    this.updatedAt = new Date().toISOString();
    
    // Add rejection comment
    this.addComment({
      userId,
      userName,
      text: `Classification "${this.userTag}" rejected by QA. Reason: ${reason}`,
      type: 'qa_rejection'
    });
  }

  // Medical Examiner Methods
  addFieldComment(fieldKey, comment, userId, userName) {
    const { v4: uuidv4 } = require('uuid');
    const fieldComment = {
      id: uuidv4(),
      fieldKey,
      comment,
      userId,
      userName,
      createdAt: new Date().toISOString()
    };
    
    this.fieldComments.push(fieldComment);
    this.updatedAt = new Date().toISOString();
    
    // Add general comment about field comment
    this.addComment({
      userId,
      userName,
      text: `Added comment to field ${fieldKey}: ${comment}`,
      type: 'field_comment'
    });
    
    return fieldComment;
  }

  updateFieldValue(fieldKey, newValue, userId, userName) {
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
      text: `Updated field ${fieldKey} from "${oldValue || 'empty'}" to "${newValue}"`,
      type: 'field_edit'
    });
  }

  revokeStudy(userId, userName, reason) {
    if (!reason) {
      throw new Error('Revocation reason is required');
    }
    
    this.medicalReviewStatus = 'revoked';
    this.revokedBy = userId;
    this.revokedAt = new Date().toISOString();
    this.revocationReason = reason;
    this.r3FormStatus = 'in_progress'; // Reset to allow data entry to fix
    this.updatedAt = new Date().toISOString();
    
    // Add revocation comment
    this.addComment({
      userId,
      userName,
      text: `Study revoked by Medical Examiner. Reason: ${reason}. Returned to Data Entry for corrections.`,
      type: 'revocation'
    });
  }

  completeMedicalReview(userId, userName) {
    this.medicalReviewStatus = 'completed';
    this.medicalReviewedBy = userId;
    this.medicalReviewedAt = new Date().toISOString();
    this.updatedAt = new Date().toISOString();
    
    // Add completion comment
    this.addComment({
      userId,
      userName,
      text: 'Medical review completed. Study approved for final processing.',
      type: 'medical_approval'
    });
  }

  updateR3FormData(formData, userId, userName) {
    this.r3FormData = {
      ...this.r3FormData,
      ...formData
    };
    this.r3FormStatus = 'in_progress';
    this.updatedAt = new Date().toISOString();
    
    // Add form update comment
    this.addComment({
      userId,
      userName,
      text: 'R3 form data updated',
      type: 'system'
    });
  }

  completeR3Form(userId, userName) {
    this.r3FormStatus = 'completed';
    this.r3FormCompletedBy = userId;
    this.r3FormCompletedAt = new Date().toISOString();
    this.updatedAt = new Date().toISOString();
    
    // Auto-tag as ICSR if not already tagged
    if (!this.userTag || this.userTag !== 'ICSR') {
      const previousTag = this.userTag;
      this.userTag = 'ICSR';
      
      // Add tag change comment
      this.addComment({
        userId,
        userName,
        text: `Study automatically classified as ICSR due to R3 form completion (previous: "${previousTag || 'None'}")`,
        type: 'system'
      });
    }
    
    // Add completion comment
    this.addComment({
      userId,
      userName,
      text: 'R3 form completed',
      type: 'system'
    });
  }

  getEffectiveClassification() {
    // User tag overrides AI classification
    if (this.userTag) {
      return this.userTag;
    }
    
    // Fall back to AI classifications
    if (this.icsrClassification) {
      return 'ICSR';
    }
    if (this.aoiClassification) {
      return 'AOI';
    }
    
    return 'No Case';
  }

  addAttachment(attachment) {
    const newAttachment = {
      id: uuidv4(),
      fileName: attachment.fileName,
      fileSize: attachment.fileSize,
      fileType: attachment.fileType,
      uploadedBy: attachment.uploadedBy,
      uploadedAt: new Date().toISOString(),
      url: attachment.url
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
      
      // QA workflow fields
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
      
      // Medical Examiner fields
      medicalReviewStatus: this.medicalReviewStatus,
      medicalReviewedBy: this.medicalReviewedBy,
      medicalReviewedAt: this.medicalReviewedAt,
      fieldComments: this.fieldComments,
      revokedBy: this.revokedBy,
      revokedAt: this.revokedAt,
      revocationReason: this.revocationReason
    };
  }

  static validate(data) {
    const errors = [];

    if (!data.pmid || !/^\d+$/.test(data.pmid)) {
      errors.push('Valid PMID (numeric) is required');
    }

    if (!data.title || data.title.trim().length < 10) {
      errors.push('Title must be at least 10 characters long');
    }

    if (!data.journal || data.journal.trim().length < 3) {
      errors.push('Journal name must be at least 3 characters long');
    }

    if (!data.publicationDate) {
      errors.push('Publication date is required');
    } else {
      const pubDate = new Date(data.publicationDate);
      if (isNaN(pubDate.getTime())) {
        errors.push('Publication date must be a valid date');
      }
    }

    if (!data.abstract || data.abstract.trim().length < 50) {
      errors.push('Abstract must be at least 50 characters long');
    }

    if (!data.drugName || data.drugName.trim().length < 2) {
      errors.push('Drug name must be at least 2 characters long');
    }

    if (!data.adverseEvent || data.adverseEvent.trim().length < 5) {
      errors.push('Adverse event description must be at least 5 characters long');
    }

    if (data.status && !['Pending Review', 'Under Review', 'Approved', 'Rejected'].includes(data.status)) {
      errors.push('Status must be Pending Review, Under Review, Approved, or Rejected');
    }

    if (!data.organizationId) {
      errors.push('Organization ID is required');
    }

    return errors;
  }

  static getSearchableFields() {
    return ['title', 'authors', 'journal', 'drugName', 'adverseEvent', 'pmid'];
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
    // Ensure originalDrug has default values if not provided or missing properties
    const safeDrug = originalDrug || {};
    const safeAiData = aiData || {};
    
    return new Study({
      organizationId,
      createdBy,
      pmid: safeAiData.PMID || safeDrug.pmid || 'Unknown PMID',
      title: safeDrug.title || safeAiData.Title || safeAiData.title || 'Title not available',
      drugName: safeAiData.Drugname || safeAiData.drugName || safeDrug.drugName || 'Drug name not available',
      adverseEvent: safeAiData.Adverse_event || 'Not specified',
      abstract: aiData.Summary || '',
      publicationDate: aiData.pubdate,
      journal: aiData.Vancouver_citation ? aiData.Vancouver_citation.split('.').pop() : '',
      authors: aiData.Lead_author ? [aiData.Lead_author] : [],
      
      // AI Inference specific fields
      aiInferenceData: aiData,
      doi: aiData.DOI,
      specialCase: aiData.special_case,
      countryOfFirstAuthor: aiData.Country_of_first_author,
      countryOfOccurrence: aiData.Country_of_occurrence,
      patientDetails: aiData.Patient_details,
      keyEvents: aiData.Key_events,
      relevantDates: aiData.Relevant_dates,
      administeredDrugs: aiData.Administered_drugs ? aiData.Administered_drugs.split(', ') : [],
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
      sponsor: aiData.Client_name // Using Client_name as sponsor
    });
  }
}

module.exports = Study;
