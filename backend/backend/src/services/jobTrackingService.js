const cosmosService = require('./cosmosService');

/**
 * Job Tracking Service for monitoring long-running operations
 */
class JobTrackingService {
  constructor() {
    this.activeJobs = new Map(); // In-memory tracking for active jobs
  }

  /**
   * Create a new job tracking record
   * @param {string} type - Type of job (e.g., 'drug_discovery', 'study_creation')
   * @param {string} userId - User ID who initiated the job
   * @param {string} organizationId - Organization ID
   * @param {Object} metadata - Additional job metadata
   * @returns {Promise<Object>} Created job record
   */
  async createJob(type, userId, organizationId, metadata = {}) {
    const jobId = this.generateJobId();
    
    const job = {
      id: jobId,
      type,
      userId,
      organizationId,
      status: 'started',
      progress: 0,
      totalSteps: metadata.totalSteps || 100,
      currentStep: 0,
      message: 'Job started',
      metadata,
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      completedAt: null,
      error: null,
      results: null
    };

    try {
      // Store in database
      const createdJob = await cosmosService.createItem('jobs', job);
      
      // Update job object with the actual ID from Cosmos DB (if different)
      const actualJobId = createdJob.id;
      job.id = actualJobId;
      
      // Store in memory for quick access using the actual ID
      this.activeJobs.set(actualJobId, job);
      
      console.log(`Created job ${actualJobId} of type ${type} for user ${userId}`);
      return createdJob;
    } catch (error) {
      console.error(`Error creating job ${jobId}:`, error);
      throw error;
    }
  }

  /**
   * Update job progress
   * @param {string} jobId - Job ID
   * @param {Object} updates - Updates to apply
   * @returns {Promise<Object>} Updated job record
   */
  async updateJob(jobId, updates) {
    try {
      const job = this.activeJobs.get(jobId);
      if (!job) {
        throw new Error(`Job ${jobId} not found in active jobs`);
      }

      // Update the job object
      Object.assign(job, {
        ...updates,
        updatedAt: new Date().toISOString()
      });

      // If job is completed or failed, set completion time
      if (updates.status === 'completed' || updates.status === 'failed') {
        job.completedAt = new Date().toISOString();
      }

      // Update in database - use organizationId as partition key
      const updatedJob = await cosmosService.updateItem('jobs', jobId, job.organizationId, job);
      
      // Update in memory
      this.activeJobs.set(jobId, job);
      
      console.log(`Updated job ${jobId}: ${updates.message || updates.status}`);
      return updatedJob;
    } catch (error) {
      console.error(`Error updating job ${jobId}:`, error);
      throw error;
    }
  }

  /**
   * Complete a job successfully
   * @param {string} jobId - Job ID
   * @param {Object} results - Final results
   * @param {string} message - Completion message
   * @returns {Promise<Object>} Completed job record
   */
  async completeJob(jobId, results = {}, message = 'Job completed successfully') {
    return await this.updateJob(jobId, {
      status: 'completed',
      progress: 100,
      message,
      results
    });
  }

  /**
   * Fail a job with error
   * @param {string} jobId - Job ID
   * @param {string} error - Error message
   * @param {Object} partialResults - Any partial results
   * @returns {Promise<Object>} Failed job record
   */
  async failJob(jobId, error, partialResults = {}) {
    return await this.updateJob(jobId, {
      status: 'failed',
      error,
      message: `Job failed: ${error}`,
      results: partialResults
    });
  }

  /**
   * Get job status
   * @param {string} jobId - Job ID
   * @param {string} organizationId - Optional organization ID for partition key
   * @returns {Promise<Object>} Job record
   */
  async getJob(jobId, organizationId = null) {
    try {
      // Try memory first
      const memoryJob = this.activeJobs.get(jobId);
      if (memoryJob) {
        return memoryJob;
      }

      // Fallback to database
      let dbJob = null;
      
      if (organizationId) {
        // Use the partition key if provided
        dbJob = await cosmosService.getItem('jobs', jobId, organizationId);
      } else {
        // Query for the job if we don't have the partition key
        const query = "SELECT * FROM c WHERE c.id = @jobId";
        const parameters = [
          { name: "@jobId", value: jobId }
        ];
        const results = await cosmosService.queryItems('jobs', query, parameters);
        dbJob = results.length > 0 ? results[0] : null;
      }
      
      if (dbJob) {
        // Add to memory if it's still active
        if (dbJob.status === 'started' || dbJob.status === 'running') {
          this.activeJobs.set(jobId, dbJob);
        }
        return dbJob;
      }

      throw new Error(`Job ${jobId} not found`);
    } catch (error) {
      console.error(`Error getting job ${jobId}:`, error);
      throw error;
    }
  }

  /**
   * Get all jobs for a user
   * @param {string} userId - User ID
   * @param {number} limit - Maximum number of jobs to return
   * @returns {Promise<Array>} Array of job records
   */
  async getUserJobs(userId, limit = 50) {
    try {
      const query = "SELECT * FROM c WHERE c.userId = @userId ORDER BY c.startedAt DESC";
      const parameters = [
        { name: "@userId", value: userId }
      ];

      const results = await cosmosService.queryItems('jobs', query, parameters);
      return results.slice(0, limit);
    } catch (error) {
      console.error(`Error getting jobs for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Clean up completed jobs from memory
   */
  cleanupMemory() {
    const completedJobs = [];
    for (const [jobId, job] of this.activeJobs) {
      if (job.status === 'completed' || job.status === 'failed') {
        // Keep completed jobs in memory for 5 minutes for quick access
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        const completedAt = new Date(job.completedAt || job.updatedAt);
        
        if (completedAt < fiveMinutesAgo) {
          completedJobs.push(jobId);
        }
      }
    }

    completedJobs.forEach(jobId => {
      this.activeJobs.delete(jobId);
      console.log(`Cleaned up completed job ${jobId} from memory`);
    });
  }

  /**
   * Generate a unique job ID
   * @returns {string} Job ID
   */
  generateJobId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `job_${timestamp}_${random}`;
  }

  /**
   * Start periodic cleanup of memory
   */
  startCleanupScheduler() {
    // Clean up every 5 minutes
    setInterval(() => {
      this.cleanupMemory();
    }, 5 * 60 * 1000);
  }
}

// Create singleton instance
const jobTrackingService = new JobTrackingService();

// Start cleanup scheduler
jobTrackingService.startCleanupScheduler();

module.exports = jobTrackingService;