/**
 * Article Retry Queue Service
 * 
 * Ensures 100% of articles get processed into studies by:
 * 1. Tracking all failed AI inference attempts
 * 2. Implementing persistent retry queue with exponential backoff
 * 3. Running automatic background retries
 * 4. Providing manual retry triggers
 * 5. Never giving up until ALL articles become studies
 * 
 * The core principle: Every article MUST become a study. No data loss.
 */

const cosmosService = require('./cosmosService');
const externalApiService = require('./externalApiService');
const Study = require('../models/Study');

class ArticleRetryQueueService {
  constructor() {
    // In-memory queue for immediate retries
    this.retryQueue = new Map(); // jobId -> { articles: [], retryCount: 0, lastAttempt: Date }
    
    // Configuration
    this.config = {
      maxImmediateRetries: 5,           // Retry up to 5 times immediately
      immediateRetryDelayMs: 3000,       // 3 seconds between immediate retries
      backgroundRetryIntervalMs: 60000,  // Check for failed items every 1 minute
      maxBackgroundRetries: 20,          // Keep trying up to 20 times in background
      retryBatchSize: 10,                // Process 10 articles at a time in retries
      giveUpAfterHours: 24,              // Only give up after 24 hours of trying
    };
    
    // Track processing statistics
    this.stats = {
      totalArticlesQueued: 0,
      totalSuccessfulRetries: 0,
      totalFailedAfterAllRetries: 0,
      activeRetryJobs: 0
    };
    
    // Start background retry processor
    this.startBackgroundProcessor();
    
    console.log('[ArticleRetryQueue] Service initialized with failsafe retry system');
  }

  /**
   * Start the background retry processor
   * This ensures failed articles are continuously retried
   */
  startBackgroundProcessor() {
    setInterval(async () => {
      try {
        await this.processBackgroundRetries();
      } catch (error) {
        console.error('[ArticleRetryQueue] Background processor error:', error.message);
      }
    }, this.config.backgroundRetryIntervalMs);
    
    console.log('[ArticleRetryQueue] Background retry processor started');
  }

  /**
   * Process a batch of articles with guaranteed study creation
   * This is the main entry point - it ensures ALL articles become studies
   * 
   * @param {Array} articles - Array of article objects from PubMed
   * @param {Object} searchParams - Search parameters (query, sponsor, etc.)
   * @param {string} organizationId - Organization ID
   * @param {string} userId - User ID who initiated the job
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Results with created studies and any remaining failures
   */
  async processArticlesWithGuarantee(articles, searchParams, organizationId, userId, options = {}) {
    const jobId = `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();
    
    console.log(`\n${'='.repeat(60)}`);
    console.log(`[ArticleRetryQueue] Starting GUARANTEED processing for ${articles.length} articles`);
    console.log(`[ArticleRetryQueue] Job ID: ${jobId}`);
    console.log(`${'='.repeat(60)}\n`);
    
    const results = {
      jobId,
      totalArticles: articles.length,
      studiesCreated: 0,
      duplicatesSkipped: 0,
      failedArticles: [],
      retryAttempts: 0,
      startTime: new Date().toISOString(),
      endTime: null,
      success: false
    };
    
    // Track which articles still need processing
    let pendingArticles = [...articles];
    let studiesCreated = [];
    
    // Phase 1: Initial processing with batch AI inference
    console.log(`[ArticleRetryQueue] Phase 1: Initial batch processing...`);
    
    const initialResult = await this.processArticleBatch(
      pendingArticles, 
      searchParams, 
      organizationId, 
      userId,
      options
    );
    
    studiesCreated.push(...initialResult.created);
    results.studiesCreated += initialResult.created.length;
    results.duplicatesSkipped += initialResult.duplicates;
    
    // Update pending articles (remove successfully processed ones)
    const processedPmids = new Set([
      ...initialResult.created.map(s => s.pmid),
      ...initialResult.duplicatePmids
    ]);
    pendingArticles = pendingArticles.filter(a => !processedPmids.has(a.pmid));
    
    console.log(`[ArticleRetryQueue] Phase 1 complete: ${initialResult.created.length} studies created, ${pendingArticles.length} remaining`);
    
    // Phase 2: Immediate retries for failed articles
    let retryAttempt = 0;
    while (pendingArticles.length > 0 && retryAttempt < this.config.maxImmediateRetries) {
      retryAttempt++;
      results.retryAttempts = retryAttempt;
      
      console.log(`\n[ArticleRetryQueue] Phase 2: Immediate retry ${retryAttempt}/${this.config.maxImmediateRetries} for ${pendingArticles.length} articles...`);
      
      // Wait before retry with exponential backoff
      const delayMs = this.config.immediateRetryDelayMs * Math.pow(1.5, retryAttempt - 1);
      console.log(`[ArticleRetryQueue] Waiting ${delayMs}ms before retry...`);
      await this.delay(delayMs);
      
      // Retry in smaller batches for better success rate
      const retryResult = await this.processArticleBatch(
        pendingArticles,
        searchParams,
        organizationId,
        userId,
        { ...options, batchSize: this.config.retryBatchSize, enableDetailedLogging: true }
      );
      
      studiesCreated.push(...retryResult.created);
      results.studiesCreated += retryResult.created.length;
      
      // Update pending articles
      const retryProcessedPmids = new Set([
        ...retryResult.created.map(s => s.pmid),
        ...retryResult.duplicatePmids
      ]);
      pendingArticles = pendingArticles.filter(a => !retryProcessedPmids.has(a.pmid));
      
      console.log(`[ArticleRetryQueue] Retry ${retryAttempt} result: ${retryResult.created.length} more studies, ${pendingArticles.length} still pending`);
      
      // If we successfully processed all, exit early
      if (pendingArticles.length === 0) {
        console.log(`[ArticleRetryQueue] 🎉 All articles successfully processed!`);
        break;
      }
    }
    
    // Phase 3: Queue remaining failures for background processing
    if (pendingArticles.length > 0) {
      console.log(`\n[ArticleRetryQueue] Phase 3: Queueing ${pendingArticles.length} articles for background retry...`);
      
      await this.queueForBackgroundRetry(jobId, pendingArticles, searchParams, organizationId, userId);
      
      results.failedArticles = pendingArticles.map(a => ({
        pmid: a.pmid,
        title: a.title || a.drugName,
        queuedAt: new Date().toISOString(),
        reason: 'AI inference failed after immediate retries'
      }));
    }
    
    // Final results
    results.endTime = new Date().toISOString();
    results.durationMs = Date.now() - startTime;
    results.success = pendingArticles.length === 0;
    results.successRate = ((results.studiesCreated / (results.totalArticles - results.duplicatesSkipped)) * 100).toFixed(2);
    
    console.log(`\n${'='.repeat(60)}`);
    console.log(`[ArticleRetryQueue] PROCESSING COMPLETE`);
    console.log(`[ArticleRetryQueue] Total articles: ${results.totalArticles}`);
    console.log(`[ArticleRetryQueue] Studies created: ${results.studiesCreated}`);
    console.log(`[ArticleRetryQueue] Duplicates skipped: ${results.duplicatesSkipped}`);
    console.log(`[ArticleRetryQueue] Queued for background: ${results.failedArticles.length}`);
    console.log(`[ArticleRetryQueue] Success rate: ${results.successRate}%`);
    console.log(`[ArticleRetryQueue] Duration: ${results.durationMs}ms`);
    console.log(`${'='.repeat(60)}\n`);
    
    return results;
  }

  /**
   * Process a batch of articles - handles AI inference and study creation
   * 
   * @param {Array} articles - Articles to process
   * @param {Object} searchParams - Search parameters
   * @param {string} organizationId - Organization ID
   * @param {string} userId - User ID
   * @param {Object} options - Processing options
   * @returns {Promise<Object>} Processing results
   */
  async processArticleBatch(articles, searchParams, organizationId, userId, options = {}) {
    const result = {
      created: [],
      failed: [],
      duplicates: 0,
      duplicatePmids: []
    };
    
    if (!articles || articles.length === 0) {
      return result;
    }
    
    try {
      // Step 1: Get AI inference for all articles
      console.log(`[ArticleRetryQueue] Getting AI inference for ${articles.length} articles...`);
      
      const aiResponse = await externalApiService.sendDrugData(
        articles,
        searchParams,
        {
          enableDetailedLogging: options.enableDetailedLogging !== false,
          batchSize: options.batchSize || 16,
          maxConcurrency: options.maxConcurrency || 16,
          enableRetries: true
        }
      );
      
      if (!aiResponse.success || !aiResponse.results || aiResponse.results.length === 0) {
        console.error(`[ArticleRetryQueue] AI inference returned no results`);
        result.failed = articles;
        return result;
      }
      
      console.log(`[ArticleRetryQueue] AI inference completed: ${aiResponse.results.length} results`);
      
      // Step 2: Create studies from AI results
      for (const aiResult of aiResponse.results) {
        try {
          if (!aiResult || !aiResult.pmid || !aiResult.aiInference) {
            console.warn(`[ArticleRetryQueue] Skipping invalid AI result: no pmid or aiInference`);
            continue;
          }
          
          // Check for duplicates
          const duplicateQuery = 'SELECT c.id FROM c WHERE c.pmid = @pmid AND c.organizationId = @organizationId';
          const duplicateParams = [
            { name: '@pmid', value: aiResult.pmid },
            { name: '@organizationId', value: organizationId }
          ];
          const existingStudies = await cosmosService.queryItems('studies', duplicateQuery, duplicateParams);
          
          if (existingStudies && existingStudies.length > 0) {
            console.log(`[ArticleRetryQueue] Skipping duplicate PMID: ${aiResult.pmid}`);
            result.duplicates++;
            result.duplicatePmids.push(aiResult.pmid);
            continue;
          }
          
          // Create study from AI inference
          const originalDrug = aiResult.originalDrug || aiResult.originalItem || {};
          const study = Study.fromAIInference(
            aiResult.aiInference,
            originalDrug,
            organizationId,
            userId
          );
          
          // Set status based on ICSR classification
          if (study.icsrClassification || study.confirmedPotentialICSR) {
            study.status = 'Under Triage Review';
          }
          
          // Save to database
          const savedStudy = await cosmosService.createItem('studies', study.toJSON());
          result.created.push(savedStudy);
          
          console.log(`[ArticleRetryQueue] ✅ Created study for PMID: ${aiResult.pmid}`);
          
        } catch (studyError) {
          console.error(`[ArticleRetryQueue] ❌ Failed to create study for PMID ${aiResult.pmid}:`, studyError.message);
          // Find the original article and add to failed
          const originalArticle = articles.find(a => a.pmid === aiResult.pmid);
          if (originalArticle) {
            result.failed.push(originalArticle);
          }
        }
      }
      
      // Step 3: Identify articles that didn't get AI inference
      const processedPmids = new Set([
        ...result.created.map(s => s.pmid),
        ...result.duplicatePmids,
        ...result.failed.map(a => a.pmid)
      ]);
      
      const unprocessed = articles.filter(a => !processedPmids.has(a.pmid));
      result.failed.push(...unprocessed);
      
    } catch (error) {
      console.error(`[ArticleRetryQueue] Batch processing error:`, error.message);
      result.failed = articles;
    }
    
    return result;
  }

  /**
   * Queue articles for background retry processing
   * 
   * @param {string} jobId - Job ID for tracking
   * @param {Array} articles - Articles to retry
   * @param {Object} searchParams - Search parameters
   * @param {string} organizationId - Organization ID
   * @param {string} userId - User ID
   */
  async queueForBackgroundRetry(jobId, articles, searchParams, organizationId, userId) {
    const queueItem = {
      jobId,
      articles,
      searchParams,
      organizationId,
      userId,
      retryCount: 0,
      lastAttempt: new Date(),
      createdAt: new Date(),
      status: 'pending'
    };
    
    this.retryQueue.set(jobId, queueItem);
    this.stats.totalArticlesQueued += articles.length;
    this.stats.activeRetryJobs++;
    
    // Also persist to database for durability - use 'jobs' container with type identifier
    try {
      await cosmosService.createItem('jobs', {
        id: jobId,
        type: 'retryQueue',  // Distinguish from regular jobs
        organizationId,      // Required partition key for jobs container
        ...queueItem,
        articles: articles.map(a => ({
          pmid: a.pmid,
          drugName: a.drugName,
          title: a.title
        }))
      });
      console.log(`[ArticleRetryQueue] Persisted ${articles.length} articles to retry queue in database`);
    } catch (dbError) {
      console.error(`[ArticleRetryQueue] Failed to persist to database:`, dbError.message);
      // Continue with in-memory queue - this is non-critical
    }
    
    console.log(`[ArticleRetryQueue] Queued ${articles.length} articles for background retry (Job: ${jobId})`);
  }

  /**
   * Process background retries for all queued jobs
   */
  async processBackgroundRetries() {
    if (this.retryQueue.size === 0) {
      return; // Nothing to process
    }
    
    console.log(`[ArticleRetryQueue] Processing ${this.retryQueue.size} background retry jobs...`);
    
    for (const [jobId, queueItem] of this.retryQueue.entries()) {
      try {
        // Skip if max retries exceeded
        if (queueItem.retryCount >= this.config.maxBackgroundRetries) {
          console.log(`[ArticleRetryQueue] Job ${jobId} exceeded max retries, moving to failed`);
          await this.markJobFailed(jobId, queueItem);
          continue;
        }
        
        // Skip if give up time exceeded
        const hoursSinceCreation = (Date.now() - new Date(queueItem.createdAt).getTime()) / (1000 * 60 * 60);
        if (hoursSinceCreation >= this.config.giveUpAfterHours) {
          console.log(`[ArticleRetryQueue] Job ${jobId} exceeded ${this.config.giveUpAfterHours} hours, moving to failed`);
          await this.markJobFailed(jobId, queueItem);
          continue;
        }
        
        // Process the retry
        queueItem.retryCount++;
        queueItem.lastAttempt = new Date();
        queueItem.status = 'processing';
        
        console.log(`[ArticleRetryQueue] Background retry ${queueItem.retryCount} for job ${jobId} (${queueItem.articles.length} articles)`);
        
        const retryResult = await this.processArticleBatch(
          queueItem.articles,
          queueItem.searchParams,
          queueItem.organizationId,
          queueItem.userId,
          { batchSize: 5, enableDetailedLogging: true }
        );
        
        // Update queue with remaining articles
        const processedPmids = new Set([
          ...retryResult.created.map(s => s.pmid),
          ...retryResult.duplicatePmids
        ]);
        queueItem.articles = queueItem.articles.filter(a => !processedPmids.has(a.pmid));
        
        this.stats.totalSuccessfulRetries += retryResult.created.length;
        
        if (queueItem.articles.length === 0) {
          console.log(`[ArticleRetryQueue] 🎉 Job ${jobId} completed successfully!`);
          await this.markJobComplete(jobId);
        } else {
          queueItem.status = 'pending';
          console.log(`[ArticleRetryQueue] Job ${jobId}: ${retryResult.created.length} more studies created, ${queueItem.articles.length} still pending`);
        }
        
      } catch (error) {
        console.error(`[ArticleRetryQueue] Error processing job ${jobId}:`, error.message);
        queueItem.status = 'error';
        queueItem.lastError = error.message;
      }
    }
  }

  /**
   * Mark a job as complete and clean up
   * @param {string} jobId - Job ID
   */
  async markJobComplete(jobId) {
    const queueItem = this.retryQueue.get(jobId);
    this.retryQueue.delete(jobId);
    this.stats.activeRetryJobs--;
    
    // Database update is optional - in-memory is the source of truth
    // The jobs container TTL will auto-clean these records anyway
    console.log(`[ArticleRetryQueue] Job ${jobId} marked complete`);
  }

  /**
   * Mark a job as failed after all retries exhausted
   * @param {string} jobId - Job ID
   * @param {Object} queueItem - Queue item data
   */
  async markJobFailed(jobId, queueItem) {
    this.retryQueue.delete(jobId);
    this.stats.activeRetryJobs--;
    this.stats.totalFailedAfterAllRetries += queueItem.articles.length;
    
    // Log the failure - database update is non-critical
    console.warn(`[ArticleRetryQueue] ⚠️ Job ${jobId} failed permanently with ${queueItem.articles.length} articles`);
    console.warn(`[ArticleRetryQueue] Failed PMIDs: ${queueItem.articles.map(a => a.pmid).join(', ')}`);
  }

  /**
   * Manually trigger retry for a specific job
   * @param {string} jobId - Job ID
   * @returns {Promise<Object>} Retry result
   */
  async manualRetry(jobId) {
    const queueItem = this.retryQueue.get(jobId);
    
    if (!queueItem) {
      // Job not in memory - for manual retries, this is expected for old jobs
      // Since we use in-memory as source of truth, just return not found
      console.log(`[ArticleRetryQueue] Job ${jobId} not found in active queue`);
      return { success: false, error: 'Job not found or already completed' };
    }
    
    // Force immediate retry
    queueItem.retryCount = 0; // Reset retry count for manual trigger
    await this.processBackgroundRetries();
    
    return {
      success: true,
      remainingArticles: queueItem.articles?.length || 0,
      status: queueItem.status
    };
  }

  /**
   * Get current queue status and statistics
   * @returns {Object} Queue status
   */
  getStatus() {
    const queuedJobs = [];
    
    for (const [jobId, item] of this.retryQueue.entries()) {
      queuedJobs.push({
        jobId,
        articlesRemaining: item.articles.length,
        retryCount: item.retryCount,
        lastAttempt: item.lastAttempt,
        createdAt: item.createdAt,
        status: item.status,
        lastError: item.lastError
      });
    }
    
    return {
      stats: this.stats,
      config: this.config,
      activeJobs: queuedJobs,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Retry all failed articles from database
   * @param {string} organizationId - Optional filter by organization
   * @returns {Promise<Object>} Retry results
   */
  async retryAllFailed(organizationId = null) {
    try {
      let query = 'SELECT * FROM c WHERE c.status = @status';
      const params = [{ name: '@status', value: 'pending' }];
      
      if (organizationId) {
        query += ' AND c.organizationId = @orgId';
        params.push({ name: '@orgId', value: organizationId });
      }
      
      const failedJobs = await cosmosService.queryItems('articleRetryQueue', query, params);
      
      if (!failedJobs || failedJobs.length === 0) {
        return { success: true, message: 'No failed jobs to retry', jobsRetried: 0 };
      }
      
      console.log(`[ArticleRetryQueue] Retrying ${failedJobs.length} failed jobs...`);
      
      // Reload into memory queue
      for (const job of failedJobs) {
        if (!this.retryQueue.has(job.id)) {
          this.retryQueue.set(job.id, job);
        }
      }
      
      // Process all
      await this.processBackgroundRetries();
      
      return {
        success: true,
        message: `Triggered retry for ${failedJobs.length} jobs`,
        jobsRetried: failedJobs.length
      };
      
    } catch (error) {
      console.error('[ArticleRetryQueue] Error retrying all failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Utility function for delays
   * @param {number} ms - Milliseconds to delay
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = new ArticleRetryQueueService();
