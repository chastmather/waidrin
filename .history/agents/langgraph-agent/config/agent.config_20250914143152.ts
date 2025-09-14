import type { AgentConfig } from "@/types";

/**
 * Default agent configuration
 */
export const defaultAgentConfig: AgentConfig = {
  model: "gpt-4",
  temperature: 0.1,
  maxIterations: 10,
  autoCommit: false,
  watchMode: false,
  projectRoot: process.cwd(),
  openaiApiKey: process.env.OPENAI_API_KEY,
  openaiBaseUrl: process.env.OPENAI_BASE_URL,
};

/**
 * Development agent configuration
 */
export const devAgentConfig: AgentConfig = {
  ...defaultAgentConfig,
  temperature: 0.2,
  maxIterations: 15,
  watchMode: true,
  autoCommit: false,
};

/**
 * Production agent configuration
 */
export const prodAgentConfig: AgentConfig = {
  ...defaultAgentConfig,
  temperature: 0.05,
  maxIterations: 5,
  watchMode: false,
  autoCommit: true,
};

/**
 * Test agent configuration
 */
export const testAgentConfig: AgentConfig = {
  ...defaultAgentConfig,
  temperature: 0.1,
  maxIterations: 8,
  watchMode: false,
  autoCommit: false,
};

/**
 * Build agent configuration
 */
export const buildAgentConfig: AgentConfig = {
  ...defaultAgentConfig,
  temperature: 0.05,
  maxIterations: 3,
  watchMode: false,
  autoCommit: false,
};

/**
 * Get configuration based on environment
 */
export function getAgentConfig(environment: string = process.env.NODE_ENV || "development"): AgentConfig {
  switch (environment) {
    case "production":
      return prodAgentConfig;
    case "test":
      return testAgentConfig;
    case "build":
      return buildAgentConfig;
    case "development":
    default:
      return devAgentConfig;
  }
}

/**
 * Validate configuration
 */
export function validateConfig(config: AgentConfig): string[] {
  const errors: string[] = [];

  if (!config.openaiApiKey) {
    errors.push("OpenAI API key is required");
  }

  if (config.temperature < 0 || config.temperature > 2) {
    errors.push("Temperature must be between 0 and 2");
  }

  if (config.maxIterations < 1 || config.maxIterations > 100) {
    errors.push("Max iterations must be between 1 and 100");
  }

  if (!config.projectRoot || !config.projectRoot.trim()) {
    errors.push("Project root is required");
  }

  return errors;
}

/**
 * Merge configurations
 */
export function mergeConfigs(base: AgentConfig, override: Partial<AgentConfig>): AgentConfig {
  return {
    ...base,
    ...override,
    config: {
      ...base.config,
      ...override.config,
    },
  };
}
