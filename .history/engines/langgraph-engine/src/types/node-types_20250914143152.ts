import { z } from "zod";
import type { GameState, NodeContext, ToolResult } from "./game-state";

/**
 * Node Type Definitions for LangGraph Game Engine
 */

// Base node interface
export interface GameNode {
  nodeId: string;
  nodeType: string;
  execute(state: GameState, context: NodeContext): Promise<Partial<GameState>>;
  canExecute(state: GameState, context: NodeContext): boolean;
  getNextNodes(state: GameState, context: NodeContext): string[];
  validateInput(state: GameState, context: NodeContext): boolean;
  onError?(error: Error, state: GameState, context: NodeContext): Promise<Partial<GameState>>;
}

// Node execution result
export const NodeExecutionResultSchema = z.object({
  success: z.boolean(),
  newState: z.unknown().optional(),
  nextNodes: z.array(z.string()).default([]),
  events: z.array(z.unknown()).default([]),
  error: z.string().optional(),
  executionTime: z.number().optional(),
});

export type NodeExecutionResult = z.infer<typeof NodeExecutionResultSchema>;

// Specific node types
export const WelcomeNodeSchema = z.object({
  nodeId: z.literal("welcome"),
  nodeType: z.literal("welcome"),
  config: z.object({
    showWelcomeMessage: z.boolean().default(true),
    allowSkip: z.boolean().default(false),
    timeout: z.number().default(5000),
  }),
});

export const ConnectionNodeSchema = z.object({
  nodeId: z.literal("connection"),
  nodeType: z.literal("connection"),
  config: z.object({
    testConnection: z.boolean().default(true),
    maxRetries: z.number().default(3),
    timeout: z.number().default(10000),
  }),
});

export const GenreNodeSchema = z.object({
  nodeId: z.literal("genre"),
  nodeType: z.literal("genre"),
  config: z.object({
    availableGenres: z.array(z.string()).default(["fantasy", "sci-fi", "reality"]),
    allowCustom: z.boolean().default(false),
  }),
});

export const CharacterNodeSchema = z.object({
  nodeId: z.literal("character"),
  nodeType: z.literal("character"),
  config: z.object({
    generateProtagonist: z.boolean().default(true),
    allowCustomization: z.boolean().default(true),
    maxRetries: z.number().default(3),
  }),
});

export const ScenarioNodeSchema = z.object({
  nodeId: z.literal("scenario"),
  nodeType: z.literal("scenario"),
  config: z.object({
    generateWorld: z.boolean().default(true),
    generateStartingLocation: z.boolean().default(true),
    generateStartingCharacters: z.boolean().default(true),
  }),
});

export const ChatNodeSchema = z.object({
  nodeId: z.literal("chat"),
  nodeType: z.literal("chat"),
  config: z.object({
    enableStreaming: z.boolean().default(true),
    maxActions: z.number().default(3),
    enableMemory: z.boolean().default(true),
  }),
});

export const NarrationNodeSchema = z.object({
  nodeId: z.string(),
  nodeType: z.literal("narration"),
  config: z.object({
    useStreaming: z.boolean().default(true),
    maxLength: z.number().default(5000),
    includeCharacters: z.boolean().default(true),
  }),
});

export const ActionNodeSchema = z.object({
  nodeId: z.string(),
  nodeType: z.literal("action"),
  config: z.object({
    generateActions: z.boolean().default(true),
    maxActions: z.number().default(3),
    allowCustomActions: z.boolean().default(true),
  }),
});

export const LocationNodeSchema = z.object({
  nodeId: z.string(),
  nodeType: z.literal("location"),
  config: z.object({
    generateLocation: z.boolean().default(true),
    includeCharacters: z.boolean().default(true),
    maxCharacters: z.number().default(5),
  }),
});

export const MemoryNodeSchema = z.object({
  nodeId: z.string(),
  nodeType: z.literal("memory"),
  config: z.object({
    updateRelationships: z.boolean().default(true),
    updateSceneMemory: z.boolean().default(true),
    maxMemorySize: z.number().default(1000),
  }),
});

// Node factory types
export type NodeFactory = (config: unknown) => GameNode;

export const NodeFactorySchema = z.object({
  nodeType: z.string(),
  createNode: z.function().args(z.unknown()).returns(z.unknown()),
  validateConfig: z.function().args(z.unknown()).returns(z.boolean()),
});

// Node registry
export interface NodeRegistry {
  registerNode(nodeType: string, factory: NodeFactory): void;
  createNode(nodeType: string, config: unknown): GameNode;
  getNodeTypes(): string[];
  hasNodeType(nodeType: string): boolean;
}

// Node execution context
export interface NodeExecutionContext {
  nodeId: string;
  nodeType: string;
  input: unknown;
  previousNode?: string;
  nextNodes: string[];
  executionTime?: number;
  retryCount: number;
  maxRetries: number;
  timeout?: number;
  dependencies: string[];
  conditions: Record<string, unknown>;
}

// Node execution pipeline
export interface NodeExecutionPipeline {
  beforeExecute?(state: GameState, context: NodeExecutionContext): Promise<GameState>;
  execute(state: GameState, context: NodeExecutionContext): Promise<Partial<GameState>>;
  afterExecute?(state: GameState, context: NodeExecutionContext, result: Partial<GameState>): Promise<GameState>;
  onError?(error: Error, state: GameState, context: NodeExecutionContext): Promise<Partial<GameState>>;
}

// Node validation
export interface NodeValidator {
  validateInput(state: GameState, context: NodeExecutionContext): boolean;
  validateOutput(state: GameState, result: Partial<GameState>): boolean;
  validateDependencies(state: GameState, context: NodeExecutionContext): boolean;
}

// Node metrics
export interface NodeMetrics {
  nodeId: string;
  executionCount: number;
  averageExecutionTime: number;
  successRate: number;
  errorRate: number;
  lastExecution: Date;
  totalExecutionTime: number;
}

// Node configuration
export interface NodeConfiguration {
  nodeId: string;
  nodeType: string;
  enabled: boolean;
  timeout: number;
  retries: number;
  dependencies: string[];
  conditions: Record<string, unknown>;
  metadata: Record<string, unknown>;
}

// Node event types
export const NodeEventSchema = z.object({
  nodeId: z.string(),
  eventType: z.enum([
    "node_started",
    "node_completed",
    "node_failed",
    "node_retry",
    "node_timeout",
    "node_skipped",
  ]),
  data: z.record(z.string(), z.unknown()),
  timestamp: z.string(),
  executionTime: z.number().optional(),
});

export type NodeEvent = z.infer<typeof NodeEventSchema>;
