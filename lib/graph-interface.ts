/**
 * LangGraph Graph Interface
 * 
 * Comprehensive interface definitions for plug-and-play graph support in Waidrin.
 * Based on LangGraph StateGraph patterns and comprehensive documentation review.
 */

import { StateGraph, END } from "@langchain/langgraph";
import type { GameState, GameEvent, NodeContext } from "./game-state";
import type { GameNode, NodeRegistry, NodeExecutionResult } from "./node-types";
import { GameStateAnnotation } from "./game-state";

// ============================================================================
// Core Graph Interface
// ============================================================================

/**
 * Base interface for all graph implementations
 * Provides the contract that all graph types must implement
 */
export interface GraphInterface {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly version: string;
  
  // Graph lifecycle
  initialize(): Promise<void>;
  compile(): CompiledGraph;
  destroy(): Promise<void>;
  
  // Node management
  addNode(nodeId: string, node: GameNode): void;
  removeNode(nodeId: string): void;
  getNode(nodeId: string): GameNode | undefined;
  hasNode(nodeId: string): boolean;
  getAllNodes(): GameNode[];
  
  // Edge management
  addEdge(fromNode: string, toNode: string, metadata?: EdgeMetadata): void;
  addConditionalEdges(
    fromNode: string,
    condition: ConditionalFunction,
    edgeMap: Record<string, string>
  ): void;
  removeEdge(fromNode: string, toNode: string): void;
  getEdges(fromNode: string): EdgeInfo[];
  hasEdge(fromNode: string, toNode: string): boolean;
  
  // Graph execution
  execute(initialState: GameState): Promise<GameState>;
  executeWithStreaming(
    initialState: GameState,
    onToken?: (token: string) => void
  ): Promise<GameState>;
  
  // Graph introspection
  getEntryPoints(): string[];
  getExitPoints(): string[];
  getGraphStructure(): GraphStructure;
  validate(): ValidationResult;
  
  // Event system
  onEvent(eventType: string, listener: (event: GameEvent) => void): void;
  offEvent(eventType: string, listener: (event: GameEvent) => void): void;
  emitEvent(event: GameEvent): void;
}

// ============================================================================
// Compiled Graph Interface
// ============================================================================

/**
 * Interface for compiled graphs that can be executed
 * Wraps LangGraph's compiled StateGraph functionality
 */
export interface CompiledGraph {
  readonly graphId: string;
  readonly isCompiled: boolean;
  
  // Execution methods
  invoke(initialState: GameState): Promise<GameState>;
  stream(initialState: GameState): AsyncIterable<GameState>;
  
  // Graph introspection
  getNodes(): string[];
  getEdges(): Array<{from: string, to: string}>;
  getEntryPoint(): string;
  getExitPoints(): string[];
  
  // State management
  getCurrentState(): GameState | null;
  isRunning(): boolean;
  
  // Control methods
  pause(): Promise<void>;
  resume(): Promise<void>;
  stop(): Promise<void>;
  abort(): Promise<void>;
}

// ============================================================================
// Graph Factory Interface
// ============================================================================

/**
 * Factory interface for creating different types of graphs
 * Enables plug-and-play graph creation
 */
export interface GraphFactory {
  readonly type: string;
  readonly name: string;
  readonly description: string;
  readonly supportedFeatures: string[];
  
  // Factory methods
  createGraph(config: GraphConfig): Promise<GraphInterface>;
  createFromRegistry(nodeRegistry: NodeRegistry, config: GraphConfig): Promise<GraphInterface>;
  createFromTemplate(templateId: string, config: GraphConfig): Promise<GraphInterface>;
  
  // Validation
  validateConfig(config: GraphConfig): ValidationResult;
  getRequiredNodes(): string[];
  getOptionalNodes(): string[];
  
  // Template management
  registerTemplate(templateId: string, template: GraphTemplate): void;
  getTemplate(templateId: string): GraphTemplate | undefined;
  getAllTemplates(): GraphTemplate[];
}

// ============================================================================
// Graph Configuration
// ============================================================================

/**
 * Configuration for graph creation and behavior
 */
export interface GraphConfig {
  id: string;
  name: string;
  description?: string;
  type: 'linear' | 'branching' | 'hierarchical' | 'custom';
  
  // Node configuration
  nodes: NodeConfig[];
  entryPoint: string;
  exitPoints: string[];
  
  // Edge configuration
  edges: EdgeConfig[];
  conditionalEdges: ConditionalEdgeConfig[];
  
  // Execution configuration
  execution: ExecutionConfig;
  
  // Features
  features: GraphFeature[];
  
  // Metadata
  metadata: Record<string, unknown>;
}

export interface NodeConfig {
  id: string;
  type: string;
  name: string;
  description?: string;
  config: Record<string, unknown>;
  dependencies?: string[];
  conditions?: string[];
}

export interface EdgeConfig {
  from: string;
  to: string;
  type: 'direct' | 'conditional' | 'parallel';
  metadata?: EdgeMetadata;
  conditions?: string[];
}

export interface ConditionalEdgeConfig {
  from: string;
  condition: string;
  edgeMap: Record<string, string>;
  metadata?: EdgeMetadata;
}

export interface EdgeMetadata {
  weight?: number;
  priority?: number;
  timeout?: number;
  retries?: number;
  conditions?: string[];
  metadata?: Record<string, unknown>;
}

export interface ExecutionConfig {
  maxConcurrency: number;
  timeout: number;
  retries: number;
  enableStreaming: boolean;
  enableCaching: boolean;
  enableLogging: boolean;
  enableMetrics: boolean;
}

export interface GraphFeature {
  name: string;
  enabled: boolean;
  config: Record<string, unknown>;
}

// ============================================================================
// Graph Templates
// ============================================================================

/**
 * Template for creating graphs with predefined structures
 */
export interface GraphTemplate {
  id: string;
  name: string;
  description: string;
  type: string;
  version: string;
  
  // Template structure
  structure: GraphStructure;
  requiredNodes: string[];
  optionalNodes: string[];
  
  // Default configuration
  defaultConfig: Partial<GraphConfig>;
  
  // Validation rules
  validationRules: ValidationRule[];
  
  // Metadata
  metadata: Record<string, unknown>;
}

export interface GraphStructure {
  nodes: Array<{
    id: string;
    type: string;
    position: {x: number, y: number};
    metadata: Record<string, unknown>;
  }>;
  edges: Array<{
    from: string;
    to: string;
    type: string;
    metadata: Record<string, unknown>;
  }>;
  layout: {
    type: 'hierarchical' | 'force' | 'circular' | 'custom';
    config: Record<string, unknown>;
  };
}

// ============================================================================
// Conditional Functions
// ============================================================================

/**
 * Function type for conditional edge routing
 */
export type ConditionalFunction = (state: GameState) => string;

/**
 * Function type for node execution
 */
export type NodeFunction = (state: GameState, context: NodeContext) => Promise<Partial<GameState>>;

/**
 * Function type for edge conditions
 */
export type EdgeCondition = (state: GameState) => boolean;

// ============================================================================
// Graph Information Types
// ============================================================================

export interface EdgeInfo {
  from: string;
  to: string;
  type: string;
  metadata: EdgeMetadata;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  type: 'error' | 'warning';
  code: string;
  message: string;
  path: string;
  context?: Record<string, unknown>;
}

export interface ValidationWarning {
  code: string;
  message: string;
  path: string;
  suggestion?: string;
}

export interface ValidationRule {
  name: string;
  description: string;
  validate: (config: GraphConfig) => ValidationResult;
}

// ============================================================================
// Graph Registry
// ============================================================================

/**
 * Registry for managing available graph types and factories
 */
export interface GraphRegistry {
  // Factory management
  registerFactory(factory: GraphFactory): void;
  unregisterFactory(type: string): void;
  getFactory(type: string): GraphFactory | undefined;
  getAllFactories(): GraphFactory[];
  
  // Graph management
  registerGraph(graph: GraphInterface): void;
  unregisterGraph(id: string): void;
  getGraph(id: string): GraphInterface | undefined;
  getAllGraphs(): GraphInterface[];
  
  // Template management
  registerTemplate(template: GraphTemplate): void;
  unregisterTemplate(id: string): void;
  getTemplate(id: string): GraphTemplate | undefined;
  getAllTemplates(): GraphTemplate[];
  
  // Discovery
  findGraphsByType(type: string): GraphInterface[];
  findTemplatesByType(type: string): GraphTemplate[];
  findFactoriesByFeature(feature: string): GraphFactory[];
}

// ============================================================================
// Graph Builder
// ============================================================================

/**
 * Builder pattern for constructing graphs programmatically
 */
export interface GraphBuilder {
  // Configuration
  setId(id: string): GraphBuilder;
  setName(name: string): GraphBuilder;
  setDescription(description: string): GraphBuilder;
  setType(type: string): GraphBuilder;
  
  // Node management
  addNode(node: GameNode): GraphBuilder;
  addNodes(nodes: GameNode[]): GraphBuilder;
  removeNode(nodeId: string): GraphBuilder;
  
  // Edge management
  addEdge(from: string, to: string, metadata?: EdgeMetadata): GraphBuilder;
  addConditionalEdges(
    from: string,
    condition: ConditionalFunction,
    edgeMap: Record<string, string>
  ): GraphBuilder;
  removeEdge(from: string, to: string): GraphBuilder;
  
  // Configuration
  setEntryPoint(entryPoint: string): GraphBuilder;
  setExitPoints(exitPoints: string[]): GraphBuilder;
  setExecutionConfig(config: ExecutionConfig): GraphBuilder;
  
  // Building
  build(): Promise<GraphInterface>;
  validate(): ValidationResult;
}

// ============================================================================
// Graph Manager
// ============================================================================

/**
 * Manager for handling multiple graphs and their lifecycle
 */
export interface GraphManager {
  // Graph lifecycle
  createGraph(config: GraphConfig): Promise<GraphInterface>;
  destroyGraph(graphId: string): Promise<void>;
  getGraph(graphId: string): GraphInterface | undefined;
  getAllGraphs(): GraphInterface[];
  
  // Graph execution
  executeGraph(graphId: string, initialState: GameState): Promise<GameState>;
  executeGraphWithStreaming(
    graphId: string,
    initialState: GameState,
    onToken?: (token: string) => void
  ): Promise<GameState>;
  
  // Graph switching
  switchGraph(fromGraphId: string, toGraphId: string, state?: GameState): Promise<void>;
  mergeGraphs(sourceGraphId: string, targetGraphId: string): Promise<GraphInterface>;
  
  // Registry management
  getRegistry(): GraphRegistry;
  
  // Event handling
  onGraphEvent(eventType: string, listener: (event: GameEvent) => void): void;
  offGraphEvent(eventType: string, listener: (event: GameEvent) => void): void;
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Graph execution context
 */
export interface GraphExecutionContext {
  graphId: string;
  executionId: string;
  startTime: number;
  currentNode?: string;
  state: GameState;
  metadata: Record<string, unknown>;
}

/**
 * Graph execution result
 */
export interface GraphExecutionResult {
  success: boolean;
  finalState: GameState;
  executionTime: number;
  nodesExecuted: string[];
  errors: ValidationError[];
  metadata: Record<string, unknown>;
}

/**
 * Graph metrics
 */
export interface GraphMetrics {
  executionCount: number;
  averageExecutionTime: number;
  successRate: number;
  errorRate: number;
  nodeUsage: Record<string, number>;
  edgeUsage: Record<string, number>;
  lastExecuted: Date;
  metadata: Record<string, unknown>;
}
