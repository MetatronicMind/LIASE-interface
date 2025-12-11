const cosmosService = require('./cosmosService');
const AdminConfig = require('../models/AdminConfig');
const AuditLog = require('../models/AuditLog');

/**
 * AdminConfigService
 * Manages admin configuration for personalization, session, security, etc.
 */
class AdminConfigService {
  constructor() {
    this.containerName = 'AdminConfigs';
    this.configCache = new Map();
  }

  /**
   * Get or create admin config for organization
   */
  async getConfig(organizationId, configType) {
    // Check cache first
    const cacheKey = `${organizationId}_${configType}`;
    if (this.configCache.has(cacheKey)) {
      const cached = this.configCache.get(cacheKey);
      // Cache for 5 minutes
      if (Date.now() - cached.timestamp < 300000) {
        return cached.config;
      }
    }

    const query = `
      SELECT * FROM c 
      WHERE c.organizationId = @organizationId
      AND c.configType = @configType
      AND c.type_doc = 'admin_config'
      AND c.isActive = true
    `;

    const parameters = [
      { name: '@organizationId', value: organizationId },
      { name: '@configType', value: configType }
    ];

    const results = await cosmosService.queryItems(
      this.containerName,
      query,
      parameters
    );

    let config = results[0];

    // Create default config if none exists
    if (!config) {
      config = await this.createConfig(organizationId, configType, {}, 'system');
    }

    // Update cache
    this.configCache.set(cacheKey, {
      config,
      timestamp: Date.now()
    });

    return config;
  }

  /**
   * Create new admin config
   */
  async createConfig(organizationId, configType, configData, userId) {
    const config = new AdminConfig({
      organizationId,
      configType,
      configData,
      createdBy: userId
    });

    const validation = config.validate();
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    const result = await cosmosService.createItem(
      this.containerName,
      config.toJSON()
    );

    // Clear cache
    this._clearCache(organizationId, configType);

    await this._createAuditLog(
      organizationId,
      userId,
      'admin_config_created',
      { configId: config.id, configType }
    );

    return result;
  }

  /**
   * Update admin config
   */
  async updateConfig(organizationId, configType, updates, userId) {
    const config = await this.getConfig(organizationId, configType);
    
    const configObj = new AdminConfig(config);
    configObj.updateConfig(updates);
    configObj.updatedBy = userId;

    const validation = configObj.validate();
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    const updated = await cosmosService.updateItem(
      this.containerName,
      configObj.id,
      configObj.organizationId,
      configObj.toJSON()
    );

    // Clear cache
    this._clearCache(organizationId, configType);

    await this._createAuditLog(
      organizationId,
      userId,
      'admin_config_updated',
      { configId: config.id, configType, updates: Object.keys(updates) }
    );

    return updated;
  }

  /**
   * Get specific config value
   */
  async getConfigValue(organizationId, configType, path) {
    const config = await this.getConfig(organizationId, configType);
    const configObj = new AdminConfig(config);
    return configObj.getConfigValue(path);
  }

  /**
   * Set specific config value
   */
  async setConfigValue(organizationId, configType, path, value, userId) {
    const config = await this.getConfig(organizationId, configType);
    
    const configObj = new AdminConfig(config);
    configObj.setConfigValue(path, value);
    configObj.updatedBy = userId;

    const updated = await cosmosService.updateItem(
      this.containerName,
      configObj.toJSON()
    );

    // Clear cache
    this._clearCache(organizationId, configType);

    await this._createAuditLog(
      organizationId,
      userId,
      'admin_config_value_updated',
      { configId: config.id, configType, path, value }
    );

    return updated;
  }

  /**
   * Get all configs for organization
   */
  async getAllConfigs(organizationId) {
    const query = `
      SELECT * FROM c 
      WHERE c.organizationId = @organizationId
      AND c.type_doc = 'admin_config'
      AND c.isActive = true
      ORDER BY c.configType
    `;

    const parameters = [
      { name: '@organizationId', value: organizationId }
    ];

    return await cosmosService.queryItems(this.containerName, query, parameters);
  }

  /**
   * Get personalization config
   */
  async getPersonalizationConfig(organizationId) {
    return await this.getConfig(organizationId, 'personalization');
  }

  /**
   * Update personalization config
   */
  async updatePersonalizationConfig(organizationId, updates, userId) {
    return await this.updateConfig(organizationId, 'personalization', updates, userId);
  }

  /**
   * Upload branding asset (logo/favicon)
   */
  async uploadBrandingAsset(organizationId, assetType, fileData, userId) {
    // In production, upload to blob storage and get URL
    // For now, store base64 data URL
    const assetUrl = fileData.dataUrl;

    const path = assetType === 'logo' ? 'branding.logoUrl' : 'branding.faviconUrl';
    
    return await this.setConfigValue(
      organizationId,
      'personalization',
      path,
      assetUrl,
      userId
    );
  }

  /**
   * Get session config
   */
  async getSessionConfig(organizationId) {
    return await this.getConfig(organizationId, 'session');
  }

  /**
   * Update session config
   */
  async updateSessionConfig(organizationId, updates, userId) {
    return await this.updateConfig(organizationId, 'session', updates, userId);
  }

  /**
   * Get notification config
   */
  async getNotificationConfig(organizationId) {
    return await this.getConfig(organizationId, 'notification');
  }

  /**
   * Update notification config
   */
  async updateNotificationConfig(organizationId, updates, userId) {
    return await this.updateConfig(organizationId, 'notification', updates, userId);
  }

  /**
   * Get scheduler config
   */
  async getSchedulerConfig(organizationId) {
    return await this.getConfig(organizationId, 'scheduler');
  }

  /**
   * Update scheduler config
   */
  async updateSchedulerConfig(organizationId, updates, userId) {
    return await this.updateConfig(organizationId, 'scheduler', updates, userId);
  }

  /**
   * Get migration config
   */
  async getMigrationConfig(organizationId) {
    return await this.getConfig(organizationId, 'migration');
  }

  /**
   * Update migration config
   */
  async updateMigrationConfig(organizationId, updates, userId) {
    return await this.updateConfig(organizationId, 'migration', updates, userId);
  }

  /**
   * Get security config
   */
  async getSecurityConfig(organizationId) {
    return await this.getConfig(organizationId, 'security');
  }

  /**
   * Update security config
   */
  async updateSecurityConfig(organizationId, updates, userId) {
    return await this.updateConfig(organizationId, 'security', updates, userId);
  }

  /**
   * Check if password change is required for user
   */
  async isPasswordChangeRequired(userId, organizationId) {
    const securityConfig = await this.getSecurityConfig(organizationId);
    const passwordPolicy = securityConfig.configData.passwordPolicy;

    if (!passwordPolicy.expiryDays) {
      return false;
    }

    // Get user's last password change date
    const query = `
      SELECT c.lastPasswordChange FROM c 
      WHERE c.id = @userId 
      AND c.organizationId = @organizationId
      AND c.type = 'user'
    `;

    const parameters = [
      { name: '@userId', value: userId },
      { name: '@organizationId', value: organizationId }
    ];

    const results = await cosmosService.queryItems('users', query, parameters);
    
    if (!results[0] || !results[0].lastPasswordChange) {
      return true; // Force change if no record
    }

    const lastChange = new Date(results[0].lastPasswordChange);
    const expiryDate = new Date(lastChange);
    expiryDate.setDate(expiryDate.getDate() + passwordPolicy.expiryDays);

    return new Date() > expiryDate;
  }

  /**
   * Validate password against policy
   */
  async validatePassword(password, organizationId) {
    const securityConfig = await this.getSecurityConfig(organizationId);
    const policy = securityConfig.configData.passwordPolicy;

    const errors = [];

    if (password.length < policy.minLength) {
      errors.push(`Password must be at least ${policy.minLength} characters long`);
    }

    if (policy.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (policy.requireLowercase && !/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (policy.requireNumbers && !/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (policy.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Clear config cache
   */
  _clearCache(organizationId, configType = null) {
    if (configType) {
      const cacheKey = `${organizationId}_${configType}`;
      this.configCache.delete(cacheKey);
    } else {
      // Clear all configs for organization
      for (const key of this.configCache.keys()) {
        if (key.startsWith(`${organizationId}_`)) {
          this.configCache.delete(key);
        }
      }
    }
  }

  /**
   * Export all configs for organization
   */
  async exportConfigs(organizationId) {
    const configs = await this.getAllConfigs(organizationId);
    
    return {
      organizationId,
      exportedAt: new Date().toISOString(),
      configs: configs.map(config => ({
        configType: config.configType,
        configData: config.configData,
        version: config.version
      }))
    };
  }

  /**
   * Import configs for organization
   */
  async importConfigs(organizationId, configsData, userId) {
    const results = [];

    for (const configData of configsData.configs) {
      try {
        const existing = await this.getConfig(organizationId, configData.configType);
        
        if (existing) {
          // Update existing
          const updated = await this.updateConfig(
            organizationId,
            configData.configType,
            configData.configData,
            userId
          );
          results.push({ configType: configData.configType, action: 'updated', success: true });
        } else {
          // Create new
          await this.createConfig(
            organizationId,
            configData.configType,
            configData.configData,
            userId
          );
          results.push({ configType: configData.configType, action: 'created', success: true });
        }
      } catch (error) {
        results.push({ 
          configType: configData.configType, 
          action: 'failed', 
          success: false, 
          error: error.message 
        });
      }
    }

    await this._createAuditLog(
      organizationId,
      userId,
      'admin_configs_imported',
      { importResults: results }
    );

    return results;
  }

  /**
   * Create audit log entry
   */
  async _createAuditLog(organizationId, userId, action, details) {
    try {
      const auditLog = new AuditLog({
        organizationId,
        userId,
        action,
        entityType: 'admin_config',
        details
      });

      await cosmosService.createItem('AuditLogs', auditLog.toJSON());
    } catch (error) {
      console.error('Failed to create audit log:', error);
    }
  }
}

module.exports = new AdminConfigService();
