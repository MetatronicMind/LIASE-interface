const cosmosService = require('./cosmosService');
const Notification = require('../models/Notification');
const NotificationRule = require('../models/NotificationRule');
const AuditLog = require('../models/AuditLog');

/**
 * NotificationManagementService
 * Handles notification creation, scheduling, and delivery management
 */
class NotificationManagementService {
  constructor() {
    this.containerName = 'Notifications';
  }

  /**
   * Create a new notification
   */
  async createNotification(notificationData, userId) {
    const notification = new Notification({
      ...notificationData,
      createdBy: userId
    });

    // Validate notification
    const validation = notification.validate();
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    // Save to database
    const result = await cosmosService.createItem(
      this.containerName,
      notification.toJSON()
    );

    // Create audit log
    await this._createAuditLog(
      notification.organizationId,
      userId,
      'notification_created',
      { notificationId: notification.id }
    );

    return result;
  }

  /**
   * Get notification by ID
   */
  async getNotificationById(notificationId, organizationId) {
    const query = `
      SELECT * FROM c 
      WHERE c.id = @notificationId 
      AND c.organizationId = @organizationId
      AND c.type_doc = 'notification'
    `;

    const parameters = [
      { name: '@notificationId', value: notificationId },
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
   * Get notifications with filters and pagination
   */
  async getNotifications(organizationId, filters = {}, page = 1, limit = 50) {
    const {
      status,
      type,
      priority,
      startDate,
      endDate,
      recipientEmail
    } = filters;

    let conditions = [
      'c.organizationId = @organizationId',
      "c.type_doc = 'notification'"
    ];

    const parameters = [
      { name: '@organizationId', value: organizationId }
    ];

    if (status) {
      conditions.push('c.status = @status');
      parameters.push({ name: '@status', value: status });
    }

    if (type) {
      conditions.push('c.type = @type');
      parameters.push({ name: '@type', value: type });
    }

    if (priority) {
      conditions.push('c.priority = @priority');
      parameters.push({ name: '@priority', value: priority });
    }

    if (startDate) {
      conditions.push('c.createdAt >= @startDate');
      parameters.push({ name: '@startDate', value: startDate });
    }

    if (endDate) {
      conditions.push('c.createdAt <= @endDate');
      parameters.push({ name: '@endDate', value: endDate });
    }

    if (recipientEmail) {
      conditions.push('ARRAY_CONTAINS(c.recipients, {"email": @recipientEmail}, true)');
      parameters.push({ name: '@recipientEmail', value: recipientEmail });
    }

    const offset = (page - 1) * limit;
    const query = `
      SELECT * FROM c 
      WHERE ${conditions.join(' AND ')}
      ORDER BY c.createdAt DESC
      OFFSET ${offset} ROWS
      FETCH NEXT ${limit} ROWS ONLY
    `;

    const results = await cosmosService.queryItems(
      this.containerName,
      query,
      parameters
    );

    // Get total count
    const countQuery = `
      SELECT VALUE COUNT(1) FROM c 
      WHERE ${conditions.join(' AND ')}
    `;
    const countResult = await cosmosService.queryItems(
      this.containerName,
      countQuery,
      parameters
    );

    return {
      notifications: results,
      pagination: {
        page,
        limit,
        total: countResult[0] || 0,
        pages: Math.ceil((countResult[0] || 0) / limit)
      }
    };
  }

  /**
   * Update notification status
   */
  async updateNotificationStatus(notificationId, organizationId, status, details = {}) {
    const notification = await this.getNotificationById(notificationId, organizationId);
    
    if (!notification) {
      throw new Error('Notification not found');
    }

    const notificationObj = new Notification(notification);

    switch (status) {
      case 'sent':
        notificationObj.markAsSent();
        break;
      case 'delivered':
        notificationObj.markAsDelivered();
        break;
      case 'failed':
        notificationObj.markAsFailed(details.error || 'Unknown error');
        break;
    }

    const updated = await cosmosService.updateItem(
      this.containerName,
      notificationObj.toJSON()
    );

    return updated;
  }

  /**
   * Get pending notifications for delivery
   */
  async getPendingNotifications(organizationId, limit = 50) {
    const query = `
      SELECT * FROM c 
      WHERE c.organizationId = @organizationId
      AND c.type_doc = 'notification'
      AND c.status IN ('pending', 'retrying')
      AND (c.scheduledAt = null OR c.scheduledAt <= @now)
      ORDER BY c.priority DESC, c.createdAt ASC
      OFFSET 0 ROWS FETCH NEXT ${limit} ROWS ONLY
    `;

    const parameters = [
      { name: '@organizationId', value: organizationId },
      { name: '@now', value: new Date().toISOString() }
    ];

    return await cosmosService.queryItems(this.containerName, query, parameters);
  }

  /**
   * Retry failed notifications
   */
  async retryFailedNotifications(organizationId) {
    const query = `
      SELECT * FROM c 
      WHERE c.organizationId = @organizationId
      AND c.type_doc = 'notification'
      AND c.status = 'retrying'
      AND c.retryCount < c.maxRetries
    `;

    const parameters = [
      { name: '@organizationId', value: organizationId }
    ];

    const notifications = await cosmosService.queryItems(
      this.containerName,
      query,
      parameters
    );

    const retried = [];
    for (const notif of notifications) {
      const notificationObj = new Notification(notif);
      if (notificationObj.shouldRetry()) {
        notificationObj.status = 'pending';
        await cosmosService.updateItem(this.containerName, notificationObj.toJSON());
        retried.push(notificationObj.id);
      }
    }

    return retried;
  }

  /**
   * Create a notification rule
   */
  async createNotificationRule(ruleData, userId) {
    const rule = new NotificationRule({
      ...ruleData,
      createdBy: userId
    });

    const validation = rule.validate();
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    // Calculate next scheduled time
    rule.calculateNextScheduledTime();

    const result = await cosmosService.createItem(
      this.containerName,
      rule.toJSON()
    );

    await this._createAuditLog(
      rule.organizationId,
      userId,
      'notification_rule_created',
      { ruleId: rule.id, ruleName: rule.name }
    );

    return result;
  }

  /**
   * Get notification rules
   */
  async getNotificationRules(organizationId, isActive = null) {
    let query = `
      SELECT * FROM c 
      WHERE c.organizationId = @organizationId
      AND c.type_doc = 'notification_rule'
    `;

    const parameters = [
      { name: '@organizationId', value: organizationId }
    ];

    if (isActive !== null) {
      query += ' AND c.isActive = @isActive';
      parameters.push({ name: '@isActive', value: isActive });
    }

    query += ' ORDER BY c.createdAt DESC';

    return await cosmosService.queryItems(this.containerName, query, parameters);
  }

  /**
   * Update notification rule
   */
  async updateNotificationRule(ruleId, organizationId, updates, userId) {
    const rule = await this.getNotificationRuleById(ruleId, organizationId);
    
    if (!rule) {
      throw new Error('Notification rule not found');
    }

    const ruleObj = new NotificationRule({ ...rule, ...updates });
    ruleObj.updatedAt = new Date().toISOString();
    
    // Recalculate next scheduled time
    if (updates.scheduleType || updates.scheduledTime || updates.scheduledDays) {
      ruleObj.calculateNextScheduledTime();
    }

    const validation = ruleObj.validate();
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    const updated = await cosmosService.updateItem(
      this.containerName,
      ruleObj.toJSON()
    );

    await this._createAuditLog(
      organizationId,
      userId,
      'notification_rule_updated',
      { ruleId, updates: Object.keys(updates) }
    );

    return updated;
  }

  /**
   * Get notification rule by ID
   */
  async getNotificationRuleById(ruleId, organizationId) {
    const query = `
      SELECT * FROM c 
      WHERE c.id = @ruleId 
      AND c.organizationId = @organizationId
      AND c.type_doc = 'notification_rule'
    `;

    const parameters = [
      { name: '@ruleId', value: ruleId },
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
   * Delete notification rule
   */
  async deleteNotificationRule(ruleId, organizationId, userId) {
    const rule = await this.getNotificationRuleById(ruleId, organizationId);
    
    if (!rule) {
      throw new Error('Notification rule not found');
    }

    await cosmosService.deleteItem(this.containerName, ruleId);

    await this._createAuditLog(
      organizationId,
      userId,
      'notification_rule_deleted',
      { ruleId, ruleName: rule.name }
    );

    return { success: true, message: 'Notification rule deleted' };
  }

  /**
   * Trigger notification rule manually
   */
  async triggerNotificationRule(ruleId, organizationId, userId, context = {}) {
    const rule = await this.getNotificationRuleById(ruleId, organizationId);
    
    if (!rule) {
      throw new Error('Notification rule not found');
    }

    const ruleObj = new NotificationRule(rule);

    // Evaluate conditions
    if (!ruleObj.evaluateConditions(context)) {
      throw new Error('Rule conditions not met');
    }

    // Get recipients based on configuration
    const recipients = await this._resolveRecipients(
      organizationId,
      ruleObj.recipientConfig
    );

    // Create notification from rule
    const notification = await this.createNotification({
      organizationId,
      type: ruleObj.notificationTemplate.type,
      title: ruleObj.notificationTemplate.title,
      message: ruleObj.notificationTemplate.message,
      templateId: ruleObj.notificationTemplate.templateId,
      recipients,
      channels: ruleObj.notificationTemplate.channels,
      priority: ruleObj.priority,
      metadata: {
        triggeredByRule: ruleId,
        ruleName: ruleObj.name,
        context
      }
    }, userId);

    // Update rule's last triggered time
    ruleObj.markAsTriggered();
    await cosmosService.updateItem(this.containerName, ruleObj.toJSON());

    return notification;
  }

  /**
   * Resolve recipients based on configuration
   */
  async _resolveRecipients(organizationId, recipientConfig) {
    const recipients = [];

    // Add users by role
    if (recipientConfig.roles && recipientConfig.roles.length > 0) {
      const query = `
        SELECT c.id, c.email, c.firstName, c.lastName 
        FROM c 
        WHERE c.organizationId = @organizationId
        AND c.type = 'user'
        AND c.roleId IN (${recipientConfig.roles.map((_, i) => `@role${i}`).join(',')})
        AND c.isActive = true
      `;

      const parameters = [
        { name: '@organizationId', value: organizationId },
        ...recipientConfig.roles.map((role, i) => ({
          name: `@role${i}`,
          value: role
        }))
      ];

      const users = await cosmosService.queryItems('Users', query, parameters);
      recipients.push(...users.map(u => ({
        userId: u.id,
        email: u.email,
        name: `${u.firstName} ${u.lastName}`
      })));
    }

    // Add specific users
    if (recipientConfig.users && recipientConfig.users.length > 0) {
      const query = `
        SELECT c.id, c.email, c.firstName, c.lastName 
        FROM c 
        WHERE c.organizationId = @organizationId
        AND c.type = 'user'
        AND c.id IN (${recipientConfig.users.map((_, i) => `@user${i}`).join(',')})
        AND c.isActive = true
      `;

      const parameters = [
        { name: '@organizationId', value: organizationId },
        ...recipientConfig.users.map((userId, i) => ({
          name: `@user${i}`,
          value: userId
        }))
      ];

      const users = await cosmosService.queryItems('Users', query, parameters);
      recipients.push(...users.map(u => ({
        userId: u.id,
        email: u.email,
        name: `${u.firstName} ${u.lastName}`
      })));
    }

    // Add custom emails
    if (recipientConfig.customEmails && recipientConfig.customEmails.length > 0) {
      recipients.push(...recipientConfig.customEmails.map(email => ({
        email,
        name: email
      })));
    }

    // Remove duplicates
    const uniqueRecipients = recipients.reduce((acc, recipient) => {
      if (!acc.find(r => r.email === recipient.email)) {
        acc.push(recipient);
      }
      return acc;
    }, []);

    return uniqueRecipients;
  }

  /**
   * Clean up old notifications based on retention policy
   */
  async cleanupOldNotifications(organizationId, retentionDays = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const query = `
      SELECT c.id FROM c 
      WHERE c.organizationId = @organizationId
      AND c.type_doc = 'notification'
      AND c.createdAt < @cutoffDate
      AND c.status IN ('delivered', 'failed')
    `;

    const parameters = [
      { name: '@organizationId', value: organizationId },
      { name: '@cutoffDate', value: cutoffDate.toISOString() }
    ];

    const notifications = await cosmosService.queryItems(
      this.containerName,
      query,
      parameters
    );

    let deletedCount = 0;
    for (const notification of notifications) {
      await cosmosService.deleteItem(this.containerName, notification.id);
      deletedCount++;
    }

    return { deletedCount };
  }

  /**
   * Get notification statistics
   */
  async getNotificationStats(organizationId, startDate, endDate) {
    const query = `
      SELECT 
        c.status,
        c.type,
        COUNT(1) as count
      FROM c 
      WHERE c.organizationId = @organizationId
      AND c.type_doc = 'notification'
      AND c.createdAt >= @startDate
      AND c.createdAt <= @endDate
      GROUP BY c.status, c.type
    `;

    const parameters = [
      { name: '@organizationId', value: organizationId },
      { name: '@startDate', value: startDate },
      { name: '@endDate', value: endDate }
    ];

    const results = await cosmosService.queryItems(
      this.containerName,
      query,
      parameters
    );

    return results;
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
        entityType: 'notification',
        details
      });

      await cosmosService.createItem('AuditLogs', auditLog.toJSON());
    } catch (error) {
      console.error('Failed to create audit log:', error);
    }
  }
}

module.exports = new NotificationManagementService();
