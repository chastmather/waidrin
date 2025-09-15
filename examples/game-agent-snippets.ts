/**
 * GAME AGENT SNIPPETS - REFERENCE IMPLEMENTATION
 * ==============================================
 * 
 * This file contains useful snippets from the original game-agent.ts
 * that may be referenced for future development.
 * 
 * ⚠️  DO NOT USE DIRECTLY - This is for reference only
 * ✅  Use game-agent-simple.ts (renamed to game-agent.ts) for active development
 */

// ============================================================================
// SNIPPET: SPECIALIST NODE IMPLEMENTATIONS
// ============================================================================

/**
 * SNIPPET: Search Specialist Node
 * 
 * Purpose: Research and information gathering specialist
 * Usage: Handles detailed research work based on user requests
 * 
 * Key Features:
 * - Uses separate ChatOpenAI model with specialized configuration
 * - Integrates with NarrativeSelector for context
 * - Stores results in narratorState.specialistResult
 */
/*
private createSearchSpecialistNode(): (state: GameState) => Promise<Partial<GameState>> {
  return async (state: GameState): Promise<Partial<GameState>> => {
    console.log('🔍 Search specialist working...');
    
    const selector = new NarrativeSelector(state.narratorState.narrativeCache);
    const narrativeContext = selector.getAbbreviatedContext(state.narratorState.currentNarrative, 10);
    
    const prompt = PROMPTS.SPECIALIST_HANDOFF
      .replace('{specialist_type}', 'research')
      .replace('{story_time_elapsed}', state.storyTimeElapsed.toFixed(1))
      .replace('{player_level}', state.playerStats.level.toString())
      .replace('{current_location}', state.playerLocation)
      .replace('{narrative_context}', narrativeContext)
      .replace('{user_input}', state.narratorState.userInput);

    const response = await this.searchModel.invoke([
      new SystemMessage(prompt),
      new HumanMessage(state.narratorState.userInput)
    ]);

    return {
      narratorState: {
        ...state.narratorState,
        specialistResult: response.content as string,
      },
      nodeHistory: [...state.nodeHistory, GRAPH_CONFIG.NODES.SEARCH_SPECIALIST],
    };
  };
}
*/

// ============================================================================
// SNIPPET: SPECIALIST MODEL CONFIGURATIONS
// ============================================================================

/**
 * SNIPPET: Specialist Model Configuration
 * 
 * Purpose: Individual model configurations for each specialist
 * Usage: Each specialist has its own temperature, maxTokens, etc.
 * 
 * Key Features:
 * - Specialized parameters for different types of work
 * - Search: Lower temperature for factual accuracy
 * - Character: Higher temperature for creativity
 * - World Building: Medium temperature for detailed descriptions
 * - Dialogue: Highest temperature for natural conversation
 */
/*
const MODEL_CONFIG = {
  // ... base config ...
  
  SEARCH: {
    TEMPERATURE: 0.5,
    MAX_TOKENS: 800,
    TOP_P: 0.9,
    FREQUENCY_PENALTY: 0.1,
    PRESENCE_PENALTY: 0.1,
  },
  
  CHARACTER: {
    TEMPERATURE: 0.8,
    MAX_TOKENS: 1000,
    TOP_P: 0.9,
    FREQUENCY_PENALTY: 0.2,
    PRESENCE_PENALTY: 0.2,
  },
  
  WORLD_BUILDING: {
    TEMPERATURE: 0.7,
    MAX_TOKENS: 1200,
    TOP_P: 0.9,
    FREQUENCY_PENALTY: 0.1,
    PRESENCE_PENALTY: 0.1,
  },
  
  DIALOGUE: {
    TEMPERATURE: 0.9,
    MAX_TOKENS: 800,
    TOP_P: 0.9,
    FREQUENCY_PENALTY: 0.3,
    PRESENCE_PENALTY: 0.3,
  },
};
*/

// ============================================================================
// SNIPPET: SPECIALIST HANDOFF PROMPT
// ============================================================================

/**
 * SNIPPET: Specialist Handoff Prompt Template
 * 
 * Purpose: Template for specialist-specific prompts
 * Usage: Each specialist uses this template with their specific type
 * 
 * Key Features:
 * - Dynamic specialist type replacement
 * - Game state context injection
 * - Narrative context integration
 * - User request handling
 */
/*
const PROMPTS = {
  SPECIALIST_HANDOFF: `You are a {specialist_type} specialist working on a fantasy story.

GAME STATE:
- Story Time: {story_time_elapsed} days
- Player Level: {player_level}
- Location: {current_location}

NARRATIVE CONTEXT:
{narrative_context}

USER REQUEST:
{user_input}

Provide detailed {specialist_type} work based on the user's request and current game state.`,
};
*/

// ============================================================================
// SNIPPET: GRAPH CONFIGURATION WITH SPECIALISTS
// ============================================================================

/**
 * SNIPPET: Graph Configuration with Specialist Nodes
 * 
 * Purpose: Complete graph structure including all specialist nodes
 * Usage: Reference for understanding the full graph architecture
 * 
 * Key Features:
 * - All specialist nodes defined
 * - Conditional routing from handoff node
 * - Direct edges from specialists to finalize
 */
/*
const GRAPH_CONFIG = {
  NODES: {
    START: '__start__',
    NARRATOR_DECISION: 'narrator_decision',
    CONTINUE_NARRATIVE: 'continue_narrative',
    HANDOFF_TO_SPECIALIST: 'handoff_to_specialist',
    SEARCH_SPECIALIST: 'search_specialist',
    CHARACTER_SPECIALIST: 'character_specialist',
    WORLD_BUILDING_SPECIALIST: 'world_building_specialist',
    DIALOGUE_SPECIALIST: 'dialogue_specialist',
    FINALIZE: 'finalize',
  },
  ACTIONS: {
    CONTINUE_NARRATIVE: 'continue_narrative',
    HANDOFF_TO_SPECIALIST: 'handoff_to_specialist',
    FINALIZE: 'finalize',
  },
};
*/

// ============================================================================
// SNIPPET: SPECIALIST ROUTING LOGIC
// ============================================================================

/**
 * SNIPPET: Specialist Routing Function
 * 
 * Purpose: Routes handoff to appropriate specialist based on specialistType
 * Usage: Used in conditional edges from handoff node
 * 
 * Key Features:
 * - Maps specialist types to node names
 * - Fallback to search specialist for unknown types
 * - Clear logging for debugging
 */
/*
private routeSpecialist(state: GameState): string {
  const specialistType = state.narratorState.specialistType;
  console.log('🔀 Routing specialist:', specialistType);
  
  if (specialistType === 'search') {
    return GRAPH_CONFIG.NODES.SEARCH_SPECIALIST;
  } else if (specialistType === 'character') {
    return GRAPH_CONFIG.NODES.CHARACTER_SPECIALIST;
  } else if (specialistType === 'world_building') {
    return GRAPH_CONFIG.NODES.WORLD_BUILDING_SPECIALIST;
  } else if (specialistType === 'dialogue') {
    return GRAPH_CONFIG.NODES.DIALOGUE_SPECIALIST;
  } else {
    console.log('⚠️ Unknown specialist type, defaulting to search');
    return GRAPH_CONFIG.NODES.SEARCH_SPECIALIST;
  }
}
*/

// ============================================================================
// SNIPPET: UTILITY FUNCTIONS
// ============================================================================

/**
 * SNIPPET: Story Time Calculation
 * 
 * Purpose: Calculate elapsed story time based on real time
 * Usage: Used in game state updates
 * 
 * Key Features:
 * - Converts real time to story time
 * - Configurable time scaling
 * - Handles time zone differences
 */
/*
private calculateStoryTimeElapsed(realTimeElapsed: number): number {
  // 1 real hour = 1 story day (configurable)
  const TIME_SCALE = 24; // hours per day
  return realTimeElapsed / TIME_SCALE;
}
*/

/**
 * SNIPPET: Inventory Management
 * 
 * Purpose: Remove items from player inventory
 * Usage: Used in game state management
 * 
 * Key Features:
 * - Finds and removes specific items
 * - Updates inventory state
 * - Handles item not found cases
 */
/*
private removeInventoryItem(inventory: InventoryItem[], itemId: string): InventoryItem[] {
  return inventory.filter(item => item.id !== itemId);
}
*/

// ============================================================================
// SNIPPET: GRAPH CONSTRUCTION WITH SPECIALISTS
// ============================================================================

/**
 * SNIPPET: Complete Graph Construction
 * 
 * Purpose: Shows how to build the complete graph with all specialist nodes
 * Usage: Reference for understanding the full graph structure
 * 
 * Key Features:
 * - All nodes added to graph
 * - Conditional edges for routing
 * - Direct edges from specialists to finalize
 * - Proper compilation with checkpointer
 */
/*
private createGraph(): ReturnType<StateGraph<typeof GameStateAnnotation.State, Partial<typeof GameStateAnnotation.State>>['compile']> {
  const graph = new StateGraph(GameStateAnnotation)
    .addNode(GRAPH_CONFIG.NODES.NARRATOR_DECISION, this.createDecisionNode())
    .addNode(GRAPH_CONFIG.NODES.CONTINUE_NARRATIVE, this.createNarrativeNode())
    .addNode(GRAPH_CONFIG.NODES.HANDOFF_TO_SPECIALIST, this.createHandoffNode())
    .addNode(GRAPH_CONFIG.NODES.SEARCH_SPECIALIST, this.createSearchSpecialistNode())
    .addNode(GRAPH_CONFIG.NODES.CHARACTER_SPECIALIST, this.createCharacterSpecialistNode())
    .addNode(GRAPH_CONFIG.NODES.WORLD_BUILDING_SPECIALIST, this.createWorldBuildingSpecialistNode())
    .addNode(GRAPH_CONFIG.NODES.DIALOGUE_SPECIALIST, this.createDialogueSpecialistNode())
    .addNode(GRAPH_CONFIG.NODES.FINALIZE, this.createFinalizeNode())
    .addEdge(GRAPH_CONFIG.NODES.START, GRAPH_CONFIG.NODES.NARRATOR_DECISION)
    .addConditionalEdges(
      GRAPH_CONFIG.NODES.NARRATOR_DECISION,
      this.routeDecision.bind(this),
      {
        [GRAPH_CONFIG.ACTIONS.CONTINUE_NARRATIVE]: GRAPH_CONFIG.NODES.CONTINUE_NARRATIVE,
        [GRAPH_CONFIG.ACTIONS.HANDOFF_TO_SPECIALIST]: GRAPH_CONFIG.NODES.HANDOFF_TO_SPECIALIST,
        [GRAPH_CONFIG.ACTIONS.FINALIZE]: GRAPH_CONFIG.NODES.FINALIZE,
      }
    )
    .addConditionalEdges(
      GRAPH_CONFIG.NODES.HANDOFF_TO_SPECIALIST,
      this.routeSpecialist.bind(this),
      {
        [GRAPH_CONFIG.NODES.SEARCH_SPECIALIST]: GRAPH_CONFIG.NODES.SEARCH_SPECIALIST,
        [GRAPH_CONFIG.NODES.CHARACTER_SPECIALIST]: GRAPH_CONFIG.NODES.CHARACTER_SPECIALIST,
        [GRAPH_CONFIG.NODES.WORLD_BUILDING_SPECIALIST]: GRAPH_CONFIG.NODES.WORLD_BUILDING_SPECIALIST,
        [GRAPH_CONFIG.NODES.DIALOGUE_SPECIALIST]: GRAPH_CONFIG.NODES.DIALOGUE_SPECIALIST,
      }
    )
    .addEdge(GRAPH_CONFIG.NODES.SEARCH_SPECIALIST, GRAPH_CONFIG.NODES.FINALIZE)
    .addEdge(GRAPH_CONFIG.NODES.CHARACTER_SPECIALIST, GRAPH_CONFIG.NODES.FINALIZE)
    .addEdge(GRAPH_CONFIG.NODES.WORLD_BUILDING_SPECIALIST, GRAPH_CONFIG.NODES.FINALIZE)
    .addEdge(GRAPH_CONFIG.NODES.DIALOGUE_SPECIALIST, GRAPH_CONFIG.NODES.FINALIZE)
    .addEdge(GRAPH_CONFIG.NODES.CONTINUE_NARRATIVE, GRAPH_CONFIG.NODES.FINALIZE)
    .addEdge(GRAPH_CONFIG.NODES.FINALIZE, END);

  return graph.compile({
    checkpointer: this.memorySaver,
  });
}
*/

// ============================================================================
// END OF SNIPPETS
// ============================================================================

/**
 * SUMMARY OF SNIPPETS:
 * 
 * 1. Specialist Node Implementations - Complete implementations for all 4 specialist types
 * 2. Specialist Model Configurations - Individual model configs with specialized parameters
 * 3. Specialist Handoff Prompt - Template for specialist-specific prompts
 * 4. Graph Configuration - Complete node and action definitions
 * 5. Specialist Routing Logic - Function to route to appropriate specialist
 * 6. Utility Functions - Helper functions for time calculation and inventory management
 * 7. Graph Construction - Complete graph building with all specialist nodes
 * 
 * These snippets can be referenced when extending the game agent with additional
 * specialist functionality or when implementing similar patterns in other parts
 * of the codebase.
 */
