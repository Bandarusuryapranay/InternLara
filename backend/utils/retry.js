const config = require('../config/config');
const broadcaster = require('../services/broadcaster');

/**
 * Retry a function with exponential backoff
 * @param {Function} fn - Async function to retry
 * @param {number} maxAttempts - Maximum retry attempts (default: 3)
 * @param {number} baseDelay - Base delay in ms (default: 1000)
 * @returns {Promise} Result of the function
 */
async function retryWithBackoff(fn, maxAttempts = config.retry.maxAttempts, baseDelay = config.retry.delayMs) {
  let lastError;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      if (attempt > 1) {
        broadcaster.broadcast('retry', {
          attempt: attempt,
          maxAttempts: maxAttempts
        });
      }
      
      const result = await fn();
      return result;
      
    } catch (error) {
      lastError = error;
      
      if (attempt < maxAttempts) {
        const delay = baseDelay * Math.pow(2, attempt - 1);
        
        broadcaster.broadcast('retry_failed', {
          attempt: attempt,
          maxAttempts: maxAttempts,
          nextRetryIn: delay,
          error: error.message
        });
        
        await sleep(delay);
      }
    }
  }
  
  throw lastError;
}

/**
 * Sleep for specified milliseconds
 * @param {number} ms - Milliseconds to sleep
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
  retryWithBackoff,
  sleep
};
