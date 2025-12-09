const cron = require('node-cron');
const dailyReportsService = require('./dailyReportsService');
const notificationTriggerService = require('./notificationTriggerService');
const notificationQueueService = require('./notificationQueueService');
const notificationManagementService = require('./notificationManagementService');
const cosmosService = require('./cosmosService');

/**
 * AzureSchedulerService
 * Integrates with Azure Scheduler for daily report generation and scheduled notifications
 * Uses node-cron for local scheduling
 */
class AzureSchedulerService {
  constructor() {
    this.scheduledJobs = new Map();
    this.isInitialized = false;
  }

  /**
   * Initialize the scheduler service
   */
  async initialize() {
    if (this.isInitialized) {
      console.log('Scheduler already initialized');
      return;
    }

    try {
      console.log('Initializing Azure Scheduler Service...');

      // Start notification queue processor
      notificationQueueService.start(10000); // Process every 10 seconds

      // Schedule default jobs
      await this._scheduleDefaultJobs();

      // Load and schedule notification rules
      await this._loadNotificationRules();

      this.isInitialized = true;
      console.log('✓ Scheduler Service initialized successfully');
    } catch (error) {
      console.error('Error initializing scheduler:', error);
      throw error;
    }
  }

  /**
   * Shutdown the scheduler
   */
  shutdown() {
    console.log('Shutting down scheduler...');
    
    // Stop notification queue
    notificationQueueService.stop();
    
    // Stop all scheduled jobs
    this.scheduledJobs.forEach((job, name) => {
      job.stop();
      console.log(`Stopped job: ${name}`);
    });
    
    this.scheduledJobs.clear();
    this.isInitialized = false;
    
    console.log('Scheduler shutdown complete');
  }

  /**
   * Schedule default system jobs
   */
  async _scheduleDefaultJobs() {
    // Daily report generation (9 AM every day)
    this.scheduleJob('daily_reports', '0 9 * * *', async () => {
      await this._generateDailyReports();
    });

    // Weekly reports (Monday 9 AM)
    this.scheduleJob('weekly_reports', '0 9 * * 1', async () => {
      await this._generateWeeklyReports();
    });

    // Cleanup old notifications (2 AM every day)
    this.scheduleJob('cleanup_notifications', '0 2 * * *', async () => {
      await this._cleanupOldNotifications();
    });

    // Process scheduled notifications (every 5 minutes)
    this.scheduleJob('process_scheduled', '*/5 * * * *', async () => {
      await this._processScheduledNotifications();
    });

    // Health check (every hour)
    this.scheduleJob('health_check', '0 * * * *', async () => {
      await this._performHealthCheck();
    });

    console.log('✓ Default jobs scheduled');
  }

  /**
   * Schedule a job using cron expression
   */
  scheduleJob(name, cronExpression, taskFunction) {
    try {
      // Stop existing job if any
      if (this.scheduledJobs.has(name)) {
        this.scheduledJobs.get(name).stop();
      }

      // Schedule new job
      const job = cron.schedule(cronExpression, async () => {
        console.log(`Running scheduled job: ${name}`);
        try {
          await taskFunction();
          console.log(`✓ Job ${name} completed successfully`);
        } catch (error) {
          console.error(`✗ Job ${name} failed:`, error);
          
          // Trigger system error event
          await notificationTriggerService.triggerEvent('job_failed', {
            job: { name, cronExpression },
            error: error.message,
            organizationId: 'system'
          });
        }
      }, {
        scheduled: true,
        timezone: 'UTC'
      });

      this.scheduledJobs.set(name, job);
      console.log(`✓ Scheduled job: ${name} (${cronExpression})`);

      return job;
    } catch (error) {
      console.error(`Error scheduling job ${name}:`, error);
      throw error;
    }
  }

  /**
   * Unschedule a job
   */
  unscheduleJob(name) {
    if (this.scheduledJobs.has(name)) {
      this.scheduledJobs.get(name).stop();
      this.scheduledJobs.delete(name);
      console.log(`Job ${name} unscheduled`);
      return true;
    }
    return false;
  }

  /**
   * Load notification rules and schedule them
   */
  async _loadNotificationRules() {
    try {
      // Get all active scheduled rules
      const query = `
        SELECT * FROM c 
        WHERE c.type_doc = 'notification_rule'
        AND c.isActive = true
        AND c.triggerType = 'scheduled'
      `;

      const rules = await cosmosService.queryItems('Notifications', query, []);
      
      console.log(`Loading ${rules.length} scheduled notification rules...`);

      for (const rule of rules) {
        await this._scheduleNotificationRule(rule);
      }

      console.log(`✓ Loaded ${rules.length} notification rules`);
    } catch (error) {
      console.error('Error loading notification rules:', error);
    }
  }

  /**
   * Schedule a notification rule
   */
  async _scheduleNotificationRule(rule) {
    try {
      let cronExpression;

      // Convert rule schedule to cron expression
      if (rule.cronExpression) {
        cronExpression = rule.cronExpression;
      } else {
        cronExpression = this._convertScheduleToCron(rule);
      }

      if (!cronExpression) {
        console.warn(`Cannot schedule rule ${rule.id}: invalid schedule configuration`);
        return;
      }

      const jobName = `rule_${rule.id}`;

      this.scheduleJob(jobName, cronExpression, async () => {
        await notificationManagementService.triggerNotificationRule(
          rule.id,
          rule.organizationId,
          'system',
          {}
        );
      });

      console.log(`✓ Scheduled rule: ${rule.name} (${cronExpression})`);
    } catch (error) {
      console.error(`Error scheduling rule ${rule.id}:`, error);
    }
  }

  /**
   * Convert rule schedule configuration to cron expression
   */
  _convertScheduleToCron(rule) {
    const [hours, minutes] = rule.scheduledTime.split(':').map(Number);

    switch (rule.scheduleType) {
      case 'daily':
        return `${minutes} ${hours} * * *`;
      
      case 'weekly':
        if (!rule.scheduledDays || rule.scheduledDays.length === 0) {
          return null;
        }
        const dayMap = {
          sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
          thursday: 4, friday: 5, saturday: 6
        };
        const days = rule.scheduledDays.map(d => dayMap[d.toLowerCase()]).join(',');
        return `${minutes} ${hours} * * ${days}`;
      
      case 'monthly':
        const dayOfMonth = rule.scheduledDays?.[0] || 1;
        return `${minutes} ${hours} ${dayOfMonth} * *`;
      
      case 'cron':
        return rule.cronExpression;
      
      default:
        return null;
    }
  }

  /**
   * Generate daily reports for all organizations
   */
  async _generateDailyReports() {
    try {
      const organizations = await this._getAllOrganizations();
      
      console.log(`Generating daily reports for ${organizations.length} organizations...`);

      for (const org of organizations) {
        try {
          // Get admin emails for this organization
          const recipients = await this._getAdminEmails(org.id);
          
          if (recipients.length === 0) {
            console.log(`No admin emails found for org ${org.id}, skipping report`);
            continue;
          }

          // Generate and send report
          await dailyReportsService.sendDailyReport(
            org.id,
            recipients,
            'daily_summary'
          );

          console.log(`✓ Daily report sent for org ${org.id}`);

          // Trigger event
          await notificationTriggerService.triggerEvent('report_generated', {
            report: { reportType: 'daily_summary' },
            organizationId: org.id
          });
        } catch (error) {
          console.error(`Error generating report for org ${org.id}:`, error);
          
          // Trigger error event
          await notificationTriggerService.triggerEvent('report_failed', {
            reportType: 'daily_summary',
            error: error.message,
            organizationId: org.id
          });
        }
      }

      console.log('✓ Daily report generation completed');
    } catch (error) {
      console.error('Error in daily reports job:', error);
    }
  }

  /**
   * Generate weekly reports
   */
  async _generateWeeklyReports() {
    try {
      const organizations = await this._getAllOrganizations();
      
      console.log(`Generating weekly reports for ${organizations.length} organizations...`);

      for (const org of organizations) {
        try {
          const recipients = await this._getAdminEmails(org.id);
          
          if (recipients.length === 0) {
            continue;
          }

          await dailyReportsService.sendDailyReport(
            org.id,
            recipients,
            'weekly_summary'
          );

          console.log(`✓ Weekly report sent for org ${org.id}`);
        } catch (error) {
          console.error(`Error generating weekly report for org ${org.id}:`, error);
        }
      }

      console.log('✓ Weekly report generation completed');
    } catch (error) {
      console.error('Error in weekly reports job:', error);
    }
  }

  /**
   * Cleanup old notifications
   */
  async _cleanupOldNotifications() {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 90); // 90 days ago

      const query = `
        SELECT c.id, c.organizationId FROM c 
        WHERE c.type_doc = 'notification'
        AND c.status IN ('delivered', 'failed')
        AND c.createdAt < @cutoffDate
      `;

      const parameters = [
        { name: '@cutoffDate', value: cutoffDate.toISOString() }
      ];

      const oldNotifications = await cosmosService.queryItems(
        'Notifications',
        query,
        parameters
      );

      console.log(`Cleaning up ${oldNotifications.length} old notifications...`);

      for (const notification of oldNotifications) {
        await cosmosService.deleteItem('Notifications', notification.id);
      }

      console.log(`✓ Cleaned up ${oldNotifications.length} notifications`);
    } catch (error) {
      console.error('Error cleaning up notifications:', error);
    }
  }

  /**
   * Process scheduled notifications
   */
  async _processScheduledNotifications() {
    try {
      const now = new Date().toISOString();

      const query = `
        SELECT * FROM c 
        WHERE c.type_doc = 'notification'
        AND c.status = 'pending'
        AND c.scheduleType = 'scheduled'
        AND c.scheduledAt <= @now
      `;

      const parameters = [
        { name: '@now', value: now }
      ];

      const dueNotifications = await cosmosService.queryItems(
        'Notifications',
        query,
        parameters
      );

      if (dueNotifications.length > 0) {
        console.log(`Processing ${dueNotifications.length} scheduled notifications...`);
        // The queue processor will pick these up automatically
      }
    } catch (error) {
      console.error('Error processing scheduled notifications:', error);
    }
  }

  /**
   * Perform system health check
   */
  async _performHealthCheck() {
    try {
      const organizations = await this._getAllOrganizations();
      
      for (const org of organizations) {
        const stats = await notificationQueueService.getQueueStats(org.id);
        
        // Alert if too many failed notifications
        if (stats.failed > 10) {
          await notificationTriggerService.triggerEvent('threshold_exceeded', {
            metric: 'failed_notifications',
            threshold: 10,
            currentValue: stats.failed,
            organizationId: org.id
          });
        }

        // Alert if queue is backing up
        if (stats.pending > 50) {
          await notificationTriggerService.triggerEvent('threshold_exceeded', {
            metric: 'pending_notifications',
            threshold: 50,
            currentValue: stats.pending,
            organizationId: org.id
          });
        }
      }
    } catch (error) {
      console.error('Error in health check:', error);
    }
  }

  /**
   * Get all organizations
   */
  async _getAllOrganizations() {
    try {
      const query = 'SELECT c.id, c.name FROM c WHERE c.type_doc = "organization"';
      return await cosmosService.queryItems('organizations', query, []);
    } catch (error) {
      console.error('Error fetching organizations:', error);
      return [];
    }
  }

  /**
   * Get admin emails for an organization
   */
  async _getAdminEmails(organizationId) {
    try {
      const query = `
        SELECT c.email FROM c 
        WHERE c.organizationId = @organizationId
        AND c.type_doc = 'user'
        AND (c.isAdmin = true OR c.isSuperAdmin = true)
      `;

      const parameters = [
        { name: '@organizationId', value: organizationId }
      ];

      const admins = await cosmosService.queryItems('users', query, parameters);
      return admins.map(a => a.email);
    } catch (error) {
      console.error(`Error fetching admin emails for org ${organizationId}:`, error);
      return [];
    }
  }

  /**
   * Get scheduled jobs status
   */
  getJobsStatus() {
    const status = [];
    
    this.scheduledJobs.forEach((job, name) => {
      status.push({
        name,
        running: job.getStatus() === 'running',
        nextRun: job.nextDate()?.toISOString()
      });
    });

    return {
      initialized: this.isInitialized,
      totalJobs: this.scheduledJobs.size,
      jobs: status
    };
  }
}

module.exports = new AzureSchedulerService();
