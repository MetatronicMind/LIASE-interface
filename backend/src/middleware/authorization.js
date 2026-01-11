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
    let hasPermission = false;

    // Method 1: Use User model method if available
    if (typeof req.user.hasPermission === 'function') {
      hasPermission = req.user.hasPermission(resource, action);
    } 
    // Method 2: Fallback manual check (if req.user is plain object)
    else {
      console.warn('Checking permissions on plain user object (missing prototype methods)');
      
      // Check for Admin/Super Admin role (case-insensitive, normalized)
      if (req.user.role) {
        const normalizedRole = req.user.role.toLowerCase().replace(/[\s_]/g, '');
        if (['admin', 'superadmin'].includes(normalizedRole)) {
          hasPermission = true;
        }
      }
      
      // Check explicit permissions if not already approved as admin
      if (!hasPermission && req.user.permissions && req.user.permissions[resource]) {
        hasPermission = req.user.permissions[resource][action] === true;
      }
    }

    // Implicitly allow 'read' and 'write' (but NOT 'delete') for the 'studies' resource
    // This replaces the configurable "Studies (Core)" permission module
    if (resource === 'studies' && (action === 'read' || action === 'write')) {
      hasPermission = true;
    }
    
    // Explicit override for admins - doubled check to be absolutely sure
    if (!hasPermission && req.user.role) {
      const normalizedRole = req.user.role.toLowerCase().replace(/[\s_]/g, '');
      const normalizedDisplayName = req.user.roleDisplayName ? req.user.roleDisplayName.toLowerCase().replace(/[\s_]/g, '') : '';
      if (['admin', 'superadmin'].includes(normalizedRole) || ['admin', 'superadmin'].includes(normalizedDisplayName)) {
        hasPermission = true;
      }
    }

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
  
  // Use isAdmin() method if available (User model instance), otherwise check role manualy
  const isUserAdmin = typeof req.user.isAdmin === 'function' 
    ? req.user.isAdmin() 
    : (req.user.role && ['admin', 'superadmin'].includes(req.user.role.toLowerCase()));

  if (isUserAdmin || req.user.id === targetUserId) {
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
