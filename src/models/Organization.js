const { v4: uuidv4 } = require('uuid');

class Organization {
  constructor({
    id = uuidv4(),
    name,
    domain,
    adminEmail,
    tenantId, // Added tenantId
    plan = 'basic',
    settings = {},
    industry = null,
    primaryContact = {},
    isActive = true,
    createdAt = new Date().toISOString(),
    updatedAt = new Date().toISOString()
  }) {
    this.id = id;
    this.name = name;
    this.domain = domain ? domain.toLowerCase() : null;
    this.adminEmail = adminEmail ? adminEmail.toLowerCase() : '';
    this.tenantId = tenantId || null; // Store tenantId
    this.industry = industry;
    this.primaryContact = primaryContact;
    this.plan = plan; // basic, premium, enterprise
    this.settings = {
      maxUsers: plan === 'basic' ? 10 : plan === 'premium' ? 50 : 1000,
      maxDrugs: plan === 'basic' ? 100 : plan === 'premium' ? 500 : 10000,
      maxStudies: plan === 'basic' ? 1000 : plan === 'premium' ? 5000 : 50000,
      features: {
        auditRetention: plan === 'basic' ? 30 : plan === 'premium' ? 90 : 365, // days
        exportData: plan !== 'basic',
        apiAccess: plan === 'enterprise',
        customBranding: plan === 'enterprise',
        ssoIntegration: plan === 'enterprise'
      },
      ...settings
    };
    this.isActive = isActive;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.type = 'organization';
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      domain: this.domain,
      adminEmail: this.adminEmail,
      tenantId: this.tenantId,
      industry: this.industry,
      primaryContact: this.primaryContact,
      plan: this.plan,
      settings: this.settings,
      isActive: this.isActive,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      type: this.type
    };
  }

  static validate(data) {
    const errors = [];

    if (!data.name || data.name.trim().length < 2) {
      errors.push('Organization name must be at least 2 characters long');
    }

    if (!data.adminEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.adminEmail)) {
      errors.push('Valid admin email is required');
    }

    if (data.plan && !['basic', 'premium', 'enterprise'].includes(data.plan)) {
      errors.push('Plan must be basic, premium, or enterprise');
    }

    return errors;
  }
}

module.exports = Organization;
