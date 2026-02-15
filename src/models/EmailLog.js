const { v4: uuidv4 } = require('uuid');

/**
 * EmailLog Model
 * Tracks all email delivery attempts and status
 */
class EmailLog {
  constructor({
    id = null,
    organizationId,
    notificationId = null,
    templateId = null,
    from,
    to, // Array or string
    cc = [],
    bcc = [],
    subject,
    bodyHtml,
    bodyPlain,
    status = 'queued', // queued, sending, sent, delivered, failed, bounced
    priority = 'normal',
    scheduledAt = null,
    sentAt = null,
    deliveredAt = null,
    failedAt = null,
    errorMessage = null,
    retryCount = 0,
    maxRetries = 3,
    providerResponse = {},
    smtpConfig = {}, // Which SMTP config was used
    metadata = {},
    createdAt = new Date().toISOString(),
    updatedAt = new Date().toISOString()
  }) {
    this.id = id || `email_log_${uuidv4()}`;
    this.organizationId = organizationId;
    this.notificationId = notificationId;
    this.templateId = templateId;
    this.from = from;
    this.to = Array.isArray(to) ? to : [to];
    this.cc = cc;
    this.bcc = bcc;
    this.subject = subject;
    this.bodyHtml = bodyHtml;
    this.bodyPlain = bodyPlain;
    this.status = status;
    this.priority = priority;
    this.scheduledAt = scheduledAt;
    this.sentAt = sentAt;
    this.deliveredAt = deliveredAt;
    this.failedAt = failedAt;
    this.errorMessage = errorMessage;
    this.retryCount = retryCount;
    this.maxRetries = maxRetries;
    this.providerResponse = providerResponse;
    this.smtpConfig = smtpConfig;
    this.metadata = metadata;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.type_doc = 'email_log';
  }

  // Mark email as sent
  markAsSent(providerResponse = {}) {
    this.status = 'sent';
    this.sentAt = new Date().toISOString();
    this.providerResponse = providerResponse;
    this.updatedAt = new Date().toISOString();
  }

  // Mark email as delivered
  markAsDelivered() {
    this.status = 'delivered';
    this.deliveredAt = new Date().toISOString();
    this.updatedAt = new Date().toISOString();
  }

  // Mark email as failed
  markAsFailed(errorMessage, providerResponse = {}) {
    this.status = 'failed';
    this.failedAt = new Date().toISOString();
    this.errorMessage = errorMessage;
    this.providerResponse = providerResponse;
    this.retryCount += 1;
    this.updatedAt = new Date().toISOString();
  }

  // Mark email as bounced
  markAsBounced(reason) {
    this.status = 'bounced';
    this.errorMessage = reason;
    this.updatedAt = new Date().toISOString();
  }

  // Check if should retry
  shouldRetry() {
    return this.status === 'failed' && this.retryCount < this.maxRetries;
  }

  toJSON() {
    return {
      id: this.id,
      organizationId: this.organizationId,
      notificationId: this.notificationId,
      templateId: this.templateId,
      from: this.from,
      to: this.to,
      cc: this.cc,
      bcc: this.bcc,
      subject: this.subject,
      bodyHtml: this.bodyHtml,
      bodyPlain: this.bodyPlain,
      status: this.status,
      priority: this.priority,
      scheduledAt: this.scheduledAt,
      sentAt: this.sentAt,
      deliveredAt: this.deliveredAt,
      failedAt: this.failedAt,
      errorMessage: this.errorMessage,
      retryCount: this.retryCount,
      maxRetries: this.maxRetries,
      providerResponse: this.providerResponse,
      smtpConfig: this.smtpConfig,
      metadata: this.metadata,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      type_doc: this.type_doc
    };
  }
}

module.exports = EmailLog;
