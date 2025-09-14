#!/usr/bin/env tsx

import { LangGraphGameEngine } from "../core/game-engine";
import { GameStateAnnotation } from "../types/game-state";
import type { GameState } from "../types/game-state";

/**
 * Basic Game Example
 * 
 * This example shows how to use the LangGraph game engine
 * for a basic Waidrin game session.
 */

// Mock node registry for demonstration
class MockNodeRegistry {
  private nodes = new Map<string, any>();

  registerNode(nodeType: string, factory: any): void {
    this.nodes.set(nodeType, factory);
  }

  createNode(nodeId: string, config: any): any {
    const nodeType = this.getNodeTypeFromId(nodeId);
    const factory = this.nodes.get(nodeType);
    if (!factory) {
      throw new Error(`Node type ${nodeType} not found`);
    }
    return factory(config);
  }

  getNodeTypes(): string[] {
    return Array.from(this.nodes.keys());
  }

  hasNodeType(nodeType: string): boolean {
    return this.nodes.has(nodeType);
  }

  private getNodeTypeFromId(nodeId: string): string {
    const typeMap: Record<string, string> = {
      "welcome": "welcome",
      "connection": "connection",
      "genre": "genre",
      "character": "character",
      "scenario": "scenario",
      "chat": "chat",
      "narration": "narration",
      "action_generation": "action_generation",
      "location_change": "location_change",
      "character_introduction": "character_introduction",
      "memory_update": "memory_update",
      "scene_summary": "scene_summary",
      "error_handling": "error_handling",
      "user_input": "user_input",
      "streaming": "streaming",
    };
    return typeMap[nodeId] || "unknown";
  }
}

// Mock node implementations
function createMockNode(nodeType: string) {
  return {
    nodeId: nodeType,
    nodeType,
    execute: async (state: GameState) => {
      console.log(`Executing ${nodeType} node`);
      
      // Simulate some processing time
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Return minimal state update
      return {
        currentNode: nodeType,
        memory: {
          ...state.memory,
          conversationHistory: [
            ...state.memory.conversationHistory,
            {
              role: "assistant" as const,
              content: `Executed ${nodeType} node`,
              timestamp: new Date().toISOString(),
              nodeId: nodeType,
            },
          ],
        },
      };
    },
    canExecute: (state: GameState) => true,
    getNextNodes: (state: GameState) => [],
    validateInput: (state: GameState) => true,
  };
}

async function main() {
  console.log("🎮 Starting Waidrin LangGraph Game Engine Example...");

  // Create mock node registry
  const nodeRegistry = new MockNodeRegistry();
  
  // Register mock nodes
  const nodeTypes = [
    "welcome", "connection", "genre", "character", "scenario", "chat",
    "narration", "action_generation", "location_change", "character_introduction",
    "memory_update", "scene_summary", "error_handling", "user_input", "streaming"
  ];

  nodeTypes.forEach(nodeType => {
    nodeRegistry.registerNode(nodeType, () => createMockNode(nodeType));
  });

  // Create game engine
  const gameEngine = new LangGraphGameEngine(nodeRegistry);

  // Set up event listeners
  gameEngine.onEvent("node_started", (event) => {
    console.log(`🚀 Node started: ${event.data.nodeId}`);
  });

  gameEngine.onEvent("node_completed", (event) => {
    console.log(`✅ Node completed: ${event.data.nodeId} (${event.data.executionTime}ms)`);
  });

  gameEngine.onEvent("node_failed", (event) => {
    console.error(`❌ Node failed: ${event.data.nodeId} - ${event.data.error}`);
  });

  gameEngine.onEvent("game_started", (event) => {
    console.log("🎮 Game started!");
  });

  gameEngine.onEvent("game_ended", (event) => {
    console.log("🏁 Game ended!");
  });

  // Create initial game state
  const initialState: GameState = GameStateSchema.parse({
    // Basic Waidrin state
    apiUrl: "http://localhost:8080/v1/",
    apiKey: "test-key",
    model: "gpt-4",
    contextLength: 16384,
    inputLength: 16384,
    generationParams: { temperature: 0.7 },
    narrationParams: { temperature: 0.8 },
    updateInterval: 200,
    logPrompts: false,
    logParams: false,
    logResponses: false,
    view: "welcome",
    world: {
      name: "Test World",
      description: "A test world for the LangGraph engine",
    },
    locations: [],
    characters: [],
    protagonist: {
      name: "Test Protagonist",
      gender: "male",
      race: "human",
      biography: "A test character",
      locationIndex: 0,
    },
    hiddenDestiny: false,
    betrayal: false,
    oppositeSexMagnet: false,
    sameSexMagnet: false,
    sexualContentLevel: "regular",
    violentContentLevel: "regular",
    events: [],
    actions: [],

    // LangGraph-specific state
    currentNode: "welcome",
    nodeHistory: [],
    memory: {
      conversationHistory: [],
      characterRelationships: {},
      sceneMemory: [],
      playerPreferences: {},
    },
    gameFlow: {
      currentPhase: "setup",
      canGoBack: false,
      canSkip: false,
      requiresUserInput: false,
    },
    streaming: {
      isStreaming: false,
      currentStream: undefined,
      streamProgress: 0,
    },
    plugins: {
      activePlugins: [],
      pluginStates: {},
      pluginEvents: [],
    },
    errors: [],
    performance: {
      nodeExecutionTimes: {},
      totalExecutionTime: 0,
      memoryUsage: 0,
      debugMode: true,
    },
  });

  try {
    console.log("🎯 Executing game engine...");
    const result = await gameEngine.execute(initialState);
    
    console.log("🎉 Game execution completed!");
    console.log("📊 Final state summary:");
    console.log(`- Current node: ${result.currentNode}`);
    console.log(`- Node history: ${result.nodeHistory.length} nodes executed`);
    console.log(`- Conversation history: ${result.memory.conversationHistory.length} messages`);
    console.log(`- Total execution time: ${result.performance.totalExecutionTime}ms`);
    console.log(`- Errors: ${result.errors.length}`);

    if (result.errors.length > 0) {
      console.log("⚠️  Errors encountered:");
      result.errors.forEach(error => {
        console.log(`  - ${error.type}: ${error.message}`);
      });
    }

  } catch (error) {
    console.error("💥 Game execution failed:", error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on("SIGINT", async () => {
  console.log("\n🛑 Shutting down game engine...");
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("\n🛑 Shutting down game engine...");
  process.exit(0);
});

// Run the main function
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error("💥 Fatal error:", error);
    process.exit(1);
  });
}
