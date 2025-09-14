import { z } from "zod";

/**
 * Game State Schema for LangGraph Engine
 * 
 * This extends the existing Waidrin state with LangGraph-specific properties
 * while maintaining compatibility with the current state management system.
 */

// Base game state that extends existing Waidrin state
export const GameStateSchema = z.object({
  // Existing Waidrin state properties
  apiUrl: z.url(),
  apiKey: z.string().trim(),
  model: z.string().trim(),
  contextLength: z.int(),
  inputLength: z.int(),
  generationParams: z.record(z.string(), z.unknown()),
  narrationParams: z.record(z.string(), z.unknown()),
  updateInterval: z.int(),
  logPrompts: z.boolean(),
  logParams: z.boolean(),
  logResponses: z.boolean(),
  view: z.enum(["welcome", "connection", "genre", "character", "scenario", "chat"]),
  world: z.object({
    name: z.string(),
    description: z.string(),
  }),
  locations: z.array(z.object({
    name: z.string(),
    type: z.enum(["tavern", "market", "road"]),
    description: z.string(),
  })),
  characters: z.array(z.object({
    name: z.string(),
    gender: z.enum(["male", "female"]),
    race: z.enum(["human", "elf", "dwarf"]),
    biography: z.string(),
    locationIndex: z.number(),
  })),
  protagonist: z.object({
    name: z.string(),
    gender: z.enum(["male", "female"]),
    race: z.enum(["human", "elf", "dwarf"]),
    biography: z.string(),
    locationIndex: z.number(),
  }),
  hiddenDestiny: z.boolean(),
  betrayal: z.boolean(),
  oppositeSexMagnet: z.boolean(),
  sameSexMagnet: z.boolean(),
  sexualContentLevel: z.enum(["regular", "explicit", "actively_explicit"]),
  violentContentLevel: z.enum(["regular", "graphic", "pervasive"]),
  events: z.array(z.unknown()),
  actions: z.array(z.string()),

  // LangGraph-specific properties
  currentNode: z.string().optional(),
  nodeHistory: z.array(z.object({
    nodeId: z.string(),
    timestamp: z.string(),
    input: z.unknown().optional(),
    output: z.unknown().optional(),
  })).default([]),
  
  // Memory and context
  memory: z.object({
    conversationHistory: z.array(z.object({
      role: z.enum(["user", "assistant", "system"]),
      content: z.string(),
      timestamp: z.string(),
      nodeId: z.string().optional(),
    })).default([]),
    characterRelationships: z.record(z.string(), z.object({
      relationship: z.string(),
      trust: z.number().min(0).max(100),
      familiarity: z.number().min(0).max(100),
      lastInteraction: z.string().optional(),
    })).default({}),
    sceneMemory: z.array(z.object({
      sceneId: z.string(),
      summary: z.string(),
      characters: z.array(z.string()),
      location: z.string(),
      timestamp: z.string(),
    })).default([]),
    playerPreferences: z.record(z.string(), z.unknown()).default({}),
  }),

  // Game flow control
  gameFlow: z.object({
    currentPhase: z.enum(["setup", "playing", "paused", "ended"]),
    canGoBack: z.boolean().default(false),
    canSkip: z.boolean().default(false),
    requiresUserInput: z.boolean().default(false),
    pendingUserInput: z.string().optional(),
  }),

  // Streaming and real-time updates
  streaming: z.object({
    isStreaming: z.boolean().default(false),
    currentStream: z.string().optional(),
    streamProgress: z.number().min(0).max(100).default(0),
  }),

  // Plugin system integration
  plugins: z.object({
    activePlugins: z.array(z.string()).default([]),
    pluginStates: z.record(z.string(), z.unknown()).default({}),
    pluginEvents: z.array(z.object({
      pluginId: z.string(),
      eventType: z.string(),
      data: z.unknown(),
      timestamp: z.string(),
    })).default([]),
  }),

  // Error handling and recovery
  errors: z.array(z.object({
    id: z.string(),
    type: z.string(),
    message: z.string(),
    nodeId: z.string().optional(),
    timestamp: z.string(),
    resolved: z.boolean().default(false),
  })).default([]),

  // Performance and debugging
  performance: z.object({
    nodeExecutionTimes: z.record(z.string(), z.number()).default({}),
    totalExecutionTime: z.number().default(0),
    memoryUsage: z.number().default(0),
    debugMode: z.boolean().default(false),
  }),
});

export type GameState = z.infer<typeof GameStateSchema>;

// Node execution context
export const NodeContextSchema = z.object({
  nodeId: z.string(),
  nodeType: z.string(),
  input: z.unknown(),
  previousNode: z.string().optional(),
  nextNodes: z.array(z.string()).default([]),
  executionTime: z.number().optional(),
  retryCount: z.number().default(0),
  maxRetries: z.number().default(3),
});

export type NodeContext = z.infer<typeof NodeContextSchema>;

// Game event types
export const GameEventSchema = z.object({
  id: z.string(),
  type: z.enum([
    "node_started",
    "node_completed", 
    "node_failed",
    "user_input_required",
    "user_input_received",
    "streaming_started",
    "streaming_completed",
    "memory_updated",
    "character_introduced",
    "location_changed",
    "action_generated",
    "narration_generated",
    "error_occurred",
    "game_paused",
    "game_resumed",
    "game_ended",
  ]),
  data: z.record(z.string(), z.unknown()),
  timestamp: z.string(),
  nodeId: z.string().optional(),
});

export type GameEvent = z.infer<typeof GameEventSchema>;

// Tool result schema
export const ToolResultSchema = z.object({
  success: z.boolean(),
  data: z.unknown().optional(),
  error: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  executionTime: z.number().optional(),
});

export type ToolResult = z.infer<typeof ToolResultSchema>;

// Node configuration schema
export const NodeConfigSchema = z.object({
  nodeId: z.string(),
  nodeType: z.string(),
  enabled: z.boolean().default(true),
  timeout: z.number().default(30000),
  retries: z.number().default(3),
  dependencies: z.array(z.string()).default([]),
  conditions: z.record(z.string(), z.unknown()).default({}),
  metadata: z.record(z.string(), z.unknown()).default({}),
});

export type NodeConfig = z.infer<typeof NodeConfigSchema>;
