const { v4: uuidv4 } = require('uuid');

/**
 * Notification Model
 * Represents a notification in the system with multi-tenant support
 */
class Notification {
  constructor({
    id = null,
    organizationId,
    type = 'info', // info, warning, error, success, report
    title,
    message,
    templateId = null,
    templateData = {},
    recipients = [],
    channels = ['email'], // email, in-app, sms
    priority = 'normal', // low, normal, high, urgent
    status = 'pending', // pending, queued, sent, delivered, failed, retrying
    scheduleType = 'immediate', // immediate, scheduled, recurring
    scheduledAt = null,
    cronExpression = null,
    retryCount = 0,
    maxRetries = 3,
    lastRetryAt = null,
    deliveryAttempts = [],
    metadata = {},
    createdBy,
    createdAt = new Date().toISOString(),
    updatedAt = new Date().toISOString(),
    sentAt = null,
    deliveredAt = null
  }) {
    this.id = id || `notification_${uuidv4()}`;
    this.organizationId = organizationId;
    this.type = type;
    this.title = title;
    this.message = message;
    this.templateId = templateId;
    this.templateData = templateData;
    this.recipients = recipients; // Array of { userId, email, name }
    this.channels = channels;
    this.priority = priority;
    this.status = status;
    this.scheduleType = scheduleType;
    this.scheduledAt = scheduledAt;
    this.cronExpression = cronExpression;
    this.retryCount = retryCount;
    this.maxRetries = maxRetries;
    this.lastRetryAt = lastRetryAt;
    this.deliveryAttempts = deliveryAttempts;
    this.metadata = metadata;
    this.createdBy = createdBy;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.sentAt = sentAt;
    this.deliveredAt = deliveredAt;
    this.type_doc = 'notification';
  }

  // Mark notification as sent
  markAsSent() {
    this.status = 'sent';
    this.sentAt = new Date().toISOString();
    this.updatedAt = new Date().toISOString();
  }

  // Mark notification as delivered
  markAsDelivered() {
    this.status = 'delivered';
    this.deliveredAt = new Date().toISOString();
    this.updatedAt = new Date().toISOString();
  }

  // Mark notification as failed and handle retry logic
  markAsFailed(errorMessage) {
    this.retryCount += 1;
    this.lastRetryAt = new Date().toISOString();
    this.deliveryAttempts.push({
      attemptNumber: this.retryCount,
      attemptedAt: new Date().toISOString(),
      error: errorMessage,
      success: false
    });

    if (this.retryCount >= this.maxRetries) {
      this.status = 'failed';
    } else {
      this.status = 'retrying';
    }
    this.updatedAt = new Date().toISOString();
  }

  // Add successful delivery attempt
  addDeliveryAttempt(channelType, success, details = {}) {
    this.deliveryAttempts.push({
      attemptNumber: this.retryCount + 1,
      attemptedAt: new Date().toISOString(),
      channel: channelType,
      success,
      details
    });
    this.updatedAt = new Date().toISOString();
  }

  // Check if notification should be retried
  shouldRetry() {
    return this.status === 'retrying' && this.retryCount < this.maxRetries;
  }

  // Calculate next retry time with exponential backoff
  getNextRetryTime() {
    if (!this.shouldRetry()) return null;
    
    const backoffMinutes = Math.pow(2, this.retryCount) * 5; // 5, 10, 20, 40 minutes
    const nextRetry = new Date();
    nextRetry.setMinutes(nextRetry.getMinutes() + backoffMinutes);
    return nextRetry.toISOString();
  }

  toJSON() {
    return {
      id: this.id,
      organizationId: this.organizationId,
      type: this.type,
      title: this.title,
      message: this.message,
      templateId: this.templateId,
      templateData: this.templateData,
      recipients: this.recipients,
      channels: this.channels,
      priority: this.priority,
      status: this.status,
      scheduleType: this.scheduleType,
      scheduledAt: this.scheduledAt,
      cronExpression: this.cronExpression,
      retryCount: this.retryCount,
      maxRetries: this.maxRetries,
      lastRetryAt: this.lastRetryAt,
      deliveryAttempts: this.deliveryAttempts,
      metadata: this.metadata,
      createdBy: this.createdBy,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      sentAt: this.sentAt,
      deliveredAt: this.deliveredAt,
      type_doc: this.type_doc
    };
  }

  validate() {
    const errors = [];

    if (!this.organizationId) {
      errors.push('Organization ID is required');
    }

    if (!this.title || this.title.trim().length === 0) {
      errors.push('Title is required');
    }

    if (!this.message || this.message.trim().length === 0) {
      errors.push('Message is required');
    }

    if (!this.recipients || this.recipients.length === 0) {
      errors.push('At least one recipient is required');
    }

    if (!['info', 'warning', 'error', 'success', 'report'].includes(this.type)) {
      errors.push('Invalid notification type');
    }

    if (!['low', 'normal', 'high', 'urgent'].includes(this.priority)) {
      errors.push('Invalid priority level');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

module.exports = Notification;
