/**
 * LangGraph Game State
 * 
 * Core state definitions for the LangGraph game engine.
 * This is the primary state management for the LangGraph implementation.
 */

import { Annotation } from "@langchain/langgraph";

// ============================================================================
// LangGraph State Annotation
// ============================================================================
export const GameStateAnnotation = Annotation.Root({
  // Core game state properties
  currentNode: Annotation<string>,
  nodeHistory: Annotation<Array<{ nodeId: string; timestamp: string; duration: number; success: boolean }>>,
  memory: Annotation<Record<string, unknown>>,
  gameFlow: Annotation<{ currentPhase: string; completedPhases: string[]; nextPhase: string | null }>,
  streaming: Annotation<{ isStreaming: boolean; streamId: string | null; buffer: string[] }>,
  plugins: Annotation<Record<string, unknown>>,
  errors: Annotation<Array<{ id: string; message: string; nodeId: string; timestamp: string; resolved: boolean }>>,
  performance: Annotation<{ totalExecutionTime: number; nodeExecutionTimes: Record<string, number>; memoryUsage: number }>,
  
  // Game-specific properties
  view: Annotation<string>,
  world: Annotation<{ name: string; description: string }>,
  locations: Annotation<Array<{ name: string; type: string; description: string }>>,
  characters: Annotation<Array<{ name: string; gender: string; race: string; biography: string; locationIndex: number }>>,
  events: Annotation<Array<unknown>>,
  currentEventIndex: Annotation<number>,
  isGenerating: Annotation<boolean>,
  error: Annotation<string | null>,
  isAborted: Annotation<boolean>,
});

// TypeScript type derived from the annotation
export type GameState = typeof GameStateAnnotation.State;

// ============================================================================
// Event Types for LangGraph Nodes
// ============================================================================
export interface GameEvent {
  type: string;
  data: Record<string, unknown>;
  timestamp: string;
  nodeId: string;
}

export interface NodeContext {
  state: GameState;
  event: GameEvent;
  memory: Record<string, unknown>;
  config: Record<string, unknown>;
}