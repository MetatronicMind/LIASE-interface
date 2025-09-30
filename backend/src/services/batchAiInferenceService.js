/**
 * Batch AI Inference Service
 * 
 * Provides high-performance batch processing capabilities for AI inference requests.
 * Supports concurrent processing, intelligent failover, and optimized throughput.
 */

const config = require('../../ai-inference-config');

class BatchAiInferenceService {
  constructor() {
    this.config = config;
    
    // Initialize endpoint health tracking
    this.endpointHealth = this.config.endpoints.map(url => ({
      url,
      isHealthy: true,
      consecutiveFailures: 0,
      lastSuccessAt: new Date(),
      lastFailureAt: null,
      responseTimeMs: 0,
      currentRequests: 0
    }));

    // Batch processing state
    this.processingQueue = [];
    this.activeRequests = new Map();
    this.requestId = 0;

    // Start health monitoring
    this.startHealthMonitoring();
  }

  /**
   * Process a batch of AI inference requests with optimal performance
   * @param {Array} drugData - Array of objects with pmid, title, drugName
   * @param {Object} searchParams - Search parameters (query, sponsor, frequency)
   * @param {Object} options - Processing options (batchSize, maxConcurrency, etc.)
   * @returns {Promise<Object>} Batch processing results
   */
  async processBatch(drugData, searchParams = {}, options = {}) {
    const startTime = Date.now();
    const totalItems = drugData.length;
    
    // Configure batch processing options
    const batchOptions = {
      batchSize: options.batchSize || this.config.maxConcurrentRequests,
      maxConcurrency: options.maxConcurrency || this.config.maxConcurrentRequests,
      enableRetries: options.enableRetries !== false,
      enableDetailedLogging: options.enableDetailedLogging !== false,
      progressCallback: options.progressCallback || null,
      ...options
    };

    if (batchOptions.enableDetailedLogging) {
      console.log(`[BatchAI] Starting batch processing for ${totalItems} items`);
      console.log(`[BatchAI] Configuration:`, batchOptions);
    }

    const results = [];
    const errors = [];
    let processed = 0;

    try {
      // Process items in batches for optimal performance
      for (let i = 0; i < drugData.length; i += batchOptions.batchSize) {
        const batch = drugData.slice(i, i + batchOptions.batchSize);
        
        if (batchOptions.enableDetailedLogging) {
          console.log(`[BatchAI] Processing batch ${Math.floor(i / batchOptions.batchSize) + 1}/${Math.ceil(drugData.length / batchOptions.batchSize)} (${batch.length} items)`);
        }

        // Process batch concurrently
        const batchPromises = batch.map(item => 
          this.processSingleItem(item, searchParams, batchOptions)
            .catch(error => ({ error, item }))
        );

        const batchResults = await this.processConcurrently(
          batchPromises, 
          batchOptions.maxConcurrency
        );

        // Collect results and errors
        for (const result of batchResults) {
          if (result.error) {
            errors.push({
              pmid: result.item?.pmid || 'unknown',
              error: result.error.message,
              timestamp: new Date().toISOString()
            });
          } else if (result.success) {
            results.push(result.data);
          }
          processed++;

          // Call progress callback if provided
          if (batchOptions.progressCallback) {
            batchOptions.progressCallback({
              processed,
              total: totalItems,
              percentage: Math.round((processed / totalItems) * 100),
              currentBatch: Math.floor(i / batchOptions.batchSize) + 1,
              totalBatches: Math.ceil(drugData.length / batchOptions.batchSize)
            });
          }
        }

        // Add delay between batches to prevent overwhelming APIs
        if (i + batchOptions.batchSize < drugData.length) {
          await this.delay(this.config.minRequestInterval || 1000);
        }
      }

      const duration = Date.now() - startTime;
      const avgResponseTime = results.length > 0 ? duration / results.length : 0;

      if (batchOptions.enableDetailedLogging) {
        console.log(`[BatchAI] Batch processing completed in ${duration}ms`);
        console.log(`[BatchAI] Success rate: ${results.length}/${totalItems} (${Math.round((results.length / totalItems) * 100)}%)`);
        console.log(`[BatchAI] Average response time: ${Math.round(avgResponseTime)}ms per item`);
      }

      return {
        success: true,
        totalItems,
        processedItems: processed,
        successfulItems: results.length,
        failedItems: errors.length,
        results,
        errors,
        performance: {
          totalDurationMs: duration,
          averageResponseTimeMs: Math.round(avgResponseTime),
          throughputPerSecond: Math.round((results.length / duration) * 1000)
        },
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('[BatchAI] Batch processing failed:', error);
      return {
        success: false,
        error: error.message,
        totalItems,
        processedItems: processed,
        successfulItems: results.length,
        failedItems: errors.length,
        results,
        errors,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Process a single AI inference item
   * @param {Object} item - Item with pmid, title, drugName
   * @param {Object} searchParams - Search parameters
   * @param {Object} options - Processing options
   * @returns {Promise<Object>} Processing result
   */
  async processSingleItem(item, searchParams, options) {
    const requestId = ++this.requestId;
    const startTime = Date.now();

    try {
      const pmid = item.pmid;
      const drugName = item.drugName || searchParams.query || 'Unknown';
      const sponsor = searchParams.sponsor || 'Unknown';

      if (options.enableDetailedLogging) {
        console.log(`[BatchAI:${requestId}] Processing PMID: ${pmid}, Drug: ${drugName}`);
      }

      // Get prioritized list of healthy endpoints
      const prioritizedEndpoints = this.getPrioritizedEndpoints();
      
      if (options.enableDetailedLogging) {
        console.log(`[BatchAI:${requestId}] Available endpoints: ${prioritizedEndpoints.length}/${this.endpointHealth.length}`);
        prioritizedEndpoints.forEach((ep, idx) => {
          console.log(`[BatchAI:${requestId}] Endpoint ${idx + 1}: ${ep.url} (healthy: ${ep.isHealthy}, failures: ${ep.consecutiveFailures})`);
        });
      }
      
      if (prioritizedEndpoints.length === 0) {
        console.error(`[BatchAI:${requestId}] No healthy endpoints available!`);
        this.endpointHealth.forEach((ep, idx) => {
          console.error(`[BatchAI:${requestId}] Endpoint ${idx + 1}: ${ep.url} - healthy: ${ep.isHealthy}, failures: ${ep.consecutiveFailures}`);
        });
        throw new Error('No healthy endpoints available');
      }

      let response = null;
      let lastError = null;
      let successfulEndpoint = null;

      // Try endpoints until success or all fail
      for (const endpoint of prioritizedEndpoints) {
        if (endpoint.currentRequests >= this.config.maxConcurrentPerEndpoint) {
          continue; // Skip overloaded endpoints
        }

        try {
          endpoint.currentRequests++;
          
          const apiUrl = this.buildApiUrl(endpoint.url, pmid, sponsor, drugName);
          const requestStartTime = Date.now();
          
          if (options.enableDetailedLogging) {
            console.log(`[BatchAI:${requestId}] Trying ${endpoint.url} with URL: ${apiUrl}`);
          }

          // Create request with timeout
          const controller = new AbortController();
          const timeoutId = setTimeout(() => {
            console.log(`[BatchAI:${requestId}] Request timeout after ${this.config.requestTimeout}ms`);
            controller.abort();
          }, this.config.requestTimeout);

          response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
              'User-Agent': 'LIASE-Batch/1.0',
              'Accept-Language': 'en-US,en;q=0.9',
              'Cache-Control': 'no-cache'
            },
            signal: controller.signal
          });

          clearTimeout(timeoutId);
          endpoint.currentRequests--;

          const responseTimeMs = Date.now() - requestStartTime;

          if (response.ok) {
            this.markEndpointSuccess(endpoint, responseTimeMs);
            successfulEndpoint = endpoint;
            break;
          } else {
            const errorMsg = `HTTP ${response.status}: ${response.statusText}`;
            this.markEndpointFailure(endpoint, errorMsg);
            lastError = errorMsg;
            continue;
          }

        } catch (fetchError) {
          endpoint.currentRequests--;
          const errorMsg = `${fetchError.name}: ${fetchError.message}`;
          console.error(`[BatchAI:${requestId}] Fetch error for ${endpoint.url}: ${errorMsg}`);
          this.markEndpointFailure(endpoint, errorMsg);
          lastError = errorMsg;
          continue;
        }
      }

      if (!response || !response.ok) {
        throw new Error(`All endpoints failed. Last error: ${lastError}`);
      }

      // Parse response
      const responseText = await response.text();
      let aiResult;

      try {
        aiResult = JSON.parse(responseText);
      } catch (parseError) {
        throw new Error(`Failed to parse AI response: ${parseError.message}`);
      }

      const duration = Date.now() - startTime;

      if (options.enableDetailedLogging) {
        console.log(`[BatchAI:${requestId}] Success for PMID ${pmid} in ${duration}ms via ${successfulEndpoint.url}`);
      }

      return {
        success: true,
        data: {
          pmid,
          drugName,
          sponsor,
          aiInference: aiResult,
          originalDrug: item,
          processingTimeMs: duration,
          endpoint: successfulEndpoint.url
        }
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      
      if (options.enableDetailedLogging) {
        console.error(`[BatchAI:${requestId}] Failed for PMID ${item.pmid} after ${duration}ms:`, error.message);
      }

      // Retry logic if enabled
      if (options.enableRetries && !error.message.includes('No healthy endpoints')) {
        const retryDelay = Math.min(
          this.config.baseBackoffMs * Math.pow(this.config.backoffMultiplier, 1),
          this.config.maxBackoffMs
        ) + Math.random() * this.config.jitterMs;

        await this.delay(retryDelay);
        
        if (options.enableDetailedLogging) {
          console.log(`[BatchAI:${requestId}] Retrying PMID ${item.pmid} after ${retryDelay}ms delay`);
        }

        // Recursive retry (only once to prevent infinite loops)
        return this.processSingleItem(item, searchParams, { ...options, enableRetries: false });
      }

      throw error;
    }
  }

  /**
   * Process promises with controlled concurrency
   * @param {Array} promises - Array of promises to process
   * @param {number} maxConcurrency - Maximum concurrent operations
   * @returns {Promise<Array>} Results array
   */
  async processConcurrently(promises, maxConcurrency) {
    const results = [];
    const executing = [];

    for (const promise of promises) {
      const wrapped = promise.then(result => {
        executing.splice(executing.indexOf(wrapped), 1);
        return result;
      });
      
      results.push(wrapped);
      executing.push(wrapped);

      if (executing.length >= maxConcurrency) {
        await Promise.race(executing);
      }
    }

    return Promise.all(results);
  }

  /**
   * Build API URL with parameters
   * @param {string} baseUrl - Base endpoint URL
   * @param {string} pmid - PubMed ID
   * @param {string} sponsor - Sponsor name
   * @param {string} drugName - Drug name
   * @returns {string} Complete API URL
   */
  buildApiUrl(baseUrl, pmid, sponsor, drugName) {
    const params = new URLSearchParams();
    params.append('PMID', pmid);
    
    if (sponsor && sponsor !== 'Unknown') {
      params.append('sponsor', sponsor);
    }
    
    if (drugName && drugName !== 'Unknown') {
      params.append('drugname', drugName);
    }

    return `${baseUrl}?${params.toString()}`;
  }

  /**
   * Get prioritized list of endpoints (healthy first, sorted by performance)
   * @returns {Array} Sorted endpoint health objects
   */
  getPrioritizedEndpoints() {
    return this.endpointHealth
      .filter(endpoint => endpoint.isHealthy || endpoint.consecutiveFailures < this.config.circuitBreakerThreshold)
      .sort((a, b) => {
        // Prioritize healthy endpoints
        if (a.isHealthy !== b.isHealthy) {
          return a.isHealthy ? -1 : 1;
        }
        
        // Then by current load
        if (a.currentRequests !== b.currentRequests) {
          return a.currentRequests - b.currentRequests;
        }
        
        // Finally by response time
        return a.responseTimeMs - b.responseTimeMs;
      });
  }

  /**
   * Mark endpoint as successful
   * @param {Object} endpoint - Endpoint health object
   * @param {number} responseTimeMs - Response time in milliseconds
   */
  markEndpointSuccess(endpoint, responseTimeMs) {
    endpoint.isHealthy = true;
    endpoint.consecutiveFailures = 0;
    endpoint.lastSuccessAt = new Date();
    endpoint.responseTimeMs = responseTimeMs;
  }

  /**
   * Mark endpoint as failed
   * @param {Object} endpoint - Endpoint health object
   * @param {string} error - Error message
   */
  markEndpointFailure(endpoint, error) {
    endpoint.consecutiveFailures++;
    endpoint.lastFailureAt = new Date();
    
    if (endpoint.consecutiveFailures >= this.config.circuitBreakerThreshold) {
      endpoint.isHealthy = false;
      console.warn(`[BatchAI] Endpoint ${endpoint.url} marked as unhealthy after ${endpoint.consecutiveFailures} failures`);
    }
  }

  /**
   * Start periodic health monitoring
   */
  startHealthMonitoring() {
    setInterval(async () => {
      const unhealthyEndpoints = this.endpointHealth.filter(ep => !ep.isHealthy);
      
      if (unhealthyEndpoints.length > 0) {
        console.log(`[BatchAI] Checking health of ${unhealthyEndpoints.length} unhealthy endpoints`);
        
        for (const endpoint of unhealthyEndpoints) {
          await this.checkEndpointHealth(endpoint);
        }
      }
    }, this.config.healthCheckInterval);
  }

  /**
   * Check health of a specific endpoint
   * @param {Object} endpoint - Endpoint health object
   */
  async checkEndpointHealth(endpoint) {
    const testUrl = `${endpoint.url}?PMID=40190438&sponsor=TestSponsor&drugname=TestDrug`;
    const startTime = Date.now();

    try {
      const response = await fetch(testUrl, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        timeout: this.config.healthCheckTimeout
      });

      const responseTimeMs = Date.now() - startTime;

      if (response.ok || response.status === 422) {
        this.markEndpointSuccess(endpoint, responseTimeMs);
        console.log(`[BatchAI] Endpoint ${endpoint.url} back online (${responseTimeMs}ms)`);
      }
    } catch (error) {
      // Keep as unhealthy
      console.log(`[BatchAI] Endpoint ${endpoint.url} still unhealthy: ${error.message}`);
    }
  }

  /**
   * Get current health status of all endpoints
   * @returns {Object} Health status summary
   */
  getHealthStatus() {
    const healthyEndpoints = this.endpointHealth.filter(ep => ep.isHealthy);
    
    return {
      totalEndpoints: this.endpointHealth.length,
      healthyEndpoints: healthyEndpoints.length,
      unhealthyEndpoints: this.endpointHealth.length - healthyEndpoints.length,
      averageResponseTime: healthyEndpoints.length > 0 
        ? Math.round(healthyEndpoints.reduce((sum, ep) => sum + ep.responseTimeMs, 0) / healthyEndpoints.length)
        : 0,
      endpoints: this.endpointHealth.map(ep => ({
        url: ep.url,
        isHealthy: ep.isHealthy,
        responseTimeMs: ep.responseTimeMs,
        consecutiveFailures: ep.consecutiveFailures,
        currentRequests: ep.currentRequests,
        lastSuccessAt: ep.lastSuccessAt,
        lastFailureAt: ep.lastFailureAt
      })),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Test connection to all endpoints
   * @returns {Promise<Object>} Test results
   */
  async testConnection() {
    console.log('[BatchAI] Testing connection to all endpoints...');
    
    const testResults = [];
    
    for (let i = 0; i < this.endpointHealth.length; i++) {
      const endpoint = this.endpointHealth[i];
      
      try {
        await this.checkEndpointHealth(endpoint);
        testResults.push({
          url: endpoint.url,
          status: endpoint.isHealthy ? 200 : 500,
          connected: endpoint.isHealthy,
          responseTimeMs: endpoint.responseTimeMs,
          consecutiveFailures: endpoint.consecutiveFailures
        });
      } catch (error) {
        testResults.push({
          url: endpoint.url,
          status: 0,
          connected: false,
          responseTimeMs: 0,
          consecutiveFailures: endpoint.consecutiveFailures,
          error: error.message
        });
      }
    }

    const healthyCount = testResults.filter(result => result.connected).length;
    const success = healthyCount > 0;

    return {
      success,
      healthyCount,
      totalCount: testResults.length,
      averageResponseTime: success ? Math.round(testResults
        .filter(r => r.connected)
        .reduce((sum, r) => sum + r.responseTimeMs, 0) / healthyCount) : 0,
      endpoints: testResults,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Utility function for delays
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise} Promise that resolves after delay
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = new BatchAiInferenceService();