/**
 * Request Queue Service
 * Manages concurrent requests to prevent server overload
 */

class RequestQueue {
  constructor(maxConcurrent = 3) {
    this.maxConcurrent = maxConcurrent;
    this.running = new Set();
    this.waiting = [];
  }

  /**
   * Add a request to the queue
   * @param {Function} requestFn - Function that returns a Promise
   * @param {string} priority - 'high', 'normal', or 'low'
   * @returns {Promise} - Promise that resolves when the request completes
   */
  async add(requestFn, priority = 'normal') {
    return new Promise((resolve, reject) => {
      const queueItem = {
        requestFn,
        priority,
        resolve,
        reject,
        timestamp: Date.now()
      };

      // Insert based on priority
      if (priority === 'high') {
        this.waiting.unshift(queueItem);
      } else {
        this.waiting.push(queueItem);
      }

      this.processNext();
    });
  }

  /**
   * Process the next item in the queue if capacity allows
   */
  async processNext() {
    if (this.running.size >= this.maxConcurrent || this.waiting.length === 0) {
      return;
    }

    const item = this.waiting.shift();
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.running.add(requestId);

    try {
      console.log(`[RequestQueue] Processing ${requestId}, queue: ${this.waiting.length}, running: ${this.running.size}`);
      
      const result = await item.requestFn();
      item.resolve(result);
    } catch (error) {
      console.error(`[RequestQueue] Error in ${requestId}:`, error);
      item.reject(error);
    } finally {
      this.running.delete(requestId);
      
      // Process next item
      setTimeout(() => this.processNext(), 10);
    }
  }

  /**
   * Get current queue status
   */
  getStatus() {
    return {
      running: this.running.size,
      waiting: this.waiting.length,
      maxConcurrent: this.maxConcurrent,
      totalCapacity: this.maxConcurrent,
      availableCapacity: this.maxConcurrent - this.running.size
    };
  }

  /**
   * Clear the queue (emergency use)
   */
  clear() {
    console.warn('[RequestQueue] Clearing queue - rejecting all waiting requests');
    
    // Reject all waiting requests
    this.waiting.forEach(item => {
      item.reject(new Error('Queue cleared'));
    });
    
    this.waiting = [];
  }

  /**
   * Update max concurrent requests
   */
  setMaxConcurrent(max) {
    this.maxConcurrent = Math.max(1, max);
    
    // Process additional items if we increased capacity
    for (let i = 0; i < max - this.running.size; i++) {
      this.processNext();
    }
  }
}

// Create singleton instances for different types of operations
const drugDiscoveryQueue = new RequestQueue(2); // Limit drug discovery to 2 concurrent
const searchConfigQueue = new RequestQueue(3); // Search configs can have 3 concurrent
const generalQueue = new RequestQueue(5); // General operations can have 5 concurrent

module.exports = {
  RequestQueue,
  drugDiscoveryQueue,
  searchConfigQueue,
  generalQueue
};