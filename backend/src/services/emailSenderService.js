const nodemailer = require('nodemailer');
const cosmosService = require('./cosmosService');
const EmailTemplate = require('../models/EmailTemplate');
const EmailLog = require('../models/EmailLog');
const SMTPConfig = require('../models/SMTPConfig');
const AuditLog = require('../models/AuditLog');

/**
 * EmailSenderService
 * Handles email template management and SMTP-based email delivery
 */
class EmailSenderService {
  constructor() {
    this.containerName = 'Emails';
    this.transportCache = new Map();
    this.queueProcessing = false;
  }

  /**
   * Create email template
   */
  async createEmailTemplate(templateData, userId) {
    const template = new EmailTemplate({
      ...templateData,
      createdBy: userId
    });

    const validation = template.validate();
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    const result = await cosmosService.createItem(
      this.containerName,
      template.toJSON()
    );

    await this._createAuditLog(
      template.organizationId,
      userId,
      'email_template_created',
      { templateId: template.id, templateName: template.name }
    );

    return result;
  }

  /**
   * Get email template by ID
   */
  async getEmailTemplateById(templateId, organizationId) {
    const query = `
      SELECT * FROM c 
      WHERE c.id = @templateId 
      AND c.organizationId = @organizationId
      AND c.type_doc = 'email_template'
    `;

    const parameters = [
      { name: '@templateId', value: templateId },
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
   * Get all email templates
   */
  async getEmailTemplates(organizationId, filters = {}) {
    const { category, status, isLocked } = filters;

    let conditions = [
      'c.organizationId = @organizationId',
      "c.type_doc = 'email_template'"
    ];

    const parameters = [
      { name: '@organizationId', value: organizationId }
    ];

    if (category) {
      conditions.push('c.category = @category');
      parameters.push({ name: '@category', value: category });
    }

    if (status) {
      conditions.push('c.status = @status');
      parameters.push({ name: '@status', value: status });
    }

    if (isLocked !== undefined) {
      conditions.push('c.isLocked = @isLocked');
      parameters.push({ name: '@isLocked', value: isLocked });
    }

    const query = `
      SELECT * FROM c 
      WHERE ${conditions.join(' AND ')}
      ORDER BY c.createdAt DESC
    `;

    return await cosmosService.queryItems(this.containerName, query, parameters);
  }

  /**
   * Update email template
   */
  async updateEmailTemplate(templateId, organizationId, updates, userId) {
    const template = await this.getEmailTemplateById(templateId, organizationId);
    
    if (!template) {
      throw new Error('Email template not found');
    }

    if (template.isLocked) {
      throw new Error('Cannot update locked template. Create a new version instead.');
    }

    const templateObj = new EmailTemplate({ ...template, ...updates });
    templateObj.updatedAt = new Date().toISOString();

    const validation = templateObj.validate();
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    const updated = await cosmosService.updateItem(
      this.containerName,
      templateObj.toJSON()
    );

    await this._createAuditLog(
      organizationId,
      userId,
      'email_template_updated',
      { templateId, updates: Object.keys(updates) }
    );

    return updated;
  }

  /**
   * Lock email template
   */
  async lockEmailTemplate(templateId, organizationId, userId, reason) {
    const template = await this.getEmailTemplateById(templateId, organizationId);
    
    if (!template) {
      throw new Error('Email template not found');
    }

    const templateObj = new EmailTemplate(template);
    templateObj.lock(userId, reason);

    const updated = await cosmosService.updateItem(
      this.containerName,
      templateObj.toJSON()
    );

    await this._createAuditLog(
      organizationId,
      userId,
      'email_template_locked',
      { templateId, reason }
    );

    return updated;
  }

  /**
   * Unlock email template (admin only)
   */
  async unlockEmailTemplate(templateId, organizationId, userId) {
    const template = await this.getEmailTemplateById(templateId, organizationId);
    
    if (!template) {
      throw new Error('Email template not found');
    }

    const templateObj = new EmailTemplate(template);
    templateObj.unlock(userId);

    const updated = await cosmosService.updateItem(
      this.containerName,
      templateObj.toJSON()
    );

    await this._createAuditLog(
      organizationId,
      userId,
      'email_template_unlocked',
      { templateId }
    );

    return updated;
  }

  /**
   * Create new version of locked template
   */
  async createTemplateVersion(templateId, organizationId, userId) {
    const template = await this.getEmailTemplateById(templateId, organizationId);
    
    if (!template) {
      throw new Error('Email template not found');
    }

    const templateObj = new EmailTemplate(template);
    const newVersion = templateObj.createNewVersion();
    newVersion.createdBy = userId;

    const result = await cosmosService.createItem(
      this.containerName,
      newVersion.toJSON()
    );

    await this._createAuditLog(
      organizationId,
      userId,
      'email_template_version_created',
      { 
        originalTemplateId: templateId, 
        newTemplateId: newVersion.id,
        version: newVersion.version
      }
    );

    return result;
  }

  /**
   * Delete email template
   */
  async deleteEmailTemplate(templateId, organizationId, userId) {
    const template = await this.getEmailTemplateById(templateId, organizationId);
    
    if (!template) {
      throw new Error('Email template not found');
    }

    if (template.isLocked) {
      throw new Error('Cannot delete locked template');
    }

    await cosmosService.deleteItem(this.containerName, templateId);

    await this._createAuditLog(
      organizationId,
      userId,
      'email_template_deleted',
      { templateId, templateName: template.name }
    );

    return { success: true, message: 'Email template deleted' };
  }

  /**
   * Render email template with data
   */
  async renderTemplate(templateId, organizationId, data) {
    const template = await this.getEmailTemplateById(templateId, organizationId);
    
    if (!template) {
      throw new Error('Email template not found');
    }

    const templateObj = new EmailTemplate(template);
    const rendered = templateObj.render(data);

    // Update usage statistics
    templateObj.markAsUsed();
    await cosmosService.updateItem(this.containerName, templateObj.toJSON());

    return rendered;
  }

  /**
   * Create SMTP configuration
   */
  async createSMTPConfig(configData, userId) {
    const config = new SMTPConfig({
      ...configData,
      createdBy: userId
    });

    const validation = config.validate();
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    // If this is set as default, unset other defaults
    if (config.isDefault) {
      await this._unsetDefaultSMTPConfigs(config.organizationId);
    }

    const result = await cosmosService.createItem(
      this.containerName,
      config.toJSON()
    );

    await this._createAuditLog(
      config.organizationId,
      userId,
      'smtp_config_created',
      { configId: config.id, configName: config.name }
    );

    return result;
  }

  /**
   * Get SMTP configurations
   */
  async getSMTPConfigs(organizationId) {
    const query = `
      SELECT * FROM c 
      WHERE c.organizationId = @organizationId
      AND c.type_doc = 'smtp_config'
      ORDER BY c.isDefault DESC, c.createdAt DESC
    `;

    const parameters = [
      { name: '@organizationId', value: organizationId }
    ];

    const results = await cosmosService.queryItems(
      this.containerName,
      query,
      parameters
    );

    // Sanitize passwords
    return results.map(config => {
      const smtpConfig = new SMTPConfig(config);
      return smtpConfig.getSanitized();
    });
  }

  /**
   * Get default SMTP config for organization
   */
  async getDefaultSMTPConfig(organizationId) {
    const query = `
      SELECT * FROM c 
      WHERE c.organizationId = @organizationId
      AND c.type_doc = 'smtp_config'
      AND c.isDefault = true
      AND c.isActive = true
    `;

    const parameters = [
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
   * Update SMTP configuration
   */
  async updateSMTPConfig(configId, organizationId, updates, userId) {
    const config = await this._getSMTPConfigById(configId, organizationId);
    
    if (!config) {
      throw new Error('SMTP configuration not found');
    }

    const configObj = new SMTPConfig({ ...config, ...updates });
    configObj.updatedAt = new Date().toISOString();

    const validation = configObj.validate();
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    // If setting as default, unset other defaults
    if (updates.isDefault && !config.isDefault) {
      await this._unsetDefaultSMTPConfigs(organizationId);
    }

    const updated = await cosmosService.updateItem(
      this.containerName,
      configObj.toJSON()
    );

    await this._createAuditLog(
      organizationId,
      userId,
      'smtp_config_updated',
      { configId, updates: Object.keys(updates) }
    );

    // Clear transport cache for this config
    this.transportCache.delete(configId);

    return updated;
  }

  /**
   * Test SMTP configuration
   */
  async testSMTPConfig(configId, organizationId, testEmail) {
    const config = await this._getSMTPConfigById(configId, organizationId);
    
    if (!config) {
      throw new Error('SMTP configuration not found');
    }

    const smtpConfig = new SMTPConfig(config);
    
    try {
      const transporter = await this._getTransporter(smtpConfig);
      
      // Send test email
      await transporter.sendMail({
        from: `"${smtpConfig.fromName}" <${smtpConfig.fromEmail}>`,
        to: testEmail,
        subject: 'SMTP Configuration Test',
        text: 'This is a test email to verify SMTP configuration.',
        html: '<p>This is a test email to verify SMTP configuration.</p>'
      });

      // Mark test as successful
      smtpConfig.markTestResult(true, 'Test email sent successfully');
      await cosmosService.updateItem(this.containerName, smtpConfig.toJSON());

      return { success: true, message: 'Test email sent successfully' };
    } catch (error) {
      // Mark test as failed
      smtpConfig.markTestResult(false, error.message);
      await cosmosService.updateItem(this.containerName, smtpConfig.toJSON());

      throw new Error(`SMTP test failed: ${error.message}`);
    }
  }

  /**
   * Delete SMTP configuration
   */
  async deleteSMTPConfig(configId, organizationId, userId) {
    const config = await this._getSMTPConfigById(configId, organizationId);
    
    if (!config) {
      throw new Error('SMTP configuration not found');
    }

    await cosmosService.deleteItem(this.containerName, configId);

    await this._createAuditLog(
      organizationId,
      userId,
      'smtp_config_deleted',
      { configId, configName: config.name }
    );

    // Clear transport cache
    this.transportCache.delete(configId);

    return { success: true, message: 'SMTP configuration deleted' };
  }

  /**
   * Queue email for sending
   */
  async queueEmail(emailData) {
    const emailLog = new EmailLog({
      ...emailData,
      status: 'queued',
      createdAt: new Date().toISOString()
    });

    const result = await cosmosService.createItem(
      this.containerName,
      emailLog.toJSON()
    );

    // Trigger queue processing if not already running
    if (!this.queueProcessing) {
      setImmediate(() => this.processEmailQueue(emailData.organizationId));
    }

    return result;
  }

  /**
   * Send email immediately
   */
  async sendEmail(organizationId, emailData, smtpConfigId = null) {
    // Get SMTP config
    let smtpConfig;
    if (smtpConfigId) {
      smtpConfig = await this._getSMTPConfigById(smtpConfigId, organizationId);
    } else {
      smtpConfig = await this.getDefaultSMTPConfig(organizationId);
    }

    if (!smtpConfig) {
      throw new Error('No SMTP configuration found');
    }

    const smtpConfigObj = new SMTPConfig(smtpConfig);

    // Check rate limit
    if (!smtpConfigObj.canSendEmail()) {
      throw new Error('Rate limit exceeded for SMTP configuration');
    }

    // Create email log
    const emailLog = new EmailLog({
      organizationId,
      ...emailData,
      smtpConfig: { id: smtpConfig.id, name: smtpConfig.name }
    });

    try {
      emailLog.status = 'sending';
      const savedLog = await cosmosService.createItem(
        this.containerName,
        emailLog.toJSON()
      );

      // Get transporter
      const transporter = await this._getTransporter(smtpConfigObj);

      // Send email
      const info = await transporter.sendMail({
        from: `"${smtpConfigObj.fromName}" <${smtpConfigObj.fromEmail}>`,
        to: emailData.to,
        cc: emailData.cc || [],
        bcc: emailData.bcc || [],
        subject: emailData.subject,
        text: emailData.bodyPlain,
        html: emailData.bodyHtml,
        replyTo: smtpConfigObj.replyTo
      });

      // Update log as sent
      emailLog.markAsSent(info);
      await cosmosService.updateItem(this.containerName, emailLog.toJSON());

      // Increment SMTP usage
      smtpConfigObj.incrementUsage();
      await cosmosService.updateItem(this.containerName, smtpConfigObj.toJSON());

      return savedLog;
    } catch (error) {
      // Update log as failed
      emailLog.markAsFailed(error.message);
      await cosmosService.updateItem(this.containerName, emailLog.toJSON());

      throw error;
    }
  }

  /**
   * Process email queue
   */
  async processEmailQueue(organizationId, batchSize = 10) {
    if (this.queueProcessing) return;

    this.queueProcessing = true;

    try {
      const query = `
        SELECT * FROM c 
        WHERE c.organizationId = @organizationId
        AND c.type_doc = 'email_log'
        AND c.status IN ('queued', 'failed')
        AND (c.scheduledAt = null OR c.scheduledAt <= @now)
        ORDER BY c.priority DESC, c.createdAt ASC
        OFFSET 0 ROWS FETCH NEXT ${batchSize} ROWS ONLY
      `;

      const parameters = [
        { name: '@organizationId', value: organizationId },
        { name: '@now', value: new Date().toISOString() }
      ];

      const emails = await cosmosService.queryItems(
        this.containerName,
        query,
        parameters
      );

      for (const email of emails) {
        const emailLog = new EmailLog(email);
        
        // Check if should retry
        if (emailLog.status === 'failed' && !emailLog.shouldRetry()) {
          continue;
        }

        try {
          await this.sendEmail(organizationId, {
            to: emailLog.to,
            cc: emailLog.cc,
            bcc: emailLog.bcc,
            subject: emailLog.subject,
            bodyHtml: emailLog.bodyHtml,
            bodyPlain: emailLog.bodyPlain,
            priority: emailLog.priority
          }, emailLog.smtpConfig.id);
        } catch (error) {
          console.error(`Failed to send email ${emailLog.id}:`, error);
        }
      }
    } finally {
      this.queueProcessing = false;
    }
  }

  /**
   * Get email logs
   */
  async getEmailLogs(organizationId, filters = {}, page = 1, limit = 50) {
    const { status, startDate, endDate, to } = filters;

    let conditions = [
      'c.organizationId = @organizationId',
      "c.type_doc = 'email_log'"
    ];

    const parameters = [
      { name: '@organizationId', value: organizationId }
    ];

    if (status) {
      conditions.push('c.status = @status');
      parameters.push({ name: '@status', value: status });
    }

    if (startDate) {
      conditions.push('c.createdAt >= @startDate');
      parameters.push({ name: '@startDate', value: startDate });
    }

    if (endDate) {
      conditions.push('c.createdAt <= @endDate');
      parameters.push({ name: '@endDate', value: endDate });
    }

    if (to) {
      conditions.push('ARRAY_CONTAINS(c.to, @to)');
      parameters.push({ name: '@to', value: to });
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
      logs: results,
      pagination: {
        page,
        limit,
        total: countResult[0] || 0,
        pages: Math.ceil((countResult[0] || 0) / limit)
      }
    };
  }

  /**
   * Get transporter for SMTP config (with caching)
   */
  async _getTransporter(smtpConfig) {
    if (this.transportCache.has(smtpConfig.id)) {
      return this.transportCache.get(smtpConfig.id);
    }

    const transporter = nodemailer.createTransporter(
      smtpConfig.getConnectionOptions()
    );

    // Verify connection
    await transporter.verify();

    this.transportCache.set(smtpConfig.id, transporter);

    return transporter;
  }

  /**
   * Get SMTP config by ID (private - includes password)
   */
  async _getSMTPConfigById(configId, organizationId) {
    const query = `
      SELECT * FROM c 
      WHERE c.id = @configId 
      AND c.organizationId = @organizationId
      AND c.type_doc = 'smtp_config'
    `;

    const parameters = [
      { name: '@configId', value: configId },
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
   * Unset default flag for other SMTP configs
   */
  async _unsetDefaultSMTPConfigs(organizationId) {
    const query = `
      SELECT * FROM c 
      WHERE c.organizationId = @organizationId
      AND c.type_doc = 'smtp_config'
      AND c.isDefault = true
    `;

    const parameters = [
      { name: '@organizationId', value: organizationId }
    ];

    const configs = await cosmosService.queryItems(
      this.containerName,
      query,
      parameters
    );

    for (const config of configs) {
      const smtpConfig = new SMTPConfig(config);
      smtpConfig.isDefault = false;
      await cosmosService.updateItem(this.containerName, smtpConfig.toJSON());
    }
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
        entityType: 'email',
        details
      });

      await cosmosService.createItem('AuditLogs', auditLog.toJSON());
    } catch (error) {
      console.error('Failed to create audit log:', error);
    }
  }
}

module.exports = new EmailSenderService();
