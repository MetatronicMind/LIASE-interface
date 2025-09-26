// External API Service for sending data to AI inference API
class ExternalApiService {
  constructor() {
    this.aiInferenceUrls = [
      'http://20.75.201.207/get_AI_inference/',
      'http://20.75.201.207/get_AI_inference2/',
      'http://20.75.201.207/get_AI_inference3/'
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

      if (response.ok) {
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
   * @param {Array} drugs - Array of objects with pmid, title, and drugName
   * @param {Object} searchParams - Original search parameters (query, sponsor, frequency)
   * @returns {Promise<Array>} Array of AI inference responses
   */
  async sendDrugData(drugs, searchParams = {}) {
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
            const apiUrl = `${endpoint.url}?PMID=${encodeURIComponent(pmid)}&sponsor=${encodeURIComponent(sponsor)}&drugname=${encodeURIComponent(drugName)}`;
            const startTime = Date.now();
            
            try {
              console.log(`Attempt ${i + 1}: Making API call to: ${endpoint.url} (health: ${endpoint.isHealthy ? 'healthy' : 'unhealthy'}, failures: ${endpoint.consecutiveFailures})`);
              
              response = await fetch(apiUrl, {
                method: 'GET',
                headers: {
                  'Accept': 'application/json',
                  'User-Agent': 'LIASE-DEV/1.0'
                },
                timeout: this.config.requestTimeout
              });

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
            console.error(`All AI inference endpoints failed for PMID ${pmid}. Last error: ${lastError}`);
            // Continue with other drugs even if one fails
            continue;
          }

          const responseText = await response.text();
          console.log(`Raw API response for PMID ${pmid}:`, responseText);

          let aiResult;
          try {
            aiResult = JSON.parse(responseText);
            console.log(`Parsed AI inference result for PMID ${pmid}:`, JSON.stringify(aiResult, null, 2));
          } catch (parseError) {
            console.error(`Failed to parse JSON response for PMID ${pmid}:`, parseError);
            console.error(`Response was:`, responseText);
            continue;
          }
          
          aiInferenceResults.push({
            pmid: pmid,
            drugName: drugName,
            sponsor: sponsor,
            aiInference: aiResult,
            originalDrug: drug
          });

        } catch (error) {
          console.error(`Error getting AI inference for PMID ${drug.pmid}:`, error);
          // Continue with other drugs
          continue;
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
}

module.exports = new ExternalApiService();