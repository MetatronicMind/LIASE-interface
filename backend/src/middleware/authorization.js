const authorizeRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    // Check if user has any of the allowed roles
    const hasAllowedRole = allowedRoles.some(role => {
      if (typeof req.user.hasRole === 'function') {
        return req.user.hasRole(role);
      }
      // Fallback to direct role comparison for backwards compatibility
      return req.user.role === role || req.user.role === role.toLowerCase();
    });

    if (!hasAllowedRole) {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS',
        required: allowedRoles,
        current: req.user.role
      });
    }

    next();
  };
};

const authorizePermission = (resource, action) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    // Check if user has the required permission
    const hasPermission = typeof req.user.hasPermission === 'function' 
      ? req.user.hasPermission(resource, action)
      : false;

    if (!hasPermission) {
      return res.status(403).json({ 
        error: `Permission denied for ${action} on ${resource}`,
        code: 'PERMISSION_DENIED',
        resource,
        action,
        userRole: req.user.role
      });
    }

    next();
  };
};

const authorizeSelfOrAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      error: 'Authentication required',
      code: 'AUTH_REQUIRED'
    });
  }

  const targetUserId = req.params.userId || req.params.id;
  
  if (req.user.role === 'Admin' || req.user.id === targetUserId) {
    return next();
  }

  return res.status(403).json({ 
    error: 'Can only access own resources or admin required',
    code: 'SELF_OR_ADMIN_REQUIRED'
  });
};

module.exports = {
  authorizeRole,
  authorizePermission,
  authorizeSelfOrAdmin
};
