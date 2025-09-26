const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

class User {
  constructor({
    id = uuidv4(),
    organizationId,
    username,
    email,
    password,
    firstName,
    lastName,
    roleId = null, // Reference to Role document
    role = 'pharmacovigilance', // Legacy support, now points to role name
    permissions = {}, // Role permissions will be loaded separately
    isActive = true,
    lastLogin = null,
    createdAt = new Date().toISOString(),
    updatedAt = new Date().toISOString(),
    createdBy = null
  }) {
    this.id = id;
    this.organizationId = organizationId;
    this.username = username ? username.toLowerCase() : '';
    this.email = email ? email.toLowerCase() : '';
    this.password = password; // Will be hashed
    this.firstName = firstName || '';
    this.lastName = lastName || '';
    this.roleId = roleId; // Dynamic role reference
    this.role = role; // Role name for backwards compatibility
    this.permissions = permissions; // Will be populated from role
    this.isActive = isActive;
    this.lastLogin = lastLogin;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.createdBy = createdBy;
    this.type = 'user';
  }

  // Check if user has specific permission
  hasPermission(resource, action) {
    if (!this.permissions || !this.permissions[resource]) {
      return false;
    }
    return this.permissions[resource][action] === true;
  }

  // Check if user has any of the specified roles
  hasRole(...roleNames) {
    return roleNames.includes(this.role);
  }

  // Check if user is admin or superadmin
  isAdmin() {
    return this.hasRole('admin', 'superadmin');
  }

  // Check if user is superadmin
  isSuperAdmin() {
    return this.hasRole('superadmin');
  }

  // Set permissions from role
  setPermissions(permissions) {
    this.permissions = permissions || {};
  }

  // Legacy method for backwards compatibility
  setDefaultPermissions(role, customPermissions = {}) {
    // This method is kept for backwards compatibility
    // In the new system, permissions come from the Role model
    const legacyPermissions = {
      admin: {
        dashboard: { read: true, write: true },
        users: { read: true, write: true, delete: true },
        roles: { read: true, write: true, delete: true },
        drugs: { read: true, write: true, delete: true },
        studies: { read: true, write: true, delete: true },
        audit: { read: true, write: false, delete: false },
        settings: { read: true, write: true }
      },
      pharmacovigilance: {
        dashboard: { read: true, write: false },
        users: { read: true, write: false, delete: false },
        drugs: { read: true, write: true, delete: false },
        studies: { read: true, write: true, delete: false },
        audit: { read: true, write: false, delete: false },
        settings: { read: true, write: false }
      },
      sponsor_auditor: {
        dashboard: { read: true, write: false },
        users: { read: false, write: false, delete: false },
        drugs: { read: true, write: false, delete: false },
        studies: { read: true, write: false, delete: false },
        audit: { read: true, write: false, delete: false },
        settings: { read: false, write: false }
      }
    };

    return {
      ...legacyPermissions[role] || legacyPermissions['pharmacovigilance'],
      ...customPermissions
    };
  }

  async hashPassword() {
    if (this.password && !this.password.startsWith('$2')) {
      this.password = await bcrypt.hash(this.password, 12);
    }
  }

  async validatePassword(password) {
    if (!password || !this.password) {
      return false;
    }
    try {
      return await bcrypt.compare(password, this.password);
    } catch (error) {
      console.error('Password validation error:', error.message);
      return false;
    }
  }

  toJSON() {
    // Return all data including password for database storage
    return { ...this };
  }

  toSafeJSON() {
    // Return user data without password for client responses
    const user = { ...this };
    delete user.password;
    return user;
  }

  getFullName() {
    return `${this.firstName} ${this.lastName}`.trim();
  }

  hasPermission(resource, action) {
    return this.permissions[resource] && this.permissions[resource][action];
  }

  updateLastLogin() {
    this.lastLogin = new Date().toISOString();
    this.updatedAt = new Date().toISOString();
  }

  static validate(data, isUpdate = false) {
    const errors = [];

    if (!isUpdate || data.username) {
      if (!data.username || data.username.trim().length < 3) {
        errors.push('Username must be at least 3 characters long');
      }
      if (data.username && !/^[a-zA-Z0-9_]+$/.test(data.username)) {
        errors.push('Username can only contain letters, numbers, and underscores');
      }
    }

    if (!isUpdate || data.email) {
      if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
        errors.push('Valid email is required');
      }
    }

    if (!isUpdate || data.password) {
      if (!isUpdate && (!data.password || data.password.length < 8)) {
        errors.push('Password must be at least 8 characters long');
      }
      if (data.password && !/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/.test(data.password)) {
        errors.push('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character');
      }
    }

    if (!isUpdate || data.firstName) {
      if (!data.firstName || data.firstName.trim().length < 1) {
        errors.push('First name is required');
      }
    }

    if (!isUpdate || data.lastName) {
      if (!data.lastName || data.lastName.trim().length < 1) {
        errors.push('Last name is required');
      }
    }

    if (!isUpdate || data.role) {
      if (!['Admin', 'Pharmacovigilance', 'Sponsor/Auditor'].includes(data.role)) {
        errors.push('Role must be Admin, Pharmacovigilance, or Sponsor/Auditor');
      }
    }

    if (!isUpdate && !data.organizationId) {
      errors.push('Organization ID is required');
    }

    return errors;
  }
}

module.exports = User;
