// Core exports
export { WaidrinAgent } from "./core/agent";

// Integration exports
export { WaidrinIntegration } from "./integration/waidrin-integration";
export { WaidrinLifecycleManager } from "./integration/lifecycle-manager";

// Tool exports
export { CodebaseTools } from "./tools/codebase-tools";
export { WaidrinTools } from "./tools/waidrin-tools";

// Type exports
export type {
  AgentState,
  AgentConfig,
  AgentAction,
  ToolResult,
  WaidrinContext,
  AgentEvent,
  TaskType,
} from "./types";

export { AgentStateSchema, TaskTypeSchema, AgentActionSchema, ToolResultSchema, WaidrinContextSchema, AgentEventSchema } from "./types";

// Configuration exports
export { 
  defaultAgentConfig, 
  devAgentConfig, 
  prodAgentConfig, 
  testAgentConfig, 
  buildAgentConfig,
  getAgentConfig,
  validateConfig,
  mergeConfigs,
} from "../config/agent.config";
