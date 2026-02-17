const { v4: uuidv4 } = require('uuid');

/**
 * NotificationRule Model
 * Defines rules and schedules for automated notifications
 */
class NotificationRule {
  constructor({
    id = null,
    organizationId,
    name,
    description = '',
    isActive = true,
    triggerType = 'scheduled', // scheduled, event, manual
    eventType = null, // user_created, study_completed, report_generated, etc.
    scheduleType = 'daily', // once, daily, weekly, monthly, cron
    cronExpression = null,
    scheduledTime = '09:00', // HH:mm format
    scheduledDays = [], // For weekly: ['monday', 'friday']
    timezone = 'UTC',
    notificationTemplate = {
      type: 'info',
      title: '',
      message: '',
      templateId: null,
      channels: ['email']
    },
    recipientConfig = {
      type: 'roles', // roles, users, custom
      roles: [], // Array of role IDs
      users: [], // Array of user IDs
      customEmails: [] // Additional email addresses
    },
    conditions = [], // Array of conditions to check before sending
    priority = 'normal',
    retentionDays = 30,
    metadata = {},
    createdBy,
    createdAt = new Date().toISOString(),
    updatedAt = new Date().toISOString(),
    lastTriggeredAt = null,
    nextScheduledAt = null
  }) {
    this.id = id || `notification_rule_${uuidv4()}`;
    this.organizationId = organizationId;
    this.name = name;
    this.description = description;
    this.isActive = isActive;
    this.triggerType = triggerType;
    this.eventType = eventType;
    this.scheduleType = scheduleType;
    this.cronExpression = cronExpression;
    this.scheduledTime = scheduledTime;
    this.scheduledDays = scheduledDays;
    this.timezone = timezone;
    this.notificationTemplate = notificationTemplate;
    this.recipientConfig = recipientConfig;
    this.conditions = conditions;
    this.priority = priority;
    this.retentionDays = retentionDays;
    this.metadata = metadata;
    this.createdBy = createdBy;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.lastTriggeredAt = lastTriggeredAt;
    this.nextScheduledAt = nextScheduledAt;
    this.type_doc = 'notification_rule';
  }

  // Update last triggered timestamp
  markAsTriggered() {
    this.lastTriggeredAt = new Date().toISOString();
    this.updatedAt = new Date().toISOString();
  }

  // Calculate next scheduled execution time
  calculateNextScheduledTime() {
    if (!this.isActive || this.triggerType !== 'scheduled') {
      return null;
    }

    const now = new Date();
    const [hours, minutes] = this.scheduledTime.split(':').map(Number);

    let nextDate = new Date(now);
    nextDate.setHours(hours, minutes, 0, 0);

    // If the time has passed today, schedule for next occurrence
    if (nextDate <= now) {
      switch (this.scheduleType) {
        case 'daily':
          nextDate.setDate(nextDate.getDate() + 1);
          break;
        case 'weekly':
          // Find next matching day
          nextDate = this._getNextWeeklyDate(nextDate);
          break;
        case 'monthly':
          nextDate.setMonth(nextDate.getMonth() + 1);
          break;
        case 'cron':
          // Cron expression would be parsed by a library in actual implementation
          return null; // Handled by cron scheduler
      }
    }

    this.nextScheduledAt = nextDate.toISOString();
    return this.nextScheduledAt;
  }

  _getNextWeeklyDate(fromDate) {
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const currentDay = fromDate.getDay();
    
    let daysToAdd = 1;
    for (let i = 1; i <= 7; i++) {
      const checkDay = (currentDay + i) % 7;
      if (this.scheduledDays.includes(dayNames[checkDay])) {
        daysToAdd = i;
        break;
      }
    }
    
    const nextDate = new Date(fromDate);
    nextDate.setDate(nextDate.getDate() + daysToAdd);
    return nextDate;
  }

  // Check if rule conditions are met
  evaluateConditions(context = {}) {
    if (this.conditions.length === 0) {
      return true; // No conditions means always pass
    }

    return this.conditions.every(condition => {
      const { field, operator, value } = condition;
      const actualValue = context[field];

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
          return actualValue && actualValue.includes(value);
        case 'exists':
          return actualValue !== undefined && actualValue !== null;
        default:
          return false;
      }
    });
  }

  toJSON() {
    return {
      id: this.id,
      organizationId: this.organizationId,
      name: this.name,
      description: this.description,
      isActive: this.isActive,
      triggerType: this.triggerType,
      eventType: this.eventType,
      scheduleType: this.scheduleType,
      cronExpression: this.cronExpression,
      scheduledTime: this.scheduledTime,
      scheduledDays: this.scheduledDays,
      timezone: this.timezone,
      notificationTemplate: this.notificationTemplate,
      recipientConfig: this.recipientConfig,
      conditions: this.conditions,
      priority: this.priority,
      retentionDays: this.retentionDays,
      metadata: this.metadata,
      createdBy: this.createdBy,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      lastTriggeredAt: this.lastTriggeredAt,
      nextScheduledAt: this.nextScheduledAt,
      type_doc: this.type_doc
    };
  }

  validate() {
    const errors = [];

    if (!this.organizationId) {
      errors.push('Organization ID is required');
    }

    if (!this.name || this.name.trim().length === 0) {
      errors.push('Rule name is required');
    }

    if (!['scheduled', 'event', 'manual'].includes(this.triggerType)) {
      errors.push('Invalid trigger type');
    }

    if (this.triggerType === 'scheduled' && !this.scheduleType) {
      errors.push('Schedule type is required for scheduled triggers');
    }

    if (!this.notificationTemplate.title || !this.notificationTemplate.message) {
      errors.push('Notification template must have title and message');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

module.exports = NotificationRule;
