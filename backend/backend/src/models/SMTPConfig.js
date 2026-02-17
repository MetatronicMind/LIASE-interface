const { v4: uuidv4 } = require('uuid');

/**
 * SMTPConfig Model
 * Stores SMTP configuration per organization
 */
class SMTPConfig {
  constructor({
    id = null,
    organizationId,
    name,
    provider = 'custom', // gmail, sendgrid, ses, custom
    isDefault = false,
    isActive = true,
    host,
    port = 587,
    secure = false, // true for 465, false for other ports
    username,
    password, // Should be encrypted in production
    fromEmail,
    fromName,
    replyTo = null,
    maxEmailsPerHour = 100,
    rateLimitWindow = 3600000, // 1 hour in ms
    currentUsage = 0,
    resetTime = null,
    tlsOptions = {},
    metadata = {},
    createdBy,
    createdAt = new Date().toISOString(),
    updatedAt = new Date().toISOString(),
    lastUsedAt = null,
    lastTestAt = null,
    testStatus = null
  }) {
    this.id = id || `smtp_config_${uuidv4()}`;
    this.organizationId = organizationId;
    this.name = name;
    this.provider = provider;
    this.isDefault = isDefault;
    this.isActive = isActive;
    this.host = host;
    this.port = port;
    this.secure = secure;
    this.username = username;
    this.password = password;
    this.fromEmail = fromEmail;
    this.fromName = fromName;
    this.replyTo = replyTo || fromEmail;
    this.maxEmailsPerHour = maxEmailsPerHour;
    this.rateLimitWindow = rateLimitWindow;
    this.currentUsage = currentUsage;
    this.resetTime = resetTime || this._calculateResetTime();
    this.tlsOptions = tlsOptions;
    this.metadata = metadata;
    this.createdBy = createdBy;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.lastUsedAt = lastUsedAt;
    this.lastTestAt = lastTestAt;
    this.testStatus = testStatus;
    this.type_doc = 'smtp_config';
  }

  // Check if rate limit allows sending
  canSendEmail() {
    if (!this.isActive) return false;

    const now = Date.now();
    
    // Reset counter if window expired
    if (this.resetTime && now > new Date(this.resetTime).getTime()) {
      this.currentUsage = 0;
      this.resetTime = this._calculateResetTime();
    }

    return this.currentUsage < this.maxEmailsPerHour;
  }

  // Increment usage counter
  incrementUsage() {
    this.currentUsage += 1;
    this.lastUsedAt = new Date().toISOString();
    this.updatedAt = new Date().toISOString();
  }

  // Calculate next reset time
  _calculateResetTime() {
    const now = new Date();
    return new Date(now.getTime() + this.rateLimitWindow).toISOString();
  }

  // Mark test result
  markTestResult(success, message = '') {
    this.lastTestAt = new Date().toISOString();
    this.testStatus = success ? 'passed' : 'failed';
    this.updatedAt = new Date().toISOString();
    
    if (!this.metadata.testHistory) {
      this.metadata.testHistory = [];
    }
    
    this.metadata.testHistory.push({
      testedAt: this.lastTestAt,
      success,
      message
    });
    
    // Keep only last 10 test results
    if (this.metadata.testHistory.length > 10) {
      this.metadata.testHistory = this.metadata.testHistory.slice(-10);
    }
  }

  // Get sanitized config (without password)
  getSanitized() {
    const config = this.toJSON();
    config.password = config.password ? '********' : null;
    return config;
  }

  // Get SMTP connection options for nodemailer
  getConnectionOptions() {
    return {
      host: this.host,
      port: this.port,
      secure: this.secure,
      auth: {
        user: this.username,
        pass: this.password
      },
      tls: this.tlsOptions
    };
  }

  toJSON() {
    return {
      id: this.id,
      organizationId: this.organizationId,
      name: this.name,
      provider: this.provider,
      isDefault: this.isDefault,
      isActive: this.isActive,
      host: this.host,
      port: this.port,
      secure: this.secure,
      username: this.username,
      password: this.password,
      fromEmail: this.fromEmail,
      fromName: this.fromName,
      replyTo: this.replyTo,
      maxEmailsPerHour: this.maxEmailsPerHour,
      rateLimitWindow: this.rateLimitWindow,
      currentUsage: this.currentUsage,
      resetTime: this.resetTime,
      tlsOptions: this.tlsOptions,
      metadata: this.metadata,
      createdBy: this.createdBy,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      lastUsedAt: this.lastUsedAt,
      lastTestAt: this.lastTestAt,
      testStatus: this.testStatus,
      type_doc: this.type_doc
    };
  }

  validate() {
    const errors = [];

    if (!this.organizationId) {
      errors.push('Organization ID is required');
    }

    if (!this.name || this.name.trim().length === 0) {
      errors.push('Configuration name is required');
    }

    if (!this.host || this.host.trim().length === 0) {
      errors.push('SMTP host is required');
    }

    if (!this.port || this.port < 1 || this.port > 65535) {
      errors.push('Valid port number is required');
    }

    if (!this.fromEmail || !this._isValidEmail(this.fromEmail)) {
      errors.push('Valid from email is required');
    }

    if (!this.username) {
      errors.push('SMTP username is required');
    }

    if (!this.password) {
      errors.push('SMTP password is required');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  _isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}

module.exports = SMTPConfig;
