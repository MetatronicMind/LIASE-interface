const express = require('express');
const router = express.Router();
const { body, param, query, validationResult } = require('express-validator');
const authenticateToken = require('../middleware/auth');
const adminConfigService = require('../services/adminConfigService');
const schedulerService = require('../services/schedulerService');

/**
 * Admin Configuration Routes
 * Handles admin configuration for personalization, session, security, etc.
 */

// Validation middleware
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// Middleware to check admin permissions
const requireAdmin = (req, res, next) => {
  if (!req.user.permissions?.admin_config?.manage) {
    return res.status(403).json({ error: 'Admin permissions required' });
  }
  next();
};

// ========== General Config Operations ==========

// Get all configs for organization
router.get(
  '/',
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const configs = await adminConfigService.getAllConfigs(
        req.user.organizationId
      );

      res.json(configs);
    } catch (error) {
      console.error('Error getting configs:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Get specific config type
router.get(
  '/:configType',
  authenticateToken,
  requireAdmin,
  [
    param('configType').isIn([
      'personalization',
      'session',
      'notification',
      'scheduler',
      'migration',
      'security'
    ])
  ],
  validate,
  async (req, res) => {
    try {
      const config = await adminConfigService.getConfig(
        req.user.organizationId,
        req.params.configType
      );

      res.json(config);
    } catch (error) {
      console.error('Error getting config:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Update config
router.put(
  '/:configType',
  authenticateToken,
  requireAdmin,
  [
    param('configType').isIn([
      'personalization',
      'session',
      'notification',
      'scheduler',
      'migration',
      'security'
    ]),
    body('configData').isObject()
  ],
  validate,
  async (req, res) => {
    try {
      const updated = await adminConfigService.updateConfig(
        req.user.organizationId,
        req.params.configType,
        req.body.configData,
        req.user.id
      );

      res.json(updated);
    } catch (error) {
      console.error('Error updating config:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Get specific config value
router.get(
  '/:configType/value',
  authenticateToken,
  [
    param('configType').isIn([
      'personalization',
      'session',
      'notification',
      'scheduler',
      'migration',
      'security'
    ]),
    query('path').notEmpty()
  ],
  validate,
  async (req, res) => {
    try {
      const value = await adminConfigService.getConfigValue(
        req.user.organizationId,
        req.params.configType,
        req.query.path
      );

      res.json({ value });
    } catch (error) {
      console.error('Error getting config value:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Set specific config value
router.post(
  '/:configType/value',
  authenticateToken,
  requireAdmin,
  [
    param('configType').isIn([
      'personalization',
      'session',
      'notification',
      'scheduler',
      'migration',
      'security'
    ]),
    body('path').notEmpty(),
    body('value').exists()
  ],
  validate,
  async (req, res) => {
    try {
      const updated = await adminConfigService.setConfigValue(
        req.user.organizationId,
        req.params.configType,
        req.body.path,
        req.body.value,
        req.user.id
      );

      res.json(updated);
    } catch (error) {
      console.error('Error setting config value:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// ========== Personalization ==========

// Upload branding asset
router.post(
  '/personalization/branding/upload',
  authenticateToken,
  requireAdmin,
  [
    body('assetType').isIn(['logo', 'favicon']),
    body('dataUrl').notEmpty()
  ],
  validate,
  async (req, res) => {
    try {
      const updated = await adminConfigService.uploadBrandingAsset(
        req.user.organizationId,
        req.body.assetType,
        { dataUrl: req.body.dataUrl },
        req.user.id
      );

      res.json(updated);
    } catch (error) {
      console.error('Error uploading branding asset:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// ========== Security ==========

// Validate password against policy
router.post(
  '/security/validate-password',
  authenticateToken,
  [body('password').notEmpty()],
  validate,
  async (req, res) => {
    try {
      const validation = await adminConfigService.validatePassword(
        req.body.password,
        req.user.organizationId
      );

      res.json(validation);
    } catch (error) {
      console.error('Error validating password:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Check if password change required
router.get(
  '/security/password-change-required/:userId',
  authenticateToken,
  [param('userId').notEmpty()],
  validate,
  async (req, res) => {
    try {
      const required = await adminConfigService.isPasswordChangeRequired(
        req.params.userId,
        req.user.organizationId
      );

      res.json({ required });
    } catch (error) {
      console.error('Error checking password change requirement:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// ========== Import/Export ==========

// Export all configs
router.get(
  '/export',
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const exportData = await adminConfigService.exportConfigs(
        req.user.organizationId
      );

      res.json(exportData);
    } catch (error) {
      console.error('Error exporting configs:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Import configs
router.post(
  '/import',
  authenticateToken,
  requireAdmin,
  [body('configs').isArray()],
  validate,
  async (req, res) => {
    try {
      const results = await adminConfigService.importConfigs(
        req.user.organizationId,
        { configs: req.body.configs },
        req.user.id
      );

      res.json(results);
    } catch (error) {
      console.error('Error importing configs:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// ========== Scheduled Jobs ==========

// Get all scheduled jobs
router.get(
  '/scheduler/jobs',
  authenticateToken,
  requireAdmin,
  [
    query('jobType').optional().isString(),
    query('isActive').optional().isBoolean(),
    query('status').optional().isString()
  ],
  validate,
  async (req, res) => {
    try {
      const jobs = await schedulerService.getScheduledJobs(
        req.user.organizationId,
        req.query
      );

      res.json(jobs);
    } catch (error) {
      console.error('Error getting scheduled jobs:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Get scheduled job by ID
router.get(
  '/scheduler/jobs/:id',
  authenticateToken,
  requireAdmin,
  [param('id').notEmpty()],
  validate,
  async (req, res) => {
    try {
      const job = await schedulerService.getScheduledJobById(
        req.params.id,
        req.user.organizationId
      );

      if (!job) {
        return res.status(404).json({ error: 'Scheduled job not found' });
      }

      res.json(job);
    } catch (error) {
      console.error('Error getting scheduled job:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Create scheduled job
router.post(
  '/scheduler/jobs',
  authenticateToken,
  requireAdmin,
  [
    body('name').notEmpty().trim(),
    body('jobType').isIn(['report', 'notification', 'cleanup', 'backup', 'custom']),
    body('scheduleType').isIn(['cron', 'interval', 'once']),
    body('cronExpression').optional().isString(),
    body('intervalMs').optional().isInt({ min: 1000 }),
    body('scheduledAt').optional().isISO8601(),
    body('payload').optional().isObject()
  ],
  validate,
  async (req, res) => {
    try {
      const jobData = {
        ...req.body,
        organizationId: req.user.organizationId
      };

      const job = await schedulerService.createScheduledJob(
        jobData,
        req.user.id
      );

      res.status(201).json(job);
    } catch (error) {
      console.error('Error creating scheduled job:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Update scheduled job
router.put(
  '/scheduler/jobs/:id',
  authenticateToken,
  requireAdmin,
  [param('id').notEmpty()],
  validate,
  async (req, res) => {
    try {
      const updated = await schedulerService.updateScheduledJob(
        req.params.id,
        req.user.organizationId,
        req.body,
        req.user.id
      );

      res.json(updated);
    } catch (error) {
      console.error('Error updating scheduled job:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Delete scheduled job
router.delete(
  '/scheduler/jobs/:id',
  authenticateToken,
  requireAdmin,
  [param('id').notEmpty()],
  validate,
  async (req, res) => {
    try {
      const result = await schedulerService.deleteScheduledJob(
        req.params.id,
        req.user.organizationId,
        req.user.id
      );

      res.json(result);
    } catch (error) {
      console.error('Error deleting scheduled job:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Execute job manually
router.post(
  '/scheduler/jobs/:id/execute',
  authenticateToken,
  requireAdmin,
  [param('id').notEmpty()],
  validate,
  async (req, res) => {
    try {
      const result = await schedulerService.executeJob(
        req.params.id,
        req.user.organizationId,
        req.user.id
      );

      res.json(result);
    } catch (error) {
      console.error('Error executing job:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Toggle job status (pause/resume)
router.patch(
  '/scheduler/jobs/:id/toggle',
  authenticateToken,
  requireAdmin,
  [
    param('id').notEmpty(),
    body('isActive').isBoolean()
  ],
  validate,
  async (req, res) => {
    try {
      const updated = await schedulerService.toggleJobStatus(
        req.params.id,
        req.user.organizationId,
        req.body.isActive,
        req.user.id
      );

      res.json(updated);
    } catch (error) {
      console.error('Error toggling job status:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Get job execution history
router.get(
  '/scheduler/jobs/:id/history',
  authenticateToken,
  requireAdmin,
  [
    param('id').notEmpty(),
    query('limit').optional().isInt({ min: 1, max: 100 })
  ],
  validate,
  async (req, res) => {
    try {
      const history = await schedulerService.getJobHistory(
        req.params.id,
        req.user.organizationId,
        parseInt(req.query.limit) || 50
      );

      res.json(history);
    } catch (error) {
      console.error('Error getting job history:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// ========== Super Admin System Configuration ==========

// Middleware to check super admin permissions
const requireSuperAdmin = (req, res, next) => {
  if (req.user.role !== 'superadmin') {
    return res.status(403).json({ error: 'Super admin permissions required' });
  }
  next();
};

// Get system configuration
router.get(
  '/system-config',
  authenticateToken,
  requireSuperAdmin,
  async (req, res) => {
    try {
      // Fetch system configuration from environment variables and database
      const systemConfig = {
        aiInferenceEndpoints: {
          primary: process.env.AI_INFERENCE_URL_1 || '',
          secondary: process.env.AI_INFERENCE_URL_2 || '',
          tertiary: process.env.AI_INFERENCE_URL_3 || '',
        },
        r3XmlEndpoint: process.env.R3_XML_ENDPOINT || '',
        pubmedApiEndpoint: process.env.PUBMED_API_ENDPOINT || 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/',
        backendPort: parseInt(process.env.PORT) || 8000,
        frontendPort: 3000,
        backendUrl: process.env.BACKEND_URL || 'http://localhost:8000',
        frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
        aiProcessing: {
          maxConcurrentRequests: parseInt(process.env.AI_MAX_CONCURRENT) || 5,
          requestTimeout: parseInt(process.env.AI_REQUEST_TIMEOUT) || 30000,
          retryAttempts: parseInt(process.env.AI_RETRY_ATTEMPTS) || 3,
          batchSize: parseInt(process.env.AI_BATCH_SIZE) || 10,
          enableCircuitBreaker: process.env.AI_CIRCUIT_BREAKER !== 'false',
          circuitBreakerThreshold: parseInt(process.env.AI_CIRCUIT_BREAKER_THRESHOLD) || 5,
        },
        database: {
          cosmosDbEndpoint: process.env.COSMOS_DB_ENDPOINT || '',
          databaseId: process.env.COSMOS_DB_DATABASE_ID || 'LIASE-DB',
          maxConnectionPoolSize: parseInt(process.env.DB_MAX_POOL_SIZE) || 100,
          requestTimeout: parseInt(process.env.DB_REQUEST_TIMEOUT) || 30000,
        },
        rateLimiting: {
          enabled: process.env.RATE_LIMIT_ENABLED !== 'false',
          windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) || 900000,
          maxRequests: parseInt(process.env.RATE_LIMIT_MAX) || 100,
        },
        email: {
          smtpHost: process.env.SMTP_HOST || '',
          smtpPort: parseInt(process.env.SMTP_PORT) || 587,
          smtpSecure: process.env.SMTP_SECURE === 'true',
          fromName: process.env.SMTP_FROM_NAME || 'LIASE Notifications',
          fromEmail: process.env.SMTP_FROM_EMAIL || '',
        },
        scheduler: {
          drugSearchInterval: process.env.DRUG_SEARCH_CRON || '0 */6 * * *',
          dailyReportsTime: process.env.DAILY_REPORTS_CRON || '0 9 * * *',
          notificationProcessingInterval: parseInt(process.env.NOTIFICATION_INTERVAL) || 10,
        },
        security: {
          jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
          passwordMinLength: parseInt(process.env.PASSWORD_MIN_LENGTH) || 8,
          enableMfa: process.env.ENABLE_MFA === 'true',
          sessionTimeout: parseInt(process.env.SESSION_TIMEOUT) || 60,
          maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 5,
        },
        maintenance: {
          enabled: process.env.MAINTENANCE_MODE === 'true',
          message: process.env.MAINTENANCE_MESSAGE || 'System is under maintenance. Please try again later.',
          allowedIps: (process.env.MAINTENANCE_ALLOWED_IPS || '').split(',').filter(ip => ip.trim()),
        },
      };

      res.json(systemConfig);
    } catch (error) {
      console.error('Error getting system config:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Update system configuration (saves to database for runtime changes)
router.post(
  '/system-config',
  authenticateToken,
  requireSuperAdmin,
  [
    body('aiInferenceEndpoints').optional().isObject(),
    body('r3XmlEndpoint').optional().isURL(),
    body('backendPort').optional().isInt({ min: 1000, max: 65535 }),
    body('frontendPort').optional().isInt({ min: 1000, max: 65535 }),
  ],
  validate,
  async (req, res) => {
    try {
      // Store system configuration in AdminConfig collection
      const config = await adminConfigService.updateConfig(
        req.user.organizationId,
        'system_config',
        req.body,
        req.user.id
      );

      res.json({
        success: true,
        message: 'System configuration saved successfully. Note: Environment variable changes require server restart.',
        config
      });
    } catch (error) {
      console.error('Error saving system config:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Test endpoint connectivity
router.post(
  '/test-endpoint',
  authenticateToken,
  requireSuperAdmin,
  [
    body('type').notEmpty(),
    body('url').isURL()
  ],
  validate,
  async (req, res) => {
    try {
      const { type, url } = req.body;
      const fetch = require('node-fetch');

      // Test the endpoint with a simple GET or POST request
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      try {
        const response = await fetch(url, {
          method: 'GET',
          signal: controller.signal,
          headers: {
            'User-Agent': 'LIASE-System-Test/1.0'
          }
        });

        clearTimeout(timeout);

        res.json({
          success: response.ok,
          message: response.ok 
            ? `Connection successful (Status: ${response.status})` 
            : `Connection failed (Status: ${response.status})`,
          statusCode: response.status,
          responseTime: response.headers.get('x-response-time') || 'N/A'
        });
      } catch (fetchError) {
        clearTimeout(timeout);
        
        if (fetchError.name === 'AbortError') {
          res.json({
            success: false,
            message: 'Connection timeout (>10 seconds)'
          });
        } else {
          res.json({
            success: false,
            message: `Connection error: ${fetchError.message}`
          });
        }
      }
    } catch (error) {
      console.error('Error testing endpoint:', error);
      res.status(500).json({ 
        success: false,
        error: error.message 
      });
    }
  }
);

module.exports = router;
