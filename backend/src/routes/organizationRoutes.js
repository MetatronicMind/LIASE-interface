const express = require('express');
const { body, validationResult } = require('express-validator');

const cosmosService = require('../services/cosmosService');
const Organization = require('../models/Organization');
const { authorizeRole } = require('../middleware/authorization');
const { auditAction } = require('../middleware/audit');

const router = express.Router();

// Get organization details
router.get('/me', async (req, res) => {
  try {
    const organization = await cosmosService.getItem('organizations', req.user.organizationId, req.user.organizationId);
    
    if (!organization) {
      return res.status(404).json({
        error: 'Organization not found'
      });
    }

    res.json(organization);

  } catch (error) {
    console.error('Error fetching organization:', error);
    res.status(500).json({
      error: 'Failed to fetch organization',
      message: error.message
    });
  }
});

// Update organization settings (Admin only)
router.put('/me',
  authorizeRole('Admin'),
  [
    body('name').optional().isLength({ min: 2 }),
    body('settings').optional().isObject()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const updates = req.body;
      
      // Remove fields that shouldn't be updated
      delete updates.id;
      delete updates.domain;
      delete updates.adminEmail;
      delete updates.plan; // Plan changes should go through billing
      delete updates.createdAt;

      const updatedOrganization = await cosmosService.updateItem(
        'organizations',
        req.user.organizationId,
        req.user.organizationId,
        updates
      );

      // Create audit log
      await auditAction(
        req.user,
        'update',
        'organization',
        req.user.organizationId,
        'Updated organization settings',
        { updates: Object.keys(updates) }
      );

      res.json({
        message: 'Organization updated successfully',
        organization: updatedOrganization
      });

    } catch (error) {
      console.error('Error updating organization:', error);
      res.status(500).json({
        error: 'Failed to update organization',
        message: error.message
      });
    }
  }
);

// Get organization statistics (Admin only)
router.get('/stats',
  authorizeRole('Admin'),
  async (req, res) => {
    try {
      const [users, drugs, studies, auditLogs] = await Promise.all([
        cosmosService.getUsersByOrganization(req.user.organizationId),
        cosmosService.getDrugsByOrganization(req.user.organizationId),
        cosmosService.getStudiesByOrganization(req.user.organizationId),
        cosmosService.getAuditLogsByOrganization(req.user.organizationId, 1000)
      ]);

      const stats = {
        users: {
          total: users.length,
          active: users.filter(u => u.isActive).length,
          byRole: users.reduce((acc, user) => {
            acc[user.role] = (acc[user.role] || 0) + 1;
            return acc;
          }, {})
        },
        drugs: {
          total: drugs.length,
          active: drugs.filter(d => d.status === 'Active').length,
          inactive: drugs.filter(d => d.status === 'Inactive').length,
          suspended: drugs.filter(d => d.status === 'Suspended').length
        },
        studies: {
          total: studies.length,
          pendingReview: studies.filter(s => ['Pending Review', 'Pending', 'Study in Process'].includes(s.status)).length,
          underReview: studies.filter(s => s.status === 'Under Review').length,
          approved: studies.filter(s => s.status === 'Approved').length,
          rejected: studies.filter(s => s.status === 'Rejected').length
        },
        activity: {
          totalActions: auditLogs.length,
          recentLogins: auditLogs.filter(log => 
            log.action === 'login' && 
            new Date(log.timestamp) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          ).length,
          topActions: Object.entries(
            auditLogs.reduce((acc, log) => {
              acc[log.action] = (acc[log.action] || 0) + 1;
              return acc;
            }, {})
          ).sort(([,a], [,b]) => b - a).slice(0, 5)
        }
      };

      res.json(stats);

    } catch (error) {
      console.error('Error fetching organization statistics:', error);
      res.status(500).json({
        error: 'Failed to fetch organization statistics',
        message: error.message
      });
    }
  }
);

// Get usage metrics (Admin only)
router.get('/usage',
  authorizeRole('Admin'),
  async (req, res) => {
    try {
      const organization = await cosmosService.getItem('organizations', req.user.organizationId, req.user.organizationId);
      
      if (!organization) {
        return res.status(404).json({
          error: 'Organization not found'
        });
      }

      const [users, drugs, studies] = await Promise.all([
        cosmosService.getUsersByOrganization(req.user.organizationId),
        cosmosService.getDrugsByOrganization(req.user.organizationId),
        cosmosService.getStudiesByOrganization(req.user.organizationId)
      ]);

      const usage = {
        plan: organization.plan,
        limits: organization.settings,
        current: {
          users: users.length,
          drugs: drugs.length,
          studies: studies.length
        },
        percentages: {
          users: Math.round((users.length / organization.settings.maxUsers) * 100),
          drugs: Math.round((drugs.length / organization.settings.maxDrugs) * 100),
          studies: Math.round((studies.length / organization.settings.maxStudies) * 100)
        },
        warnings: []
      };

      // Add warnings for approaching limits
      if (usage.percentages.users > 80) {
        usage.warnings.push(`User limit is ${usage.percentages.users}% full`);
      }
      if (usage.percentages.drugs > 80) {
        usage.warnings.push(`Drug limit is ${usage.percentages.drugs}% full`);
      }
      if (usage.percentages.studies > 80) {
        usage.warnings.push(`Study limit is ${usage.percentages.studies}% full`);
      }

      res.json(usage);

    } catch (error) {
      console.error('Error fetching usage metrics:', error);
      res.status(500).json({
        error: 'Failed to fetch usage metrics',
        message: error.message
      });
    }
  }
);

// Validate if organization can add more resources
router.post('/validate-limit',
  [
    body('resource').isIn(['users', 'drugs', 'studies']),
    body('count').optional().isInt({ min: 1 })
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { resource, count = 1 } = req.body;
      
      const organization = await cosmosService.getItem('organizations', req.user.organizationId, req.user.organizationId);
      
      if (!organization) {
        return res.status(404).json({
          error: 'Organization not found'
        });
      }

      // Get current count
      let currentCount = 0;
      const limitKey = `max${resource.charAt(0).toUpperCase() + resource.slice(1)}`;
      const limit = organization.settings[limitKey];

      switch (resource) {
        case 'users':
          const users = await cosmosService.getUsersByOrganization(req.user.organizationId);
          currentCount = users.length;
          break;
        case 'drugs':
          const drugs = await cosmosService.getDrugsByOrganization(req.user.organizationId);
          currentCount = drugs.length;
          break;
        case 'studies':
          const studies = await cosmosService.getStudiesByOrganization(req.user.organizationId);
          currentCount = studies.length;
          break;
      }

      const canAdd = (currentCount + count) <= limit;
      const remaining = limit - currentCount;

      res.json({
        resource,
        currentCount,
        limit,
        requestedCount: count,
        canAdd,
        remaining,
        wouldExceed: !canAdd,
        plan: organization.plan
      });

    } catch (error) {
      console.error('Error validating limit:', error);
      res.status(500).json({
        error: 'Failed to validate limit',
        message: error.message
      });
    }
  }
);

module.exports = router;
