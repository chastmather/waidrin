/**
 * Configuration Management
 * 
 * Centralized configuration management using the config library with
 * environment-specific configurations and validation.
 */

import config from "config";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Configuration schema validation
const validateConfig = () => {
  const requiredKeys = [
    'openai.apiKey',
    'openai.model'
  ];

  const missingKeys = requiredKeys.filter(key => !config.has(key));
  
  if (missingKeys.length > 0) {
    throw new Error(`Missing required configuration keys: ${missingKeys.join(', ')}`);
  }
};

// Validate configuration on import
validateConfig();

// OpenAI Configuration
export const openaiConfig = {
  apiKey: config.get<string>('openai.apiKey'),
  model: config.get<string>('openai.model', 'gpt-4'),
  baseURL: config.get<string>('openai.baseURL', 'https://api.openai.com/v1'),
  temperature: config.get<number>('openai.temperature', 0.6),
  maxTokens: config.get<number>('openai.maxTokens', 1000),
  streaming: config.get<boolean>('openai.streaming', true),
  timeout: config.get<number>('openai.timeout', 30000)
};

// LangGraph Configuration
export const langgraphConfig = {
  maxRetries: config.get<number>('langgraph.maxRetries', 3),
  timeout: config.get<number>('langgraph.timeout', 30000),
  maxConcurrency: config.get<number>('langgraph.maxConcurrency', 5),
  enableStreaming: config.get<boolean>('langgraph.enableStreaming', true),
  logLevel: config.get<string>('langgraph.logLevel', 'info'),
  enablePerformanceMonitoring: config.get<boolean>('langgraph.enablePerformanceMonitoring', true)
};

// Logging Configuration
export const loggingConfig = {
  level: config.get<string>('logging.level', 'info'),
  file: config.get<string>('logging.file', 'waidrin.log'),
  enableConsole: config.get<boolean>('logging.enableConsole', true),
  enableFile: config.get<boolean>('logging.enableFile', true),
  maxFileSize: config.get<string>('logging.maxFileSize', '10m'),
  maxFiles: config.get<number>('logging.maxFiles', 5)
};

// Database Configuration (if needed)
export const databaseConfig = {
  url: config.get<string>('database.url', ''),
  maxConnections: config.get<number>('database.maxConnections', 10),
  timeout: config.get<number>('database.timeout', 5000)
};

// Application Configuration
export const appConfig = {
  name: config.get<string>('app.name', 'Waidrin LangGraph Engine'),
  version: config.get<string>('app.version', '1.0.0'),
  environment: config.get<string>('app.environment', 'development'),
  port: config.get<number>('app.port', 3000),
  host: config.get<string>('app.host', 'localhost')
};

// Rate Limiting Configuration
export const rateLimitConfig = {
  windowMs: config.get<number>('rateLimit.windowMs', 60000), // 1 minute
  maxRequests: config.get<number>('rateLimit.maxRequests', 100),
  skipSuccessfulRequests: config.get<boolean>('rateLimit.skipSuccessfulRequests', false)
};

// Caching Configuration
export const cacheConfig = {
  ttl: config.get<number>('cache.ttl', 300), // 5 minutes
  maxSize: config.get<number>('cache.maxSize', 1000),
  enableMemoryCache: config.get<boolean>('cache.enableMemoryCache', true)
};

// Export all configurations
export const configurations = {
  openai: openaiConfig,
  langgraph: langgraphConfig,
  logging: loggingConfig,
  database: databaseConfig,
  app: appConfig,
  rateLimit: rateLimitConfig,
  cache: cacheConfig
};

// Configuration validation helper
export const validateConfiguration = (configName: string, config: any) => {
  if (!config || typeof config !== 'object') {
    throw new Error(`Invalid configuration for ${configName}: must be an object`);
  }
  
  // Add specific validation logic here based on configName
  switch (configName) {
    case 'openai':
      if (!config.apiKey || typeof config.apiKey !== 'string') {
        throw new Error('OpenAI API key is required and must be a string');
      }
      if (!config.model || typeof config.model !== 'string') {
        throw new Error('OpenAI model is required and must be a string');
      }
      break;
    case 'langgraph':
      if (config.maxRetries < 0 || config.maxRetries > 10) {
        throw new Error('LangGraph maxRetries must be between 0 and 10');
      }
      if (config.timeout < 1000 || config.timeout > 300000) {
        throw new Error('LangGraph timeout must be between 1000ms and 300000ms');
      }
      break;
    default:
      // No specific validation for other configs
      break;
  }
};

// Validate all configurations on startup
Object.entries(configurations).forEach(([name, config]) => {
  try {
    validateConfiguration(name, config);
  } catch (error) {
    console.error(`Configuration validation failed for ${name}:`, error.message);
    process.exit(1);
  }
});

export default configurations;
