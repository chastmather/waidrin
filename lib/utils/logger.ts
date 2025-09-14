/**
 * Winston Logger Configuration
 * 
 * Centralized logging setup for the LangGraph engine with structured logging,
 * multiple transports, and development-friendly formatting.
 */

import winston from "winston";
import config from "config";

// Log levels configuration
const logLevel = config.get<string>('logging.level', 'info');
const logFile = config.get<string>('logging.file', 'waidrin.log');

// Create logger instance
export const logger = winston.createLogger({
  level: logLevel,
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'waidrin-langgraph' },
  transports: [
    // Console transport for development
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          return `${timestamp} [${level}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''}`;
        })
      )
    }),
    
    // File transport for persistent logging
    new winston.transports.File({
      filename: logFile,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    }),
    
    // Error file for error-specific logging
    new winston.transports.File({
      filename: 'waidrin-errors.log',
      level: 'error',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    })
  ]
});

// Performance logger for monitoring
export const performanceLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({
      filename: 'waidrin-performance.log',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    })
  ]
});

// Debug logger for development
export const debugLogger = winston.createLogger({
  level: 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.colorize(),
    winston.format.simple()
  ),
  transports: [
    new winston.transports.Console()
  ]
});

// LangGraph-specific loggers
export const nodeLogger = logger.child({ component: 'node' });
export const engineLogger = logger.child({ component: 'engine' });
export const stateLogger = logger.child({ component: 'state' });
export const apiLogger = logger.child({ component: 'api' });

// Utility functions
export const logNodeExecution = (nodeId: string, startTime: number, success: boolean, error?: Error) => {
  const duration = Date.now() - startTime;
  
  if (success) {
    nodeLogger.info('Node execution completed', {
      nodeId,
      duration,
      timestamp: new Date().toISOString()
    });
  } else {
    nodeLogger.error('Node execution failed', {
      nodeId,
      duration,
      error: error?.message,
      stack: error?.stack,
      timestamp: new Date().toISOString()
    });
  }
};

export const logApiCall = (endpoint: string, method: string, duration: number, success: boolean, error?: Error) => {
  if (success) {
    apiLogger.info('API call completed', {
      endpoint,
      method,
      duration,
      timestamp: new Date().toISOString()
    });
  } else {
    apiLogger.error('API call failed', {
      endpoint,
      method,
      duration,
      error: error?.message,
      timestamp: new Date().toISOString()
    });
  }
};

export const logStateChange = (oldState: any, newState: any, changeType: string) => {
  stateLogger.info('State changed', {
    changeType,
    oldState: JSON.stringify(oldState, null, 2),
    newState: JSON.stringify(newState, null, 2),
    timestamp: new Date().toISOString()
  });
};

// Development debug helper
export const debug = (namespace: string) => {
  return (message: string, ...args: any[]) => {
    if (process.env.NODE_ENV === 'development') {
      debugLogger.debug(`[${namespace}] ${message}`, ...args);
    }
  };
};

export default logger;
