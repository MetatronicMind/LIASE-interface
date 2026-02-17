const express = require('express');
const router = express.Router();
const { body, param, query, validationResult } = require('express-validator');
const authenticateToken = require('../middleware/auth');
const emailSenderService = require('../services/emailSenderService');

/**
 * Email Routes
 * Handles email templates, SMTP configuration, and email sending
 */

// Validation middleware
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// ========== Email Templates ==========

// Get all email templates
router.get(
  '/templates',
  authenticateToken,
  [
    query('category').optional().isString(),
    query('status').optional().isIn(['draft', 'active', 'archived']),
    query('isLocked').optional().isBoolean()
  ],
  validate,
  async (req, res) => {
    try {
      const templates = await emailSenderService.getEmailTemplates(
        req.user.organizationId,
        req.query
      );

      res.json(templates);
    } catch (error) {
      console.error('Error getting email templates:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Get email template by ID
router.get(
  '/templates/:id',
  authenticateToken,
  [param('id').notEmpty()],
  validate,
  async (req, res) => {
    try {
      const template = await emailSenderService.getEmailTemplateById(
        req.params.id,
        req.user.organizationId
      );

      if (!template) {
        return res.status(404).json({ error: 'Email template not found' });
      }

      res.json(template);
    } catch (error) {
      console.error('Error getting email template:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Create email template
router.post(
  '/templates',
  authenticateToken,
  [
    body('name').notEmpty().trim(),
    body('subject').notEmpty().trim(),
    body('bodyHtml').notEmpty(),
    body('variables').optional().isArray(),
    body('category').optional().isString(),
    body('status').optional().isIn(['draft', 'active', 'archived'])
  ],
  validate,
  async (req, res) => {
    try {
      const templateData = {
        ...req.body,
        organizationId: req.user.organizationId
      };

      const template = await emailSenderService.createEmailTemplate(
        templateData,
        req.user.id
      );

      res.status(201).json(template);
    } catch (error) {
      console.error('Error creating email template:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Update email template
router.put(
  '/templates/:id',
  authenticateToken,
  [param('id').notEmpty()],
  validate,
  async (req, res) => {
    try {
      const updated = await emailSenderService.updateEmailTemplate(
        req.params.id,
        req.user.organizationId,
        req.body,
        req.user.id
      );

      res.json(updated);
    } catch (error) {
      console.error('Error updating email template:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Lock email template
router.post(
  '/templates/:id/lock',
  authenticateToken,
  [
    param('id').notEmpty(),
    body('reason').optional().isString()
  ],
  validate,
  async (req, res) => {
    try {
      const locked = await emailSenderService.lockEmailTemplate(
        req.params.id,
        req.user.organizationId,
        req.user.id,
        req.body.reason
      );

      res.json(locked);
    } catch (error) {
      console.error('Error locking email template:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Unlock email template (admin only)
router.post(
  '/templates/:id/unlock',
  authenticateToken,
  [param('id').notEmpty()],
  validate,
  async (req, res) => {
    try {
      // Check if user has admin permissions
      if (!req.user.permissions?.email_templates?.unlock) {
        return res.status(403).json({ error: 'Insufficient permissions to unlock templates' });
      }

      const unlocked = await emailSenderService.unlockEmailTemplate(
        req.params.id,
        req.user.organizationId,
        req.user.id
      );

      res.json(unlocked);
    } catch (error) {
      console.error('Error unlocking email template:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Create new version of template
router.post(
  '/templates/:id/version',
  authenticateToken,
  [param('id').notEmpty()],
  validate,
  async (req, res) => {
    try {
      const newVersion = await emailSenderService.createTemplateVersion(
        req.params.id,
        req.user.organizationId,
        req.user.id
      );

      res.status(201).json(newVersion);
    } catch (error) {
      console.error('Error creating template version:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Delete email template
router.delete(
  '/templates/:id',
  authenticateToken,
  [param('id').notEmpty()],
  validate,
  async (req, res) => {
    try {
      const result = await emailSenderService.deleteEmailTemplate(
        req.params.id,
        req.user.organizationId,
        req.user.id
      );

      res.json(result);
    } catch (error) {
      console.error('Error deleting email template:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Render template with data (preview)
router.post(
  '/templates/:id/render',
  authenticateToken,
  [
    param('id').notEmpty(),
    body('data').isObject()
  ],
  validate,
  async (req, res) => {
    try {
      const rendered = await emailSenderService.renderTemplate(
        req.params.id,
        req.user.organizationId,
        req.body.data
      );

      res.json(rendered);
    } catch (error) {
      console.error('Error rendering template:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// ========== SMTP Configuration ==========

// Get all SMTP configurations
router.get(
  '/smtp',
  authenticateToken,
  async (req, res) => {
    try {
      const configs = await emailSenderService.getSMTPConfigs(
        req.user.organizationId
      );

      res.json(configs);
    } catch (error) {
      console.error('Error getting SMTP configs:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Alias for /smtp-config (compatibility with frontend)
router.get(
  '/smtp-config',
  authenticateToken,
  async (req, res) => {
    try {
      const configs = await emailSenderService.getSMTPConfigs(
        req.user.organizationId
      );

      res.json(configs);
    } catch (error) {
      console.error('Error getting SMTP configs:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Create SMTP configuration
router.post(
  '/smtp',
  authenticateToken,
  [
    body('name').notEmpty().trim(),
    body('host').notEmpty().trim(),
    body('port').isInt({ min: 1, max: 65535 }),
    body('secure').optional().isBoolean(),
    body('user').notEmpty().trim(),
    body('password').notEmpty(),
    body('fromEmail').isEmail(),
    body('fromName').notEmpty().trim(),
    body('provider').optional().isIn(['gmail', 'sendgrid', 'ses', 'custom'])
  ],
  validate,
  async (req, res) => {
    try {
      const configData = {
        ...req.body,
        organizationId: req.user.organizationId,
        username: req.body.user || req.body.username
      };

      const config = await emailSenderService.createSMTPConfig(
        configData,
        req.user.id
      );

      res.status(201).json(config);
    } catch (error) {
      console.error('Error creating SMTP config:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Alias for /smtp-config (compatibility with frontend)
router.post(
  '/smtp-config',
  authenticateToken,
  [
    body('name').notEmpty().trim(),
    body('host').notEmpty().trim(),
    body('port').isInt({ min: 1, max: 65535 }),
    body('secure').optional().isBoolean(),
    body('user').notEmpty().trim(),
    body('password').notEmpty(),
    body('fromEmail').isEmail(),
    body('fromName').notEmpty().trim(),
    body('provider').optional().isIn(['gmail', 'sendgrid', 'ses', 'custom'])
  ],
  validate,
  async (req, res) => {
    try {
      const configData = {
        ...req.body,
        organizationId: req.user.organizationId,
        username: req.body.user || req.body.username
      };

      const config = await emailSenderService.createSMTPConfig(
        configData,
        req.user.id
      );

      res.status(201).json(config);
    } catch (error) {
      console.error('Error creating SMTP config:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Test SMTP configuration (before saving)
router.post(
  '/smtp-config/test',
  authenticateToken,
  async (req, res) => {
    try {
      console.log('Received test request body:', JSON.stringify(req.body, null, 2));
      
      // Manual validation with better error messages
      const { host, port, secure, user, password, fromEmail } = req.body;
      
      if (!host || !host.trim()) {
        return res.status(400).json({ error: 'Host is required' });
      }
      if (!port || port < 1 || port > 65535) {
        return res.status(400).json({ error: 'Valid port (1-65535) is required' });
      }
      if (!user || !user.trim()) {
        return res.status(400).json({ error: 'Username is required' });
      }
      if (!password) {
        return res.status(400).json({ error: 'Password is required' });
      }
      if (!fromEmail || !fromEmail.includes('@')) {
        return res.status(400).json({ error: 'Valid from email is required' });
      }

      const nodemailer = require('nodemailer');
      
      console.log('Creating transporter with:', { host, port, secure, user });
      
      // Create a test transporter with the provided config
      const transporter = nodemailer.createTransport({
        host: host.trim(),
        port: parseInt(port),
        secure: secure || false,
        auth: {
          user: user.trim(),
          pass: password
        }
      });

      // Verify the connection
      await transporter.verify();
      
      console.log('SMTP test successful');
      res.json({ 
        success: true, 
        message: 'SMTP configuration is valid and connection successful' 
      });
    } catch (error) {
      console.error('SMTP test failed:', error);
      res.status(400).json({ 
        success: false, 
        error: error.message 
      });
    }
  }
);

// Update SMTP configuration
router.put(
  '/smtp/:id',
  authenticateToken,
  [param('id').notEmpty()],
  validate,
  async (req, res) => {
    try {
      const updated = await emailSenderService.updateSMTPConfig(
        req.params.id,
        req.user.organizationId,
        req.body,
        req.user.id
      );

      res.json(updated);
    } catch (error) {
      console.error('Error updating SMTP config:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Test SMTP configuration
router.post(
  '/smtp/:id/test',
  authenticateToken,
  [
    param('id').notEmpty(),
    body('testEmail').isEmail()
  ],
  validate,
  async (req, res) => {
    try {
      const result = await emailSenderService.testSMTPConfig(
        req.params.id,
        req.user.organizationId,
        req.body.testEmail
      );

      res.json(result);
    } catch (error) {
      console.error('Error testing SMTP config:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Delete SMTP configuration
router.delete(
  '/smtp/:id',
  authenticateToken,
  [param('id').notEmpty()],
  validate,
  async (req, res) => {
    try {
      const result = await emailSenderService.deleteSMTPConfig(
        req.params.id,
        req.user.organizationId,
        req.user.id
      );

      res.json(result);
    } catch (error) {
      console.error('Error deleting SMTP config:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// ========== Email Sending ==========

// Send email immediately
router.post(
  '/send',
  authenticateToken,
  [
    body('to').custom(value => {
      if (Array.isArray(value)) {
        return value.every(email => typeof email === 'string');
      }
      return typeof value === 'string';
    }),
    body('subject').notEmpty().trim(),
    body('bodyHtml').notEmpty(),
    body('bodyPlain').optional().isString(),
    body('cc').optional().isArray(),
    body('bcc').optional().isArray(),
    body('smtpConfigId').optional().isString()
  ],
  validate,
  async (req, res) => {
    try {
      const emailData = req.body;
      
      const result = await emailSenderService.sendEmail(
        req.user.organizationId,
        emailData,
        emailData.smtpConfigId
      );

      res.json(result);
    } catch (error) {
      console.error('Error sending email:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Queue email for sending
router.post(
  '/queue',
  authenticateToken,
  [
    body('to').custom(value => {
      if (Array.isArray(value)) {
        return value.every(email => typeof email === 'string');
      }
      return typeof value === 'string';
    }),
    body('subject').notEmpty().trim(),
    body('bodyHtml').notEmpty(),
    body('priority').optional().isIn(['low', 'normal', 'high']),
    body('scheduledAt').optional().isISO8601()
  ],
  validate,
  async (req, res) => {
    try {
      const emailData = {
        ...req.body,
        organizationId: req.user.organizationId
      };

      const result = await emailSenderService.queueEmail(emailData);

      res.status(201).json(result);
    } catch (error) {
      console.error('Error queueing email:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Get email logs
router.get(
  '/logs',
  authenticateToken,
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('status').optional().isString(),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601()
  ],
  validate,
  async (req, res) => {
    try {
      const { page = 1, limit = 50, ...filters } = req.query;
      
      const result = await emailSenderService.getEmailLogs(
        req.user.organizationId,
        filters,
        parseInt(page),
        parseInt(limit)
      );

      res.json(result);
    } catch (error) {
      console.error('Error getting email logs:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

module.exports = router;
