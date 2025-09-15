/**
 * LangGraph Node Types
 * 
 * Core interfaces for LangGraph game nodes and their execution.
 */

import type { GameState, GameEvent, NodeContext } from "./game-state";

// ============================================================================
// Core Node Interface
// ============================================================================
export interface GameNode {
  id: string;
  name: string;
  description?: string;
  nodeType: string;
  execute: (state: GameState, context: NodeContext) => Promise<NodeExecutionResult>;
}

// ============================================================================
// Node Registry
// ============================================================================
export interface NodeRegistry {
  [nodeId: string]: GameNode;
}

// ============================================================================
// Node Execution Result
// ============================================================================
export interface NodeExecutionResult {
  success: boolean;
  nextNodeId?: string;
  error?: string;
  data?: Record<string, unknown>;
  stateUpdates?: Partial<GameState>;
}

// ============================================================================
// Node Configuration
// ============================================================================
export interface NodeConfig {
  timeout?: number;
  retries?: number;
  dependencies?: string[];
  conditions?: (state: GameState) => boolean;
}

// ============================================================================
// Node Factory
// ============================================================================
export interface NodeFactory {
  createNode(id: string, config: NodeConfig): GameNode;
  registerNode(node: GameNode): void;
  getNode(id: string): GameNode | undefined;
  getAllNodes(): GameNode[];
}