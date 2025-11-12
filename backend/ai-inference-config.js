/**
 * AI Inference Configuration
 * 
 * This file contains configuration options for the AI inference system.
 * You can modify these settings to tune the behavior for your specific needs.
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
  
  // API Response Configuration (optimized for your 45-60 second APIs)
  requestTimeout: 90000,        // 90 seconds (buffer for 45-60s response time)
  connectionTimeout: 15000,     // 15 seconds to establish connection
  
  // Retry Configuration
  maxRetries: 5,                // Try each endpoint at least once
  maxRetriesPerEndpoint: 2,     // Don't hammer single endpoint
  
  // Backoff Configuration (exponential with jitter)
  baseBackoffMs: 2000,          // Start with 2 seconds
  maxBackoffMs: 30000,          // Cap at 30 seconds
  backoffMultiplier: 2,         // Double each time
  jitterMs: 1000,               // Add random 0-1s jitter
  
  // Circuit Breaker Configuration
  circuitBreakerThreshold: 3,   // Open circuit after 3 consecutive failures
  circuitBreakerTimeout: 60000, // Try again after 1 minute
  
  // Concurrency Configuration (optimized for speed with 4 endpoints)
  maxConcurrentRequests: 16,    // Allow 16 concurrent requests (4 per endpoint)
  maxConcurrentPerEndpoint: 4,  // Allow 4 requests per endpoint at a time
  
  // Rate Limiting (reduced for faster processing)
  minRequestInterval: 1000,     // Minimum 1 second between requests (faster)
  
  // Health Check Configuration
  healthCheckInterval: 120000,  // Check every 2 minutes
  healthCheckTimeout: 30000,    // 30 second timeout for health checks
  
  // Logging Configuration
  enableDetailedLogging: true,  // Enable detailed request/response logging
  enableTimingLogs: true,       // Enable timing information
  enableHealthLogs: true,       // Enable health check logging
  
  // Test Configuration
  testTimeout: 600000,          // 10 minutes timeout for entire test
  enableMockFallback: false,    // Create mock results for failed requests
  
  // Endpoint URLs (you can modify these if needed)
  endpoints: [
    'http://20.242.200.176/get_AI_inference',
    'http://20.246.204.143/get_AI_inference2',
    'http://20.242.192.125/get_AI_inference3',
    'http://52.191.200.41/get_AI_inference4'
  ]
};