const { v4: uuidv4 } = require('uuid');

/**
 * ArchivalConfig Model
 * Stores archival configuration per organization
 */
class ArchivalConfig {
  constructor({
    id = null,
    organizationId,
    isEnabled = false,
    
    // Archival Triggers
    autoArchiveEnabled = false,
    archiveAfterDays = 90, // Days after study completion/final report
    manualArchiveOnly = false,
    
    // Google Drive Settings
    googleDrive = {
      enabled: false,
      serviceAccountEmail: null,
      serviceAccountKey: null, // Base64 encoded JSON key
      folderId: null, // Target folder ID in Google Drive
      folderPath: null, // Display path for UI
      createSubfolders: true, // Create org/date subfolders
      subfolderPattern: 'YYYY/MM/DD' // Pattern for subfolder creation
    },
    
    // Email Notification Settings
    emailNotification = {
      enabled: true,
      notifyOnArchival: true,
      notifyOnFailure: true,
      adminEmails: [], // List of admin emails to notify
      includeAttachments: true, // Attach PDF/CSV to email
      smtpConfigId: null, // Reference to SMTP config
      emailTemplateId: null // Reference to email template (optional)
    },
    
    // File Generation Settings
    fileGeneration = {
      generatePDF: true,
      generateCSV: true,
      includeAuditTrail: true,
      includeAttachments: false, // Include study attachments in archive
      pdfSettings: {
        includeCharts: true,
        includeImages: true,
        pageSize: 'A4',
        orientation: 'portrait',
        includeWatermark: false,
        watermarkText: 'ARCHIVED'
      },
      csvSettings: {
        includeHeaders: true,
        delimiter: ',',
        encoding: 'utf-8',
        includeMetadata: true
      }
    },
    
    // Data Retention & Cleanup
    dataRetention = {
      deleteFromCosmosDB: false, // Delete study from CosmosDB after archival
      createBackupBeforeDelete: true,
      retainAuditLogs: true, // Keep audit logs even after deletion
      retainUserReferences: true // Keep user activity references
    },
    
    // Archive Scope
    archiveScope = {
      includeStudies: true,
      includeReports: true,
      includeComments: true,
      includeHistory: true,
      includeAttachments: true,
      studyStatuses: ['Completed', 'Final Report Completed'], // Which statuses trigger archival
      includeArchivedData: false // Include already archived metadata
    },
    
    // Performance & Limits
    performance = {
      batchSize: 10, // Number of studies to archive in one batch
      maxConcurrent: 3, // Max concurrent archival operations
      retryAttempts: 3,
      retryDelayMs: 5000,
      timeoutMs: 300000 // 5 minutes per study
    },
    
    // Metadata
    lastArchivedAt = null,
    totalArchived = 0,
    totalFailed = 0,
    lastStatus = null,
    lastError = null,
    
    createdBy,
    createdAt = new Date().toISOString(),
    updatedAt = new Date().toISOString(),
    metadata = {}
  }) {
    this.id = id || `archival_config_${uuidv4()}`;
    this.organizationId = organizationId;
    this.isEnabled = isEnabled;
    
    this.autoArchiveEnabled = autoArchiveEnabled;
    this.archiveAfterDays = archiveAfterDays;
    this.manualArchiveOnly = manualArchiveOnly;
    
    this.googleDrive = googleDrive;
    this.emailNotification = emailNotification;
    this.fileGeneration = fileGeneration;
    this.dataRetention = dataRetention;
    this.archiveScope = archiveScope;
    this.performance = performance;
    
    this.lastArchivedAt = lastArchivedAt;
    this.totalArchived = totalArchived;
    this.totalFailed = totalFailed;
    this.lastStatus = lastStatus;
    this.lastError = lastError;
    
    this.createdBy = createdBy;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.metadata = metadata;
    this.type_doc = 'archival_config';
  }

  // Update statistics
  updateStats(success, error = null) {
    if (success) {
      this.totalArchived += 1;
      this.lastStatus = 'success';
      this.lastError = null;
    } else {
      this.totalFailed += 1;
      this.lastStatus = 'failed';
      this.lastError = error;
    }
    this.lastArchivedAt = new Date().toISOString();
    this.updatedAt = new Date().toISOString();
  }

  // Check if study should be archived based on config
  shouldArchiveStudy(study) {
    if (!this.isEnabled) return false;
    
    // Check if study status matches archival criteria
    if (!this.archiveScope.studyStatuses.includes(study.status)) {
      return false;
    }
    
    // Check age requirement
    if (this.autoArchiveEnabled && this.archiveAfterDays > 0) {
      const studyDate = new Date(study.completedAt || study.updatedAt);
      const ageInDays = (Date.now() - studyDate.getTime()) / (1000 * 60 * 60 * 24);
      
      if (ageInDays < this.archiveAfterDays) {
        return false;
      }
    }
    
    return true;
  }

  // Get sanitized config (without sensitive data)
  getSanitized() {
    const config = this.toJSON();
    
    // Mask sensitive Google Drive credentials
    if (config.googleDrive.serviceAccountKey) {
      config.googleDrive.serviceAccountKey = '********';
    }
    
    return config;
  }

  toJSON() {
    return {
      id: this.id,
      organizationId: this.organizationId,
      isEnabled: this.isEnabled,
      
      autoArchiveEnabled: this.autoArchiveEnabled,
      archiveAfterDays: this.archiveAfterDays,
      manualArchiveOnly: this.manualArchiveOnly,
      
      googleDrive: this.googleDrive,
      emailNotification: this.emailNotification,
      fileGeneration: this.fileGeneration,
      dataRetention: this.dataRetention,
      archiveScope: this.archiveScope,
      performance: this.performance,
      
      lastArchivedAt: this.lastArchivedAt,
      totalArchived: this.totalArchived,
      totalFailed: this.totalFailed,
      lastStatus: this.lastStatus,
      lastError: this.lastError,
      
      createdBy: this.createdBy,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      metadata: this.metadata,
      type_doc: this.type_doc
    };
  }

  validate() {
    const errors = [];

    if (!this.organizationId) {
      errors.push('Organization ID is required');
    }

    if (this.archiveAfterDays < 0) {
      errors.push('Archive after days must be positive');
    }

    if (this.googleDrive.enabled) {
      if (!this.googleDrive.serviceAccountEmail) {
        errors.push('Google Drive service account email is required');
      }
      if (!this.googleDrive.serviceAccountKey) {
        errors.push('Google Drive service account key is required');
      }
      if (!this.googleDrive.folderId) {
        errors.push('Google Drive folder ID is required');
      }
    }

    if (this.emailNotification.enabled) {
      if (!this.emailNotification.adminEmails || this.emailNotification.adminEmails.length === 0) {
        errors.push('At least one admin email is required for notifications');
      }
      
      // Validate email formats
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      for (const email of this.emailNotification.adminEmails) {
        if (!emailRegex.test(email)) {
          errors.push(`Invalid email format: ${email}`);
        }
      }
    }

    if (this.performance.batchSize < 1 || this.performance.batchSize > 100) {
      errors.push('Batch size must be between 1 and 100');
    }

    if (this.performance.maxConcurrent < 1 || this.performance.maxConcurrent > 10) {
      errors.push('Max concurrent operations must be between 1 and 10');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

module.exports = ArchivalConfig;
