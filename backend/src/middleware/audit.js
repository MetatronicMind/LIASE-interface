const AuditLog = require('../models/AuditLog');
const cosmosService = require('../services/cosmosService');

const auditLogger = (action, resource) => {
  return async (req, res, next) => {
    // Store original json method
    const originalJson = res.json;

    // Override json method to capture response
    res.json = function(data) {
      // Create audit log entry
      if (req.user && res.statusCode < 400) {
        const fullName = typeof req.user.getFullName === 'function'
          ? req.user.getFullName()
          : [req.user.firstName, req.user.lastName].filter(Boolean).join(' ') || req.user.username || req.user.email || 'Unknown User';
        const auditLog = new AuditLog({
          organizationId: req.user.organizationId,
          userId: req.user.id,
          userName: fullName,
          action: action || req.method.toLowerCase(),
          resource: resource || req.route?.path?.split('/')[1] || 'unknown',
          resourceId: req.params.id || req.params.userId || req.params.drugId || req.params.studyId,
          details: `${req.method} ${req.originalUrl}`,
          ipAddress: req.ip || req.connection.remoteAddress,
          userAgent: req.get('User-Agent'),
          metadata: {
            method: req.method,
            path: req.originalUrl,
            statusCode: res.statusCode,
            responseSize: JSON.stringify(data).length
          }
        });

        // Save audit log asynchronously (don't block response)
        cosmosService.createItem('audit-logs', auditLog.toJSON()).catch(error => {
          console.error('Failed to save audit log:', error);
        });
      }

      // Call original json method
      return originalJson.call(this, data);
    };

    next();
  };
};

const auditAction = async (user, action, resource, resourceId, details, metadata = {}) => {
  try {
    const auditLog = AuditLog.createResourceLog(
      user,
      action,
      resource,
      resourceId,
      details,
      metadata
    );

    await cosmosService.createItem('audit-logs', auditLog.toJSON());
  } catch (error) {
    console.error('Failed to create audit log:', error);
  }
};

module.exports = {
  auditLogger,
  auditAction
};
