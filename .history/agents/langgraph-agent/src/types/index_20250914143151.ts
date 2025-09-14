import { z } from "zod";

// Agent State Schema
export const AgentStateSchema = z.object({
  // Current task being processed
  currentTask: z.string().optional(),
  
  // Task history
  taskHistory: z.array(z.object({
    id: z.string(),
    task: z.string(),
    status: z.enum(["pending", "in_progress", "completed", "failed"]),
    result: z.string().optional(),
    timestamp: z.string(),
    error: z.string().optional(),
  })).default([]),
  
  // Codebase context
  codebaseContext: z.object({
    projectRoot: z.string(),
    currentFiles: z.array(z.string()).default([]),
    modifiedFiles: z.array(z.string()).default([]),
    gitStatus: z.string().optional(),
    lastCommit: z.string().optional(),
  }),
  
  // Agent configuration
  config: z.object({
    model: z.string().default("gpt-4"),
    temperature: z.number().default(0.1),
    maxIterations: z.number().default(10),
    autoCommit: z.boolean().default(false),
    watchMode: z.boolean().default(false),
  }),
  
  // Memory and context
  memory: z.object({
    recentActions: z.array(z.string()).default([]),
    learnedPatterns: z.array(z.string()).default([]),
    userPreferences: z.record(z.string(), z.unknown()).default({}),
  }),
  
  // Current conversation context
  conversation: z.object({
    messages: z.array(z.object({
      role: z.enum(["user", "assistant", "system"]),
      content: z.string(),
      timestamp: z.string(),
    })).default([]),
    currentGoal: z.string().optional(),
  }),
});

export type AgentState = z.infer<typeof AgentStateSchema>;

// Task Types
export const TaskTypeSchema = z.enum([
  "code_review",
  "bug_fix",
  "feature_implementation",
  "refactoring",
  "testing",
  "documentation",
  "optimization",
  "dependency_update",
  "migration",
  "deployment",
]);

export type TaskType = z.infer<typeof TaskTypeSchema>;

// Agent Actions
export const AgentActionSchema = z.object({
  type: z.enum([
    "analyze_code",
    "read_file",
    "write_file",
    "modify_file",
    "run_command",
    "search_code",
    "create_test",
    "update_documentation",
    "commit_changes",
    "ask_user",
    "plan_task",
    "execute_task",
  ]),
  payload: z.record(z.string(), z.unknown()),
  timestamp: z.string(),
});

export type AgentAction = z.infer<typeof AgentActionSchema>;

// Tool Results
export const ToolResultSchema = z.object({
  success: z.boolean(),
  data: z.unknown().optional(),
  error: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type ToolResult = z.infer<typeof ToolResultSchema>;

// Waidrin Integration Types
export const WaidrinContextSchema = z.object({
  gameState: z.object({
    view: z.string(),
    world: z.unknown().optional(),
    locations: z.array(z.unknown()).default([]),
    characters: z.array(z.unknown()).default([]),
    events: z.array(z.unknown()).default([]),
  }),
  codebaseFiles: z.array(z.string()).default([]),
  pluginSystem: z.object({
    plugins: z.array(z.string()).default([]),
    activePlugins: z.array(z.string()).default([]),
  }),
});

export type WaidrinContext = z.infer<typeof WaidrinContextSchema>;

// Agent Configuration
export interface AgentConfig {
  model: string;
  temperature: number;
  maxIterations: number;
  autoCommit: boolean;
  watchMode: boolean;
  projectRoot: string;
  openaiApiKey?: string;
  openaiBaseUrl?: string;
}

// Event Types
export const AgentEventSchema = z.object({
  type: z.enum([
    "task_started",
    "task_completed",
    "task_failed",
    "file_modified",
    "command_executed",
    "user_interaction",
    "error_occurred",
  ]),
  data: z.record(z.string(), z.unknown()),
  timestamp: z.string(),
});

export type AgentEvent = z.infer<typeof AgentEventSchema>;
