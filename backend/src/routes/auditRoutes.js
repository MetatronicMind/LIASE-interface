const express = require('express');
const cosmosService = require('../services/cosmosService');
const { authorizePermission } = require('../middleware/authorization');

const router = express.Router();

// Get audit logs for organization
router.get('/',
  authorizePermission('audit', 'read'),
  async (req, res) => {
    try {
      const { 
        page = 1, 
        limit = 100, 
        action, 
        resource, 
        userId,
        startDate,
        endDate,
        sortOrder = 'desc' 
      } = req.query;

      let targetOrgId = req.user.organizationId;
      if (req.user.isSuperAdmin() && req.query.organizationId) {
        targetOrgId = req.query.organizationId;
      }

      let query = 'SELECT * FROM c WHERE c.organizationId = @orgId';
      const parameters = [{ name: '@orgId', value: targetOrgId }];

      // Add filters
      if (action) {
        query += ' AND c.action = @action';
        parameters.push({ name: '@action', value: action });
      }

      if (resource) {
        query += ' AND c.resource = @resource';
        parameters.push({ name: '@resource', value: resource });
      }

      if (userId) {
        query += ' AND c.userId = @userId';
        parameters.push({ name: '@userId', value: userId });
      }

      if (startDate) {
        query += ' AND c.timestamp >= @startDate';
        parameters.push({ name: '@startDate', value: startDate });
      }

      if (endDate) {
        query += ' AND c.timestamp <= @endDate';
        parameters.push({ name: '@endDate', value: endDate });
      }

      // Add sorting
      query += ` ORDER BY c.timestamp ${sortOrder.toUpperCase()}`;

      // Add pagination
      const offset = (page - 1) * limit;
      query += ` OFFSET ${offset} LIMIT ${limit}`;

      const auditLogs = await cosmosService.queryItems('audit-logs', query, parameters);

      res.json({
        auditLogs,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: auditLogs.length
        }
      });

    } catch (error) {
      console.error('Error fetching audit logs:', error);
      res.status(500).json({
        error: 'Failed to fetch audit logs',
        message: error.message
      });
    }
  }
);

// Get audit statistics
router.get('/stats',
  authorizePermission('audit', 'read'),
  async (req, res) => {
    try {
      const { days = 30 } = req.query;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(days));

      let targetOrgId = req.user.organizationId;
      if (req.user.isSuperAdmin() && req.query.organizationId) {
        targetOrgId = req.query.organizationId;
      }

      const auditLogs = await cosmosService.queryItems(
        'audit-logs',
        'SELECT * FROM c WHERE c.organizationId = @orgId AND c.timestamp >= @startDate ORDER BY c.timestamp DESC',
        [
          { name: '@orgId', value: targetOrgId },
          { name: '@startDate', value: startDate.toISOString() }
        ]
      );

      const stats = {
        total: auditLogs.length,
        byAction: {},
        byResource: {},
        byUser: {},
        byDay: {},
        topActions: [],
        topUsers: []
      };

      auditLogs.forEach(log => {
        // Count by action
        stats.byAction[log.action] = (stats.byAction[log.action] || 0) + 1;

        // Count by resource
        stats.byResource[log.resource] = (stats.byResource[log.resource] || 0) + 1;

        // Count by user
        const userKey = `${log.userName} (${log.userId})`;
        stats.byUser[userKey] = (stats.byUser[userKey] || 0) + 1;

        // Count by day
        const day = log.timestamp.split('T')[0]; // YYYY-MM-DD
        stats.byDay[day] = (stats.byDay[day] || 0) + 1;
      });

      // Get top actions
      stats.topActions = Object.entries(stats.byAction)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([action, count]) => ({ action, count }));

      // Get top users
      stats.topUsers = Object.entries(stats.byUser)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([user, count]) => ({ user, count }));

      res.json(stats);

    } catch (error) {
      console.error('Error fetching audit statistics:', error);
      res.status(500).json({
        error: 'Failed to fetch audit statistics',
        message: error.message
      });
    }
  }
);

// Get specific audit log
router.get('/:auditId',
  authorizePermission('audit', 'read'),
  async (req, res) => {
    try {
      const auditLog = await cosmosService.getItem('audit-logs', req.params.auditId, req.user.organizationId);
      
      if (!auditLog) {
        return res.status(404).json({
          error: 'Audit log not found'
        });
      }

      res.json(auditLog);

    } catch (error) {
      console.error('Error fetching audit log:', error);
      res.status(500).json({
        error: 'Failed to fetch audit log',
        message: error.message
      });
    }
  }
);

// Export audit logs (Admin only)
router.get('/export/csv',
  authorizePermission('audit', 'read'),
  async (req, res) => {
    try {
      // Only admins can export
      if (req.user.role !== 'Admin') {
        return res.status(403).json({
          error: 'Only administrators can export audit logs'
        });
      }

      const { 
        startDate, 
        endDate,
        action,
        resource 
      } = req.query;

      let query = 'SELECT * FROM c WHERE c.organizationId = @orgId';
      const parameters = [{ name: '@orgId', value: req.user.organizationId }];

      // Add filters
      if (action) {
        query += ' AND c.action = @action';
        parameters.push({ name: '@action', value: action });
      }

      if (resource) {
        query += ' AND c.resource = @resource';
        parameters.push({ name: '@resource', value: resource });
      }

      if (startDate) {
        query += ' AND c.timestamp >= @startDate';
        parameters.push({ name: '@startDate', value: startDate });
      }

      if (endDate) {
        query += ' AND c.timestamp <= @endDate';
        parameters.push({ name: '@endDate', value: endDate });
      }

      query += ' ORDER BY c.timestamp DESC';

      const auditLogs = await cosmosService.queryItems('audit-logs', query, parameters);

      // Generate CSV
      const csvHeaders = [
        'Timestamp',
        'User Name',
        'User ID',
        'Action',
        'Resource',
        'Resource ID',
        'Details',
        'IP Address'
      ];

      const csvRows = auditLogs.map(log => [
        log.timestamp,
        log.userName,
        log.userId,
        log.action,
        log.resource,
        log.resourceId || '',
        log.details,
        log.ipAddress || ''
      ]);

      const csvContent = [
        csvHeaders.join(','),
        ...csvRows.map(row => 
          row.map(cell => 
            typeof cell === 'string' && cell.includes(',') 
              ? `"${cell.replace(/"/g, '""')}"` 
              : cell
          ).join(',')
        )
      ].join('\n');

      // Set headers for file download
      const filename = `audit-logs-${req.user.organizationId}-${new Date().toISOString().split('T')[0]}.csv`;
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(csvContent);

      // Log the export action
      const AuditLog = require('../models/AuditLog');
      const { auditAction } = require('../middleware/audit');
      
      await auditAction(
        req.user,
        'export',
        'audit',
        'csv',
        `Exported ${auditLogs.length} audit log entries`,
        { format: 'csv', count: auditLogs.length, filters: { action, resource, startDate, endDate } }
      );

    } catch (error) {
      console.error('Error exporting audit logs:', error);
      res.status(500).json({
        error: 'Failed to export audit logs',
        message: error.message
      });
    }
  }
);

// Get available filter options
router.get('/filters/options',
  authorizePermission('audit', 'read'),
  async (req, res) => {
    try {
      const AuditLog = require('../models/AuditLog');
      
      // Get unique values for filters from recent logs
      const recentLogs = await cosmosService.queryItems(
        'audit-logs',
        'SELECT DISTINCT c.action, c.resource, c.userName FROM c WHERE c.organizationId = @orgId ORDER BY c.timestamp DESC OFFSET 0 LIMIT 1000',
        [{ name: '@orgId', value: req.user.organizationId }]
      );

      const uniqueActions = [...new Set(recentLogs.map(log => log.action))].sort();
      const uniqueResources = [...new Set(recentLogs.map(log => log.resource))].sort();
      const uniqueUsers = [...new Set(recentLogs.map(log => log.userName))].sort();

      res.json({
        actions: uniqueActions,
        resources: uniqueResources,
        users: uniqueUsers,
        availableActions: AuditLog.getActionTypes(),
        availableResources: AuditLog.getResourceTypes()
      });

    } catch (error) {
      console.error('Error fetching filter options:', error);
      res.status(500).json({
        error: 'Failed to fetch filter options',
        message: error.message
      });
    }
  }
);

module.exports = router;
