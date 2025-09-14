import { StateGraph, END } from "@langchain/langgraph";
import type { GameState, GameEvent, NodeContext } from "../types/game-state";
import type { GameNode, NodeRegistry, NodeExecutionResult } from "../types/node-types";
import { GameStateAnnotation } from "../types/game-state";

/**
 * LangGraph Game Engine
 * 
 * This is the main game engine that replaces the linear state machine
 * in Waidrin with a flexible, dynamic LangGraph-based system.
 */
export class LangGraphGameEngine {
  private graph: StateGraph<GameState>;           // LangGraph state machine
  private nodeRegistry: NodeRegistry;             // Manages all game nodes
  private eventListeners: Map<string, ((event: GameEvent) => void)[]>; // Event system
  private isRunning = false;                      // Execution state
  private currentExecution: Promise<GameState> | null = null; // Current execution

  constructor(nodeRegistry: NodeRegistry) {
    this.nodeRegistry = nodeRegistry;  // Inject node registry
    this.graph = this.createGraph();   // Build the state graph
  }

  /**
   * Create the LangGraph state machine
   */
  private createGraph(): StateGraph<GameState> {
    const graph = new StateGraph<GameState>({
      channels: GameStateSchema,
    });

    // Add all game nodes
    this.addGameNodes(graph);

    // Add conditional edges for dynamic flow
    this.addConditionalEdges(graph);

    return graph;
  }

  /**
   * Add all game nodes to the graph
   */
  private addGameNodes(graph: StateGraph<GameState>): void {
    // Core game flow nodes
    graph.addNode("welcome", this.createNodeWrapper("welcome"));
    graph.addNode("connection", this.createNodeWrapper("connection"));
    graph.addNode("genre", this.createNodeWrapper("genre"));
    graph.addNode("character", this.createNodeWrapper("character"));
    graph.addNode("scenario", this.createNodeWrapper("scenario"));
    graph.addNode("chat", this.createNodeWrapper("chat"));

    // Dynamic game nodes
    graph.addNode("narration", this.createNodeWrapper("narration"));
    graph.addNode("action_generation", this.createNodeWrapper("action_generation"));
    graph.addNode("location_change", this.createNodeWrapper("location_change"));
    graph.addNode("character_introduction", this.createNodeWrapper("character_introduction"));
    graph.addNode("memory_update", this.createNodeWrapper("memory_update"));
    graph.addNode("scene_summary", this.createNodeWrapper("scene_summary"));

    // Utility nodes
    graph.addNode("error_handling", this.createNodeWrapper("error_handling"));
    graph.addNode("user_input", this.createNodeWrapper("user_input"));
    graph.addNode("streaming", this.createNodeWrapper("streaming"));
  }

  /**
   * Add conditional edges for dynamic game flow
   */
  private addConditionalEdges(graph: StateGraph<GameState>): void {
    // Main game flow
    graph.addEdge("welcome", "connection");
    graph.addEdge("connection", "genre");
    graph.addEdge("genre", "character");
    graph.addEdge("character", "scenario");
    graph.addEdge("scenario", "chat");

    // Chat loop with dynamic branching
    graph.addConditionalEdges(
      "chat",
      this.shouldContinueChat.bind(this),
      {
        "narration": "narration",
        "action_generation": "action_generation",
        "location_change": "location_change",
        "character_introduction": "character_introduction",
        "memory_update": "memory_update",
        "scene_summary": "scene_summary",
        "user_input": "user_input",
        "streaming": "streaming",
        "error_handling": "error_handling",
        "end": END,
      }
    );

    // Narration flow
    graph.addConditionalEdges(
      "narration",
      this.afterNarration.bind(this),
      {
        "action_generation": "action_generation",
        "memory_update": "memory_update",
        "chat": "chat",
      }
    );

    // Action generation flow
    graph.addConditionalEdges(
      "action_generation",
      this.afterActionGeneration.bind(this),
      {
        "user_input": "user_input",
        "chat": "chat",
      }
    );

    // Location change flow
    graph.addConditionalEdges(
      "location_change",
      this.afterLocationChange.bind(this),
      {
        "character_introduction": "character_introduction",
        "narration": "narration",
        "chat": "chat",
      }
    );

    // Character introduction flow
    graph.addConditionalEdges(
      "character_introduction",
      this.afterCharacterIntroduction.bind(this),
      {
        "narration": "narration",
        "memory_update": "memory_update",
        "chat": "chat",
      }
    );

    // Memory update flow
    graph.addConditionalEdges(
      "memory_update",
      this.afterMemoryUpdate.bind(this),
      {
        "chat": "chat",
        "scene_summary": "scene_summary",
      }
    );

    // Scene summary flow
    graph.addConditionalEdges(
      "scene_summary",
      this.afterSceneSummary.bind(this),
      {
        "chat": "chat",
        "end": END,
      }
    );

    // Error handling flow
    graph.addConditionalEdges(
      "error_handling",
      this.afterErrorHandling.bind(this),
      {
        "chat": "chat",
        "retry": "chat",
        "end": END,
      }
    );

    // User input flow
    graph.addConditionalEdges(
      "user_input",
      this.afterUserInput.bind(this),
      {
        "chat": "chat",
        "narration": "narration",
        "action_generation": "action_generation",
      }
    );

    // Streaming flow
    graph.addConditionalEdges(
      "streaming",
      this.afterStreaming.bind(this),
      {
        "chat": "chat",
        "narration": "narration",
      }
    );
  }

  /**
   * Create a node wrapper that handles execution and error handling
   */
  private createNodeWrapper(nodeId: string) {
    return async (state: GameState): Promise<Partial<GameState>> => {
      try {
        this.emitEvent({
          id: crypto.randomUUID(),
          type: "node_started",
          data: { nodeId },
          timestamp: new Date().toISOString(),
          nodeId,
        });

        const node = this.nodeRegistry.createNode(nodeId, {});
        const context: NodeContext = {
          nodeId,
          nodeType: node.nodeType,
          input: state,
          previousNode: state.currentNode,
          nextNodes: [],
          executionTime: 0,
          retryCount: 0,
          maxRetries: 3,
        };

        const startTime = Date.now();
        const result = await node.execute(state, context);
        const executionTime = Date.now() - startTime;

        this.emitEvent({
          id: crypto.randomUUID(),
          type: "node_completed",
          data: { nodeId, executionTime },
          timestamp: new Date().toISOString(),
          nodeId,
        });

        return {
          ...result,
          currentNode: nodeId,
          nodeHistory: [
            ...state.nodeHistory,
            {
              nodeId,
              timestamp: new Date().toISOString(),
              input: state,
              output: result,
            },
          ],
          performance: {
            ...state.performance,
            nodeExecutionTimes: {
              ...state.performance.nodeExecutionTimes,
              [nodeId]: executionTime,
            },
            totalExecutionTime: state.performance.totalExecutionTime + executionTime,
          },
        };
      } catch (error) {
        this.emitEvent({
          id: crypto.randomUUID(),
          type: "node_failed",
          data: { nodeId, error: error instanceof Error ? error.message : String(error) },
          timestamp: new Date().toISOString(),
          nodeId,
        });

        return {
          errors: [
            ...state.errors,
            {
              id: crypto.randomUUID(),
              type: "node_execution_error",
              message: error instanceof Error ? error.message : String(error),
              nodeId,
              timestamp: new Date().toISOString(),
              resolved: false,
            },
          ],
        };
      }
    };
  }

  /**
   * Conditional edge functions
   */
  private shouldContinueChat(state: GameState): string {
    if (state.errors.length > 0) return "error_handling";
    if (state.gameFlow.requiresUserInput) return "user_input";
    if (state.streaming.isStreaming) return "streaming";
    if (state.view === "chat") return "narration";
    return "end";
  }

  private afterNarration(state: GameState): string {
    if (state.gameFlow.requiresUserInput) return "action_generation";
    return "memory_update";
  }

  private afterActionGeneration(state: GameState): string {
    if (state.gameFlow.requiresUserInput) return "user_input";
    return "chat";
  }

  private afterLocationChange(state: GameState): string {
    // Check if new characters need to be introduced
    const hasNewCharacters = state.characters.some(char => 
      !state.memory.characterRelationships[char.name]
    );
    if (hasNewCharacters) return "character_introduction";
    return "narration";
  }

  private afterCharacterIntroduction(state: GameState): string {
    return "narration";
  }

  private afterMemoryUpdate(state: GameState): string {
    // Check if scene should be summarized
    const recentEvents = state.events.slice(-10);
    const hasLocationChange = recentEvents.some(event => 
      event.type === "location_change"
    );
    if (hasLocationChange) return "scene_summary";
    return "chat";
  }

  private afterSceneSummary(state: GameState): string {
    return "chat";
  }

  private afterErrorHandling(state: GameState): string {
    const lastError = state.errors[state.errors.length - 1];
    if (lastError?.resolved) return "chat";
    return "end";
  }

  private afterUserInput(state: GameState): string {
    if (state.gameFlow.pendingUserInput) return "chat";
    return "action_generation";
  }

  private afterStreaming(state: GameState): string {
    if (state.streaming.isStreaming) return "streaming";
    return "chat";
  }

  /**
   * Execute the game engine
   */
  async execute(initialState: GameState): Promise<GameState> {
    if (this.isRunning) {
      throw new Error("Game engine is already running");
    }

    this.isRunning = true;
    this.emitEvent({
      id: crypto.randomUUID(),
      type: "game_started",
      data: { initialState },
      timestamp: new Date().toISOString(),
    });

    try {
      const compiledGraph = this.graph.compile();
      const result = await compiledGraph.invoke(initialState);
      
      this.emitEvent({
        id: crypto.randomUUID(),
        type: "game_ended",
        data: { finalState: result },
        timestamp: new Date().toISOString(),
      });

      return result;
    } catch (error) {
      this.emitEvent({
        id: crypto.randomUUID(),
        type: "error_occurred",
        data: { error: error instanceof Error ? error.message : String(error) },
        timestamp: new Date().toISOString(),
      });
      throw error;
    } finally {
      this.isRunning = false;
      this.currentExecution = null;
    }
  }

  /**
   * Pause the game engine
   */
  async pause(): Promise<void> {
    if (!this.isRunning) return;
    
    this.emitEvent({
      id: crypto.randomUUID(),
      type: "game_paused",
      data: {},
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Resume the game engine
   */
  async resume(): Promise<void> {
    this.emitEvent({
      id: crypto.randomUUID(),
      type: "game_resumed",
      data: {},
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Stop the game engine
   */
  async stop(): Promise<void> {
    this.isRunning = false;
    this.currentExecution = null;
    
    this.emitEvent({
      id: crypto.randomUUID(),
      type: "game_ended",
      data: {},
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Event system
   */
  onEvent(eventType: string, listener: (event: GameEvent) => void): void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, []);
    }
    this.eventListeners.get(eventType)!.push(listener);
  }

  offEvent(eventType: string, listener: (event: GameEvent) => void): void {
    const listeners = this.eventListeners.get(eventType) || [];
    const index = listeners.indexOf(listener);
    if (index > -1) {
      listeners.splice(index, 1);
    }
  }

  private emitEvent(event: GameEvent): void {
    const listeners = this.eventListeners.get(event.type) || [];
    listeners.forEach(listener => listener(event));
  }

  /**
   * Get current execution status
   */
  getStatus(): { isRunning: boolean; currentNode?: string } {
    return {
      isRunning: this.isRunning,
      currentNode: this.isRunning ? "executing" : undefined,
    };
  }
}
