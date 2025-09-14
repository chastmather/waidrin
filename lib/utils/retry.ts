/**
 * Retry Utilities
 * 
 * Centralized retry logic with exponential backoff, jitter, and
 * configurable retry strategies for different types of operations.
 */

import pRetry from "p-retry";
import { logger } from "./logger";
import { langgraphConfig } from "./config";

// Retry configuration
const defaultRetryOptions = {
  retries: langgraphConfig.maxRetries,
  factor: 2,
  minTimeout: 1000,
  maxTimeout: 10000,
  randomize: true,
  onFailedAttempt: (error: any) => {
    logger.warn("Retry attempt failed", {
      attempt: error.attemptNumber,
      retriesLeft: error.retriesLeft,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// API-specific retry options
const apiRetryOptions = {
  ...defaultRetryOptions,
  retries: 3,
  minTimeout: 2000,
  maxTimeout: 15000
};

// Database-specific retry options
const databaseRetryOptions = {
  ...defaultRetryOptions,
  retries: 5,
  minTimeout: 500,
  maxTimeout: 5000
};

// File operation retry options
const fileRetryOptions = {
  ...defaultRetryOptions,
  retries: 2,
  minTimeout: 1000,
  maxTimeout: 3000
};

// Error classification for retry logic
export const isRetryableError = (error: any): boolean => {
  // Network errors
  if (error.code === 'ECONNRESET' || error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
    return true;
  }
  
  // HTTP status codes that should be retried
  if (error.status >= 500 && error.status < 600) {
    return true;
  }
  
  // Rate limiting
  if (error.status === 429) {
    return true;
  }
  
  // Timeout errors
  if (error.code === 'ETIMEDOUT' || error.name === 'TimeoutError') {
    return true;
  }
  
  // OpenAI specific errors
  if (error.type === 'insufficient_quota' || error.type === 'rate_limit_exceeded') {
    return true;
  }
  
  return false;
};

// Custom retry function with error classification
export const retryWithClassification = async <T>(
  fn: () => Promise<T>,
  options: Partial<typeof defaultRetryOptions> = {}
): Promise<T> => {
  return pRetry(fn, {
    ...defaultRetryOptions,
    ...options,
    onFailedAttempt: (error) => {
      if (!isRetryableError(error)) {
        logger.error("Non-retryable error encountered", {
          error: error.message,
          type: error.type,
          code: error.code,
          status: error.status
        });
        throw error; // Don't retry non-retryable errors
      }
      
      logger.warn("Retryable error encountered, retrying", {
        attempt: error.attemptNumber,
        retriesLeft: error.retriesLeft,
        error: error.message,
        type: error.type,
        code: error.code
      });
    }
  });
};

// API call retry wrapper
export const retryApiCall = async <T>(
  apiCall: () => Promise<T>,
  context: string = "API call"
): Promise<T> => {
  return retryWithClassification(apiCall, {
    ...apiRetryOptions,
    onFailedAttempt: (error) => {
      logger.warn(`${context} failed, retrying`, {
        attempt: error.attemptNumber,
        retriesLeft: error.retriesLeft,
        error: error.message,
        context
      });
    }
  });
};

// Database operation retry wrapper
export const retryDatabaseOperation = async <T>(
  operation: () => Promise<T>,
  context: string = "Database operation"
): Promise<T> => {
  return retryWithClassification(operation, {
    ...databaseRetryOptions,
    onFailedAttempt: (error) => {
      logger.warn(`${context} failed, retrying`, {
        attempt: error.attemptNumber,
        retriesLeft: error.retriesLeft,
        error: error.message,
        context
      });
    }
  });
};

// File operation retry wrapper
export const retryFileOperation = async <T>(
  operation: () => Promise<T>,
  context: string = "File operation"
): Promise<T> => {
  return retryWithClassification(operation, {
    ...fileRetryOptions,
    onFailedAttempt: (error) => {
      logger.warn(`${context} failed, retrying`, {
        attempt: error.attemptNumber,
        retriesLeft: error.retriesLeft,
        error: error.message,
        context
      });
    }
  });
};

// LangGraph node retry wrapper
export const retryNodeExecution = async <T>(
  nodeFunction: () => Promise<T>,
  nodeId: string
): Promise<T> => {
  return retryWithClassification(nodeFunction, {
    ...defaultRetryOptions,
    onFailedAttempt: (error) => {
      logger.warn(`Node ${nodeId} execution failed, retrying`, {
        nodeId,
        attempt: error.attemptNumber,
        retriesLeft: error.retriesLeft,
        error: error.message
      });
    }
  });
};

// Circuit breaker pattern for failing services
export class CircuitBreaker {
  private failureCount = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  
  constructor(
    private threshold: number = 5,
    private timeout: number = 60000, // 1 minute
    private resetTimeout: number = 30000 // 30 seconds
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.resetTimeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }

  private onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.failureCount >= this.threshold) {
      this.state = 'OPEN';
      logger.error('Circuit breaker opened', {
        failureCount: this.failureCount,
        threshold: this.threshold
      });
    }
  }

  getState() {
    return this.state;
  }
}

// Create circuit breakers for different services
export const apiCircuitBreaker = new CircuitBreaker(5, 60000, 30000);
export const databaseCircuitBreaker = new CircuitBreaker(3, 30000, 15000);

// Utility function to check if operation should be retried
export const shouldRetry = (error: any, attemptNumber: number, maxRetries: number): boolean => {
  if (attemptNumber >= maxRetries) {
    return false;
  }
  
  return isRetryableError(error);
};

// Exponential backoff with jitter calculation
export const calculateBackoff = (attemptNumber: number, baseDelay: number = 1000, maxDelay: number = 10000): number => {
  const exponentialDelay = Math.min(baseDelay * Math.pow(2, attemptNumber), maxDelay);
  const jitter = Math.random() * 0.1 * exponentialDelay; // 10% jitter
  return Math.floor(exponentialDelay + jitter);
};

export default {
  retryWithClassification,
  retryApiCall,
  retryDatabaseOperation,
  retryFileOperation,
  retryNodeExecution,
  isRetryableError,
  shouldRetry,
  calculateBackoff,
  CircuitBreaker
};
