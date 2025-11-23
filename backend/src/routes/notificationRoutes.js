const express = require('express');
const router = express.Router();
const { body, param, query, validationResult } = require('express-validator');
const authenticateToken = require('../middleware/auth');
const notificationManagementService = require('../services/notificationManagementService');

/**
 * Notification Routes
 * Handles notification management and delivery
 */

// Validation middleware
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// Get all notifications
router.get(
  '/',
  authenticateToken,
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('status').optional().isIn(['pending', 'queued', 'sent', 'delivered', 'failed', 'retrying']),
    query('type').optional().isIn(['info', 'warning', 'error', 'success', 'report']),
    query('priority').optional().isIn(['low', 'normal', 'high', 'urgent'])
  ],
  validate,
  async (req, res) => {
    try {
      const { page = 1, limit = 50, ...filters } = req.query;
      
      const result = await notificationManagementService.getNotifications(
        req.user.organizationId,
        filters,
        parseInt(page),
        parseInt(limit)
      );

      res.json(result);
    } catch (error) {
      console.error('Error getting notifications:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Get notification by ID
router.get(
  '/:id',
  authenticateToken,
  [param('id').notEmpty()],
  validate,
  async (req, res) => {
    try {
      const notification = await notificationManagementService.getNotificationById(
        req.params.id,
        req.user.organizationId
      );

      if (!notification) {
        return res.status(404).json({ error: 'Notification not found' });
      }

      res.json(notification);
    } catch (error) {
      console.error('Error getting notification:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Create notification
router.post(
  '/',
  authenticateToken,
  [
    body('type').isIn(['info', 'warning', 'error', 'success', 'report']),
    body('title').notEmpty().trim(),
    body('message').notEmpty().trim(),
    body('recipients').isArray({ min: 1 }),
    body('channels').optional().isArray(),
    body('priority').optional().isIn(['low', 'normal', 'high', 'urgent']),
    body('scheduledAt').optional().isISO8601()
  ],
  validate,
  async (req, res) => {
    try {
      const notificationData = {
        ...req.body,
        organizationId: req.user.organizationId
      };

      const notification = await notificationManagementService.createNotification(
        notificationData,
        req.user.id
      );

      res.status(201).json(notification);
    } catch (error) {
      console.error('Error creating notification:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Update notification status
router.patch(
  '/:id/status',
  authenticateToken,
  [
    param('id').notEmpty(),
    body('status').isIn(['sent', 'delivered', 'failed']),
    body('error').optional().isString()
  ],
  validate,
  async (req, res) => {
    try {
      const { status, error } = req.body;
      
      const updated = await notificationManagementService.updateNotificationStatus(
        req.params.id,
        req.user.organizationId,
        status,
        { error }
      );

      res.json(updated);
    } catch (error) {
      console.error('Error updating notification status:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Retry failed notifications
router.post(
  '/retry',
  authenticateToken,
  async (req, res) => {
    try {
      const retriedIds = await notificationManagementService.retryFailedNotifications(
        req.user.organizationId
      );

      res.json({ 
        success: true, 
        retriedCount: retriedIds.length,
        notificationIds: retriedIds
      });
    } catch (error) {
      console.error('Error retrying notifications:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Get notification statistics
router.get(
  '/stats/summary',
  authenticateToken,
  [
    query('startDate').isISO8601(),
    query('endDate').isISO8601()
  ],
  validate,
  async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      
      const stats = await notificationManagementService.getNotificationStats(
        req.user.organizationId,
        startDate,
        endDate
      );

      res.json(stats);
    } catch (error) {
      console.error('Error getting notification stats:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// ========== Notification Rules ==========

// Get all notification rules
router.get(
  '/rules/list',
  authenticateToken,
  [query('isActive').optional().isBoolean()],
  validate,
  async (req, res) => {
    try {
      const isActive = req.query.isActive !== undefined 
        ? req.query.isActive === 'true' 
        : null;
      
      const rules = await notificationManagementService.getNotificationRules(
        req.user.organizationId,
        isActive
      );

      res.json(rules);
    } catch (error) {
      console.error('Error getting notification rules:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Get notification rule by ID
router.get(
  '/rules/:id',
  authenticateToken,
  [param('id').notEmpty()],
  validate,
  async (req, res) => {
    try {
      const rule = await notificationManagementService.getNotificationRuleById(
        req.params.id,
        req.user.organizationId
      );

      if (!rule) {
        return res.status(404).json({ error: 'Notification rule not found' });
      }

      res.json(rule);
    } catch (error) {
      console.error('Error getting notification rule:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Create notification rule
router.post(
  '/rules',
  authenticateToken,
  [
    body('name').notEmpty().trim(),
    body('triggerType').isIn(['scheduled', 'event', 'manual']),
    body('scheduleType').optional().isIn(['once', 'daily', 'weekly', 'monthly', 'cron']),
    body('notificationTemplate').isObject(),
    body('recipientConfig').isObject()
  ],
  validate,
  async (req, res) => {
    try {
      const ruleData = {
        ...req.body,
        organizationId: req.user.organizationId
      };

      const rule = await notificationManagementService.createNotificationRule(
        ruleData,
        req.user.id
      );

      res.status(201).json(rule);
    } catch (error) {
      console.error('Error creating notification rule:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Update notification rule
router.put(
  '/rules/:id',
  authenticateToken,
  [param('id').notEmpty()],
  validate,
  async (req, res) => {
    try {
      const updated = await notificationManagementService.updateNotificationRule(
        req.params.id,
        req.user.organizationId,
        req.body,
        req.user.id
      );

      res.json(updated);
    } catch (error) {
      console.error('Error updating notification rule:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Delete notification rule
router.delete(
  '/rules/:id',
  authenticateToken,
  [param('id').notEmpty()],
  validate,
  async (req, res) => {
    try {
      const result = await notificationManagementService.deleteNotificationRule(
        req.params.id,
        req.user.organizationId,
        req.user.id
      );

      res.json(result);
    } catch (error) {
      console.error('Error deleting notification rule:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Trigger notification rule manually
router.post(
  '/rules/:id/trigger',
  authenticateToken,
  [
    param('id').notEmpty(),
    body('context').optional().isObject()
  ],
  validate,
  async (req, res) => {
    try {
      const notification = await notificationManagementService.triggerNotificationRule(
        req.params.id,
        req.user.organizationId,
        req.user.id,
        req.body.context || {}
      );

      res.json(notification);
    } catch (error) {
      console.error('Error triggering notification rule:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

module.exports = router;
