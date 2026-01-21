const { v4: uuidv4 } = require('uuid');

/**
 * EmailTemplate Model
 * Manages email templates with variable substitution and locking
 */
class EmailTemplate {
  constructor({
    id = null,
    organizationId,
    name,
    description = '',
    subject,
    bodyHtml,
    bodyPlain = '',
    variables = [], // Array of {name, description, required, defaultValue}
    category = 'general', // general, notification, report, system
    isLocked = false,
    lockedBy = null,
    lockedAt = null,
    lockReason = '',
    version = 1,
    status = 'draft', // draft, active, archived
    previewText = '',
    isDefault = false,
    metadata = {},
    createdBy,
    createdAt = new Date().toISOString(),
    updatedAt = new Date().toISOString(),
    lastUsedAt = null,
    usageCount = 0
  }) {
    this.id = id || `email_template_${uuidv4()}`;
    this.organizationId = organizationId;
    this.name = name;
    this.description = description;
    this.subject = subject;
    this.bodyHtml = bodyHtml;
    this.bodyPlain = bodyPlain || this._stripHtml(bodyHtml);
    this.variables = variables;
    this.category = category;
    this.isLocked = isLocked;
    this.lockedBy = lockedBy;
    this.lockedAt = lockedAt;
    this.lockReason = lockReason;
    this.version = version;
    this.status = status;
    this.previewText = previewText;
    this.isDefault = isDefault;
    this.metadata = metadata;
    this.createdBy = createdBy;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.lastUsedAt = lastUsedAt;
    this.usageCount = usageCount;
    this.type_doc = 'email_template';
  }

  // Lock the template to prevent editing
  lock(userId, reason = 'Template approved and locked for production use') {
    if (this.isLocked) {
      throw new Error('Template is already locked');
    }

    this.isLocked = true;
    this.lockedBy = userId;
    this.lockedAt = new Date().toISOString();
    this.lockReason = reason;
    this.status = 'active';
    this.updatedAt = new Date().toISOString();
  }

  // Unlock the template (admin only)
  unlock(userId) {
    this.isLocked = false;
    this.lockedBy = null;
    this.lockedAt = null;
    this.lockReason = '';
    this.updatedAt = new Date().toISOString();
    
    // Add unlock audit trail in metadata
    if (!this.metadata.unlockHistory) {
      this.metadata.unlockHistory = [];
    }
    this.metadata.unlockHistory.push({
      unlockedBy: userId,
      unlockedAt: new Date().toISOString()
    });
  }

  // Create a new version (when locked template needs changes)
  createNewVersion() {
    if (!this.isLocked) {
      throw new Error('Only locked templates can be versioned');
    }

    const newTemplate = new EmailTemplate({
      ...this.toJSON(),
      id: null, // Generate new ID
      version: this.version + 1,
      isLocked: false,
      lockedBy: null,
      lockedAt: null,
      lockReason: '',
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metadata: {
        ...this.metadata,
        previousVersionId: this.id
      }
    });

    return newTemplate;
  }

  // Render template with provided data
  render(data = {}) {
    let renderedSubject = this.subject;
    let renderedBodyHtml = this.bodyHtml;
    let renderedBodyPlain = this.bodyPlain;

    // Replace variables in format {variableName}
    this.variables.forEach(variable => {
      const placeholder = new RegExp(`\\{${variable.name}\\}`, 'g');
      const value = data[variable.name] || variable.defaultValue || '';

      renderedSubject = renderedSubject.replace(placeholder, value);
      renderedBodyHtml = renderedBodyHtml.replace(placeholder, value);
      renderedBodyPlain = renderedBodyPlain.replace(placeholder, value);
    });

    // Check for required variables
    const missingVariables = this.variables
      .filter(v => v.required && !data[v.name])
      .map(v => v.name);

    if (missingVariables.length > 0) {
      throw new Error(`Missing required variables: ${missingVariables.join(', ')}`);
    }

    return {
      subject: renderedSubject,
      bodyHtml: renderedBodyHtml,
      bodyPlain: renderedBodyPlain
    };
  }

  // Extract variables from template content
  extractVariables() {
    const variablePattern = /\{(\w+)\}/g;
    const foundVariables = new Set();
    
    let match;
    const combinedText = `${this.subject} ${this.bodyHtml} ${this.bodyPlain}`;
    
    while ((match = variablePattern.exec(combinedText)) !== null) {
      foundVariables.add(match[1]);
    }

    return Array.from(foundVariables);
  }

  // Validate template structure
  validateTemplate() {
    const errors = [];
    const extractedVars = this.extractVariables();
    const declaredVars = this.variables.map(v => v.name);

    // Check for undeclared variables
    const undeclared = extractedVars.filter(v => !declaredVars.includes(v));
    if (undeclared.length > 0) {
      errors.push(`Undeclared variables found: ${undeclared.join(', ')}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      extractedVariables: extractedVars
    };
  }

  // Track usage
  markAsUsed() {
    this.lastUsedAt = new Date().toISOString();
    this.usageCount += 1;
    this.updatedAt = new Date().toISOString();
  }

  // Helper to strip HTML tags for plain text
  _stripHtml(html) {
    if (!html) return '';
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .trim();
  }

  toJSON() {
    return {
      id: this.id,
      organizationId: this.organizationId,
      name: this.name,
      description: this.description,
      subject: this.subject,
      bodyHtml: this.bodyHtml,
      bodyPlain: this.bodyPlain,
      variables: this.variables,
      category: this.category,
      isLocked: this.isLocked,
      lockedBy: this.lockedBy,
      lockedAt: this.lockedAt,
      lockReason: this.lockReason,
      version: this.version,
      status: this.status,
      previewText: this.previewText,
      isDefault: this.isDefault,
      metadata: this.metadata,
      createdBy: this.createdBy,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      lastUsedAt: this.lastUsedAt,
      usageCount: this.usageCount,
      type_doc: this.type_doc
    };
  }

  validate() {
    const errors = [];

    if (!this.organizationId) {
      errors.push('Organization ID is required');
    }

    if (!this.name || this.name.trim().length === 0) {
      errors.push('Template name is required');
    }

    if (!this.subject || this.subject.trim().length === 0) {
      errors.push('Subject is required');
    }

    if (!this.bodyHtml || this.bodyHtml.trim().length === 0) {
      errors.push('HTML body is required');
    }

    // Validate template syntax
    const templateValidation = this.validateTemplate();
    if (!templateValidation.isValid) {
      errors.push(...templateValidation.errors);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

module.exports = EmailTemplate;
