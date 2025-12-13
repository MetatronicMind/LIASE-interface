const { v4: uuidv4 } = require('uuid');

class DrugSearchConfig {
  constructor(data = {}) {
    this.id = data.id || uuidv4();
    this.organizationId = data.organizationId;
    this.userId = data.userId;
    this.name = data.name; // User-friendly name for the search
    this.inn = data.inn || ''; // International Nonproprietary Name
    this.query = data.query; // Drug name or search term
    this.sponsor = data.sponsor || ''; // Manufacturer/sponsor
    this.brandName = data.brandName || ''; // Brand/Product name
    this.frequency = data.frequency || 'custom'; // weekly, custom
    this.customFrequencyHours = data.customFrequencyHours || 12; // For custom frequency
    this.isActive = data.isActive !== undefined ? data.isActive : true;
    this.lastRunAt = data.lastRunAt || null;
    this.nextRunAt = data.nextRunAt || null;
    this.totalRuns = data.totalRuns || 0;
    this.lastResultCount = data.lastResultCount || 0;
    this.lastRunPmids = data.lastRunPmids || [];
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
    this.createdBy = data.createdBy;
    
    // Search configuration
    this.maxResults = data.maxResults || 1000; // Increased default limit
    this.includeAdverseEvents = data.includeAdverseEvents !== undefined ? data.includeAdverseEvents : true;
    this.includeSafety = data.includeSafety !== undefined ? data.includeSafety : true;
    
    // Date range configuration
    this.dateFrom = data.dateFrom || null; // YYYY/MM/DD format
    this.dateTo = data.dateTo || null; // YYYY/MM/DD format
    
    // External API configuration
    this.sendToExternalApi = data.sendToExternalApi !== undefined ? data.sendToExternalApi : true;
    this.lastExternalApiCall = data.lastExternalApiCall || null;
    this.lastExternalApiSuccess = data.lastExternalApiSuccess || null;

    // FOR TESTING: Log when config is created without data.id (meaning it's new)
    if (!data.id && this.frequency !== 'manual') {
      console.log(`🔧 NEW DRUG SEARCH CONFIG CREATED: "${this.name}" with frequency "${this.frequency}" - scheduled to run based on frequency`);
    }
  }

  // Calculate date range based on frequency
  calculateDateRange() {
    const now = new Date();
    let dateFrom = null;
    let dateTo = null;

    switch (this.frequency) {
      case 'daily':
        // Last 24 hours
        dateFrom = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        dateTo = now;
        break;
      case 'weekly':
        // Last 7 days
        dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        dateTo = now;
        break;
      case 'monthly':
        // Last 30 days
        dateFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        dateTo = now;
        break;
      case 'custom':
        // Use user-specified date range if provided
        dateFrom = this.dateFrom ? new Date(this.dateFrom) : null;
        dateTo = this.dateTo ? new Date(this.dateTo) : null;
        break;
    }

    return {
      dateFrom: dateFrom ? this.formatDateForPubMed(dateFrom) : null,
      dateTo: dateTo ? this.formatDateForPubMed(dateTo) : null
    };
  }

  // Format date for PubMed API (YYYY/MM/DD)
  formatDateForPubMed(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}/${month}/${day}`;
  }

  // Calculate next run time based on frequency
  calculateNextRun() {
    const now = new Date();
    let nextRun = null;
    
    switch (this.frequency) {
      case 'daily':
        nextRun = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
        break;
      case 'weekly':
        nextRun = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
        break;
      case 'monthly':
        nextRun = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
        break;
      case 'custom':
        nextRun = this.customFrequencyHours ? 
          new Date(now.getTime() + this.customFrequencyHours * 60 * 60 * 1000).toISOString() :
          null; // Custom with no hours means manual execution
        break;
      default:
        nextRun = null; // Custom searches without hours don't have scheduled next run
    }

    if (nextRun) {
      const nextRunDate = new Date(nextRun);
      console.log(`🕐 SCHEDULED: "${this.name || this.id}" (${this.frequency}) next run at ${nextRunDate.toLocaleString('en-US', { timeZone: 'UTC' })} UTC`);
    }

    return nextRun;
  }

  // Update after a search run
  updateAfterRun(resultCount, externalApiSuccess = null, pmids = []) {
    this.lastRunAt = new Date().toISOString();
    this.totalRuns += 1;
    this.lastResultCount = resultCount;
    this.lastRunPmids = pmids;
    this.nextRunAt = this.calculateNextRun();
    this.updatedAt = new Date().toISOString();
    
    if (externalApiSuccess !== null) {
      this.lastExternalApiCall = new Date().toISOString();
      this.lastExternalApiSuccess = externalApiSuccess;
    }
  }

  // Check if search is due to run
  isDueForRun() {
    if (!this.isActive || this.frequency === 'manual') {
      return false;
    }
    
    if (!this.nextRunAt) {
      return true; // Never run before, run now
    }
    
    return new Date(this.nextRunAt) <= new Date();
  }

  // Validate required fields
  validate() {
    const errors = [];
    
    if (!this.name || this.name.trim().length === 0) {
      errors.push('Name is required');
    }
    
    if (!this.query || this.query.trim().length === 0) {
      errors.push('Query is required');
    }
    
    if (!this.organizationId) {
      errors.push('Organization ID is required');
    }
    
    if (!this.userId) {
      errors.push('User ID is required');
    }
    
    if (!['daily', 'weekly', 'monthly', 'custom'].includes(this.frequency)) {
      errors.push('Invalid frequency');
    }
    
    if (this.frequency === 'custom' && (!this.customFrequencyHours || this.customFrequencyHours < 1)) {
      errors.push('Custom frequency hours must be at least 1');
    }
    
    return errors;
  }

  // Convert to plain object for database storage
  toObject() {
    return {
      id: this.id,
      organizationId: this.organizationId,
      userId: this.userId,
      name: this.name,
      inn: this.inn,
      query: this.query,
      sponsor: this.sponsor,
      brandName: this.brandName,
      frequency: this.frequency,
      customFrequencyHours: this.customFrequencyHours,
      isActive: this.isActive,
      lastRunAt: this.lastRunAt,
      nextRunAt: this.nextRunAt,
      totalRuns: this.totalRuns,
      lastResultCount: this.lastResultCount,
      lastRunPmids: this.lastRunPmids,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      createdBy: this.createdBy,
      maxResults: this.maxResults,
      includeAdverseEvents: this.includeAdverseEvents,
      includeSafety: this.includeSafety,
      dateFrom: this.dateFrom,
      dateTo: this.dateTo,
      sendToExternalApi: this.sendToExternalApi,
      lastExternalApiCall: this.lastExternalApiCall,
      lastExternalApiSuccess: this.lastExternalApiSuccess
    };
  }

  // Create from database object
  static fromObject(obj) {
    return new DrugSearchConfig(obj);
  }
}

module.exports = DrugSearchConfig;