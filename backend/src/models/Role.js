const { v4: uuidv4 } = require('uuid');

class Role {
  constructor({
    id = uuidv4(),
    organizationId,
    name,
    displayName,
    description = '',
    permissions = {},
    isSystemRole = false, // For built-in roles like superadmin
    isActive = true,
    createdAt = new Date().toISOString(),
    updatedAt = new Date().toISOString(),
    createdBy = null
  }) {
    this.id = id;
    this.organizationId = organizationId;
    this.name = name; // Unique identifier (e.g., 'clinical_researcher')
    this.displayName = displayName; // Human readable name (e.g., 'Clinical Researcher')
    this.description = description;
    this.permissions = this.validatePermissions(permissions);
    this.isSystemRole = isSystemRole;
    this.isActive = isActive;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.createdBy = createdBy;
    this.type = 'role';
  }

  validatePermissions(permissions) {
    const defaultStructure = {
      dashboard: { read: false, write: false },
      users: { read: false, write: false, delete: false },
      roles: { read: false, write: false, delete: false },
      drugs: { read: false, write: false, delete: false },
      studies: { read: false, write: false, delete: false },
      audit: { read: false, write: false, delete: false },
      settings: { read: false, write: false },
      organizations: { read: false, write: false, delete: false }
    };

    // Merge provided permissions with default structure
    const validatedPermissions = { ...defaultStructure };
    
    Object.keys(permissions).forEach(resource => {
      if (validatedPermissions[resource]) {
        validatedPermissions[resource] = {
          ...validatedPermissions[resource],
          ...permissions[resource]
        };
      }
    });

    return validatedPermissions;
  }

  hasPermission(resource, action) {
    return this.permissions[resource] && this.permissions[resource][action] === true;
  }

  updatePermissions(newPermissions) {
    this.permissions = this.validatePermissions(newPermissions);
    this.updatedAt = new Date().toISOString();
  }

  toJSON() {
    return { ...this };
  }

  // Get default system roles
  static getSystemRoles() {
    return {
      superadmin: {
        name: 'superadmin',
        displayName: 'Super Administrator',
        description: 'Full system access with organization management capabilities',
        permissions: {
          dashboard: { read: true, write: true },
          users: { read: true, write: true, delete: true },
          roles: { read: true, write: true, delete: true },
          drugs: { read: true, write: true, delete: true },
          studies: { read: true, write: true, delete: true },
          audit: { read: true, write: true, delete: false },
          settings: { read: true, write: true },
          organizations: { read: true, write: true, delete: true }
        },
        isSystemRole: true
      },
      admin: {
        name: 'admin',
        displayName: 'Administrator',
        description: 'Organization administrator with user and role management access',
        permissions: {
          dashboard: { read: true, write: true },
          users: { read: true, write: true, delete: true },
          roles: { read: true, write: true, delete: true },
          drugs: { read: true, write: true, delete: true },
          studies: { read: true, write: true, delete: true },
          audit: { read: true, write: false, delete: false },
          settings: { read: true, write: true },
          organizations: { read: false, write: false, delete: false }
        },
        isSystemRole: true
      },
      pharmacovigilance: {
        name: 'pharmacovigilance',
        displayName: 'Pharmacovigilance',
        description: 'Standard pharmacovigilance user with drug and study access',
        permissions: {
          dashboard: { read: true, write: false },
          users: { read: true, write: false, delete: false },
          roles: { read: false, write: false, delete: false },
          drugs: { read: true, write: true, delete: false },
          studies: { read: true, write: true, delete: false },
          audit: { read: true, write: false, delete: false },
          settings: { read: true, write: false },
          organizations: { read: false, write: false, delete: false }
        },
        isSystemRole: true
      },
      sponsor_auditor: {
        name: 'sponsor_auditor',
        displayName: 'Sponsor/Auditor',
        description: 'Read-only access for sponsors and auditors',
        permissions: {
          dashboard: { read: true, write: false },
          users: { read: false, write: false, delete: false },
          roles: { read: false, write: false, delete: false },
          drugs: { read: true, write: false, delete: false },
          studies: { read: true, write: false, delete: false },
          audit: { read: true, write: false, delete: false },
          settings: { read: false, write: false },
          organizations: { read: false, write: false, delete: false }
        },
        isSystemRole: true
      },
      data_entry: {
        name: 'data_entry',
        displayName: 'Data Entry',
        description: 'Access to data entry forms for ICSR classified studies',
        permissions: {
          dashboard: { read: true, write: false },
          users: { read: false, write: false, delete: false },
          roles: { read: false, write: false, delete: false },
          drugs: { read: true, write: false, delete: false },
          studies: { read: true, write: true, delete: false },
          audit: { read: false, write: false, delete: false },
          settings: { read: false, write: false },
          organizations: { read: false, write: false, delete: false }
        },
        isSystemRole: true
      },
      medical_examiner: {
        name: 'medical_examiner',
        displayName: 'Medical Examiner',
        description: 'Review and examine ICSR studies completed by data entry users',
        permissions: {
          dashboard: { read: true, write: false },
          users: { read: false, write: false, delete: false },
          roles: { read: false, write: false, delete: false },
          drugs: { read: true, write: false, delete: false },
          studies: { read: true, write: true, delete: false },
          audit: { read: true, write: false, delete: false },
          settings: { read: false, write: false },
          organizations: { read: false, write: false, delete: false }
        },
        isSystemRole: true
      }
    };
  }

  // Create a role from system role template
  static createFromSystemRole(roleType, organizationId, createdBy = null) {
    const systemRoles = Role.getSystemRoles();
    const systemRole = systemRoles[roleType];
    
    if (!systemRole) {
      throw new Error(`Unknown system role: ${roleType}`);
    }

    return new Role({
      organizationId,
      ...systemRole,
      createdBy
    });
  }
}

module.exports = Role;