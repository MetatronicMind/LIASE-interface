const cosmosService = require('./cosmosService');
const reportGeneratorService = require('./reportGeneratorService');
const googleDriveService = require('./googleDriveService');
const emailSenderService = require('./emailSenderService');
const ArchivalConfig = require('../models/ArchivalConfig');
const ArchivalRecord = require('../models/ArchivalRecord');
const AuditLog = require('../models/AuditLog');
const fs = require('fs').promises;

/**
 * ArchivalService
 * Main service for archiving studies
 */
class ArchivalService {
  constructor() {
    this.activeArchivalOperations = new Map();
  }

  /**
   * Archive a single study
   */
  async archiveStudy(studyId, organizationId, userId, options = {}) {
    const operationId = `${studyId}_${Date.now()}`;
    
    console.log(`\n🗄️ Starting archival process for study: ${studyId}`);
    console.log(`Operation ID: ${operationId}`);

    // Prevent duplicate operations
    if (this.activeArchivalOperations.has(studyId)) {
      throw new Error('Archival operation already in progress for this study');
    }

    this.activeArchivalOperations.set(studyId, operationId);

    try {
      // Get archival configuration
      const config = await this.getArchivalConfig(organizationId);
      if (!config || !config.isEnabled) {
        throw new Error('Archival is not enabled for this organization');
      }

      // Get study data
      const study = await this._getStudy(studyId, organizationId);
      if (!study) {
        throw new Error('Study not found');
      }

      // Create archival record
      const record = new ArchivalRecord({
        organizationId,
        studyId: study.id,
        studyTitle: study.title,
        initiatedBy: userId
      });

      await cosmosService.createItem('Archives', record.toJSON());
      record.addLog('archival_started', 'success', { studyId, userId });

      // Step 1: Generate PDF
      if (config.fileGeneration.generatePDF) {
        await this._generatePDF(study, config, record);
      }

      // Step 2: Generate CSV
      if (config.fileGeneration.generateCSV) {
        await this._generateCSV(study, config, record);
      }

      // Step 3: Upload to Google Drive (optional - will warn if it fails)
      if (config.googleDrive.enabled) {
        try {
          await this._uploadToGoogleDrive(config, record);
        } catch (error) {
          // Log the error but don't fail the entire archival process
          console.warn('⚠️ Google Drive upload failed, continuing without it:', error.message);
          record.addWarning('Google Drive upload failed', { error: error.message });
          record.addLog('google_drive_upload_failed', 'warning', { error: error.message });
          await cosmosService.updateItem('Archives', record.id, record.toJSON());
        }
      }

      // Step 4: Send email notification
      if (config.emailNotification.enabled && config.emailNotification.notifyOnArchival) {
        await this._sendEmailNotification(study, config, record, organizationId);
      }

      // Step 5: Database cleanup
      if (config.dataRetention.deleteFromCosmosDB) {
        await this._performDatabaseCleanup(study, config, record, userId);
      }

      // Mark record as completed
      record.markCompleted(true);
      record.addLog('archival_completed', 'success', { duration: record.totalDuration });
      await cosmosService.updateItem('Archives', record.id, record.toJSON());

      // Update config statistics
      const configObj = new ArchivalConfig(config);
      configObj.updateStats(true);
      await cosmosService.updateItem('Settings', configObj.id, configObj.toJSON());

      // Create audit log
      await this._createAuditLog(organizationId, userId, 'study_archived', {
        studyId,
        recordId: record.id,
        duration: record.totalDuration
      });

      console.log(`✅ Archival completed successfully for study: ${studyId}`);
      console.log(`   Duration: ${record.totalDuration}ms`);
      console.log(`   Success Rate: ${record.getSuccessRate()}%\n`);

      return {
        success: true,
        record: record.toJSON()
      };

    } catch (error) {
      console.error(`❌ Archival failed for study ${studyId}:`, error);

      // Update config statistics
      const config = await this.getArchivalConfig(organizationId);
      if (config) {
        const configObj = new ArchivalConfig(config);
        configObj.updateStats(false, error.message);
        await cosmosService.updateItem('Settings', configObj.id, configObj.toJSON());
      }

      // Send failure notification
      if (config?.emailNotification?.enabled && config.emailNotification.notifyOnFailure) {
        await this._sendFailureNotification(studyId, organizationId, error.message, config);
      }

      throw error;

    } finally {
      this.activeArchivalOperations.delete(studyId);
    }
  }

  /**
   * Archive multiple studies in batch
   */
  async archiveBatch(studyIds, organizationId, userId) {
    console.log(`\n🗄️ Starting batch archival for ${studyIds.length} studies`);

    const config = await this.getArchivalConfig(organizationId);
    if (!config || !config.isEnabled) {
      throw new Error('Archival is not enabled for this organization');
    }

    const results = {
      total: studyIds.length,
      successful: [],
      failed: [],
      errors: []
    };

    const batchSize = config.performance.batchSize;
    const maxConcurrent = config.performance.maxConcurrent;

    // Process in batches
    for (let i = 0; i < studyIds.length; i += batchSize) {
      const batch = studyIds.slice(i, i + batchSize);
      console.log(`\n📦 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(studyIds.length / batchSize)}`);

      // Process batch with concurrency limit
      const promises = [];
      for (let j = 0; j < batch.length; j += maxConcurrent) {
        const concurrent = batch.slice(j, j + maxConcurrent);
        
        const concurrentResults = await Promise.allSettled(
          concurrent.map(studyId => this.archiveStudy(studyId, organizationId, userId))
        );

        concurrentResults.forEach((result, index) => {
          const studyId = concurrent[index];
          if (result.status === 'fulfilled') {
            results.successful.push(studyId);
          } else {
            results.failed.push(studyId);
            results.errors.push({ studyId, error: result.reason.message });
          }
        });
      }

      // Small delay between batches
      if (i + batchSize < studyIds.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log(`\n✅ Batch archival completed`);
    console.log(`   Successful: ${results.successful.length}/${results.total}`);
    console.log(`   Failed: ${results.failed.length}/${results.total}\n`);

    return results;
  }

  /**
   * Auto-archive eligible studies
   */
  async autoArchiveStudies(organizationId, userId) {
    console.log(`\n🤖 Running auto-archival for organization: ${organizationId}`);

    const config = await this.getArchivalConfig(organizationId);
    if (!config || !config.isEnabled || !config.autoArchiveEnabled) {
      console.log('Auto-archival is not enabled');
      return { success: false, message: 'Auto-archival is not enabled' };
    }

    // Find eligible studies
    const eligibleStudies = await this._findEligibleStudies(organizationId, config);
    
    if (eligibleStudies.length === 0) {
      console.log('No eligible studies found for archival');
      return { success: true, message: 'No eligible studies found', archived: 0 };
    }

    console.log(`Found ${eligibleStudies.length} eligible studies`);

    // Archive in batch
    const studyIds = eligibleStudies.map(s => s.id);
    const results = await this.archiveBatch(studyIds, organizationId, userId);

    return {
      success: true,
      ...results
    };
  }

  /**
   * Get or create archival configuration
   */
  async getArchivalConfig(organizationId) {
    const query = `
      SELECT * FROM c 
      WHERE c.organizationId = @organizationId 
      AND c.type_doc = 'archival_config'
    `;

    const results = await cosmosService.queryItems('Settings', query, [
      { name: '@organizationId', value: organizationId }
    ]);

    return results[0] || null;
  }

  /**
   * Create or update archival configuration
   */
  async saveArchivalConfig(organizationId, configData, userId) {
    const existing = await this.getArchivalConfig(organizationId);

    let config;
    if (existing) {
      config = new ArchivalConfig({ ...existing, ...configData, updatedAt: new Date().toISOString() });
    } else {
      config = new ArchivalConfig({ ...configData, organizationId, createdBy: userId });
    }

    const validation = config.validate();
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    const result = existing
      ? await cosmosService.updateItem('Settings', config.id, config.toJSON())
      : await cosmosService.createItem('Settings', config.toJSON());

    await this._createAuditLog(organizationId, userId, 'archival_config_updated', {
      configId: config.id,
      changes: configData
    });

    return result;
  }

  /**
   * Test Google Drive connection
   */
  async testGoogleDriveConnection(organizationId, configData) {
    const tempConfig = new ArchivalConfig({ organizationId, googleDrive: configData });
    return await googleDriveService.testConnection(tempConfig);
  }

  /**
   * Get archival records
   */
  async getArchivalRecords(organizationId, filters = {}, page = 1, limit = 50) {
    const { status, startDate, endDate, studyId } = filters;

    let conditions = [
      'c.organizationId = @organizationId',
      "c.type_doc = 'archival_record'"
    ];

    const parameters = [
      { name: '@organizationId', value: organizationId }
    ];

    if (status) {
      conditions.push('c.status = @status');
      parameters.push({ name: '@status', value: status });
    }

    if (startDate) {
      conditions.push('c.initiatedAt >= @startDate');
      parameters.push({ name: '@startDate', value: startDate });
    }

    if (endDate) {
      conditions.push('c.initiatedAt <= @endDate');
      parameters.push({ name: '@endDate', value: endDate });
    }

    if (studyId) {
      conditions.push('c.studyId = @studyId');
      parameters.push({ name: '@studyId', value: studyId });
    }

    const offset = (page - 1) * limit;
    const query = `
      SELECT * FROM c 
      WHERE ${conditions.join(' AND ')}
      ORDER BY c.initiatedAt DESC
      OFFSET ${offset} LIMIT ${limit}
    `;

    const results = await cosmosService.queryItems('Archives', query, parameters);

    // Get total count
    const countQuery = `
      SELECT VALUE COUNT(1) FROM c 
      WHERE ${conditions.join(' AND ')}
    `;
    const countResult = await cosmosService.queryItems('Archives', countQuery, parameters);

    return {
      records: results,
      pagination: {
        page,
        limit,
        total: countResult[0] || 0,
        pages: Math.ceil((countResult[0] || 0) / limit)
      }
    };
  }

  // ==================== PRIVATE METHODS ====================

  async _generatePDF(study, config, record) {
    console.log('📄 Generating PDF...');
    record.addLog('pdf_generation_started', 'in_progress');

    try {
      const result = await reportGeneratorService.generatePDF(study, config);
      
      if (result.success) {
        record.updateFileGeneration('pdf', {
          generated: true,
          fileName: result.fileName,
          filePath: result.filePath,
          fileSize: result.fileSize
        });
        record.addLog('pdf_generation_completed', 'success', result);
        console.log(`✅ PDF generated: ${result.fileName}`);
      } else {
        throw new Error(result.error);
      }

      const recordData = record.toJSON();
      console.log('🔍 Updating Archives with record:', { id: recordData.id, organizationId: recordData.organizationId });
      await cosmosService.updateItem('Archives', recordData.id, recordData);

    } catch (error) {
      record.updateFileGeneration('pdf', {
        generated: false,
        error: error.message
      });
      record.addError('PDF generation failed', { error: error.message });
      record.addLog('pdf_generation_failed', 'failed', { error: error.message });
      const recordData = record.toJSON();
      console.log('🔍 Updating Archives with error record:', { id: recordData.id, organizationId: recordData.organizationId });
      await cosmosService.updateItem('Archives', recordData.id, recordData);
      throw error;
    }
  }

  async _generateCSV(study, config, record) {
    console.log('📊 Generating CSV...');
    record.addLog('csv_generation_started', 'in_progress');

    try {
      const result = await reportGeneratorService.generateCSV(study, config);
      
      if (result.success) {
        record.updateFileGeneration('csv', {
          generated: true,
          fileName: result.fileName,
          filePath: result.filePath,
          fileSize: result.fileSize
        });
        record.addLog('csv_generation_completed', 'success', result);
        console.log(`✅ CSV generated: ${result.fileName}`);
      } else {
        throw new Error(result.error);
      }

      await cosmosService.updateItem('Archives', record.id, record.toJSON());

    } catch (error) {
      record.updateFileGeneration('csv', {
        generated: false,
        error: error.message
      });
      record.addError('CSV generation failed', { error: error.message });
      record.addLog('csv_generation_failed', 'failed', { error: error.message });
      await cosmosService.updateItem('Archives', record.id, record.toJSON());
      throw error;
    }
  }

  async _uploadToGoogleDrive(config, record) {
    console.log('☁️ Uploading to Google Drive...');
    record.addLog('google_drive_upload_started', 'in_progress');

    try {
      const filesToUpload = [];
      
      if (record.files.pdf.generated) {
        filesToUpload.push({
          filePath: record.files.pdf.filePath,
          fileName: record.files.pdf.fileName
        });
      }

      if (record.files.csv.generated) {
        filesToUpload.push({
          filePath: record.files.csv.filePath,
          fileName: record.files.csv.fileName
        });
      }

      if (filesToUpload.length === 0) {
        throw new Error('No files to upload');
      }

      const uploadResults = await googleDriveService.uploadMultipleFiles(filesToUpload, config, {
        description: `Archived study: ${record.studyTitle}`
      });

      // Update record with Google Drive info
      let allSuccess = true;
      for (const result of uploadResults) {
        if (result.fileName === record.files.pdf.fileName) {
          record.files.pdf.googleDriveId = result.fileId;
          record.files.pdf.googleDriveUrl = result.webViewLink;
        } else if (result.fileName === record.files.csv.fileName) {
          record.files.csv.googleDriveId = result.fileId;
          record.files.csv.googleDriveUrl = result.webViewLink;
        }
        
        if (!result.success) allSuccess = false;
      }

      if (allSuccess) {
        record.updateGoogleDrive({
          uploaded: true,
          folderId: config.googleDrive.folderId
        });
        record.addLog('google_drive_upload_completed', 'success', { filesUploaded: uploadResults.length });
        console.log(`✅ Uploaded ${uploadResults.length} files to Google Drive`);
      } else {
        throw new Error('Some files failed to upload');
      }

      await cosmosService.updateItem('Archives', record.id, record.toJSON());

    } catch (error) {
      record.updateGoogleDrive({
        uploaded: false,
        error: error.message
      });
      record.addError('Google Drive upload failed', { error: error.message });
      record.addLog('google_drive_upload_failed', 'failed', { error: error.message });
      await cosmosService.updateItem('Archives', record.id, record.toJSON());
      throw error;
    }
  }

  async _sendEmailNotification(study, config, record, organizationId) {
    console.log('📧 Sending email notification...');
    record.addLog('email_notification_started', 'in_progress');

    try {
      const attachments = [];

      // Attach files if configured
      if (config.emailNotification.includeAttachments) {
        if (record.files.pdf.generated) {
          attachments.push({
            filename: record.files.pdf.fileName,
            path: record.files.pdf.filePath
          });
        }

        if (record.files.csv.generated) {
          attachments.push({
            filename: record.files.csv.fileName,
            path: record.files.csv.filePath
          });
        }
      }

      // Build email content
      const emailData = {
        to: config.emailNotification.adminEmails,
        subject: `Study Archived: ${study.title}`,
        bodyPlain: this._generateEmailBodyPlain(study, record, config),
        bodyHtml: this._generateEmailBodyHtml(study, record, config),
        attachments
      };

      const result = await emailSenderService.sendArchivalNotification(
        organizationId,
        emailData,
        config.emailNotification.smtpConfigId
      );

      record.updateEmail({
        sent: true,
        recipients: config.emailNotification.adminEmails,
        messageId: result.messageId
      });
      record.addLog('email_notification_sent', 'success', { messageId: result.messageId });
      console.log(`✅ Email notification sent to ${config.emailNotification.adminEmails.length} recipients`);

      await cosmosService.updateItem('Archives', record.id, record.toJSON());

    } catch (error) {
      record.updateEmail({
        sent: false,
        error: error.message
      });
      record.addError('Email notification failed', { error: error.message });
      record.addLog('email_notification_failed', 'failed', { error: error.message });
      await cosmosService.updateItem('Archives', record.id, record.toJSON());
      
      // Don't throw - email failure shouldn't stop archival
      console.error('⚠️ Email notification failed but continuing:', error);
    }
  }

  async _performDatabaseCleanup(study, config, record, userId) {
    console.log('🗑️ Performing database cleanup...');
    record.addLog('database_cleanup_started', 'in_progress');

    try {
      // Create backup if configured
      if (config.dataRetention.createBackupBeforeDelete) {
        const { v4: uuidv4 } = require('uuid');
        const backup = {
          ...study,
          id: `study_backup_${uuidv4()}`, // Generate unique ID for backup
          type_doc: 'study_backup',
          originalStudyId: study.id,
          archivedAt: new Date().toISOString(),
          archivedBy: userId,
          archivalRecordId: record.id
        };

        await cosmosService.createItem('Archives', backup);
        record.cleanup.backupCreated = true;
        console.log(`✅ Created backup for study ${study.id}`);
      }

      // Delete from Studies container
      if (config.dataRetention.deleteFromCosmosDB) {
        try {
          // studies container uses organizationId as partition key, not id
          await cosmosService.deleteItem('studies', study.id, study.organizationId);
          record.cleanup.deletedFromCosmosDB = true;
          console.log(`✅ Deleted study ${study.id} from database`);
        } catch (error) {
          // If already deleted or not found, log warning but don't fail
          if (error.code === 404 || error.message?.includes('Not Found')) {
            console.warn(`⚠️ Study ${study.id} not found in database (may have been already deleted)`);
            record.addWarning('Study not found for deletion', { studyId: study.id });
          } else {
            throw error; // Re-throw other errors
          }
        }
      }

      record.updateCleanup({
        executed: true,
        deletedFromCosmosDB: config.dataRetention.deleteFromCosmosDB,
        backupCreated: config.dataRetention.createBackupBeforeDelete
      });
      record.addLog('database_cleanup_completed', 'success');
      console.log('✅ Database cleanup completed');

      await cosmosService.updateItem('Archives', record.id, record.toJSON());

      // Cleanup temp files
      const tempFiles = [];
      if (record.files.pdf.filePath) tempFiles.push(record.files.pdf.filePath);
      if (record.files.csv.filePath) tempFiles.push(record.files.csv.filePath);
      
      if (tempFiles.length > 0) {
        await reportGeneratorService.cleanupTempFiles(tempFiles);
      }

    } catch (error) {
      record.updateCleanup({
        executed: false,
        error: error.message
      });
      record.addError('Database cleanup failed', { error: error.message });
      record.addLog('database_cleanup_failed', 'failed', { error: error.message });
      await cosmosService.updateItem('Archives', record.id, record.toJSON());
      throw error;
    }
  }

  async _getStudy(studyId, organizationId) {
    console.log(`🔍 Looking for study with ID/PMID: ${studyId}, Organization: ${organizationId}`);
    
    const query = `
      SELECT * FROM c 
      WHERE (c.id = @studyId OR c.pmid = @studyId)
      AND c.organizationId = @organizationId
    `;

    const results = await cosmosService.queryItems('studies', query, [
      { name: '@studyId', value: studyId },
      { name: '@organizationId', value: organizationId }
    ]);

    console.log(`📊 Query returned ${results.length} results`);
    if (results.length > 0) {
      console.log(`✅ Found study: ${results[0].title || results[0].id}`);
    }

    return results[0] || null;
  }

  async _findEligibleStudies(organizationId, config) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - config.archiveAfterDays);

    const statusConditions = config.archiveScope.studyStatuses
      .map((_, i) => `@status${i}`)
      .join(', ');

    const query = `
      SELECT * FROM c 
      WHERE c.organizationId = @organizationId
      AND c.status IN (${statusConditions})
      AND (c.completedAt <= @cutoffDate OR c.updatedAt <= @cutoffDate)
    `;

    const parameters = [
      { name: '@organizationId', value: organizationId },
      { name: '@cutoffDate', value: cutoffDate.toISOString() },
      ...config.archiveScope.studyStatuses.map((status, i) => ({
        name: `@status${i}`,
        value: status
      }))
    ];

    return await cosmosService.queryItems('studies', query, parameters);
  }

  _generateEmailBodyPlain(study, record, config) {
    return `
Study Archival Notification

Study: ${study.title}
Study ID: ${study.id}
Status: Archived Successfully

Archival Details:
- PDF Generated: ${record.files.pdf.generated ? 'Yes' : 'No'}
- CSV Generated: ${record.files.csv.generated ? 'Yes' : 'No'}
- Uploaded to Google Drive: ${record.googleDrive.uploaded ? 'Yes' : 'No'}
- Database Cleanup: ${record.cleanup.executed ? 'Yes' : 'No'}

${record.googleDrive.uploaded ? `
Google Drive Links:
${record.files.pdf.googleDriveUrl ? `- PDF: ${record.files.pdf.googleDriveUrl}` : ''}
${record.files.csv.googleDriveUrl ? `- CSV: ${record.files.csv.googleDriveUrl}` : ''}
` : ''}

Duration: ${record.totalDuration}ms
Timestamp: ${new Date().toISOString()}

This is an automated notification from LIASE System.
    `.trim();
  }

  _generateEmailBodyHtml(study, record, config) {
    return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #2c3e50; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background: #f8f9fa; }
    .status-box { background: white; border-left: 4px solid #27ae60; padding: 15px; margin: 15px 0; }
    .info-row { padding: 8px 0; border-bottom: 1px solid #ddd; }
    .label { font-weight: bold; color: #555; }
    .link { color: #3498db; text-decoration: none; }
    .footer { text-align: center; padding: 20px; color: #777; font-size: 12px; }
    .success { color: #27ae60; font-weight: bold; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🗄️ Study Archived Successfully</h1>
    </div>
    <div class="content">
      <div class="status-box">
        <h2>${study.title}</h2>
        <p><span class="label">Study ID:</span> ${study.id}</p>
        <p><span class="label">Status:</span> <span class="success">Archived</span></p>
      </div>

      <h3>Archival Details</h3>
      <div class="info-row">
        <span class="label">PDF Generated:</span> ${record.files.pdf.generated ? '✅ Yes' : '❌ No'}
      </div>
      <div class="info-row">
        <span class="label">CSV Generated:</span> ${record.files.csv.generated ? '✅ Yes' : '❌ No'}
      </div>
      <div class="info-row">
        <span class="label">Uploaded to Google Drive:</span> ${record.googleDrive.uploaded ? '✅ Yes' : '❌ No'}
      </div>
      <div class="info-row">
        <span class="label">Database Cleanup:</span> ${record.cleanup.executed ? '✅ Yes' : '❌ No'}
      </div>

      ${record.googleDrive.uploaded ? `
      <h3>Google Drive Links</h3>
      ${record.files.pdf.googleDriveUrl ? `<p>📄 <a href="${record.files.pdf.googleDriveUrl}" class="link">View PDF Report</a></p>` : ''}
      ${record.files.csv.googleDriveUrl ? `<p>📊 <a href="${record.files.csv.googleDriveUrl}" class="link">View CSV Data</a></p>` : ''}
      ` : ''}

      <div class="info-row">
        <span class="label">Duration:</span> ${record.totalDuration}ms
      </div>
      <div class="info-row">
        <span class="label">Timestamp:</span> ${new Date().toISOString()}
      </div>
    </div>
    <div class="footer">
      <p>This is an automated notification from LIASE System</p>
    </div>
  </div>
</body>
</html>
    `.trim();
  }

  async _sendFailureNotification(studyId, organizationId, errorMessage, config) {
    try {
      const emailData = {
        to: config.emailNotification.adminEmails,
        subject: `Archival Failed: Study ${studyId}`,
        bodyPlain: `Archival process failed for study ${studyId}.\n\nError: ${errorMessage}\n\nTimestamp: ${new Date().toISOString()}`,
        bodyHtml: `
          <h2>❌ Archival Failed</h2>
          <p><strong>Study ID:</strong> ${studyId}</p>
          <p><strong>Error:</strong> ${errorMessage}</p>
          <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
        `,
        attachments: []
      };

      await emailSenderService.sendArchivalNotification(
        organizationId,
        emailData,
        config.emailNotification.smtpConfigId
      );
    } catch (error) {
      console.error('Failed to send failure notification:', error);
    }
  }

  async _createAuditLog(organizationId, userId, action, details) {
    try {
      const auditLog = new AuditLog({
        organizationId,
        userId,
        action,
        entityType: 'archival',
        details
      });

      await cosmosService.createItem('audit-logs', auditLog.toJSON());
    } catch (error) {
      console.error('Failed to create audit log:', error);
    }
  }
}

module.exports = new ArchivalService();
