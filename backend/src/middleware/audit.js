const AuditLog = require('../models/AuditLog');
const cosmosService = require('../services/cosmosService');
const { extractChanges, createAuditDescription, generateChangeDescription } = require('../utils/auditHelpers');
const geolocationService = require('../services/geolocationService');

function coerceDetails(details) {
  if (details === null || details === undefined) return '';
  if (typeof details === 'string') return details;
  if (typeof details === 'number' || typeof details === 'boolean') return String(details);
  if (typeof details === 'object') {
    if (typeof details.message === 'string') return details.message;
    try {
      return JSON.stringify(details);
    } catch {
      return String(details);
    }
  }
  return String(details);
}

const auditLogger = (action, resource) => {
  return async (req, res, next) => {
    // Store original json method
    const originalJson = res.json;

    // Override json method to capture response
    res.json = async function(data) {
      // Create audit log entry
      // Skip GET requests to reduce noise (navigation), only log mutations
      // Also skip specific routes that shouldn't be logged
      const shouldLog = req.user && 
                        res.statusCode < 400 && 
                        req.method !== 'GET' &&
                        !req.originalUrl.includes('/QA/bulk-process');

      if (shouldLog) {
        const fullName = typeof req.user.getFullName === 'function'
          ? req.user.getFullName()
          : [req.user.firstName, req.user.lastName].filter(Boolean).join(' ') || req.user.username || req.user.email || 'Unknown User';
        
        // Get location from IP address
        const ipAddress = req.ip || req.connection.remoteAddress;
        const location = await geolocationService.getCountryFromIP(ipAddress).catch(() => null);
        
        const auditLog = new AuditLog({
          organizationId: req.user.organizationId,
          userId: req.user.id,
          userName: fullName,
          action: action || req.method.toLowerCase(),
          resource: resource || req.route?.path?.split('/')[1] || 'unknown',
          resourceId: req.params.id || req.params.userId || req.params.drugId || req.params.studyId,
          details: `${req.method} ${req.originalUrl}`,
          ipAddress,
          userAgent: req.get('User-Agent'),
          location,
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

const auditAction = async (user, action, resource, resourceId, details, metadata = {}, beforeValue = null, afterValue = null, ipAddress = null) => {
  try {
    // Extract field-level changes if before and after values are provided
    let changes = [];
    const baseDetails = coerceDetails(details).trim();
    let enrichedDetails = baseDetails;

    if (beforeValue !== null && afterValue !== null) {
      changes = extractChanges(beforeValue, afterValue);
      
      // Enrich details with change information
      if (changes.length > 0) {
        // Keep caller-provided details short/plain. Use generic description only when no message is provided.
        // The UI can render `changes` in a friendly way.
        enrichedDetails = baseDetails ? baseDetails : createAuditDescription(action, resource, resourceId, changes);
      }
    }

    // Get location from IP address if provided
    let location = null;
    if (ipAddress) {
      location = await geolocationService.getCountryFromIP(ipAddress).catch(() => null);
    }

    const auditLog = new AuditLog({
      organizationId: user.organizationId,
      userId: user.id,
      userName: user.getFullName(),
      action,
      resource,
      resourceId,
      details: enrichedDetails,
      ipAddress,
      location,
      metadata,
      beforeValue,
      afterValue,
      changes
    });

    await cosmosService.createItem('audit-logs', auditLog.toJSON());
  } catch (error) {
    console.error('Failed to create audit log:', error);
  }
};

module.exports = {
  auditLogger,
  auditAction
};
