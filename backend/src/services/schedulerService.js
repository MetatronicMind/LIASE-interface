const cron = require('node-cron');
const cronParser = require('cron-parser');
const cosmosService = require('./cosmosService');
const ScheduledJob = require('../models/ScheduledJob');
const notificationManagementService = require('./notificationManagementService');
const emailSenderService = require('./emailSenderService');
const AuditLog = require('../models/AuditLog');

/**
 * SchedulerService
 * Manages scheduled jobs and cron tasks
 */
class SchedulerService {
  constructor() {
    this.containerName = 'ScheduledJobs';
    this.activeJobs = new Map(); // Map of jobId -> cron task
    this.initialized = false;
  }

  /**
   * Initialize scheduler - load and schedule all active jobs
   */
  async initialize() {
    if (this.initialized) return;

    console.log('Initializing scheduler service...');

    try {
      // Get all active jobs
      const query = `
        SELECT * FROM c 
        WHERE c.type_doc = 'scheduled_job'
        AND c.isActive = true
      `;

      const jobs = await cosmosService.queryItems(this.containerName, query, []);

      // Schedule each job
      for (const job of jobs) {
        await this._scheduleJob(job);
      }

      // Start cleanup job (runs daily at 2 AM)
      this._scheduleCleanupJob();

      this.initialized = true;
      console.log(`Scheduler initialized with ${jobs.length} active jobs`);
    } catch (error) {
      console.error('Failed to initialize scheduler:', error);
    }
  }

  /**
   * Create a new scheduled job
   */
  async createScheduledJob(jobData, userId) {
    const job = new ScheduledJob({
      ...jobData,
      createdBy: userId
    });

    const validation = job.validate();
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    // Calculate next run time
    this._calculateNextRun(job);

    const result = await cosmosService.createItem(
      this.containerName,
      job.toJSON()
    );

    // Schedule the job
    if (job.isActive) {
      await this._scheduleJob(result);
    }

    await this._createAuditLog(
      job.organizationId,
      userId,
      'scheduled_job_created',
      { jobId: job.id, jobName: job.name }
    );

    return result;
  }

  /**
   * Get scheduled job by ID
   */
  async getScheduledJobById(jobId, organizationId) {
    const query = `
      SELECT * FROM c 
      WHERE c.id = @jobId 
      AND c.organizationId = @organizationId
      AND c.type_doc = 'scheduled_job'
    `;

    const parameters = [
      { name: '@jobId', value: jobId },
      { name: '@organizationId', value: organizationId }
    ];

    const results = await cosmosService.queryItems(
      this.containerName,
      query,
      parameters
    );

    return results[0] || null;
  }

  /**
   * Get all scheduled jobs
   */
  async getScheduledJobs(organizationId, filters = {}) {
    const { jobType, isActive, status } = filters;

    let conditions = [
      'c.organizationId = @organizationId',
      "c.type_doc = 'scheduled_job'"
    ];

    const parameters = [
      { name: '@organizationId', value: organizationId }
    ];

    if (jobType) {
      conditions.push('c.jobType = @jobType');
      parameters.push({ name: '@jobType', value: jobType });
    }

    if (isActive !== undefined) {
      conditions.push('c.isActive = @isActive');
      parameters.push({ name: '@isActive', value: isActive });
    }

    if (status) {
      conditions.push('c.status = @status');
      parameters.push({ name: '@status', value: status });
    }

    const query = `
      SELECT * FROM c 
      WHERE ${conditions.join(' AND ')}
      ORDER BY c.nextRunAt ASC
    `;

    return await cosmosService.queryItems(this.containerName, query, parameters);
  }

  /**
   * Update scheduled job
   */
  async updateScheduledJob(jobId, organizationId, updates, userId) {
    const job = await this.getScheduledJobById(jobId, organizationId);
    
    if (!job) {
      throw new Error('Scheduled job not found');
    }

    const jobObj = new ScheduledJob({ ...job, ...updates });
    jobObj.updatedAt = new Date().toISOString();

    // Recalculate next run if schedule changed
    if (updates.cronExpression || updates.intervalMs || updates.scheduleType) {
      this._calculateNextRun(jobObj);
    }

    const validation = jobObj.validate();
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    const updated = await cosmosService.updateItem(
      this.containerName,
      jobObj.toJSON()
    );

    // Reschedule if active
    if (updated.isActive) {
      this._unscheduleJob(jobId);
      await this._scheduleJob(updated);
    } else {
      this._unscheduleJob(jobId);
    }

    await this._createAuditLog(
      organizationId,
      userId,
      'scheduled_job_updated',
      { jobId, updates: Object.keys(updates) }
    );

    return updated;
  }

  /**
   * Delete scheduled job
   */
  async deleteScheduledJob(jobId, organizationId, userId) {
    const job = await this.getScheduledJobById(jobId, organizationId);
    
    if (!job) {
      throw new Error('Scheduled job not found');
    }

    // Unschedule if active
    this._unscheduleJob(jobId);

    await cosmosService.deleteItem(this.containerName, jobId);

    await this._createAuditLog(
      organizationId,
      userId,
      'scheduled_job_deleted',
      { jobId, jobName: job.name }
    );

    return { success: true, message: 'Scheduled job deleted' };
  }

  /**
   * Execute a job manually
   */
  async executeJob(jobId, organizationId, userId) {
    const job = await this.getScheduledJobById(jobId, organizationId);
    
    if (!job) {
      throw new Error('Scheduled job not found');
    }

    const result = await this._executeJob(job);

    await this._createAuditLog(
      organizationId,
      userId,
      'scheduled_job_executed_manually',
      { jobId, jobName: job.name, result }
    );

    return result;
  }

  /**
   * Pause/Resume a job
   */
  async toggleJobStatus(jobId, organizationId, isActive, userId) {
    return await this.updateScheduledJob(
      jobId,
      organizationId,
      { isActive },
      userId
    );
  }

  /**
   * Get job execution history
   */
  async getJobHistory(jobId, organizationId, limit = 50) {
    const job = await this.getScheduledJobById(jobId, organizationId);
    
    if (!job) {
      throw new Error('Scheduled job not found');
    }

    // Return last N executions from executionHistory
    const history = job.executionHistory || [];
    return history.slice(-limit).reverse();
  }

  /**
   * Internal: Schedule a job with node-cron
   */
  async _scheduleJob(job) {
    const jobObj = new ScheduledJob(job);

    if (!jobObj.isActive) return;

    // Clear existing schedule if any
    this._unscheduleJob(jobObj.id);

    let cronTask;

    switch (jobObj.scheduleType) {
      case 'cron':
        if (!cron.validate(jobObj.cronExpression)) {
          console.error(`Invalid cron expression for job ${jobObj.id}: ${jobObj.cronExpression}`);
          return;
        }
        
        cronTask = cron.schedule(jobObj.cronExpression, async () => {
          await this._executeJob(job);
        }, {
          scheduled: true,
          timezone: jobObj.timezone
        });
        break;

      case 'interval':
        // Use setInterval for interval-based jobs
        const intervalId = setInterval(async () => {
          await this._executeJob(job);
        }, jobObj.intervalMs);
        
        // Wrap in object with stop method to match cron interface
        cronTask = {
          stop: () => clearInterval(intervalId)
        };
        break;

      case 'once':
        // Schedule one-time execution
        const delay = new Date(jobObj.scheduledAt).getTime() - Date.now();
        if (delay > 0) {
          const timeoutId = setTimeout(async () => {
            await this._executeJob(job);
          }, delay);
          
          cronTask = {
            stop: () => clearTimeout(timeoutId)
          };
        }
        break;
    }

    if (cronTask) {
      this.activeJobs.set(jobObj.id, cronTask);
    }
  }

  /**
   * Internal: Unschedule a job
   */
  _unscheduleJob(jobId) {
    const cronTask = this.activeJobs.get(jobId);
    if (cronTask) {
      cronTask.stop();
      this.activeJobs.delete(jobId);
    }
  }

  /**
   * Internal: Execute a job
   */
  async _executeJob(job) {
    const jobObj = new ScheduledJob(job);
    const startTime = Date.now();

    console.log(`Executing job: ${jobObj.name} (${jobObj.id})`);

    jobObj.markAsStarted();
    await cosmosService.updateItem(this.containerName, jobObj.toJSON());

    try {
      let result;

      // Execute based on job type
      switch (jobObj.jobType) {
        case 'report':
          result = await this._executeReportJob(jobObj);
          break;

        case 'notification':
          result = await this._executeNotificationJob(jobObj);
          break;

        case 'cleanup':
          result = await this._executeCleanupJob(jobObj);
          break;

        case 'backup':
          result = await this._executeBackupJob(jobObj);
          break;

        case 'custom':
          result = await this._executeCustomJob(jobObj);
          break;

        default:
          throw new Error(`Unknown job type: ${jobObj.jobType}`);
      }

      const duration = Date.now() - startTime;
      jobObj.markAsCompleted(duration, result);

      console.log(`Job completed: ${jobObj.name} in ${duration}ms`);

    } catch (error) {
      const duration = Date.now() - startTime;
      jobObj.markAsFailed(duration, error.message);

      console.error(`Job failed: ${jobObj.name}`, error);
    }

    // Save updated job status
    await cosmosService.updateItem(this.containerName, jobObj.toJSON());

    return jobObj.toJSON();
  }

  /**
   * Execute report generation job
   */
  async _executeReportJob(job) {
    const { reportType, recipients } = job.payload;

    // Generate report based on type
    let reportData;
    switch (reportType) {
      case 'daily_summary':
        reportData = await this._generateDailySummaryReport(job.organizationId);
        break;
      case 'weekly_summary':
        reportData = await this._generateWeeklySummaryReport(job.organizationId);
        break;
      case 'monthly_summary':
        reportData = await this._generateMonthlySummaryReport(job.organizationId);
        break;
      default:
        throw new Error(`Unknown report type: ${reportType}`);
    }

    // Send report via email
    await emailSenderService.queueEmail({
      organizationId: job.organizationId,
      to: recipients,
      subject: reportData.subject,
      bodyHtml: reportData.html,
      bodyPlain: reportData.text,
      priority: 'normal',
      metadata: {
        reportType,
        generatedBy: 'scheduler',
        jobId: job.id
      }
    });

    return { reportGenerated: true, recipientCount: recipients.length };
  }

  /**
   * Execute notification job
   */
  async _executeNotificationJob(job) {
    const { notificationRuleId } = job.payload;

    // Trigger notification rule
    const notification = await notificationManagementService.triggerNotificationRule(
      notificationRuleId,
      job.organizationId,
      job.createdBy,
      { triggeredBy: 'scheduler', jobId: job.id }
    );

    return { notificationCreated: true, notificationId: notification.id };
  }

  /**
   * Execute cleanup job
   */
  async _executeCleanupJob(job) {
    const { entityType, retentionDays } = job.payload;

    let deletedCount = 0;

    switch (entityType) {
      case 'notifications':
        const notifResult = await notificationManagementService.cleanupOldNotifications(
          job.organizationId,
          retentionDays
        );
        deletedCount = notifResult.deletedCount;
        break;

      case 'audit_logs':
        deletedCount = await this._cleanupOldAuditLogs(
          job.organizationId,
          retentionDays
        );
        break;

      case 'email_logs':
        deletedCount = await this._cleanupOldEmailLogs(
          job.organizationId,
          retentionDays
        );
        break;

      default:
        throw new Error(`Unknown entity type for cleanup: ${entityType}`);
    }

    return { cleaned: true, deletedCount };
  }

  /**
   * Execute backup job
   */
  async _executeBackupJob(job) {
    // Placeholder for backup functionality
    // In production, implement actual backup logic
    return { backupCreated: true, timestamp: new Date().toISOString() };
  }

  /**
   * Execute custom job
   */
  async _executeCustomJob(job) {
    // Placeholder for custom job logic
    // Can be extended based on requirements
    return { executed: true, payload: job.payload };
  }

  /**
   * Generate daily summary report
   */
  async _generateDailySummaryReport(organizationId) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get statistics for yesterday
    const stats = await this._getOrganizationStats(
      organizationId,
      yesterday.toISOString(),
      today.toISOString()
    );

    const html = `
      <html>
        <body>
          <h1>Daily Summary Report</h1>
          <p><strong>Date:</strong> ${yesterday.toLocaleDateString()}</p>
          <h2>Activity Summary</h2>
          <ul>
            <li>New Studies: ${stats.newStudies}</li>
            <li>Updated Studies: ${stats.updatedStudies}</li>
            <li>Notifications Sent: ${stats.notificationsSent}</li>
            <li>Active Users: ${stats.activeUsers}</li>
          </ul>
        </body>
      </html>
    `;

    const text = `
      Daily Summary Report
      Date: ${yesterday.toLocaleDateString()}
      
      Activity Summary:
      - New Studies: ${stats.newStudies}
      - Updated Studies: ${stats.updatedStudies}
      - Notifications Sent: ${stats.notificationsSent}
      - Active Users: ${stats.activeUsers}
    `;

    return {
      subject: `Daily Summary Report - ${yesterday.toLocaleDateString()}`,
      html,
      text
    };
  }

  /**
   * Generate weekly summary report
   */
  async _generateWeeklySummaryReport(organizationId) {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const stats = await this._getOrganizationStats(
      organizationId,
      oneWeekAgo.toISOString(),
      new Date().toISOString()
    );

    const html = `
      <html>
        <body>
          <h1>Weekly Summary Report</h1>
          <p><strong>Period:</strong> ${oneWeekAgo.toLocaleDateString()} - ${new Date().toLocaleDateString()}</p>
          <h2>Activity Summary</h2>
          <ul>
            <li>New Studies: ${stats.newStudies}</li>
            <li>Updated Studies: ${stats.updatedStudies}</li>
            <li>Notifications Sent: ${stats.notificationsSent}</li>
            <li>Active Users: ${stats.activeUsers}</li>
          </ul>
        </body>
      </html>
    `;

    const text = `Weekly Summary Report\nPeriod: ${oneWeekAgo.toLocaleDateString()} - ${new Date().toLocaleDateString()}\n\nNew Studies: ${stats.newStudies}\nUpdated Studies: ${stats.updatedStudies}\nNotifications Sent: ${stats.notificationsSent}\nActive Users: ${stats.activeUsers}`;

    return {
      subject: `Weekly Summary Report - Week of ${oneWeekAgo.toLocaleDateString()}`,
      html,
      text
    };
  }

  /**
   * Generate monthly summary report
   */
  async _generateMonthlySummaryReport(organizationId) {
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    const stats = await this._getOrganizationStats(
      organizationId,
      oneMonthAgo.toISOString(),
      new Date().toISOString()
    );

    const html = `
      <html>
        <body>
          <h1>Monthly Summary Report</h1>
          <p><strong>Period:</strong> ${oneMonthAgo.toLocaleDateString()} - ${new Date().toLocaleDateString()}</p>
          <h2>Activity Summary</h2>
          <ul>
            <li>New Studies: ${stats.newStudies}</li>
            <li>Updated Studies: ${stats.updatedStudies}</li>
            <li>Notifications Sent: ${stats.notificationsSent}</li>
            <li>Active Users: ${stats.activeUsers}</li>
          </ul>
        </body>
      </html>
    `;

    const text = `Monthly Summary Report\nPeriod: ${oneMonthAgo.toLocaleDateString()} - ${new Date().toLocaleDateString()}\n\nNew Studies: ${stats.newStudies}\nUpdated Studies: ${stats.updatedStudies}\nNotifications Sent: ${stats.notificationsSent}\nActive Users: ${stats.activeUsers}`;

    return {
      subject: `Monthly Summary Report - ${oneMonthAgo.toLocaleString('default', { month: 'long', year: 'numeric' })}`,
      html,
      text
    };
  }

  /**
   * Get organization statistics for a date range
   */
  async _getOrganizationStats(organizationId, startDate, endDate) {
    // This would query various containers for statistics
    // Simplified version for now
    return {
      newStudies: 0,
      updatedStudies: 0,
      notificationsSent: 0,
      activeUsers: 0
    };
  }

  /**
   * Calculate next run time for a job
   */
  _calculateNextRun(job) {
    try {
      switch (job.scheduleType) {
        case 'cron':
          if (cron.validate(job.cronExpression)) {
            const interval = cronParser.parseExpression(job.cronExpression, {
              currentDate: new Date(),
              tz: job.timezone
            });
            job.nextRunAt = interval.next().toISOString();
          }
          break;

        case 'interval':
          const nextRun = new Date(Date.now() + job.intervalMs);
          job.nextRunAt = nextRun.toISOString();
          break;

        case 'once':
          job.nextRunAt = job.scheduledAt;
          break;
      }
    } catch (error) {
      console.error('Failed to calculate next run time:', error);
    }
  }

  /**
   * Schedule automatic cleanup job
   */
  _scheduleCleanupJob() {
    // Run cleanup daily at 2 AM
    cron.schedule('0 2 * * *', async () => {
      console.log('Running automatic cleanup...');
      
      const query = `
        SELECT DISTINCT c.organizationId 
        FROM c 
        WHERE c.type_doc = 'scheduled_job'
        AND c.isActive = true
      `;

      const results = await cosmosService.queryItems(this.containerName, query, []);
      
      for (const result of results) {
        try {
          // Clean up old job executions
          await this._cleanupOldJobExecutions(result.organizationId, 30);
        } catch (error) {
          console.error(`Cleanup failed for organization ${result.organizationId}:`, error);
        }
      }
    });
  }

  /**
   * Clean up old job execution history
   */
  async _cleanupOldJobExecutions(organizationId, retentionDays) {
    // Keep only last N days of execution history in each job
    const jobs = await this.getScheduledJobs(organizationId, {});
    
    for (const job of jobs) {
      const jobObj = new ScheduledJob(job);
      
      // Keep only executions from last N days
      if (jobObj.executionHistory.length > 0) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
        
        jobObj.executionHistory = jobObj.executionHistory.filter(exec => {
          return new Date(exec.executedAt) >= cutoffDate;
        });
        
        await cosmosService.updateItem(this.containerName, jobObj.toJSON());
      }
    }
  }

  /**
   * Clean up old audit logs
   */
  async _cleanupOldAuditLogs(organizationId, retentionDays) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const query = `
      SELECT c.id FROM c 
      WHERE c.organizationId = @organizationId
      AND c.type = 'audit_log'
      AND c.createdAt < @cutoffDate
    `;

    const parameters = [
      { name: '@organizationId', value: organizationId },
      { name: '@cutoffDate', value: cutoffDate.toISOString() }
    ];

    const logs = await cosmosService.queryItems('AuditLogs', query, parameters);

    for (const log of logs) {
      await cosmosService.deleteItem('AuditLogs', log.id);
    }

    return logs.length;
  }

  /**
   * Clean up old email logs
   */
  async _cleanupOldEmailLogs(organizationId, retentionDays) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const query = `
      SELECT c.id FROM c 
      WHERE c.organizationId = @organizationId
      AND c.type_doc = 'email_log'
      AND c.createdAt < @cutoffDate
      AND c.status IN ('sent', 'delivered', 'failed')
    `;

    const parameters = [
      { name: '@organizationId', value: organizationId },
      { name: '@cutoffDate', value: cutoffDate.toISOString() }
    ];

    const logs = await cosmosService.queryItems('Emails', query, parameters);

    for (const log of logs) {
      await cosmosService.deleteItem('Emails', log.id);
    }

    return logs.length;
  }

  /**
   * Create audit log entry
   */
  async _createAuditLog(organizationId, userId, action, details) {
    try {
      const auditLog = new AuditLog({
        organizationId,
        userId,
        action,
        entityType: 'scheduled_job',
        details
      });

      await cosmosService.createItem('AuditLogs', auditLog.toJSON());
    } catch (error) {
      console.error('Failed to create audit log:', error);
    }
  }
}

module.exports = new SchedulerService();
