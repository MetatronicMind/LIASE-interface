const https = require('https');
const http = require('http');

/**
 * Improved External API Service for AI Inference
 * 
 * Key improvements:
 * - Proper timeout handling for 45-60 second API responses
 * - Exponential backoff with jitter
 * - Connection pooling and keep-alive
 * - Circuit breaker pattern
 * - Comprehensive error handling and retry logic
 * - Health monitoring and automatic recovery
 * - Rate limiting and concurrent request management
 */
class ImprovedExternalApiService {
  constructor() {
    this.aiInferenceUrls = [
   'http://20.242.200.176/get_AI_inference',
    'http://20.246.204.143/get_AI_inference2',
    'http://20.242.192.125/get_AI_inference3',
    'http://52.191.200.41/get_AI_inference4'
    ];
    
    // Configuration optimized for 45-60 second API responses
    this.config = {
      // Timeout configuration
      requestTimeout: 90000, // 90 seconds (buffer for 45-60s response time)
      connectionTimeout: 15000, // 15 seconds to establish connection
      
      // Retry configuration
      maxRetries: 5, // Try each endpoint at least once
      maxRetriesPerEndpoint: 2, // Don't hammer single endpoint
      
      // Backoff configuration (exponential with jitter)
      baseBackoffMs: 2000, // Start with 2 seconds
      maxBackoffMs: 30000, // Cap at 30 seconds
      backoffMultiplier: 2, // Double each time
      jitterMs: 1000, // Add random 0-1s jitter
      
      // Circuit breaker configuration
      circuitBreakerThreshold: 3, // Open circuit after 3 consecutive failures
      circuitBreakerTimeout: 60000, // Try again after 1 minute
      circuitBreakerHalfOpenMaxCalls: 1, // Only 1 test call when half-open
      
      // Health check configuration
      healthCheckInterval: 120000, // Check every 2 minutes
      healthCheckTimeout: 30000, // 30 second timeout for health checks
      
      // Concurrency configuration (optimized for 4 endpoints)
      maxConcurrentRequests: 16, // Allow 16 concurrent requests (4 per endpoint)
      maxConcurrentPerEndpoint: 1, // Only 1 request per endpoint at a time
      
      // Rate limiting (optimized for speed)
      minRequestInterval: 1000, // Minimum 1 second between requests
      
      // Connection pooling
      keepAlive: true,
      maxSockets: 5,
      maxFreeSockets: 2,
      socketTimeout: 95000 // Slightly longer than request timeout
    };
    
    // Create HTTP agents with connection pooling
    this.httpAgent = new http.Agent({
      keepAlive: this.config.keepAlive,
      maxSockets: this.config.maxSockets,
      maxFreeSockets: this.config.maxFreeSockets,
      timeout: this.config.socketTimeout
    });
    
    this.httpsAgent = new https.Agent({
      keepAlive: this.config.keepAlive,
      maxSockets: this.config.maxSockets,
      maxFreeSockets: this.config.maxFreeSockets,
      timeout: this.config.socketTimeout
    });
    
    // Endpoint health and circuit breaker state
    this.endpoints = this.aiInferenceUrls.map((url, index) => ({
      id: index,
      url,
      state: 'CLOSED', // CLOSED, OPEN, HALF_OPEN
      consecutiveFailures: 0,
      lastFailureTime: null,
      lastSuccessTime: new Date(),
      totalRequests: 0,
      totalSuccesses: 0,
      totalFailures: 0,
      averageResponseTime: 0,
      currentRequests: 0,
      isHealthy: true,
      lastHealthCheck: new Date(),
      circuitBreakerOpenTime: null
    }));
    
    // Global state
    this.currentRequests = 0;
    this.lastRequestTime = 0;
    this.requestQueue = [];
    this.isProcessingQueue = false;
    
    // Start health monitoring
    this.startHealthMonitoring();
    
    console.log('🚀 Improved External API Service initialized');
    console.log(`📊 Configuration: ${this.config.requestTimeout}ms timeout, ${this.config.maxRetries} max retries`);
    console.log(`🔗 Endpoints: ${this.endpoints.length} configured`);
  }
  
  /**
   * Start periodic health monitoring
   */
  startHealthMonitoring() {
    setInterval(async () => {
      await this.performHealthChecks();
      this.updateCircuitBreakerStates();
    }, this.config.healthCheckInterval);
  }
  
  /**
   * Perform health checks on all endpoints
   */
  async performHealthChecks() {
    console.log('🔍 Performing endpoint health checks...');
    
    const healthCheckPromises = this.endpoints.map(async (endpoint) => {
      try {
        await this.healthCheckEndpoint(endpoint);
      } catch (error) {
        console.warn(`❌ Health check failed for ${endpoint.url}: ${error.message}`);
      }
    });
    
    await Promise.allSettled(healthCheckPromises);
    
    const healthyCount = this.endpoints.filter(ep => ep.isHealthy).length;
    console.log(`💚 Health check complete: ${healthyCount}/${this.endpoints.length} endpoints healthy`);
  }
  
  /**
   * Health check for a single endpoint
   */
  async healthCheckEndpoint(endpoint) {
    const testUrl = `${endpoint.url}?PMID=test&sponsor=HealthCheck&drugname=TestDrug`;
    const startTime = Date.now();
    
    try {
      const response = await this.makeRequest(testUrl, {
        timeout: this.config.healthCheckTimeout,
        retries: 0,
        isHealthCheck: true
      });
      
      const responseTime = Date.now() - startTime;
      endpoint.lastHealthCheck = new Date();
      
      if (response.ok || response.status === 422 || response.status === 400) {
        // Consider 400/422 as healthy (parameter validation errors are expected in health checks)
        endpoint.isHealthy = true;
        console.log(`✅ ${endpoint.url} healthy (${responseTime}ms)`);
      } else {
        endpoint.isHealthy = false;
        console.warn(`⚠️ ${endpoint.url} unhealthy: HTTP ${response.status}`);
      }
    } catch (error) {
      endpoint.isHealthy = false;
      endpoint.lastHealthCheck = new Date();
      console.warn(`❌ ${endpoint.url} health check failed: ${error.message}`);
    }
  }
  
  /**
   * Update circuit breaker states based on failure patterns
   */
  updateCircuitBreakerStates() {
    const now = Date.now();
    
    for (const endpoint of this.endpoints) {
      switch (endpoint.state) {
        case 'CLOSED':
          if (endpoint.consecutiveFailures >= this.config.circuitBreakerThreshold) {
            endpoint.state = 'OPEN';
            endpoint.circuitBreakerOpenTime = now;
            console.warn(`🔴 Circuit breaker OPEN for ${endpoint.url} (${endpoint.consecutiveFailures} failures)`);
          }
          break;
          
        case 'OPEN':
          if (now - endpoint.circuitBreakerOpenTime >= this.config.circuitBreakerTimeout) {
            endpoint.state = 'HALF_OPEN';
            console.log(`🟡 Circuit breaker HALF_OPEN for ${endpoint.url} (testing)`);
          }
          break;
          
        case 'HALF_OPEN':
          // Reset to CLOSED on successful request, or back to OPEN on failure
          // This is handled in the request success/failure methods
          break;
      }
    }
  }
  
  /**
   * Get available endpoints sorted by priority
   */
  getAvailableEndpoints() {
    const now = Date.now();
    
    return this.endpoints
      .filter(endpoint => {
        // Skip OPEN circuit breakers
        if (endpoint.state === 'OPEN') return false;
        
        // Skip endpoints that are at their concurrency limit
        if (endpoint.currentRequests >= this.config.maxConcurrentPerEndpoint) return false;
        
        // Only allow 1 request for HALF_OPEN endpoints
        if (endpoint.state === 'HALF_OPEN' && endpoint.currentRequests > 0) return false;
        
        return true;
      })
      .sort((a, b) => {
        // Prioritize CLOSED over HALF_OPEN
        if (a.state !== b.state) {
          return a.state === 'CLOSED' ? -1 : 1;
        }
        
        // Prioritize healthy endpoints
        if (a.isHealthy !== b.isHealthy) {
          return b.isHealthy - a.isHealthy;
        }
        
        // Prioritize endpoints with fewer current requests
        if (a.currentRequests !== b.currentRequests) {
          return a.currentRequests - b.currentRequests;
        }
        
        // Prioritize endpoints with better success rate
        const aSuccessRate = a.totalRequests > 0 ? a.totalSuccesses / a.totalRequests : 0;
        const bSuccessRate = b.totalRequests > 0 ? b.totalSuccesses / b.totalRequests : 0;
        if (aSuccessRate !== bSuccessRate) {
          return bSuccessRate - aSuccessRate;
        }
        
        // Prioritize faster endpoints
        return a.averageResponseTime - b.averageResponseTime;
      });
  }
  
  /**
   * Calculate backoff time with exponential backoff and jitter
   */
  calculateBackoff(attempt) {
    const exponentialBackoff = Math.min(
      this.config.baseBackoffMs * Math.pow(this.config.backoffMultiplier, attempt),
      this.config.maxBackoffMs
    );
    
    const jitter = Math.random() * this.config.jitterMs;
    return exponentialBackoff + jitter;
  }
  
  /**
   * Make HTTP request with proper timeout and agent
   */
  async makeRequest(url, options = {}) {
    const timeout = options.timeout || this.config.requestTimeout;
    const isHttps = url.startsWith('https:');
    const agent = isHttps ? this.httpsAgent : this.httpAgent;
    
    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'LIASE-AI-Inference/2.0',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive',
          'Cache-Control': 'no-cache'
        },
        signal: controller.signal,
        agent: agent
      });
      
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new Error(`Request timeout after ${timeout}ms`);
      }
      throw error;
    }
  }
  
  /**
   * Record successful request
   */
  recordSuccess(endpoint, responseTime) {
    endpoint.consecutiveFailures = 0;
    endpoint.lastSuccessTime = new Date();
    endpoint.totalSuccesses++;
    endpoint.totalRequests++;
    endpoint.currentRequests = Math.max(0, endpoint.currentRequests - 1);
    
    // Update average response time
    const totalTime = endpoint.averageResponseTime * (endpoint.totalSuccesses - 1) + responseTime;
    endpoint.averageResponseTime = totalTime / endpoint.totalSuccesses;
    
    // Reset circuit breaker if it was HALF_OPEN
    if (endpoint.state === 'HALF_OPEN') {
      endpoint.state = 'CLOSED';
      console.log(`🟢 Circuit breaker CLOSED for ${endpoint.url} (success)`);
    }
    
    console.log(`✅ Success: ${endpoint.url} (${responseTime}ms, ${endpoint.totalSuccesses}/${endpoint.totalRequests} success rate)`);
  }
  
  /**
   * Record failed request
   */
  recordFailure(endpoint, error) {
    endpoint.consecutiveFailures++;
    endpoint.lastFailureTime = new Date();
    endpoint.totalFailures++;
    endpoint.totalRequests++;
    endpoint.currentRequests = Math.max(0, endpoint.currentRequests - 1);
    
    // If circuit breaker was HALF_OPEN, go back to OPEN
    if (endpoint.state === 'HALF_OPEN') {
      endpoint.state = 'OPEN';
      endpoint.circuitBreakerOpenTime = Date.now();
      console.warn(`🔴 Circuit breaker OPEN again for ${endpoint.url} (half-open test failed)`);
    }
    
    console.warn(`❌ Failure: ${endpoint.url} - ${error} (${endpoint.consecutiveFailures} consecutive failures)`);
  }
  
  /**
   * Rate limiting - ensure minimum interval between requests
   */
  async enforceRateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.config.minRequestInterval) {
      const delay = this.config.minRequestInterval - timeSinceLastRequest;
      console.log(`⏳ Rate limiting: waiting ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    this.lastRequestTime = Date.now();
  }
  
  /**
   * Send AI inference request for a single drug
   */
  async sendSingleDrugRequest(pmid, drugName, sponsor, originalDrug = null, attempt = 0) {
    // Check global concurrency limit
    if (this.currentRequests >= this.config.maxConcurrentRequests) {
      throw new Error('Maximum concurrent requests reached');
    }
    
    // Enforce rate limiting
    await this.enforceRateLimit();
    
    // Get available endpoints
    const availableEndpoints = this.getAvailableEndpoints();
    
    if (availableEndpoints.length === 0) {
      throw new Error('No available endpoints (all circuit breakers open or at capacity)');
    }
    
    // Try endpoints in priority order
    for (const endpoint of availableEndpoints) {
      try {
        this.currentRequests++;
        endpoint.currentRequests++;
        
        // Format drug name as INN(BrandName) if BrandName is available
        let apiDrugName = drugName;
        if (originalDrug && originalDrug.brandName) {
          apiDrugName = `${drugName}(${originalDrug.brandName})`;
        }
        
        const url = `${endpoint.url}?PMID=${encodeURIComponent(pmid)}&sponsor=${encodeURIComponent(sponsor)}&drugname=${encodeURIComponent(apiDrugName)}`;
        
        console.log(`🔄 [Attempt ${attempt + 1}] PMID ${pmid} -> ${endpoint.url} (${endpoint.state})`);
        console.log(`📊 Current load: Global ${this.currentRequests}/${this.config.maxConcurrentRequests}, Endpoint ${endpoint.currentRequests}/${this.config.maxConcurrentPerEndpoint}`);
        
        const startTime = Date.now();
        const response = await this.makeRequest(url);
        const responseTime = Date.now() - startTime;
        
        this.currentRequests--;
        
        if (response.ok) {
          this.recordSuccess(endpoint, responseTime);
          
          const responseText = await response.text();
          console.log(`✅ PMID ${pmid} completed in ${responseTime}ms from ${endpoint.url}`);
          
          try {
            const aiResult = JSON.parse(responseText);
            return {
              success: true,
              pmid,
              drugName,
              sponsor,
              aiInference: aiResult,
              originalDrug: originalDrug,
              endpoint: endpoint.url,
              responseTime: responseTime,
              attempt: attempt + 1
            };
          } catch (parseError) {
            console.warn(`⚠️ JSON parse error for PMID ${pmid}: ${parseError.message}`);
            // Return raw response if JSON parsing fails
            return {
              success: true,
              pmid,
              drugName,
              sponsor,
              aiInference: { raw: responseText },
              originalDrug: originalDrug,
              endpoint: endpoint.url,
              responseTime: responseTime,
              attempt: attempt + 1,
              warning: 'Response was not valid JSON'
            };
          }
        } else {
          this.recordFailure(endpoint, `HTTP ${response.status}: ${response.statusText}`);
          
          if (response.status >= 500) {
            // Server error - try next endpoint
            console.warn(`🔄 Server error ${response.status} from ${endpoint.url}, trying next endpoint...`);
            continue;
          } else {
            // Client error - don't retry
            throw new Error(`Client error ${response.status}: ${response.statusText}`);
          }
        }
        
      } catch (error) {
        this.currentRequests--;
        this.recordFailure(endpoint, error.message);
        
        if (error.message.includes('timeout')) {
          console.warn(`⏰ Timeout on ${endpoint.url} after ${this.config.requestTimeout}ms, trying next endpoint...`);
          continue;
        } else if (error.message.includes('Client error')) {
          // Don't retry client errors
          throw error;
        } else {
          console.warn(`🔄 Network error on ${endpoint.url}: ${error.message}, trying next endpoint...`);
          continue;
        }
      }
    }
    
    // All endpoints failed
    throw new Error(`All endpoints failed for PMID ${pmid} after trying ${availableEndpoints.length} endpoints`);
  }
  
  /**
   * Send AI inference requests for multiple drugs with optimized concurrent processing
   * This method processes drugs in batches of 4 (one per endpoint) for maximum speed
   */
  async sendDrugData(drugs, searchParams = {}) {
    const sponsor = searchParams.sponsor || 'Unknown';
    const results = [];
    const errors = [];
    
    console.log(`🧬 Starting AI inference for ${drugs.length} drugs`);
    console.log(`⚙️ Config: ${this.config.requestTimeout}ms timeout, ${this.config.maxRetries} max retries`);
    console.log(`🚀 Optimized concurrent processing: ${this.config.maxConcurrentRequests} concurrent requests`);
    
    // Process drugs in batches of 4 (one per endpoint) for maximum speed
    const batchSize = Math.min(this.config.maxConcurrentRequests, this.endpoints.length);
    const batches = [];
    
    for (let i = 0; i < drugs.length; i += batchSize) {
      batches.push(drugs.slice(i, i + batchSize));
    }
    
    console.log(`📦 Processing ${drugs.length} drugs in ${batches.length} batches of ${batchSize}`);
    
    let totalProcessed = 0;
    
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      const batchStartTime = Date.now();
      
      console.log(`\n📋 Batch ${batchIndex + 1}/${batches.length}: Processing ${batch.length} drugs concurrently`);
      
      // Process all drugs in this batch concurrently
      const batchPromises = batch.map(async (drug, drugIndex) => {
        const pmid = drug.pmid;
        const drugName = drug.drugName || searchParams.query || 'Unknown';
        
        console.log(`  � [${batchIndex + 1}.${drugIndex + 1}] Starting PMID ${pmid} (${drugName})`);
        
        let success = false;
        let lastError = null;
        
        // Retry loop with exponential backoff
        for (let attempt = 0; attempt < this.config.maxRetries && !success; attempt++) {
          try {
            if (attempt > 0) {
              const backoffTime = this.calculateBackoff(attempt - 1);
              console.log(`    ⏳ Retry ${attempt + 1}/${this.config.maxRetries} after ${Math.round(backoffTime)}ms backoff...`);
              await new Promise(resolve => setTimeout(resolve, backoffTime));
            }
            
            const result = await this.sendSingleDrugRequest(pmid, drugName, sponsor, drug, attempt);
            results.push(result);
            success = true;
            
            console.log(`    ✅ PMID ${pmid} completed in ${result.responseTime}ms from ${result.endpoint}`);
            
          } catch (error) {
            lastError = error.message;
            console.warn(`    ❌ Attempt ${attempt + 1} failed for PMID ${pmid}: ${error.message}`);
            
            if (error.message.includes('Client error')) {
              // Don't retry client errors
              break;
            }
          }
        }
        
        if (!success) {
          console.error(`  💥 PMID ${pmid} failed after ${this.config.maxRetries} attempts: ${lastError}`);
          errors.push({
            pmid,
            drugName,
            sponsor,
            error: lastError,
            attempts: this.config.maxRetries
          });
        }
        
        return { pmid, success };
      });
      
      // Wait for all drugs in this batch to complete
      const batchResults = await Promise.allSettled(batchPromises);
      const batchTime = Date.now() - batchStartTime;
      
      // Count successful completions in this batch
      const batchSuccesses = batchResults.filter(result => 
        result.status === 'fulfilled' && result.value.success
      ).length;
      
      totalProcessed += batchSuccesses;
      
      console.log(`  📊 Batch ${batchIndex + 1} completed in ${Math.round(batchTime/1000)}s: ${batchSuccesses}/${batch.length} successful`);
      
      // Progress update
      const remaining = drugs.length - ((batchIndex + 1) * batchSize);
      console.log(`  � Overall progress: ${totalProcessed}/${drugs.length} completed, ~${Math.max(0, remaining)} remaining`);
      
      // Small delay between batches to be respectful to the APIs
      if (batchIndex < batches.length - 1) {
        console.log(`  ⏸️ Brief pause before next batch...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    const successRate = drugs.length > 0 ? (results.length / drugs.length * 100).toFixed(1) : 0;
    
    console.log(`\n🎯 AI Inference Summary:`);
    console.log(`✅ Successful: ${results.length}/${drugs.length} (${successRate}%)`);
    console.log(`❌ Failed: ${errors.length}/${drugs.length}`);
    
    // Print endpoint statistics
    console.log(`\n📈 Endpoint Statistics:`);
    for (const endpoint of this.endpoints) {
      const successRate = endpoint.totalRequests > 0 ? 
        (endpoint.totalSuccesses / endpoint.totalRequests * 100).toFixed(1) : 0;
      console.log(`  ${endpoint.url}: ${endpoint.totalSuccesses}/${endpoint.totalRequests} (${successRate}%) - ${endpoint.state} - Avg: ${Math.round(endpoint.averageResponseTime)}ms`);
    }
    
    return {
      success: results.length > 0,
      message: `AI inference completed: ${results.length} successful, ${errors.length} failed`,
      processedCount: results.length,
      totalCount: drugs.length,
      results: results,
      errors: errors,
      successRate: parseFloat(successRate),
      timestamp: new Date().toISOString(),
      processingMethod: 'optimized-concurrent-batches'
    };
  }
  
  /**
   * Get current service status
   */
  getStatus() {
    const healthyEndpoints = this.endpoints.filter(ep => ep.isHealthy && ep.state === 'CLOSED').length;
    const totalRequests = this.endpoints.reduce((sum, ep) => sum + ep.totalRequests, 0);
    const totalSuccesses = this.endpoints.reduce((sum, ep) => sum + ep.totalSuccesses, 0);
    const overallSuccessRate = totalRequests > 0 ? (totalSuccesses / totalRequests * 100).toFixed(1) : 0;
    
    return {
      healthyEndpoints: `${healthyEndpoints}/${this.endpoints.length}`,
      currentRequests: this.currentRequests,
      maxConcurrentRequests: this.config.maxConcurrentRequests,
      overallSuccessRate: `${overallSuccessRate}%`,
      totalRequests,
      endpoints: this.endpoints.map(ep => ({
        url: ep.url,
        state: ep.state,
        isHealthy: ep.isHealthy,
        successRate: ep.totalRequests > 0 ? 
          `${(ep.totalSuccesses / ep.totalRequests * 100).toFixed(1)}%` : '0%',
        averageResponseTime: `${Math.round(ep.averageResponseTime)}ms`,
        currentRequests: ep.currentRequests
      }))
    };
  }
}

module.exports = ImprovedExternalApiService;