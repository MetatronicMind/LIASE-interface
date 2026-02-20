const { v4: uuidv4 } = require('uuid');

class Role {
  constructor({
    id = null, // Will be generated in the constructor
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
    // Generate ID with proper prefix if not provided
    this.id = id || `role_${uuidv4()}`;
    // Ensure ID always has role prefix
    if (!this.id.startsWith('role_')) {
      this.id = `role_${this.id}`;
    }

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
      dashboard: { read: false },
      users: {
        read: false,
        write: false,
        create: false,
        update: false,
        delete: false
      },
      roles: { read: false, write: false, delete: false },
      drugs: { read: false, write: false, delete: false },
      studies: { read: false, write: false, delete: false },
      audit: { read: false, write: false, delete: false, export: false },
      settings: {
        read: false,
        write: false,
        viewDateTime: false,
        viewRoleManagement: false,
        viewOrganization: false,
        viewWorkflow: false,
        viewNotifications: false,
        viewEmail: false,
        viewArchival: false,
        viewAdminConfig: false,
        viewStudyQueue: false,
        viewSystemConfig: false
      },
      organizations: { read: false, write: false, delete: false },
      reports: { read: false, write: false, delete: false, export: false },
      // Workflow track visibility
      icsr_track: { read: false },
      aoi_track: { read: false },
      no_case_track: { read: false },
      // New workflow-specific permissions
      triage: {
        read: false,
        write: false,
        classify: false,
        manual_drug_test: false
      },
      QA: {
        read: false,
        write: false,
        approve: false,
        reject: false
      },
      QC: {
        read: false,
        write: false,
        approve: false,
        reject: false
      },
      data_entry: {
        read: false,
        write: false,
        r3_form: false,
        revoke_studies: false
      },
      medical_examiner: {
        read: false,
        write: false,
        comment_fields: false,
        edit_fields: false,
        revoke_studies: false
      },
      notifications: { read: false, write: false, delete: false },
      email: { read: false, write: false, delete: false },
      admin_config: { read: false, write: false, manage_jobs: false },
      // Added missing modules
      aoiAssessment: { read: false, save: false },
      legacyData: { read: false, create: false },
      archive: { read: false, archive: false }
    };

    // Merge provided permissions with default structure
    const validatedPermissions = { ...defaultStructure };

    Object.keys(permissions).forEach(resource => {
      if (validatedPermissions[resource]) {
        validatedPermissions[resource] = {
          ...validatedPermissions[resource],
          ...permissions[resource]
        };
      } else {
        // Preserve any resource not in the default structure (future-proof)
        validatedPermissions[resource] = permissions[resource];
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
          dashboard: { read: true },
          users: { read: true, write: true, create: true, update: true, delete: true },
          roles: { read: true, write: true, delete: true },
          drugs: { read: true, write: true, delete: true },
          studies: { read: true, write: true, delete: true },
          audit: { read: true, write: true, delete: false },
          settings: { read: true, write: true, viewRoleManagement: true },
          organizations: { read: true, write: true, delete: true },
          reports: { read: true, write: true, delete: true },
          triage: { read: true, write: true, classify: true, manual_drug_test: true },
          QC: { read: true, write: true, approve: true, reject: true },
          data_entry: { read: true, write: true, r3_form: true },
          medical_examiner: { read: true, write: true, comment_fields: true, edit_fields: true, revoke_studies: true },
          notifications: { read: true, write: true, delete: true },
          email: { read: true, write: true, delete: true },
          admin_config: { read: true, write: true, manage_jobs: true }
        },
        isSystemRole: true
      },
      admin: {
        name: 'admin',
        displayName: 'Administrator',
        description: 'Organization administrator with user and role management access (limited)',
        permissions: {
          dashboard: { read: true },
          users: { read: true, write: true, create: true, update: true, delete: true },
          roles: { read: true, write: true, delete: false }, // Cannot delete roles (reduced from superadmin)
          drugs: { read: true, write: true, delete: true },
          studies: { read: true, write: true, delete: true },
          audit: { read: true, write: false, delete: false },
          settings: { read: true, write: true, viewRoleManagement: true },
          organizations: { read: false, write: false, delete: false }, // NO org access (CRM-only)
          reports: { read: true, write: true, delete: false },
          triage: { read: true, write: true, classify: true, manual_drug_test: true },
          QC: { read: true, write: true, approve: true, reject: true },
          data_entry: { read: true, write: true, r3_form: true },
          medical_examiner: { read: true, write: true, comment_fields: true, edit_fields: true, revoke_studies: true },
          notifications: { read: true, write: true, delete: true },
          email: { read: true, write: true, delete: true },
          admin_config: { read: true, write: false, manage_jobs: false } // Reduced: no write access
        },
        isSystemRole: true
      },
      triage: {
        name: 'triage',
        displayName: 'Triage Specialist',
        description: 'Can run manual drug tests and classify studies as ICSR, AOI, or No Case',
        permissions: {
          dashboard: { read: true },
          users: { read: false, write: false, delete: false },
          roles: { read: false, write: false, delete: false },
          drugs: { read: true, write: true, delete: false }, // write: true to enable drug test execution
          studies: { read: true, write: true, delete: false },
          audit: { read: false, write: false, delete: false },
          settings: { read: false, write: false },
          organizations: { read: false, write: false, delete: false },
          reports: { read: false, write: false, delete: false },
          triage: { read: true, write: true, classify: true, manual_drug_test: true },
          QC: { read: false, write: false, approve: false, reject: false },
          data_entry: { read: false, write: false, r3_form: false },
          medical_examiner: { read: false, write: false, comment_fields: false, edit_fields: false, revoke_studies: false },
          notifications: { read: false, write: false, delete: false },
          email: { read: false, write: false, delete: false },
          admin_config: { read: false, write: false, manage_jobs: false }
        },
        isSystemRole: true
      },
      QA: {
        name: 'QA',
        displayName: 'Quality Assurance',
        description: 'Can approve or reject triage classifications',
        permissions: {
          dashboard: { read: true },
          users: { read: false, write: false, delete: false },
          roles: { read: false, write: false, delete: false },
          drugs: { read: true, write: false, delete: false },
          studies: { read: true, write: true, delete: false },
          audit: { read: true, write: false, delete: false },
          settings: { read: false, write: false },
          organizations: { read: false, write: false, delete: false },
          reports: { read: false, write: false, delete: false },
          triage: { read: true, write: false, classify: false, manual_drug_test: false },
          QA: { read: true, write: true, approve: true, reject: true },
          data_entry: { read: false, write: false, r3_form: false },
          medical_examiner: { read: false, write: false, comment_fields: false, edit_fields: false, revoke_studies: false },
          notifications: { read: false, write: false, delete: false },
          email: { read: false, write: false, delete: false },
          admin_config: { read: false, write: false, manage_jobs: false }
        },
        isSystemRole: true
      },
      QC: {
        name: 'QC',
        displayName: 'Quality Control',
        description: 'Can approve or reject R3 XML forms before medical review',
        permissions: {
          dashboard: { read: true },
          users: { read: false, write: false, delete: false },
          roles: { read: false, write: false, delete: false },
          drugs: { read: true, write: false, delete: false },
          studies: { read: true, write: true, delete: false },
          audit: { read: true, write: false, delete: false },
          settings: { read: false, write: false },
          organizations: { read: false, write: false, delete: false },
          reports: { read: false, write: false, delete: false },
          triage: { read: true, write: false, classify: false, manual_drug_test: false },
          QC: { read: true, write: true, approve: true, reject: true },
          data_entry: { read: false, write: false, r3_form: false },
          medical_examiner: { read: false, write: false, comment_fields: false, edit_fields: false, revoke_studies: false },
          notifications: { read: false, write: false, delete: false },
          email: { read: false, write: false, delete: false },
          admin_config: { read: false, write: false, manage_jobs: false }
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
          organizations: { read: false, write: false, delete: false },
          reports: { read: true, write: false, delete: false },
          triage: { read: false, write: false, classify: false, manual_drug_test: false },
          QC: { read: false, write: false, approve: false, reject: false },
          data_entry: { read: false, write: false, r3_form: false },
          medical_examiner: { read: false, write: false, comment_fields: false, edit_fields: false, revoke_studies: false },
          notifications: { read: false, write: false, delete: false },
          email: { read: false, write: false, delete: false },
          admin_config: { read: false, write: false, manage_jobs: false }
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
          organizations: { read: false, write: false, delete: false },
          reports: { read: true, write: false, delete: false },
          triage: { read: false, write: false, classify: false, manual_drug_test: false },
          QC: { read: false, write: false, approve: false, reject: false },
          data_entry: { read: false, write: false, r3_form: false },
          medical_examiner: { read: false, write: false, comment_fields: false, edit_fields: false, revoke_studies: false },
          notifications: { read: false, write: false, delete: false },
          email: { read: false, write: false, delete: false },
          admin_config: { read: false, write: false, manage_jobs: false }
        },
        isSystemRole: true
      },
      data_entry: {
        name: 'data_entry',
        displayName: 'Data Entry Specialist',
        description: 'Access to QC-approved ICSR studies for R3 XML form completion',
        permissions: {
          dashboard: { read: true },
          users: { read: false, write: false, delete: false },
          roles: { read: false, write: false, delete: false },
          drugs: { read: true, write: false, delete: false },
          studies: { read: true, write: true, delete: false },
          audit: { read: false, write: false, delete: false },
          settings: { read: false, write: false },
          organizations: { read: false, write: false, delete: false },
          reports: { read: false, write: false, delete: false },
          triage: { read: false, write: false, classify: false, manual_drug_test: false },
          QC: { read: false, write: false, approve: false, reject: false },
          data_entry: { read: true, write: true, r3_form: true },
          medical_examiner: { read: false, write: false, comment_fields: false, edit_fields: false, revoke_studies: false },
          notifications: { read: false, write: false, delete: false },
          email: { read: false, write: false, delete: false },
          admin_config: { read: false, write: false, manage_jobs: false }
        },
        isSystemRole: true
      },
      medical_examiner: {
        name: 'medical_examiner',
        displayName: 'Medical Reviewer',
        description: 'Review completed ICSR studies, comment on fields, edit data, and manage revocations',
        permissions: {
          dashboard: { read: true },
          users: { read: false, write: false, delete: false },
          roles: { read: false, write: false, delete: false },
          drugs: { read: true, write: false, delete: false },
          studies: { read: true, write: true, delete: false },
          audit: { read: true, write: false, delete: false },
          settings: { read: false, write: false },
          organizations: { read: false, write: false, delete: false },
          reports: { read: true, write: true, delete: false },
          triage: { read: false, write: false, classify: false, manual_drug_test: false },
          QC: { read: false, write: false, approve: false, reject: false },
          data_entry: { read: true, write: false, r3_form: false },
          medical_examiner: { read: true, write: true, comment_fields: true, edit_fields: true, revoke_studies: true },
          notifications: { read: false, write: false, delete: false },
          email: { read: false, write: false, delete: false },
          admin_config: { read: false, write: false, manage_jobs: false }
        },
        isSystemRole: true
      }
    };
  }

  // Get permission templates for different workflow roles
  static getPermissionTemplates() {
    return {
      triage_specialist: {
        name: 'triage_specialist',
        displayName: 'Triage Specialist Template',
        description: 'Template for roles that classify studies and run manual drug tests',
        permissions: {
          dashboard: { read: true },
          users: { read: false, write: false, delete: false },
          roles: { read: false, write: false, delete: false },
          drugs: { read: true, write: true, delete: false }, // write: true to enable drug test execution
          studies: { read: true, write: true, delete: false },
          audit: { read: false, write: false, delete: false },
          settings: { read: false, write: false },
          organizations: { read: false, write: false, delete: false },
          reports: { read: false, write: false, delete: false },
          triage: { read: true, write: true, classify: true, manual_drug_test: true },
          QA: { read: false, write: false, approve: false, reject: false },
          QC: { read: false, write: false, approve: false, reject: false },
          data_entry: { read: false, write: false, r3_form: false },
          medical_examiner: { read: false, write: false, comment_fields: false, edit_fields: false, revoke_studies: false }
        }
      },
      QA_reviewer: {
        name: 'QA_reviewer',
        displayName: 'Quality Assurance Template',
        description: 'Template for roles that approve or reject triage classifications',
        permissions: {
          dashboard: { read: true },
          users: { read: false, write: false, delete: false },
          roles: { read: false, write: false, delete: false },
          drugs: { read: true, write: false, delete: false },
          studies: { read: true, write: true, delete: false },
          audit: { read: true, write: false, delete: false },
          settings: { read: false, write: false },
          organizations: { read: false, write: false, delete: false },
          reports: { read: false, write: false, delete: false },
          triage: { read: true, write: false, classify: false, manual_drug_test: false },
          QA: { read: true, write: true, approve: true, reject: true },
          data_entry: { read: false, write: false, r3_form: false },
          medical_examiner: { read: false, write: false, comment_fields: false, edit_fields: false, revoke_studies: false }
        }
      },
      QC_reviewer: {
        name: 'QC_reviewer',
        displayName: 'Quality Control Template',
        description: 'Template for roles that approve or reject R3 XML forms',
        permissions: {
          dashboard: { read: true },
          users: { read: false, write: false, delete: false },
          roles: { read: false, write: false, delete: false },
          drugs: { read: true, write: false, delete: false },
          studies: { read: true, write: true, delete: false },
          audit: { read: true, write: false, delete: false },
          settings: { read: false, write: false },
          organizations: { read: false, write: false, delete: false },
          reports: { read: false, write: false, delete: false },
          triage: { read: true, write: false, classify: false, manual_drug_test: false },
          QC: { read: true, write: true, approve: true, reject: true },
          data_entry: { read: false, write: false, r3_form: false },
          medical_examiner: { read: false, write: false, comment_fields: false, edit_fields: false, revoke_studies: false }
        }
      },
      data_entry_specialist: {
        name: 'data_entry_specialist',
        displayName: 'Data Entry Specialist Template',
        description: 'Template for roles that fill R3 forms for approved ICSR studies',
        permissions: {
          dashboard: { read: true },
          users: { read: false, write: false, delete: false },
          roles: { read: false, write: false, delete: false },
          drugs: { read: true, write: false, delete: false },
          studies: { read: true, write: true, delete: false },
          audit: { read: false, write: false, delete: false },
          settings: { read: false, write: false },
          organizations: { read: false, write: false, delete: false },
          reports: { read: false, write: false, delete: false },
          triage: { read: false, write: false, classify: false, manual_drug_test: false },
          QA: { read: false, write: false, approve: false, reject: false },
          QC: { read: false, write: false, approve: false, reject: false },
          data_entry: { read: true, write: true, r3_form: true },
          medical_examiner: { read: false, write: false, comment_fields: false, edit_fields: false, revoke_studies: false }
        }
      },
      medical_reviewer: {
        name: 'medical_reviewer',
        displayName: 'Medical Reviewer Template',
        description: 'Template for roles that review, comment, edit, and revoke completed studies',
        permissions: {
          dashboard: { read: true },
          users: { read: false, write: false, delete: false },
          roles: { read: false, write: false, delete: false },
          drugs: { read: true, write: false, delete: false },
          studies: { read: true, write: true, delete: false },
          audit: { read: true, write: false, delete: false },
          settings: { read: false, write: false },
          organizations: { read: false, write: false, delete: false },
          reports: { read: true, write: true, delete: false },
          triage: { read: false, write: false, classify: false, manual_drug_test: false },
          QA: { read: false, write: false, approve: false, reject: false },
          QC: { read: false, write: false, approve: false, reject: false },
          data_entry: { read: true, write: false, r3_form: false },
          medical_examiner: { read: true, write: true, comment_fields: true, edit_fields: true, revoke_studies: true }
        }
      },
      pharmacovigilance_user: {
        name: 'pharmacovigilance_user',
        displayName: 'Pharmacovigilance User Template',
        description: 'Template for standard pharmacovigilance users with drug and study access',
        permissions: {
          dashboard: { read: true },
          users: { read: true, write: false, delete: false },
          roles: { read: false, write: false, delete: false },
          drugs: { read: true, write: true, delete: false },
          studies: { read: true, write: true, delete: false },
          audit: { read: true, write: false, delete: false },
          settings: { read: true, write: false },
          organizations: { read: false, write: false, delete: false },
          reports: { read: true, write: false, delete: false },
          triage: { read: false, write: false, classify: false, manual_drug_test: false },
          QC: { read: false, write: false, approve: false, reject: false },
          data_entry: { read: false, write: false, r3_form: false },
          medical_examiner: { read: false, write: false, comment_fields: false, edit_fields: false, revoke_studies: false }
        }
      },
      read_only_auditor: {
        name: 'read_only_auditor',
        displayName: 'Read-Only Auditor Template',
        description: 'Template for sponsors and auditors with read-only access',
        permissions: {
          dashboard: { read: true },
          users: { read: false, write: false, delete: false },
          roles: { read: false, write: false, delete: false },
          drugs: { read: true, write: false, delete: false },
          studies: { read: true, write: false, delete: false },
          audit: { read: true, write: false, delete: false },
          settings: { read: false, write: false },
          organizations: { read: false, write: false, delete: false },
          reports: { read: true, write: false, delete: false },
          triage: { read: false, write: false, classify: false, manual_drug_test: false },
          QC: { read: false, write: false, approve: false, reject: false },
          data_entry: { read: false, write: false, r3_form: false },
          medical_examiner: { read: false, write: false, comment_fields: false, edit_fields: false, revoke_studies: false }
        }
      }
    };
  }

  // Create a custom role with predefined permission template
  static createCustomRole(customName, customDisplayName, permissionTemplate, organizationId, description = '', createdBy = null) {
    const templates = Role.getPermissionTemplates();
    const template = templates[permissionTemplate];

    if (!template) {
      throw new Error(`Permission template '${permissionTemplate}' not found. Available templates: ${Object.keys(templates).join(', ')}`);
    }

    return new Role({
      organizationId,
      name: customName.toLowerCase().replace(/\s+/g, '_'), // Convert to valid name format
      displayName: customDisplayName,
      description: description || template.description,
      permissions: template.permissions,
      isSystemRole: false, // Custom roles are not system roles
      createdBy
    });
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