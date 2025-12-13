// External API Service for sending data to AI inference API
const batchAiInferenceService = require('./batchAiInferenceService');

class ExternalApiService {
  constructor() {
    this.aiInferenceUrls = [
   'http://20.242.200.176/get_AI_inference',
    'http://20.246.204.143/get_AI_inference2',
    'http://20.242.192.125/get_AI_inference3',
    'http://52.191.200.41/get_AI_inference4'
    ];
 
    this.apiKey = process.env.EXTERNAL_API_KEY || '';
    
    // Health tracking for endpoints
    this.endpointHealth = this.aiInferenceUrls.map(url => ({
      url,
      isHealthy: true,
      consecutiveFailures: 0,
      lastSuccessAt: new Date(),
      lastFailureAt: null,
      responseTimeMs: 0
    }));
    
    // Configuration for failover behavior
    this.config = {
      maxConsecutiveFailures: 3, // Mark endpoint as unhealthy after 3 failures
      healthCheckInterval: 60000, // Check unhealthy endpoints every minute
      requestTimeout: 30000, // 30 second timeout for requests
      testTimeout: 10000, // 10 second timeout for health checks
      maxRetries: this.aiInferenceUrls.length // Try all endpoints once
    };
    
    // Batch processing thresholds
    this.batchThresholds = {
      minBatchSize: 5, // Use batch processing for 5+ items
      optimalBatchSize: 20, // Optimal batch size for performance
      maxBatchSize: 50 // Maximum items per batch
    };
    
    // Start periodic health checks for unhealthy endpoints
    this.startHealthMonitoring();
  }

  /**
   * Start periodic health monitoring for endpoints
   */
  startHealthMonitoring() {
    setInterval(async () => {
      const unhealthyEndpoints = this.endpointHealth.filter(ep => !ep.isHealthy);
      if (unhealthyEndpoints.length > 0) {
        console.log(`Checking health of ${unhealthyEndpoints.length} unhealthy endpoints...`);
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
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'LIASE-DEV/1.0'
        },
        timeout: this.config.testTimeout
      });

      endpoint.responseTimeMs = Date.now() - startTime;

      if (response.ok || response.status === 422) {
        endpoint.isHealthy = true;
        endpoint.consecutiveFailures = 0;
        endpoint.lastSuccessAt = new Date();
        console.log(`✓ Endpoint ${endpoint.url} is healthy (${endpoint.responseTimeMs}ms)`);
      } else {
        this.markEndpointFailure(endpoint, `HTTP ${response.status}`);
      }
    } catch (error) {
      endpoint.responseTimeMs = Date.now() - startTime;
      this.markEndpointFailure(endpoint, error.message);
    }
  }

  /**
   * Mark an endpoint as having failed
   * @param {Object} endpoint - Endpoint health object
   * @param {string} error - Error message
   */
  markEndpointFailure(endpoint, error) {
    endpoint.consecutiveFailures++;
    endpoint.lastFailureAt = new Date();
    
    if (endpoint.consecutiveFailures >= this.config.maxConsecutiveFailures) {
      endpoint.isHealthy = false;
      console.warn(`✗ Endpoint ${endpoint.url} marked as unhealthy after ${endpoint.consecutiveFailures} failures. Last error: ${error}`);
    } else {
      console.warn(`⚠ Endpoint ${endpoint.url} failed (${endpoint.consecutiveFailures}/${this.config.maxConsecutiveFailures}): ${error}`);
    }
  }

  /**
   * Mark an endpoint as successful
   * @param {Object} endpoint - Endpoint health object
   */
  markEndpointSuccess(endpoint, responseTimeMs) {
    endpoint.isHealthy = true;
    endpoint.consecutiveFailures = 0;
    endpoint.lastSuccessAt = new Date();
    endpoint.responseTimeMs = responseTimeMs;
  }

  /**
   * Get sorted list of endpoints prioritizing healthy ones with good response times
   * @returns {Array} Sorted array of endpoint health objects
   */
  getPrioritizedEndpoints() {
    return [...this.endpointHealth].sort((a, b) => {
      // Healthy endpoints first
      if (a.isHealthy !== b.isHealthy) {
        return b.isHealthy - a.isHealthy;
      }
      
      // Among healthy endpoints, prioritize by response time
      if (a.isHealthy && b.isHealthy) {
        return a.responseTimeMs - b.responseTimeMs;
      }
      
      // Among unhealthy endpoints, prioritize by fewer consecutive failures
      return a.consecutiveFailures - b.consecutiveFailures;
    });
  }

  /**
   * Get AI inference for each drug from external API
   * Intelligently chooses between batch and single processing based on data size
   * @param {Array} drugs - Array of objects with pmid, title, and drugName
   * @param {Object} searchParams - Original search parameters (query, sponsor, frequency)
   * @param {Object} options - Processing options (forceBatch, progressCallback, etc.)
   * @returns {Promise<Array>} Array of AI inference responses
   */
  async sendDrugData(drugs, searchParams = {}, options = {}) {
    const startTime = Date.now();
    const drugCount = drugs.length;

    console.log(`[ExternalAPI] Processing ${drugCount} drugs for AI inference`);

    // Determine processing strategy
    const shouldUseBatch = options.forceBatch || 
                          drugCount >= this.batchThresholds.minBatchSize;

    if (shouldUseBatch) {
      console.log(`[ExternalAPI] Using batch processing for ${drugCount} items`);
      return await this.sendDrugDataBatch(drugs, searchParams, options);
    } else {
      console.log(`[ExternalAPI] Using sequential processing for ${drugCount} items`);
      return await this.sendDrugDataSequential(drugs, searchParams, options);
    }
  }

  /**
   * Send drug data using high-performance batch processing
   * @param {Array} drugs - Array of drug objects
   * @param {Object} searchParams - Search parameters
   * @param {Object} options - Processing options
   * @returns {Promise<Object>} Batch processing results
   */
  async sendDrugDataBatch(drugs, searchParams = {}, options = {}) {
    try {
      console.log('[ExternalAPI] Starting batch AI inference processing...');

      const batchOptions = {
        batchSize: Math.min(options.batchSize || this.batchThresholds.optimalBatchSize, this.batchThresholds.maxBatchSize),
        maxConcurrency: options.maxConcurrency || 16,
        enableDetailedLogging: options.enableDetailedLogging !== false,
        enableRetries: options.enableRetries !== false,
        progressCallback: options.progressCallback
      };

      // Use the new batch processing service
      const batchResult = await batchAiInferenceService.processBatch(
        drugs,
        searchParams,
        batchOptions
      );

      if (batchResult.success) {
        console.log(`[ExternalAPI] Batch processing completed successfully`);
        console.log(`[ExternalAPI] Processed ${batchResult.successfulItems}/${batchResult.totalItems} items`);
        console.log(`[ExternalAPI] Performance: ${batchResult.performance.throughputPerSecond} items/sec`);

        return {
          success: true,
          message: 'AI inference completed via batch processing',
          processedCount: batchResult.successfulItems,
          totalCount: batchResult.totalItems,
          results: batchResult.results,
          errors: batchResult.errors,
          performance: batchResult.performance,
          processingMethod: 'batch',
          timestamp: batchResult.timestamp
        };
      } else {
        console.error('[ExternalAPI] Batch processing failed, falling back to sequential');
        return await this.sendDrugDataSequential(drugs, searchParams, options);
      }

    } catch (error) {
      console.error('[ExternalAPI] Batch processing error:', error);
      console.log('[ExternalAPI] Falling back to sequential processing');
      return await this.sendDrugDataSequential(drugs, searchParams, options);
    }
  }

  /**
   * Send drug data using original sequential processing (maintained for compatibility)
   * @param {Array} drugs - Array of drug objects
   * @param {Object} searchParams - Search parameters
   * @param {Object} options - Processing options
   * @returns {Promise<Object>} Sequential processing results
   */
  async sendDrugDataSequential(drugs, searchParams = {}, options = {}) {
    try {
      console.log('Getting AI inference for drugs:', {
        drugsCount: drugs.length,
        searchParams
      });

      const aiInferenceResults = [];
      const sponsor = searchParams.sponsor || 'Unknown';

      // Process each drug individually to get AI inference
      for (const drug of drugs) {
        try {
          const pmid = drug.pmid;
          const drugName = drug.drugName || searchParams.query || 'Unknown';
          
          console.log(`Getting AI inference for PMID: ${pmid}, Drug: ${drugName}, Sponsor: ${sponsor}`);
          
          // Call AI inference API with improved failover logic
          let response = null;
          let lastError = null;
          let successfulEndpoint = null;
          
          // Get prioritized list of endpoints (healthy ones first, sorted by response time)
          const prioritizedEndpoints = this.getPrioritizedEndpoints();
          
          for (let i = 0; i < prioritizedEndpoints.length; i++) {
            const endpoint = prioritizedEndpoints[i];
            // Format drug name as INN(BrandName) if BrandName is available
            let apiDrugName = drugName;
            if (drug && drug.brandName) {
              apiDrugName = `${drugName}(${drug.brandName})`;
            }

            // Include sponsor and drugname by default for compatibility
            let apiUrl = `${endpoint.url}?PMID=${encodeURIComponent(pmid)}&sponsor=${encodeURIComponent(sponsor)}&drugname=${encodeURIComponent(apiDrugName)}`;
            const startTime = Date.now();
            
            try {
              console.log(`Attempt ${i + 1}: Making API call to: ${endpoint.url} (health: ${endpoint.isHealthy ? 'healthy' : 'unhealthy'}, failures: ${endpoint.consecutiveFailures})`);
              
              // Add timeout control using AbortController
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), this.config.requestTimeout);
              
              response = await fetch(apiUrl, {
                method: 'GET',
                headers: {
                  'Accept': 'application/json',
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                  'Accept-Language': 'en-US,en;q=0.9',
                  'Accept-Encoding': 'gzip, deflate',
                  'Connection': 'keep-alive',
                  'Cache-Control': 'no-cache',
                  'Origin': 'http://localhost',
                  'Referer': 'http://localhost/'
                },
                signal: controller.signal
              });
              
              clearTimeout(timeoutId);

              const responseTimeMs = Date.now() - startTime;
              console.log(`API response status for PMID ${pmid} from ${endpoint.url}: ${response.status} ${response.statusText} (${responseTimeMs}ms)`);

              if (response.ok) {
                successfulEndpoint = endpoint;
                this.markEndpointSuccess(endpoint, responseTimeMs);
                console.log(`✓ Successfully got response from ${endpoint.url} for PMID ${pmid} in ${responseTimeMs}ms`);
                break;
              } else if (response.status >= 500) {
                // Server errors - try next endpoint
                const errorMsg = `HTTP ${response.status}: ${response.statusText}`;
                console.warn(`Server error from ${endpoint.url} for PMID ${pmid}, trying next endpoint... (${errorMsg})`);
                this.markEndpointFailure(endpoint, errorMsg);
                lastError = errorMsg;
                // Enrich URL for next try on next endpoint if we have sponsor
                if (!apiUrl.includes('sponsor=') && sponsor) {
                  apiUrl = `${endpoint.url}?PMID=${encodeURIComponent(pmid)}&sponsor=${encodeURIComponent(sponsor)}`;
                } else if (!apiUrl.includes('drugname=') && drugName) {
                  apiUrl = `${endpoint.url}?PMID=${encodeURIComponent(pmid)}&sponsor=${encodeURIComponent(sponsor)}&drugname=${encodeURIComponent(drugName)}`;
                }
                continue;
              } else {
                // Client errors (4xx) - don't retry but don't mark endpoint as failed
                console.error(`Client error ${response.status} from ${endpoint.url} for PMID ${pmid} - not retrying`);
                lastError = `HTTP ${response.status}: ${response.statusText}`;
                break;
              }
            } catch (fetchError) {
              const responseTimeMs = Date.now() - startTime;
              console.warn(`Network error calling ${endpoint.url} for PMID ${pmid} (${responseTimeMs}ms):`, fetchError.message);
              this.markEndpointFailure(endpoint, fetchError.message);
              lastError = fetchError.message;
              continue;
            }
          }

          if (!response || !response.ok) {
            console.error(`❌ All AI inference endpoints failed for PMID ${pmid}. Last error: ${lastError}`);
            console.log(`⚠️ CRITICAL: Retrying PMID ${pmid} with exponential backoff...`);
            
            // AGGRESSIVE RETRY: Try up to 5 more times with exponential backoff
            let retrySuccess = false;
            for (let retryAttempt = 1; retryAttempt <= 5; retryAttempt++) {
              const backoffMs = Math.min(1000 * Math.pow(2, retryAttempt), 10000);
              console.log(`Retry attempt ${retryAttempt}/5 for PMID ${pmid} (waiting ${backoffMs}ms)...`);
              await new Promise(resolve => setTimeout(resolve, backoffMs));
              
              // Try all endpoints again
              for (const endpoint of prioritizedEndpoints) {
                try {
                  const apiUrl = `${endpoint.url}?PMID=${encodeURIComponent(pmid)}&sponsor=${encodeURIComponent(sponsor)}&drugname=${encodeURIComponent(drugName)}`;
                  const controller = new AbortController();
                  const timeoutId = setTimeout(() => controller.abort(), this.config.requestTimeout * 2); // Double timeout for retries
                  
                  const retryResponse = await fetch(apiUrl, {
                    method: 'GET',
                    headers: {
                      'Accept': 'application/json',
                      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                      'Connection': 'keep-alive'
                    },
                    signal: controller.signal
                  });
                  
                  clearTimeout(timeoutId);
                  
                  if (retryResponse.ok) {
                    response = retryResponse;
                    retrySuccess = true;
                    console.log(`✅ Retry successful for PMID ${pmid} on attempt ${retryAttempt}`);
                    break;
                  }
                } catch (retryError) {
                  console.log(`Retry ${retryAttempt} failed for PMID ${pmid}:`, retryError.message);
                }
              }
              
              if (retrySuccess) break;
            }
            
            if (!retrySuccess || !response || !response.ok) {
              console.error(`❌❌❌ FATAL: Could not get AI inference for PMID ${pmid} after all retries`);
              throw new Error(`Failed to get AI inference for PMID ${pmid} after all retry attempts. Last error: ${lastError}`);
            }
          }

          const responseText = await response.text();
          console.log(`Raw API response for PMID ${pmid}:`, responseText);

          let aiResult;
          try {
            aiResult = JSON.parse(responseText);
            console.log(`✅ Parsed AI inference result for PMID ${pmid}`);
          } catch (parseError) {
            console.error(`❌ Failed to parse JSON response for PMID ${pmid}:`, parseError);
            console.error(`Response was:`, responseText);
            throw new Error(`Invalid JSON response for PMID ${pmid}: ${parseError.message}`);
          }
          
          aiInferenceResults.push({
            pmid: pmid,
            drugName: drugName,
            sponsor: sponsor,
            aiInference: aiResult,
            originalDrug: drug
          });

        } catch (error) {
          console.error(`❌ Error getting AI inference for PMID ${drug.pmid}:`, error);
          console.error(`Error stack:`, error.stack);
          throw new Error(`Failed to process PMID ${drug.pmid}: ${error.message}`);
        }
      }

      console.log(`AI inference completed. Successfully processed ${aiInferenceResults.length} out of ${drugs.length} drugs`);
      
      return {
        success: true,
        message: 'AI inference completed',
        processedCount: aiInferenceResults.length,
        totalCount: drugs.length,
        results: aiInferenceResults,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('Error in AI inference process:', error);
      throw new Error(`AI inference failed: ${error.message}`);
    }
  }

  /**
   * Test connection to AI inference API and update health status
   * @returns {Promise<Object>} Detailed test results
   */
  async testConnection() {
    try {
      console.log('Testing AI inference API connections...');
      
      const testResults = [];
      
      // Test all available endpoints and update their health
      for (let i = 0; i < this.endpointHealth.length; i++) {
        const endpoint = this.endpointHealth[i];
        
        try {
          console.log(`Testing endpoint ${i + 1}: ${endpoint.url}`);
          await this.checkEndpointHealth(endpoint);
          
          testResults.push({
            url: endpoint.url,
            status: endpoint.isHealthy ? 200 : 500,
            connected: endpoint.isHealthy,
            responseTimeMs: endpoint.responseTimeMs,
            consecutiveFailures: endpoint.consecutiveFailures,
            lastSuccessAt: endpoint.lastSuccessAt,
            lastFailureAt: endpoint.lastFailureAt,
            error: endpoint.isHealthy ? null : `${endpoint.consecutiveFailures} consecutive failures`
          });
          
          console.log(`Endpoint ${i + 1} test result: ${endpoint.isHealthy ? 'SUCCESS' : 'FAILED'} (${endpoint.responseTimeMs}ms, ${endpoint.consecutiveFailures} failures)`);
          
        } catch (error) {
          console.error(`Endpoint ${i + 1} test failed:`, error.message);
          testResults.push({
            url: endpoint.url,
            status: 0,
            connected: false,
            responseTimeMs: 0,
            consecutiveFailures: endpoint.consecutiveFailures,
            lastSuccessAt: endpoint.lastSuccessAt,
            lastFailureAt: endpoint.lastFailureAt,
            error: error.message
          });
        }
      }
      
      // Return detailed results
      const healthyEndpoints = testResults.filter(result => result.connected);
      const hasWorkingEndpoint = healthyEndpoints.length > 0;
      
      console.log(`Overall connection test result: ${hasWorkingEndpoint ? 'SUCCESS' : 'FAILED'}`);
      console.log(`Healthy endpoints: ${healthyEndpoints.length}/${testResults.length}`);
      
      if (hasWorkingEndpoint) {
        const avgResponseTime = healthyEndpoints.reduce((sum, ep) => sum + ep.responseTimeMs, 0) / healthyEndpoints.length;
        console.log(`Average response time of healthy endpoints: ${Math.round(avgResponseTime)}ms`);
      }
      
      return {
        success: hasWorkingEndpoint,
        healthyCount: healthyEndpoints.length,
        totalCount: testResults.length,
        averageResponseTime: hasWorkingEndpoint ? Math.round(healthyEndpoints.reduce((sum, ep) => sum + ep.responseTimeMs, 0) / healthyEndpoints.length) : 0,
        endpoints: testResults,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('AI inference API connection test failed:', error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
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
        consecutiveFailures: ep.consecutiveFailures,
        responseTimeMs: ep.responseTimeMs,
        lastSuccessAt: ep.lastSuccessAt,
        lastFailureAt: ep.lastFailureAt
      })),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get batch processing health status
   * @returns {Object} Batch service health status
   */
  getBatchHealthStatus() {
    return batchAiInferenceService.getHealthStatus();
  }

  /**
   * Test batch processing connection
   * @returns {Promise<Object>} Batch connection test results
   */
  async testBatchConnection() {
    return await batchAiInferenceService.testConnection();
  }

  /**
   * Force the use of batch processing for the next request
   * @param {Array} drugs - Array of drug objects
   * @param {Object} searchParams - Search parameters
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Batch processing results
   */
  async sendDrugDataBatchForced(drugs, searchParams = {}, options = {}) {
    return await this.sendDrugDataBatch(drugs, searchParams, { ...options, forceBatch: true });
  }

  /**
   * Get comprehensive API health status including both services
   * @returns {Object} Combined health status
   */
  getComprehensiveHealthStatus() {
    const legacyHealth = this.getHealthStatus();
    const batchHealth = this.getBatchHealthStatus();

    return {
      legacy: legacyHealth,
      batch: batchHealth,
      overall: {
        totalEndpoints: legacyHealth.totalEndpoints,
        healthyEndpoints: Math.max(legacyHealth.healthyEndpoints, batchHealth.healthyEndpoints),
        recommendedProcessingMethod: legacyHealth.healthyEndpoints > 0 ? 'automatic' : 'batch-only',
        performance: {
          legacyAvgResponseTime: legacyHealth.averageResponseTime,
          batchAvgResponseTime: batchHealth.averageResponseTime,
          recommendBatch: batchHealth.healthyEndpoints >= legacyHealth.healthyEndpoints
        }
      },
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = new ExternalApiService();