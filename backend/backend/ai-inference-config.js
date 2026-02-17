/**
 * AI Inference Configuration
 * 
 * This file contains configuration options for the AI inference system.
 * Optimized for 100% article-to-study conversion with aggressive retry.
 * 
 * GOAL: Every article MUST become a study. No data loss.
 */

module.exports = {
  // Service Selection
  useImprovedService: true,     // Use the new improved service (recommended)
  useLegacySequential: false,   // Use old sequential processing
  useLegacyLoadBalancer: false, // Use old load balancer
  
  // Batch Processing Configuration
  enableBatchProcessing: true,  // Enable high-performance batch processing
  batchProcessingThreshold: 5,  // Use batch processing for 5+ items
  optimalBatchSize: 16,         // Optimal batch size for performance (matches maxConcurrentRequests)
  maxBatchSize: 50,             // Maximum items per batch
  
  // API Response Configuration (optimized for slow APIs with VERY aggressive timeouts)
  requestTimeout: 180000,       // 180 seconds (3 minutes - give APIs plenty of time)
  connectionTimeout: 30000,     // 30 seconds to establish connection
  
  // Retry Configuration - MAXIMUM AGGRESSIVENESS
  maxRetries: 15,               // Try up to 15 times total per article
  maxRetriesPerEndpoint: 4,     // Try each endpoint 4 times
  
  // Backoff Configuration (exponential with jitter) - PERSISTENT BUT GENTLE
  baseBackoffMs: 2000,          // Start with 2 seconds
  maxBackoffMs: 30000,          // Cap at 30 seconds
  backoffMultiplier: 1.5,       // 1.5x each time (gentler growth)
  jitterMs: 1000,               // Add random 0-1000ms jitter
  
  // Circuit Breaker Configuration - VERY FORGIVING
  circuitBreakerThreshold: 8,   // Open circuit after 8 consecutive failures (more tolerant)
  circuitBreakerTimeout: 45000, // Try again after 45 seconds (faster recovery)
  
  // Concurrency Configuration (optimized for speed with 4 endpoints)
  maxConcurrentRequests: 16,    // Allow 16 concurrent requests (4 per endpoint)
  maxConcurrentPerEndpoint: 4,  // Allow 4 requests per endpoint at a time
  
  // Rate Limiting (balanced for throughput and API health)
  minRequestInterval: 500,      // Minimum 500ms between requests (faster)
  
  // Health Check Configuration
  healthCheckInterval: 60000,   // Check every 1 minute
  healthCheckTimeout: 30000,    // 30 second timeout for health checks
  
  // Logging Configuration
  enableDetailedLogging: true,  // Enable detailed request/response logging
  enableTimingLogs: true,       // Enable timing information
  enableHealthLogs: true,       // Enable health check logging
  
  // Test Configuration
  testTimeout: 900000,          // 15 minutes timeout for entire test (longer for large batches)
  enableMockFallback: false,    // Never use mock results - real data only
  
  // Endpoint URLs (4 load-balanced endpoints)
  endpoints: [
    'http://20.242.200.176/get_AI_inference',
    'http://20.246.204.143/get_AI_inference2',
    'http://20.242.192.125/get_AI_inference3',
    'http://52.191.200.41/get_AI_inference4'
  ],
  
  // Retry Queue Configuration (for guaranteed processing)
  retryQueue: {
    maxImmediateRetries: 5,           // Retry up to 5 times immediately
    immediateRetryDelayMs: 3000,       // 3 seconds between immediate retries
    backgroundRetryIntervalMs: 60000,  // Check for failed items every 1 minute
    maxBackgroundRetries: 20,          // Keep trying up to 20 times in background
    retryBatchSize: 10,                // Process 10 articles at a time in retries
    giveUpAfterHours: 24               // Only give up after 24 hours of trying
  }
};