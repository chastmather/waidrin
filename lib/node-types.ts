/**
 * Node Types for LangGraph Engine
 * 
 * Defines interfaces for game nodes and their execution.
 */

export interface GameNode {
  id: string;
  name: string;
  description?: string;
  execute: (context: NodeContext) => Promise<NodeExecutionResult>;
}

export interface NodeRegistry {
  [nodeId: string]: GameNode;
}

export interface NodeExecutionResult {
  success: boolean;
  nextNodeId?: string;
  error?: string;
  data?: Record<string, unknown>;
}
