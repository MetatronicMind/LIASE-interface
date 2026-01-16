const { v4: uuidv4 } = require('uuid');

/**
 * AdminConfig Model
 * Stores various admin configurations including personalization, session management, etc.
 */
class AdminConfig {
  constructor({
    id = null,
    organizationId,
    configType, // personalization, session, notification, scheduler, migration, security
    configData = {},
    isActive = true,
    version = 1,
    createdBy,
    updatedBy = null,
    createdAt = new Date().toISOString(),
    updatedAt = new Date().toISOString(),
    metadata = {}
  }) {
    this.id = id || `admin_config_${uuidv4()}`;
    this.organizationId = organizationId;
    this.configType = configType;
    this.configData = this._initializeConfigData(configType, configData);
    this.isActive = isActive;
    this.version = version;
    this.createdBy = createdBy;
    this.updatedBy = updatedBy;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.metadata = metadata;
    this.type_doc = 'admin_config';
  }

  _initializeConfigData(configType, data) {
    const defaults = this._getDefaultConfig(configType);
    return { ...defaults, ...data };
  }

  _getDefaultConfig(configType) {
    const defaults = {
      personalization: {
        branding: {
          logoUrl: null,
          faviconUrl: null,
          primaryColor: '#3B82F6',
          secondaryColor: '#10B981',
          accentColor: '#F59E0B',
          fontFamily: 'Inter, sans-serif'
        },
        starterScreen: {
          enabled: false,
          title: 'Welcome to LIASE',
          subtitle: 'Your Pharmacovigilance Management System',
          backgroundImage: null,
          quickLinks: []
        },
        locale: {
          defaultLanguage: 'en',
          defaultTimezone: 'UTC',
          dateFormat: 'MM/DD/YYYY',
          timeFormat: '12h'
        }
      },
      session: {
        timeout: 30, // minutes
        autoLogout: true,
        captureTimestamp: true,
        showWarningBefore: 5, // minutes before timeout
        extendOnActivity: true,
        maxConcurrentSessions: 1
      },
      notification: {
        channels: ['email', 'in-app'],
        defaultPriority: 'normal',
        retentionDays: 30,
        batchSize: 50,
        retryAttempts: 3,
        retryDelayMinutes: 5
      },
      export: {
        pdfPassword: 'admin', // Default password, changes via Admin Config
        excelPassword: 'admin',
        includeFooter: true,
        footerText: 'This was generated using the liase tool , MetatronicMinds Technologies 2026'
      },
      scheduler: {
        enabled: true,
        timezone: 'UTC',
        retentionDays: 30,
        autoCleanup: true,
        maxConcurrentJobs: 5,
        defaultTimeout: 3600000 // 1 hour in ms
      },
      migration: {
        allowDuplicates: false,
        validateBeforeImport: true,
        batchSize: 100,
        idFieldMapping: {},
        defaultConflictResolution: 'skip' // skip, overwrite, merge
      },
      study_queue: {
        mode: 'default', // 'status', 'client', 'default'
        statusQueue: ['Probable ICSR', 'Probable AOI', 'Probable ICSR/AOI', 'No Case', 'Manual Review'],
        clientList: [],
        allowUserClientEntry: false
      },
      triage: {
        batchSize: 10,
        priorityQueue: [
          'Probable ICSR',
          'Probable AOI',
          'Probable ICSR/AOI',
          'No Case',
          'Manual Review'
        ]
      },
      workflow: {
        qcDataEntry: true,
        medicalReview: true,
        stages: [
          { id: 'triage', label: 'Triage', color: '#3B82F6', type: 'initial' },
          { id: 'qc_triage', label: 'QC Triage', color: '#8B5CF6', type: 'process' },
          { id: 'data_entry', label: 'Data Entry', color: '#10B981', type: 'process' },
          { id: 'medical_review', label: 'Medical Review', color: '#F59E0B', type: 'process' },
          { id: 'reporting', label: 'Reporting', color: '#EC4899', type: 'process' },
          { id: 'archived', label: 'Archived', color: '#6B7280', type: 'final' }
        ],
        transitions: [
          { from: 'triage', to: 'qc_triage', label: 'Submit for QC' },
          { from: 'qc_triage', to: 'data_entry', label: 'Approve & Move to Data Entry' },
          { from: 'qc_triage', to: 'triage', label: 'Reject & Return to Triage' },
          { from: 'data_entry', to: 'medical_review', label: 'Submit for Medical Review', canRevoke: true, revokeTo: 'triage' },
          { from: 'medical_review', to: 'reporting', label: 'Approve & Move to Reporting' },
          { from: 'medical_review', to: 'data_entry', label: 'Request More Info' },
          { from: 'reporting', to: 'archived', label: 'Archive' }
        ]
      },
      security: {
        passwordPolicy: {
          minLength: 8,
          requireUppercase: true,
          requireLowercase: true,
          requireNumbers: true,
          requireSpecialChars: true,
          expiryDays: 90, // Force password change for superadmin
          preventReuse: 5 // Remember last N passwords
        },
        twoFactorAuth: {
          enabled: false,
          required: false,
          methods: ['email', 'authenticator']
        },
        ipWhitelist: {
          enabled: false,
          addresses: []
        }
      }
    };

    return defaults[configType] || {};
  }

  // Update specific config section
  updateConfig(updates) {
    this.configData = {
      ...this.configData,
      ...updates
    };
    this.version += 1;
    this.updatedAt = new Date().toISOString();
  }

  // Get config value by path (e.g., 'branding.primaryColor')
  getConfigValue(path) {
    const keys = path.split('.');
    let value = this.configData;
    
    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return null;
      }
    }
    
    return value;
  }

  // Set config value by path
  setConfigValue(path, value) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    let target = this.configData;
    
    for (const key of keys) {
      if (!(key in target)) {
        target[key] = {};
      }
      target = target[key];
    }
    
    target[lastKey] = value;
    this.version += 1;
    this.updatedAt = new Date().toISOString();
  }

  toJSON() {
    return {
      id: this.id,
      organizationId: this.organizationId,
      configType: this.configType,
      configData: this.configData,
      isActive: this.isActive,
      version: this.version,
      createdBy: this.createdBy,
      updatedBy: this.updatedBy,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      metadata: this.metadata,
      type_doc: this.type_doc
    };
  }

  validate() {
    const errors = [];

    if (!this.organizationId) {
      errors.push('Organization ID is required');
    }

    if (!this.configType) {
      errors.push('Config type is required');
    }

    const validTypes = ['personalization', 'session', 'notification', 'scheduler', 'migration', 'security', 'workflow', 'study_queue', 'triage', 'system_config', 'export'];
    if (!validTypes.includes(this.configType)) {
      errors.push(`Invalid config type. Must be one of: ${validTypes.join(', ')}`);
    }

    // Type-specific validation
    if (this.configType === 'session') {
      if (this.configData.timeout < 1 || this.configData.timeout > 1440) {
        errors.push('Session timeout must be between 1 and 1440 minutes');
      }
    }

    if (this.configType === 'scheduler') {
      if (this.configData.retentionDays < 1 || this.configData.retentionDays > 365) {
        errors.push('Retention days must be between 1 and 365');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

module.exports = AdminConfig;
