const { v4: uuidv4 } = require('uuid');

/**
 * ScheduledJob Model
 * Manages scheduled tasks and cron jobs
 */
class ScheduledJob {
  constructor({
    id = null,
    organizationId,
    name,
    description = '',
    jobType = 'report', // report, notification, cleanup, backup, custom
    scheduleType = 'cron', // cron, interval, once
    cronExpression = '0 9 * * *', // Default: daily at 9 AM
    intervalMs = null,
    scheduledAt = null, // For one-time jobs
    timezone = 'UTC',
    isActive = true,
    status = 'pending', // pending, running, completed, failed, cancelled
    lastRunAt = null,
    lastRunStatus = null,
    lastRunDuration = null,
    lastRunError = null,
    nextRunAt = null,
    runCount = 0,
    failureCount = 0,
    maxRetries = 3,
    timeout = 3600000, // 1 hour default
    payload = {}, // Job-specific configuration
    executionHistory = [],
    metadata = {},
    createdBy,
    createdAt = new Date().toISOString(),
    updatedAt = new Date().toISOString()
  }) {
    this.id = id || `scheduled_job_${uuidv4()}`;
    this.organizationId = organizationId;
    this.name = name;
    this.description = description;
    this.jobType = jobType;
    this.scheduleType = scheduleType;
    this.cronExpression = cronExpression;
    this.intervalMs = intervalMs;
    this.scheduledAt = scheduledAt;
    this.timezone = timezone;
    this.isActive = isActive;
    this.status = status;
    this.lastRunAt = lastRunAt;
    this.lastRunStatus = lastRunStatus;
    this.lastRunDuration = lastRunDuration;
    this.lastRunError = lastRunError;
    this.nextRunAt = nextRunAt;
    this.runCount = runCount;
    this.failureCount = failureCount;
    this.maxRetries = maxRetries;
    this.timeout = timeout;
    this.payload = payload;
    this.executionHistory = executionHistory;
    this.metadata = metadata;
    this.createdBy = createdBy;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.type_doc = 'scheduled_job';
  }

  // Mark job as started
  markAsStarted() {
    this.status = 'running';
    this.lastRunAt = new Date().toISOString();
    this.updatedAt = new Date().toISOString();
  }

  // Mark job as completed
  markAsCompleted(duration, result = {}) {
    this.status = 'completed';
    this.lastRunStatus = 'success';
    this.lastRunDuration = duration;
    this.lastRunError = null;
    this.runCount += 1;
    this.updatedAt = new Date().toISOString();

    this._addExecutionRecord('success', duration, null, result);
    this._calculateNextRun();
  }

  // Mark job as failed
  markAsFailed(duration, error) {
    this.status = 'failed';
    this.lastRunStatus = 'failed';
    this.lastRunDuration = duration;
    this.lastRunError = error;
    this.failureCount += 1;
    this.updatedAt = new Date().toISOString();

    this._addExecutionRecord('failed', duration, error);

    // Disable job if max retries exceeded
    if (this.failureCount >= this.maxRetries) {
      this.isActive = false;
      this.metadata.disabledReason = 'Maximum retry attempts exceeded';
    }

    this._calculateNextRun();
  }

  // Add execution record to history
  _addExecutionRecord(status, duration, error = null, result = {}) {
    this.executionHistory.push({
      executedAt: new Date().toISOString(),
      status,
      duration,
      error,
      result
    });

    // Keep only last 50 executions
    if (this.executionHistory.length > 50) {
      this.executionHistory = this.executionHistory.slice(-50);
    }
  }

  // Calculate next run time based on schedule
  _calculateNextRun() {
    if (!this.isActive) {
      this.nextRunAt = null;
      return;
    }

    const now = new Date();

    switch (this.scheduleType) {
      case 'once':
        this.nextRunAt = null;
        this.isActive = false;
        break;

      case 'interval':
        if (this.intervalMs) {
          const nextRun = new Date(now.getTime() + this.intervalMs);
          this.nextRunAt = nextRun.toISOString();
        }
        break;

      case 'cron':
        // In production, use a cron parser library like 'cron-parser'
        // For now, setting a placeholder
        this.nextRunAt = new Date(now.getTime() + 86400000).toISOString(); // +24 hours
        break;
    }
  }

  // Check if job should run now
  shouldRunNow() {
    if (!this.isActive) return false;
    if (this.status === 'running') return false;
    if (!this.nextRunAt) return false;

    const now = new Date();
    const nextRun = new Date(this.nextRunAt);
    
    return now >= nextRun;
  }

  // Cancel the job
  cancel(reason = 'Cancelled by admin') {
    this.status = 'cancelled';
    this.isActive = false;
    this.metadata.cancelReason = reason;
    this.metadata.cancelledAt = new Date().toISOString();
    this.updatedAt = new Date().toISOString();
  }

  toJSON() {
    return {
      id: this.id,
      organizationId: this.organizationId,
      name: this.name,
      description: this.description,
      jobType: this.jobType,
      scheduleType: this.scheduleType,
      cronExpression: this.cronExpression,
      intervalMs: this.intervalMs,
      scheduledAt: this.scheduledAt,
      timezone: this.timezone,
      isActive: this.isActive,
      status: this.status,
      lastRunAt: this.lastRunAt,
      lastRunStatus: this.lastRunStatus,
      lastRunDuration: this.lastRunDuration,
      lastRunError: this.lastRunError,
      nextRunAt: this.nextRunAt,
      runCount: this.runCount,
      failureCount: this.failureCount,
      maxRetries: this.maxRetries,
      timeout: this.timeout,
      payload: this.payload,
      executionHistory: this.executionHistory,
      metadata: this.metadata,
      createdBy: this.createdBy,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      type_doc: this.type_doc
    };
  }

  validate() {
    const errors = [];

    if (!this.organizationId) {
      errors.push('Organization ID is required');
    }

    if (!this.name || this.name.trim().length === 0) {
      errors.push('Job name is required');
    }

    if (!['report', 'notification', 'cleanup', 'backup', 'custom'].includes(this.jobType)) {
      errors.push('Invalid job type');
    }

    if (!['cron', 'interval', 'once'].includes(this.scheduleType)) {
      errors.push('Invalid schedule type');
    }

    if (this.scheduleType === 'cron' && !this.cronExpression) {
      errors.push('Cron expression is required for cron schedule type');
    }

    if (this.scheduleType === 'interval' && (!this.intervalMs || this.intervalMs < 1000)) {
      errors.push('Valid interval (minimum 1000ms) is required for interval schedule type');
    }

    if (this.scheduleType === 'once' && !this.scheduledAt) {
      errors.push('Scheduled time is required for one-time jobs');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

module.exports = ScheduledJob;
