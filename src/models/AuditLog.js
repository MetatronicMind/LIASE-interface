const { v4: uuidv4 } = require('uuid');

class AuditLog {
  constructor({
    id = uuidv4(),
    organizationId,
    userId,
    userName,
    action,
    resource,
    resourceId,
    details,
    ipAddress,
    userAgent,
    location = null,
    timestamp = new Date().toISOString(),
    metadata = {},
    beforeValue = null,
    afterValue = null,
    changes = []
  }) {
    this.id = id;
    this.organizationId = organizationId;
    this.userId = userId;
    this.userName = userName;
    this.action = action; // create, read, update, delete, login, logout, approve, reject
    this.resource = resource; // user, drug, study, organization, auth
    this.resourceId = resourceId;
    this.details = details;
    this.ipAddress = ipAddress;
    this.userAgent = userAgent;
    this.location = location; // { country, countryCode, region, city, timezone, isp }
    this.timestamp = timestamp;
    this.metadata = metadata;
    this.beforeValue = beforeValue; // The value before the change
    this.afterValue = afterValue; // The value after the change
    this.changes = changes; // Array of {field, before, after} for detailed field-level changes
    this.type = 'audit-log';
  }

  toJSON() {
    return {
      id: this.id,
      organizationId: this.organizationId,
      userId: this.userId,
      userName: this.userName,
      action: this.action,
      resource: this.resource,
      resourceId: this.resourceId,
      details: this.details,
      ipAddress: this.ipAddress,
      userAgent: this.userAgent,
      location: this.location,
      timestamp: this.timestamp,
      metadata: this.metadata,
      beforeValue: this.beforeValue,
      afterValue: this.afterValue,
      changes: this.changes,
      type: this.type
    };
  }

  static createLoginLog(user, ipAddress, userAgent, success = true, location = null) {
    return new AuditLog({
      organizationId: user.organizationId,
      userId: user.id,
      userName: user.getFullName(),
      action: success ? 'login' : 'login_failed',
      resource: 'auth',
      resourceId: user.id,
      details: success ? 
        `User ${user.username} logged in with role ${user.role}` :
        `Failed login attempt for user ${user.username}`,
      ipAddress,
      userAgent,
      location,
      metadata: { role: user.role, username: user.username }
    });
  }

  static createLogoutLog(user, ipAddress, userAgent, location = null) {
    return new AuditLog({
      organizationId: user.organizationId,
      userId: user.id,
      userName: user.getFullName(),
      action: 'logout',
      resource: 'auth',
      resourceId: user.id,
      details: `User ${user.username} logged out`,
      ipAddress,
      userAgent,
      location,
      metadata: { role: user.role, username: user.username }
    });
  }

  static createResourceLog(user, action, resource, resourceId, details, metadata = {}) {
    return new AuditLog({
      organizationId: user.organizationId,
      userId: user.id,
      userName: user.getFullName(),
      action,
      resource,
      resourceId,
      details,
      metadata
    });
  }

  static validate(data) {
    const errors = [];

    if (!data.organizationId) {
      errors.push('Organization ID is required');
    }

    if (!data.userId) {
      errors.push('User ID is required');
    }

    if (!data.userName || data.userName.trim().length < 1) {
      errors.push('User name is required');
    }

    if (!data.action || data.action.trim().length < 1) {
      errors.push('Action is required');
    }

    if (!data.resource || data.resource.trim().length < 1) {
      errors.push('Resource is required');
    }

    if (!data.details || data.details.trim().length < 1) {
      errors.push('Details are required');
    }

    return errors;
  }

  static getActionTypes() {
    return [
      'create', 'read', 'update', 'delete',
      'login', 'logout', 'login_failed',
      'approve', 'reject', 'comment',
      'export', 'import', 'backup'
    ];
  }

  static getResourceTypes() {
    return [
      'user', 'drug', 'study', 'organization',
      'auth', 'settings', 'audit', 'system'
    ];
  }
}

module.exports = AuditLog;
