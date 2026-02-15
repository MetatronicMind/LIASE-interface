const notificationManagementService = require('./notificationManagementService');
const AuditLog = require('../models/AuditLog');
const cosmosService = require('./cosmosService');

/**
 * NotificationTriggerService
 * Handles event-based notification triggers
 */
class NotificationTriggerService {
  constructor() {
    this.eventHandlers = new Map();
    this._registerDefaultHandlers();
  }

  /**
   * Register default event handlers
   */
  _registerDefaultHandlers() {
    // User-related events
    this.registerHandler('user_created', this._handleUserCreated.bind(this));
    this.registerHandler('user_updated', this._handleUserUpdated.bind(this));
    this.registerHandler('user_deleted', this._handleUserDeleted.bind(this));
    
    // Study-related events
    this.registerHandler('study_created', this._handleStudyCreated.bind(this));
    this.registerHandler('study_completed', this._handleStudyCompleted.bind(this));
    this.registerHandler('study_assigned', this._handleStudyAssigned.bind(this));
    this.registerHandler('study_status_changed', this._handleStudyStatusChanged.bind(this));
    
    // Report-related events
    this.registerHandler('report_generated', this._handleReportGenerated.bind(this));
    this.registerHandler('report_failed', this._handleReportFailed.bind(this));
    
    // System events
    this.registerHandler('system_error', this._handleSystemError.bind(this));
    this.registerHandler('threshold_exceeded', this._handleThresholdExceeded.bind(this));
    this.registerHandler('job_completed', this._handleJobCompleted.bind(this));
    this.registerHandler('job_failed', this._handleJobFailed.bind(this));
  }

  /**
   * Register a custom event handler
   */
  registerHandler(eventType, handler) {
    this.eventHandlers.set(eventType, handler);
  }

  /**
   * Trigger a notification based on an event
   */
  async triggerEvent(eventType, eventData) {
    try {
      console.log(`Triggering notification event: ${eventType}`);

      // Get notification rules for this event type
      const rules = await this._getActiveRulesForEvent(
        eventData.organizationId,
        eventType
      );

      if (rules.length === 0) {
        console.log(`No active rules found for event: ${eventType}`);
        return { triggered: 0, notifications: [] };
      }

      const notifications = [];

      // Process each rule
      for (const rule of rules) {
        try {
          // Evaluate conditions
          if (!this._evaluateConditions(rule, eventData)) {
            console.log(`Rule ${rule.id} conditions not met`);
            continue;
          }

          // Execute custom handler if available
          const handler = this.eventHandlers.get(eventType);
          if (handler) {
            const notification = await handler(rule, eventData);
            if (notification) {
              notifications.push(notification);
            }
          } else {
            // Use default notification creation
            const notification = await this._createDefaultNotification(rule, eventData);
            notifications.push(notification);
          }

          // Mark rule as triggered
          await notificationManagementService.updateNotificationRule(
            rule.id,
            rule.organizationId,
            { lastTriggeredAt: new Date().toISOString() },
            'system'
          );
        } catch (error) {
          console.error(`Error processing rule ${rule.id}:`, error);
        }
      }

      // Create audit log
      await this._createAuditLog(
        eventData.organizationId,
        eventData.userId || 'system',
        'notification_event_triggered',
        {
          eventType,
          rulesTriggered: notifications.length,
          notificationIds: notifications.map(n => n.id)
        }
      );

      return {
        triggered: notifications.length,
        notifications
      };
    } catch (error) {
      console.error(`Error triggering event ${eventType}:`, error);
      throw error;
    }
  }

  /**
   * Handler: User Created
   */
  async _handleUserCreated(rule, eventData) {
    const { user, organizationId } = eventData;

    return await notificationManagementService.createNotification({
      organizationId,
      type: 'info',
      title: rule.notificationTemplate.title || 'New User Created',
      message: rule.notificationTemplate.message || 
        `A new user ${user.name} (${user.email}) has been added to the system.`,
      recipients: await this._getRecipients(rule, organizationId),
      channels: rule.notificationTemplate.channels,
      priority: rule.priority,
      metadata: {
        eventType: 'user_created',
        userId: user.id,
        userName: user.name,
        userEmail: user.email
      }
    }, 'system');
  }

  /**
   * Handler: User Updated
   */
  async _handleUserUpdated(rule, eventData) {
    const { user, changes, organizationId } = eventData;

    return await notificationManagementService.createNotification({
      organizationId,
      type: 'info',
      title: 'User Profile Updated',
      message: `User ${user.name} profile has been updated. Changes: ${Object.keys(changes).join(', ')}`,
      recipients: await this._getRecipients(rule, organizationId),
      channels: rule.notificationTemplate.channels,
      priority: rule.priority,
      metadata: {
        eventType: 'user_updated',
        userId: user.id,
        changes
      }
    }, 'system');
  }

  /**
   * Handler: User Deleted
   */
  async _handleUserDeleted(rule, eventData) {
    const { user, organizationId } = eventData;

    return await notificationManagementService.createNotification({
      organizationId,
      type: 'warning',
      title: 'User Account Deleted',
      message: `User ${user.name} (${user.email}) has been removed from the system.`,
      recipients: await this._getRecipients(rule, organizationId),
      channels: rule.notificationTemplate.channels,
      priority: 'high',
      metadata: {
        eventType: 'user_deleted',
        userId: user.id
      }
    }, 'system');
  }

  /**
   * Handler: Study Created
   */
  async _handleStudyCreated(rule, eventData) {
    const { study, organizationId } = eventData;

    return await notificationManagementService.createNotification({
      organizationId,
      type: 'success',
      title: 'New Study Created',
      message: `A new study has been created: ${study.title || study.pmid}`,
      recipients: await this._getRecipients(rule, organizationId),
      channels: rule.notificationTemplate.channels,
      priority: rule.priority,
      metadata: {
        eventType: 'study_created',
        studyId: study.id,
        studyTitle: study.title,
        pmid: study.pmid
      }
    }, 'system');
  }

  /**
   * Handler: Study Completed
   */
  async _handleStudyCompleted(rule, eventData) {
    const { study, organizationId, completedBy } = eventData;

    return await notificationManagementService.createNotification({
      organizationId,
      type: 'success',
      title: 'Study Completed',
      message: `Study ${study.title || study.pmid} has been completed by ${completedBy}.`,
      recipients: await this._getRecipients(rule, organizationId),
      channels: rule.notificationTemplate.channels,
      priority: rule.priority,
      metadata: {
        eventType: 'study_completed',
        studyId: study.id,
        completedBy,
        completedAt: new Date().toISOString()
      }
    }, 'system');
  }

  /**
   * Handler: Study Assigned
   */
  async _handleStudyAssigned(rule, eventData) {
    const { study, assignedTo, assignedBy, organizationId } = eventData;

    return await notificationManagementService.createNotification({
      organizationId,
      type: 'info',
      title: 'Study Assigned',
      message: `Study ${study.title || study.pmid} has been assigned to ${assignedTo.name}.`,
      recipients: [
        { email: assignedTo.email, name: assignedTo.name, userId: assignedTo.id },
        ...await this._getRecipients(rule, organizationId)
      ],
      channels: rule.notificationTemplate.channels,
      priority: rule.priority,
      metadata: {
        eventType: 'study_assigned',
        studyId: study.id,
        assignedToId: assignedTo.id,
        assignedById: assignedBy.id
      }
    }, 'system');
  }

  /**
   * Handler: Study Status Changed
   */
  async _handleStudyStatusChanged(rule, eventData) {
    const { study, oldStatus, newStatus, organizationId } = eventData;

    return await notificationManagementService.createNotification({
      organizationId,
      type: 'info',
      title: 'Study Status Changed',
      message: `Study ${study.title || study.pmid} status changed from ${oldStatus} to ${newStatus}.`,
      recipients: await this._getRecipients(rule, organizationId),
      channels: rule.notificationTemplate.channels,
      priority: rule.priority,
      metadata: {
        eventType: 'study_status_changed',
        studyId: study.id,
        oldStatus,
        newStatus
      }
    }, 'system');
  }

  /**
   * Handler: Report Generated
   */
  async _handleReportGenerated(rule, eventData) {
    const { report, organizationId } = eventData;

    return await notificationManagementService.createNotification({
      organizationId,
      type: 'success',
      title: 'Report Generated Successfully',
      message: `${report.reportType} report has been generated successfully.`,
      recipients: await this._getRecipients(rule, organizationId),
      channels: rule.notificationTemplate.channels,
      priority: rule.priority,
      metadata: {
        eventType: 'report_generated',
        reportId: report.id,
        reportType: report.reportType
      }
    }, 'system');
  }

  /**
   * Handler: Report Failed
   */
  async _handleReportFailed(rule, eventData) {
    const { reportType, error, organizationId } = eventData;

    return await notificationManagementService.createNotification({
      organizationId,
      type: 'error',
      title: 'Report Generation Failed',
      message: `Failed to generate ${reportType} report. Error: ${error}`,
      recipients: await this._getRecipients(rule, organizationId),
      channels: rule.notificationTemplate.channels,
      priority: 'high',
      metadata: {
        eventType: 'report_failed',
        reportType,
        error
      }
    }, 'system');
  }

  /**
   * Handler: System Error
   */
  async _handleSystemError(rule, eventData) {
    const { error, context, organizationId } = eventData;

    return await notificationManagementService.createNotification({
      organizationId,
      type: 'error',
      title: 'System Error Detected',
      message: `A system error has occurred: ${error.message}`,
      recipients: await this._getRecipients(rule, organizationId),
      channels: rule.notificationTemplate.channels,
      priority: 'urgent',
      metadata: {
        eventType: 'system_error',
        error: error.message,
        context
      }
    }, 'system');
  }

  /**
   * Handler: Threshold Exceeded
   */
  async _handleThresholdExceeded(rule, eventData) {
    const { metric, threshold, currentValue, organizationId } = eventData;

    return await notificationManagementService.createNotification({
      organizationId,
      type: 'warning',
      title: 'Threshold Exceeded',
      message: `${metric} has exceeded threshold. Current: ${currentValue}, Threshold: ${threshold}`,
      recipients: await this._getRecipients(rule, organizationId),
      channels: rule.notificationTemplate.channels,
      priority: 'high',
      metadata: {
        eventType: 'threshold_exceeded',
        metric,
        threshold,
        currentValue
      }
    }, 'system');
  }

  /**
   * Handler: Job Completed
   */
  async _handleJobCompleted(rule, eventData) {
    const { job, organizationId } = eventData;

    return await notificationManagementService.createNotification({
      organizationId,
      type: 'success',
      title: 'Scheduled Job Completed',
      message: `Job ${job.name} completed successfully.`,
      recipients: await this._getRecipients(rule, organizationId),
      channels: rule.notificationTemplate.channels,
      priority: rule.priority,
      metadata: {
        eventType: 'job_completed',
        jobId: job.id,
        jobName: job.name
      }
    }, 'system');
  }

  /**
   * Handler: Job Failed
   */
  async _handleJobFailed(rule, eventData) {
    const { job, error, organizationId } = eventData;

    return await notificationManagementService.createNotification({
      organizationId,
      type: 'error',
      title: 'Scheduled Job Failed',
      message: `Job ${job.name} failed. Error: ${error}`,
      recipients: await this._getRecipients(rule, organizationId),
      channels: rule.notificationTemplate.channels,
      priority: 'high',
      metadata: {
        eventType: 'job_failed',
        jobId: job.id,
        jobName: job.name,
        error
      }
    }, 'system');
  }

  /**
   * Get active rules for an event type
   */
  async _getActiveRulesForEvent(organizationId, eventType) {
    const query = `
      SELECT * FROM c 
      WHERE c.organizationId = @organizationId
      AND c.type_doc = 'notification_rule'
      AND c.isActive = true
      AND c.triggerType = 'event'
      AND c.eventType = @eventType
    `;

    const parameters = [
      { name: '@organizationId', value: organizationId },
      { name: '@eventType', value: eventType }
    ];

    return await cosmosService.queryItems('Notifications', query, parameters);
  }

  /**
   * Evaluate rule conditions
   */
  _evaluateConditions(rule, eventData) {
    if (!rule.conditions || rule.conditions.length === 0) {
      return true; // No conditions means always trigger
    }

    return rule.conditions.every(condition => {
      const { field, operator, value } = condition;
      const actualValue = this._getNestedValue(eventData, field);

      switch (operator) {
        case 'equals':
          return actualValue === value;
        case 'not_equals':
          return actualValue !== value;
        case 'greater_than':
          return actualValue > value;
        case 'less_than':
          return actualValue < value;
        case 'contains':
          return actualValue && String(actualValue).includes(value);
        case 'exists':
          return actualValue !== undefined && actualValue !== null;
        default:
          return false;
      }
    });
  }

  /**
   * Get nested value from object
   */
  _getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Get recipients based on rule configuration
   */
  async _getRecipients(rule, organizationId) {
    const recipients = [];

    const { recipientConfig } = rule;

    // Add users by role
    if (recipientConfig.roles && recipientConfig.roles.length > 0) {
      for (const roleId of recipientConfig.roles) {
        const users = await this._getUsersByRole(organizationId, roleId);
        recipients.push(...users.map(u => ({
          userId: u.id,
          email: u.email,
          name: u.name
        })));
      }
    }

    // Add specific users
    if (recipientConfig.users && recipientConfig.users.length > 0) {
      for (const userId of recipientConfig.users) {
        const user = await this._getUserById(userId);
        if (user) {
          recipients.push({
            userId: user.id,
            email: user.email,
            name: user.name
          });
        }
      }
    }

    // Add custom emails
    if (recipientConfig.customEmails && recipientConfig.customEmails.length > 0) {
      recipients.push(...recipientConfig.customEmails.map(email => ({
        email,
        name: email
      })));
    }

    // Remove duplicates
    return Array.from(
      new Map(recipients.map(r => [r.email, r])).values()
    );
  }

  /**
   * Get users by role
   */
  async _getUsersByRole(organizationId, roleId) {
    const query = `
      SELECT c.id, c.email, c.name FROM c 
      WHERE c.organizationId = @organizationId
      AND c.type_doc = 'user'
      AND ARRAY_CONTAINS(c.roles, @roleId)
    `;

    const parameters = [
      { name: '@organizationId', value: organizationId },
      { name: '@roleId', value: roleId }
    ];

    return await cosmosService.queryItems('Users', query, parameters);
  }

  /**
   * Get user by ID
   */
  async _getUserById(userId) {
    const query = `
      SELECT c.id, c.email, c.name FROM c 
      WHERE c.id = @userId
      AND c.type_doc = 'user'
    `;

    const parameters = [
      { name: '@userId', value: userId }
    ];

    const results = await cosmosService.queryItems('Users', query, parameters);
    return results[0] || null;
  }

  /**
   * Create default notification
   */
  async _createDefaultNotification(rule, eventData) {
    return await notificationManagementService.createNotification({
      organizationId: eventData.organizationId,
      type: rule.notificationTemplate.type || 'info',
      title: rule.notificationTemplate.title || `Event: ${eventData.eventType}`,
      message: rule.notificationTemplate.message || JSON.stringify(eventData),
      recipients: await this._getRecipients(rule, eventData.organizationId),
      channels: rule.notificationTemplate.channels || ['email'],
      priority: rule.priority,
      metadata: {
        eventType: eventData.eventType,
        ruleId: rule.id,
        ...eventData
      }
    }, 'system');
  }

  /**
   * Create audit log
   */
  async _createAuditLog(organizationId, userId, action, details) {
    const auditLog = new AuditLog({
      organizationId,
      userId,
      action,
      resource: 'notification_trigger',
      details,
      ipAddress: 'system',
      userAgent: 'notification-trigger-service'
    });

    await cosmosService.createItem('AuditLogs', auditLog.toJSON());
  }
}

module.exports = new NotificationTriggerService();
