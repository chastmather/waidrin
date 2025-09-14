#!/usr/bin/env tsx

import { createIntegratedGameEngine, LangGraphGameEngine } from "../lib";
import { GameStateAnnotation } from "../lib/game-state";
import type { GameState } from "../lib/game-state";

/**
 * Basic LangGraph Game Example
 * 
 * This example demonstrates how to use the LangGraph game engine
 * for creating interactive game experiences.
 */

// ============================================================================
// Example Game Nodes
// ============================================================================

const exampleNodes = {
  start: {
    id: "start",
    name: "Game Start",
    description: "Initialize the game and welcome the player",
    execute: async (context) => {
      console.log("🎮 Game starting...");
      return {
        success: true,
        nextNodeId: "character_creation",
        data: { message: "Welcome to the game!" },
        stateUpdates: {
          view: "character_creation",
          gameFlow: {
            currentPhase: "character_creation",
            completedPhases: ["start"],
            nextPhase: "gameplay"
          }
        }
      };
    }
  },

  character_creation: {
    id: "character_creation",
    name: "Character Creation",
    description: "Create the player's character",
    execute: async (context) => {
      console.log("👤 Creating character...");
      return {
        success: true,
        nextNodeId: "gameplay",
        data: { character: "Player created" },
        stateUpdates: {
          view: "gameplay",
          characters: [{
            name: "Player",
            gender: "unknown",
            race: "human",
            biography: "A brave adventurer",
            locationIndex: 0
          }],
          gameFlow: {
            currentPhase: "gameplay",
            completedPhases: ["start", "character_creation"],
            nextPhase: "combat"
          }
        }
      };
    }
  },

  gameplay: {
    id: "gameplay",
    name: "Main Gameplay",
    description: "Core game loop",
    execute: async (context) => {
      console.log("🎯 Gameplay in progress...");
      return {
        success: true,
        nextNodeId: "end",
        data: { action: "Playing the game" },
        stateUpdates: {
          view: "gameplay",
          events: [{
            type: "narration",
            text: "You are in a mysterious forest..."
          }]
        }
      };
    }
  },

  end: {
    id: "end",
    name: "Game End",
    description: "End the game",
    execute: async (context) => {
      console.log("🏁 Game ended!");
      return {
        success: true,
        data: { message: "Thanks for playing!" },
        stateUpdates: {
          view: "end",
          gameFlow: {
            currentPhase: "end",
            completedPhases: ["start", "character_creation", "gameplay"],
            nextPhase: null
          }
        }
      };
    }
  }
};

// ============================================================================
// Example Usage
// ============================================================================

async function runExample() {
  console.log("🚀 Starting LangGraph Game Example\n");

  // Create the game engine with our example nodes
  const engine = new LangGraphGameEngine(exampleNodes);

  // Create initial game state
  const initialState: GameState = GameStateAnnotation.State({
    // Core LangGraph state
    currentNode: "start",
    nodeHistory: [],
    memory: {},
    gameFlow: {
      currentPhase: "start",
      completedPhases: [],
      nextPhase: "character_creation"
    },
    streaming: {
      isStreaming: false,
      streamId: null,
      buffer: []
    },
    plugins: {},
    errors: [],
    performance: {
      totalExecutionTime: 0,
      nodeExecutionTimes: {},
      memoryUsage: 0
    },
    
    // Game-specific state
    view: "start",
    world: {
      name: "Example World",
      description: "A simple example world"
    },
    locations: [{
      name: "Forest",
      type: "outdoor",
      description: "A mysterious forest"
    }],
    characters: [],
    events: [],
    currentEventIndex: 0,
    isGenerating: false,
    error: null,
    isAborted: false
  });

  try {
    // Execute the game
    console.log("Executing game...\n");
    const finalState = await engine.execute(initialState);
    
    console.log("\n✅ Game completed successfully!");
    console.log("Final state:", JSON.stringify(finalState, null, 2));
    
  } catch (error) {
    console.error("❌ Game execution failed:", error);
  }
}

// Run the example if this file is executed directly
if (require.main === module) {
  runExample().catch(console.error);
}

export { runExample };