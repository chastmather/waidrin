import { StateGraph, END } from "@langchain/langgraph";
import type { GameState, GameEvent, NodeContext } from "./game-state";
import type { NodeRegistry } from "./node-types";
import { GameStateAnnotation } from "./game-state";

/**
 * ⚠️  UNCONFIRMED CHANGES ⚠️
 * 
 * These changes have been made based on LangGraph documentation review but have NOT been
 * confirmed to be correct. They need thorough testing and validation.
 * 
 * Changes made:
 * - Fixed StateGraph constructor to use GameStateAnnotation instead of Zod schema
 * - Added proper graph compilation with .compile()
 * - Fixed node wrapper functions to return proper state updates
 * - Added proper entry point with __start__
 * 
 * LangGraph Game Engine
 * 
 * This is the main game engine that replaces the linear state machine
 * in Waidrin with a flexible, dynamic LangGraph-based system.
 */
export class LangGraphGameEngine {
  private compiledGraph: any;           // Compiled LangGraph state machine
  private nodeRegistry: NodeRegistry;             // Manages all game nodes
  private eventListeners: Map<string, ((event: GameEvent) => void)[]> = new Map(); // Event system
  private isRunning = false;                      // Execution state
  private currentExecution: Promise<GameState> | null = null; // Current execution

  constructor(nodeRegistry: NodeRegistry) {
    this.nodeRegistry = nodeRegistry;  // Inject node registry
    this.compiledGraph = this.createGraph();   // Build and compile the state graph
  }

  /**
   * Create the LangGraph state machine using fluent builder pattern
   * Based on LangGraph documentation: new StateGraph(Annotation).addNode().addEdge().compile()
   */
  private createGraph(): any {
    // Use fluent builder pattern as per LangGraph documentation
    return new StateGraph(GameStateAnnotation)
      .addNode("welcome", this.createNodeFunction("welcome"))
      .addNode("connection", this.createNodeFunction("connection"))
      .addNode("genre", this.createNodeFunction("genre"))
      .addNode("character", this.createNodeFunction("character"))
      .addNode("scenario", this.createNodeFunction("scenario"))
      .addNode("chat", this.createNodeFunction("chat"))
      .addNode("narration", this.createNodeFunction("narration"))
      .addNode("action_generation", this.createNodeFunction("action_generation"))
      .addNode("location_change", this.createNodeFunction("location_change"))
      .addNode("character_introduction", this.createNodeFunction("character_introduction"))
      .addNode("memory_update", this.createNodeFunction("memory_update"))
      .addNode("scene_summary", this.createNodeFunction("scene_summary"))
      .addNode("error_handling", this.createNodeFunction("error_handling"))
      .addNode("user_input", this.createNodeFunction("user_input"))
      .addNode("streaming", this.createNodeFunction("streaming"))
      .addEdge("__start__", "welcome")
      .addEdge("welcome", "connection")
      .addEdge("connection", "genre")
      .addEdge("genre", "character")
      .addEdge("character", "scenario")
      .addEdge("scenario", "chat")
      .addConditionalEdges("chat", this.shouldContinueChat.bind(this), {
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
      })
      .addConditionalEdges("narration", this.afterNarration.bind(this), {
        "action_generation": "action_generation",
        "memory_update": "memory_update",
        "chat": "chat",
      })
      .addConditionalEdges("action_generation", this.afterActionGeneration.bind(this), {
        "user_input": "user_input",
        "chat": "chat",
      })
      .addConditionalEdges("location_change", this.afterLocationChange.bind(this), {
        "character_introduction": "character_introduction",
        "narration": "narration",
        "chat": "chat",
      })
      .addConditionalEdges("character_introduction", this.afterCharacterIntroduction.bind(this), {
        "narration": "narration",
        "memory_update": "memory_update",
        "chat": "chat",
      })
      .addConditionalEdges("memory_update", this.afterMemoryUpdate.bind(this), {
        "chat": "chat",
        "scene_summary": "scene_summary",
      })
      .addConditionalEdges("scene_summary", this.afterSceneSummary.bind(this), {
        "chat": "chat",
        "end": END,
      })
      .addConditionalEdges("error_handling", this.afterErrorHandling.bind(this), {
        "chat": "chat",
        "retry": "chat",
        "end": END,
      })
      .addConditionalEdges("user_input", this.afterUserInput.bind(this), {
        "chat": "chat",
        "narration": "narration",
        "action_generation": "action_generation",
      })
      .addConditionalEdges("streaming", this.afterStreaming.bind(this), {
        "chat": "chat",
        "narration": "narration",
      })
      .compile();
  }

  /**
   * Create a simple node function following LangGraph patterns
   * Based on documentation: async function callModel(state) { return { messages: [response] }; }
   */
  private createNodeFunction(nodeId: string) {
    return async (state: GameState): Promise<Partial<GameState>> => {
      try {
        this.emitEvent({
          id: crypto.randomUUID(),
          type: "node_started",
          data: { nodeId },
          timestamp: new Date().toISOString(),
          nodeId,
        });

        const node = this.nodeRegistry[nodeId];
        if (!node) {
          throw new Error(`Node ${nodeId} not found in registry`);
        }

        const context: NodeContext = {
          nodeId,
          nodeType: node.nodeType || "unknown",
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

        // Return state updates as per LangGraph documentation
        return {
          currentNode: nodeId,
          nodeHistory: [
            ...state.nodeHistory,
            {
              nodeId,
              timestamp: new Date().toISOString(),
              duration: executionTime,
              success: true,
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
          // Include any state updates from the node execution
          ...(result.stateUpdates || {}),
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
      !state.memory.characterRelationships?.[char.name]
    );
    if (hasNewCharacters) return "character_introduction";
    return "narration";
  }

  private afterCharacterIntroduction(_state: GameState): string {
    return "narration";
  }

  private afterMemoryUpdate(state: GameState): string {
    // Check if scene should be summarized
    const recentEvents = state.events.slice(-10);
    const hasLocationChange = recentEvents.some((event: any) => 
      event.type === "location_change"
    );
    if (hasLocationChange) return "scene_summary";
    return "chat";
  }

  private afterSceneSummary(_state: GameState): string {
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
      nodeId: "game_engine",
    });

    try {
      const result = await this.compiledGraph.invoke(initialState);
      
      this.emitEvent({
        id: crypto.randomUUID(),
        type: "game_ended",
        data: { finalState: result },
        timestamp: new Date().toISOString(),
        nodeId: "game_engine",
      });

      return result as GameState;
    } catch (error) {
      this.emitEvent({
        id: crypto.randomUUID(),
        type: "error_occurred",
        data: { error: error instanceof Error ? error.message : String(error) },
        timestamp: new Date().toISOString(),
        nodeId: "game_engine",
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
      nodeId: "game_engine",
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
      nodeId: "game_engine",
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
      nodeId: "game_engine",
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
