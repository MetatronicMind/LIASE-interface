const { v4: uuidv4 } = require('uuid');

/**
 * ArchivalRecord Model
 * Tracks individual archival operations
 */
class ArchivalRecord {
  constructor({
    id = null,
    organizationId,
    studyId,
    studyTitle,
    drugName,
    
    // Archival Status
    status = 'pending', // pending, processing, completed, failed, partial
    initiatedBy, // user ID
    initiatedAt = new Date().toISOString(),
    completedAt = null,
    
    // Generated Files
    files = {
      pdf: {
        generated: false,
        fileName: null,
        filePath: null,
        fileSize: 0,
        googleDriveId: null,
        googleDriveUrl: null,
        generatedAt: null,
        error: null
      },
      csv: {
        generated: false,
        fileName: null,
        filePath: null,
        fileSize: 0,
        googleDriveId: null,
        googleDriveUrl: null,
        generatedAt: null,
        error: null
      }
    },
    
    // Google Drive Upload
    googleDrive = {
      uploaded: false,
      folderId: null,
      folderUrl: null,
      uploadedAt: null,
      error: null
    },
    
    // Email Notification
    email = {
      sent: false,
      recipients: [],
      sentAt: null,
      messageId: null,
      error: null
    },
    
    // Database Cleanup
    cleanup = {
      executed: false,
      deletedFromCosmosDB: false,
      backupCreated: false,
      cleanedAt: null,
      error: null
    },
    
    // Operation Details
    operationLog = [],
    totalDuration = 0, // in milliseconds
    retryCount = 0,
    errors = [],
    warnings = [],
    
    metadata = {}
  }) {
    this.id = id || `archival_record_${uuidv4()}`;
    this.organizationId = organizationId;
    this.studyId = studyId;
    this.studyTitle = studyTitle;
    this.drugName = drugName;
    
    this.status = status;
    this.initiatedBy = initiatedBy;
    this.initiatedAt = initiatedAt;
    this.completedAt = completedAt;
    
    this.files = files;
    this.googleDrive = googleDrive;
    this.email = email;
    this.cleanup = cleanup;
    
    this.operationLog = operationLog;
    this.totalDuration = totalDuration;
    this.retryCount = retryCount;
    this.errors = errors;
    this.warnings = warnings;
    
    this.metadata = metadata;
    this.type_doc = 'archival_record';
  }

  // Add log entry
  addLog(action, status, details = {}) {
    this.operationLog.push({
      timestamp: new Date().toISOString(),
      action,
      status,
      details
    });
  }

  // Add error
  addError(message, details = {}) {
    this.errors.push({
      timestamp: new Date().toISOString(),
      message,
      details
    });
  }

  // Add warning
  addWarning(message, details = {}) {
    this.warnings.push({
      timestamp: new Date().toISOString(),
      message,
      details
    });
  }

  // Mark as completed
  markCompleted(success = true) {
    this.completedAt = new Date().toISOString();
    this.status = success ? 'completed' : 'failed';
    
    // Calculate total duration
    const start = new Date(this.initiatedAt).getTime();
    const end = new Date(this.completedAt).getTime();
    this.totalDuration = end - start;
  }

  // Update file generation status
  updateFileGeneration(fileType, data) {
    if (this.files[fileType]) {
      this.files[fileType] = {
        ...this.files[fileType],
        ...data,
        generatedAt: data.generated ? new Date().toISOString() : null
      };
    }
  }

  // Update Google Drive status
  updateGoogleDrive(data) {
    this.googleDrive = {
      ...this.googleDrive,
      ...data,
      uploadedAt: data.uploaded ? new Date().toISOString() : null
    };
  }

  // Update email status
  updateEmail(data) {
    this.email = {
      ...this.email,
      ...data,
      sentAt: data.sent ? new Date().toISOString() : null
    };
  }

  // Update cleanup status
  updateCleanup(data) {
    this.cleanup = {
      ...this.cleanup,
      ...data,
      cleanedAt: data.executed ? new Date().toISOString() : null
    };
  }

  // Check if archival is complete
  isComplete() {
    return this.status === 'completed' || this.status === 'failed';
  }

  // Get success rate
  getSuccessRate() {
    const tasks = [
      this.files.pdf.generated,
      this.files.csv.generated,
      this.googleDrive.uploaded,
      this.email.sent,
      this.cleanup.executed
    ];
    
    const successCount = tasks.filter(t => t === true).length;
    return (successCount / tasks.length) * 100;
  }

  toJSON() {
    return {
      id: this.id,
      organizationId: this.organizationId,
      studyId: this.studyId,
      studyTitle: this.studyTitle,
      drugName: this.drugName,
      
      status: this.status,
      initiatedBy: this.initiatedBy,
      initiatedAt: this.initiatedAt,
      completedAt: this.completedAt,
      
      files: this.files,
      googleDrive: this.googleDrive,
      email: this.email,
      cleanup: this.cleanup,
      
      operationLog: this.operationLog,
      totalDuration: this.totalDuration,
      retryCount: this.retryCount,
      errors: this.errors,
      warnings: this.warnings,
      
      metadata: this.metadata,
      type_doc: this.type_doc
    };
  }
}

module.exports = ArchivalRecord;
