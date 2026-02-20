// The SuperAdmin Organization ID - users from this org have superadmin privileges
const SUPER_ADMIN_ORG_ID = '94b7e106-1e86-4805-9725-5bdec4a4375f';

const authorizeRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    // Normalize allowed roles for comparison
    const normalizedAllowedRoles = allowedRoles.map(r => r.toLowerCase().replace(/[\s_]/g, ''));

    // Special case: If 'superadmin' is required AND user is from the SuperAdmin Organization, grant access
    if (normalizedAllowedRoles.includes('superadmin') && req.user.organizationId === SUPER_ADMIN_ORG_ID) {
      return next();
    }

    // Check if user has any of the allowed roles
    const hasAllowedRole = normalizedAllowedRoles.some(normalizedRole => {
      // Use hasRole method if available (User model instance)
      if (typeof req.user.hasRole === 'function') {
        // hasRole already normalizes internally
        return req.user.hasRole(normalizedRole);
      }

      // Fallback for plain objects: normalize and compare
      const userRole = req.user.role ? req.user.role.toLowerCase().replace(/[\s_]/g, '') : '';
      const userDisplayRole = req.user.roleDisplayName ? req.user.roleDisplayName.toLowerCase().replace(/[\s_]/g, '') : '';

      return userRole === normalizedRole || userDisplayRole === normalizedRole;
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

    // SuperAdmin Org users with admin role have all permissions
    // (but this is checked via their actual role, not blanket override)
    const isSuperAdminOrgUser = req.user.organizationId === SUPER_ADMIN_ORG_ID;

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

    // Track-role fallback: icsr_track.triage / aoi_track.triage / no_case_track.triage
    // satisfies triage.read and triage.write checks.
    // Similarly *.assessment satisfies QA/QC read+write.
    if (!hasPermission && req.user.permissions) {
      const perms = req.user.permissions;
      const hasTrackTriage =
        perms.icsr_track?.triage === true ||
        perms.aoi_track?.triage === true ||
        perms.no_case_track?.triage === true;
      const hasTrackAssessment =
        perms.icsr_track?.assessment === true ||
        perms.aoi_track?.assessment === true ||
        perms.no_case_track?.assessment === true;

      if (resource === 'triage' && (action === 'read' || action === 'write') && hasTrackTriage) {
        hasPermission = true;
      }
      if ((resource === 'QA' || resource === 'QC') && (action === 'read' || action === 'write') && hasTrackAssessment) {
        hasPermission = true;
      }
    }

    // Explicit override for SuperAdmin Org admins - they get full permissions
    if (!hasPermission && isSuperAdminOrgUser && req.user.role) {
      const normalizedRole = req.user.role.toLowerCase().replace(/[\s_]/g, '');
      if (['admin', 'superadmin'].includes(normalizedRole)) {
        hasPermission = true;
      }
    }

    // For regular org admins, check their actual permissions, not blanket override
    // (Removed the previous blanket admin override to enforce permission-based access)

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

  // SuperAdmin Org users are always admins
  const isSuperAdminOrg = req.user.organizationId === SUPER_ADMIN_ORG_ID;

  // Use isAdmin() method if available (User model instance), otherwise check role manually
  const isUserAdmin = isSuperAdminOrg || (typeof req.user.isAdmin === 'function'
    ? req.user.isAdmin()
    : (req.user.role && ['admin', 'superadmin'].includes(req.user.role.toLowerCase())));

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
  authorizeSelfOrAdmin,
  SUPER_ADMIN_ORG_ID
};
