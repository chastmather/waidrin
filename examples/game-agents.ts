/**
 * SIMPLE GAME AGENT (DEEPSEEK COMPATIBLE)
 * ======================================
 * 
 * Simplified game agent that works with DeepSeek's JSON output capabilities
 * without using withStructuredOutput() which may not be compatible.
 */

import { StateGraph, Annotation, END, MessagesAnnotation, MemorySaver } from "@langchain/langgraph";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";
import * as dotenv from "dotenv";

// Import the game state and utilities
import { 
  GameStateAnnotation, 
  type GameState,
  updateStoryTime,
  addInventoryItem,
  updatePlayerStats,
  addWorldEvent,
  addNarrativeNode,
  getNarrativeNode,
  getBranchNodes,
  checkStoryConsistency,
  logAgentCall,
  logStateChange,
  logConsistencyCheck,
  logMemoryOperation,
  getDebugLogSummary,
  type InventoryItem,
  type PlayerStats,
  type WorldState,
  type NarrativeNode,
  type ConsistencyCheckResult
} from './game-state';

// Import the narrative cache system
import { 
  NarrativeSelector, 
  createEmptyNarrativeCache
} from './narrative-cache';

// Load environment variables
dotenv.config();

// ============================================================================
// CONFIGURATION CONSTANTS
// ============================================================================

const MODEL_CONFIG = {
  MODEL: process.env.OPENAI_MODEL || "deepseek-chat",
  API_KEY: process.env.OPENAI_API_KEY || "",
  BASE_URL: process.env.OPENAI_API_URL || "https://api.openai.com/v1/",
  
  NARRATOR: {
    TEMPERATURE: 0.7,
    MAX_TOKENS: 1000,
    TOP_P: 0.9,
    FREQUENCY_PENALTY: 0.1,
    PRESENCE_PENALTY: 0.1,
  },
  
  DECISION: {
    TEMPERATURE: 0.3,
    MAX_TOKENS: 500,
    TOP_P: 0.8,
    FREQUENCY_PENALTY: 0.0,
    PRESENCE_PENALTY: 0.0,
  },
  
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

const PROMPTS = {
  NARRATOR_DECISION: `You are a skilled narrator deciding how to continue a fantasy story. Please respond in JSON format.

CURRENT GAME STATE:
- Story Time Elapsed: {story_time_elapsed} days
- Player Level: {player_level}
- Current Location: {current_location}
- Inventory Items: {inventory_count}

NARRATIVE CONTEXT:
{narrative_context}

USER INPUT:
{user_input}

Based on the user's input and current game state, decide whether to:
1. Continue the narrative directly (continue_narrative)
2. Hand off to a specialist for detailed work (handoff_to_specialist)

Please respond in this JSON format:
{
  "action": "continue_narrative" or "handoff_to_specialist",
  "specialist_type": "search" or "character" or "world_building" or "dialogue" or null,
  "reasoning": "Your reasoning for this decision",
  "confidence": 0.0 to 1.0
}`,

  NARRATOR_CONTINUE: `You are a skilled fantasy narrator continuing an engaging story.

GAME STATE:
- Story Time: {story_time_elapsed} days
- Player Level: {player_level}
- Location: {current_location}
- Recent Events: {recent_events}

NARRATIVE CONTEXT:
{narrative_context}

USER INPUT:
{user_input}

Continue the narrative based on the user's input. Consider the game state and story progression. Be engaging and immersive.`,

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

// ============================================================================
// DECISION SCHEMA
// ============================================================================

// Decision schema for type safety
const GameDecisionSchema = z.object({
  action: z.enum(['continue_narrative', 'handoff_to_specialist']),
  specialist_type: z.enum(['search', 'character', 'world_building', 'dialogue']).nullable(),
  reasoning: z.string(),
  confidence: z.number().min(0).max(1),
});

// ============================================================================
// GAME AGENT CLASS
// ============================================================================

export class GameAgent {
  private narratorModel!: ChatOpenAI;
  private decisionModel!: ChatOpenAI;
  private searchModel!: ChatOpenAI;
  private characterModel!: ChatOpenAI;
  private worldBuildingModel!: ChatOpenAI;
  private dialogueModel!: ChatOpenAI;
  private compiledGraph: ReturnType<StateGraph<typeof GameStateAnnotation.State, Partial<typeof GameStateAnnotation.State>>['compile']>;
  private memorySaver: MemorySaver;

  constructor() {
    this.initializeModels();
    this.memorySaver = new MemorySaver();
    this.compiledGraph = this.createGraph();
  }

  /**
   * Initialize all models with appropriate configurations
   */
  private initializeModels(): void {
    // Narrator model
    this.narratorModel = new ChatOpenAI({
      model: MODEL_CONFIG.MODEL,
      apiKey: MODEL_CONFIG.API_KEY,
      configuration: { baseURL: MODEL_CONFIG.BASE_URL },
      temperature: MODEL_CONFIG.NARRATOR.TEMPERATURE,
      maxTokens: MODEL_CONFIG.NARRATOR.MAX_TOKENS,
      topP: MODEL_CONFIG.NARRATOR.TOP_P,
      frequencyPenalty: MODEL_CONFIG.NARRATOR.FREQUENCY_PENALTY,
      presencePenalty: MODEL_CONFIG.NARRATOR.PRESENCE_PENALTY,
    });

    // Decision model with JSON output
    this.decisionModel = new ChatOpenAI({
      model: MODEL_CONFIG.MODEL,
      apiKey: MODEL_CONFIG.API_KEY,
      configuration: { baseURL: MODEL_CONFIG.BASE_URL },
      temperature: MODEL_CONFIG.DECISION.TEMPERATURE,
      maxTokens: MODEL_CONFIG.DECISION.MAX_TOKENS,
      topP: MODEL_CONFIG.DECISION.TOP_P,
      frequencyPenalty: MODEL_CONFIG.DECISION.FREQUENCY_PENALTY,
      presencePenalty: MODEL_CONFIG.DECISION.PRESENCE_PENALTY,
    });

    // Search specialist model
    this.searchModel = new ChatOpenAI({
      model: MODEL_CONFIG.MODEL,
      apiKey: MODEL_CONFIG.API_KEY,
      configuration: { baseURL: MODEL_CONFIG.BASE_URL },
      temperature: MODEL_CONFIG.SEARCH.TEMPERATURE,
      maxTokens: MODEL_CONFIG.SEARCH.MAX_TOKENS,
      topP: MODEL_CONFIG.SEARCH.TOP_P,
      frequencyPenalty: MODEL_CONFIG.SEARCH.FREQUENCY_PENALTY,
      presencePenalty: MODEL_CONFIG.SEARCH.PRESENCE_PENALTY,
    });

    // Character specialist model
    this.characterModel = new ChatOpenAI({
      model: MODEL_CONFIG.MODEL,
      apiKey: MODEL_CONFIG.API_KEY,
      configuration: { baseURL: MODEL_CONFIG.BASE_URL },
      temperature: MODEL_CONFIG.CHARACTER.TEMPERATURE,
      maxTokens: MODEL_CONFIG.CHARACTER.MAX_TOKENS,
      topP: MODEL_CONFIG.CHARACTER.TOP_P,
      frequencyPenalty: MODEL_CONFIG.CHARACTER.FREQUENCY_PENALTY,
      presencePenalty: MODEL_CONFIG.CHARACTER.PRESENCE_PENALTY,
    });

    // World building specialist model
    this.worldBuildingModel = new ChatOpenAI({
      model: MODEL_CONFIG.MODEL,
      apiKey: MODEL_CONFIG.API_KEY,
      configuration: { baseURL: MODEL_CONFIG.BASE_URL },
      temperature: MODEL_CONFIG.WORLD_BUILDING.TEMPERATURE,
      maxTokens: MODEL_CONFIG.WORLD_BUILDING.MAX_TOKENS,
      topP: MODEL_CONFIG.WORLD_BUILDING.TOP_P,
      frequencyPenalty: MODEL_CONFIG.WORLD_BUILDING.FREQUENCY_PENALTY,
      presencePenalty: MODEL_CONFIG.WORLD_BUILDING.PRESENCE_PENALTY,
    });

    // Dialogue specialist model
    this.dialogueModel = new ChatOpenAI({
      model: MODEL_CONFIG.MODEL,
      apiKey: MODEL_CONFIG.API_KEY,
      configuration: { baseURL: MODEL_CONFIG.BASE_URL },
      temperature: MODEL_CONFIG.DIALOGUE.TEMPERATURE,
      maxTokens: MODEL_CONFIG.DIALOGUE.MAX_TOKENS,
      topP: MODEL_CONFIG.DIALOGUE.TOP_P,
      frequencyPenalty: MODEL_CONFIG.DIALOGUE.FREQUENCY_PENALTY,
      presencePenalty: MODEL_CONFIG.DIALOGUE.PRESENCE_PENALTY,
    });
  }

  /**
   * Create the main game graph
   */
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

  /**
   * Parse JSON response from DeepSeek
   */
  private parseJsonResponse(content: string): unknown {
    let jsonContent = content;
    if (jsonContent.includes('```json')) {
      jsonContent = jsonContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    }
    
    try {
      return JSON.parse(jsonContent);
    } catch (error) {
      console.error('JSON Parse Error:', (error as Error).message);
      console.error('Content:', jsonContent);
      throw error;
    }
  }

  /**
   * Create decision node
   */
  private createDecisionNode(): (state: GameState) => Promise<Partial<GameState>> {
    return async (state: GameState): Promise<Partial<GameState>> => {
      console.log('🎯 Making game decision...');
      
      // Update story time
      const timeUpdate = updateStoryTime(state);
      
      // Get narrative context
      const selector = new NarrativeSelector(state.narratorState.narrativeCache);
      const narrativeContext = selector.getAbbreviatedContext(state.narratorState.currentNarrative, 10);
      
      // Prepare decision prompt
      const prompt = PROMPTS.NARRATOR_DECISION
        .replace('{story_time_elapsed}', state.storyTimeElapsed.toFixed(1))
        .replace('{player_level}', state.playerStats.level.toString())
        .replace('{current_location}', state.playerLocation)
        .replace('{inventory_count}', state.playerInventory.length.toString())
        .replace('{narrative_context}', narrativeContext)
        .replace('{user_input}', state.narratorState.userInput);

      const response = await this.decisionModel.invoke([
        new SystemMessage(prompt),
        new HumanMessage(state.narratorState.userInput)
      ]);

      const decision = this.parseJsonResponse(response.content as string) as {
        action: 'continue_narrative' | 'handoff_to_specialist';
        specialist_type: 'search' | 'character' | 'world_building' | 'dialogue' | null;
        reasoning: string;
        confidence: number;
      };

      return {
        ...timeUpdate,
        narratorState: {
          ...state.narratorState,
          nextAction: decision.action,
          specialistType: decision.specialist_type,
          decisionReasoning: decision.reasoning,
        },
        nodeHistory: [...state.nodeHistory, GRAPH_CONFIG.NODES.NARRATOR_DECISION],
      };
    };
  }

  /**
   * Create narrative continuation node
   */
  private createNarrativeNode(): (state: GameState) => Promise<Partial<GameState>> {
    return async (state: GameState): Promise<Partial<GameState>> => {
      console.log('📖 Continuing narrative...');
      
      // Get narrative context
      const selector = new NarrativeSelector(state.narratorState.narrativeCache);
      const narrativeContext = selector.getAbbreviatedContext(state.narratorState.currentNarrative, 10);
      const recentEvents = state.worldState.worldEvents.slice(-3);
      
      // Prepare narrative prompt
      const prompt = PROMPTS.NARRATOR_CONTINUE
        .replace('{story_time_elapsed}', state.storyTimeElapsed.toFixed(1))
        .replace('{player_level}', state.playerStats.level.toString())
        .replace('{current_location}', state.playerLocation)
        .replace('{recent_events}', recentEvents.map(e => e.name).join(', ') || 'None')
        .replace('{narrative_context}', narrativeContext)
        .replace('{user_input}', state.narratorState.userInput);

      const response = await this.narratorModel.invoke([
        new SystemMessage(prompt),
        new HumanMessage(state.narratorState.userInput)
      ]);

      const narrativeContent = response.content as string;
      const narrativeEntry = {
        id: `narrative_${Date.now()}`,
        content: narrativeContent,
        timestamp: new Date().toISOString(),
      };

      // Add narrative node with sequential ID and URI
      const updatedNarrative = addNarrativeNode(state.serializedNarrative, {
        title: `Chapter ${state.serializedNarrative.totalNodes + 1}`,
        content: narrativeContent,
        tags: ['narrative', 'continuation'],
        metadata: {
          author: 'narrator',
          mood: 'adventure',
          location: state.playerLocation,
          characters: [],
          events: [],
        },
        parentId: null,
        branchId: state.serializedNarrative.currentBranchId || 'main',
      });

      return {
        narratorState: {
          ...state.narratorState,
          currentNarrative: narrativeContent,
          narrativeHistory: [...state.narratorState.narrativeHistory, narrativeEntry],
        },
        serializedNarrative: updatedNarrative,
        nodeHistory: [...state.nodeHistory, GRAPH_CONFIG.NODES.CONTINUE_NARRATIVE],
      };
    };
  }

  /**
   * Create finalize node with consistency checker
   */
  private createFinalizeNode(): (state: GameState) => Promise<Partial<GameState>> {
    return async (state: GameState): Promise<Partial<GameState>> => {
      console.log('✅ Finalizing game turn...');
      
      // Run consistency check if enabled
      if (state.consistencyChecker.enabled) {
        console.log('🔍 Running consistency check...');
        
        const checkResult = checkStoryConsistency(
          state.serializedNarrative, 
          state.consistencyChecker.checkLastTurns
        );
        
        console.log('📊 Consistency check results:');
        console.log(`   Overall Score: ${checkResult.overallScore}/100`);
        console.log(`   Inconsistencies: ${checkResult.inconsistencies.length}`);
        console.log(`   Needs Revision: ${checkResult.needsRevision}`);
        
        if (checkResult.inconsistencies.length > 0) {
          console.log('⚠️ Inconsistencies found:');
          checkResult.inconsistencies.forEach((inc, index) => {
            console.log(`   ${index + 1}. [${inc.severity.toUpperCase()}] ${inc.type}: ${inc.description}`);
            if (inc.suggestedFix) {
              console.log(`      Suggested fix: ${inc.suggestedFix}`);
            }
          });
        }
        
        // Update consistency checker state
        const updatedConsistencyChecker = {
          ...state.consistencyChecker,
          lastCheck: new Date().toISOString(),
          checkHistory: [...state.consistencyChecker.checkHistory, checkResult].slice(-10), // Keep last 10 checks
        };
        
        // If revision is needed, kick back to narrator
        if (checkResult.needsRevision) {
          console.log('🔄 Kicking back to narrator for revision...');
          console.log(`   Reason: ${checkResult.revisionReason}`);
          
          return {
            nodeHistory: [...state.nodeHistory, GRAPH_CONFIG.NODES.FINALIZE],
            consistencyChecker: updatedConsistencyChecker,
            narratorState: {
              ...state.narratorState,
              nextAction: 'continue_narrative', // Force narrator to continue
              decisionReasoning: `Consistency check failed: ${checkResult.revisionReason}. Please revise the narrative to address the inconsistencies.`,
            },
            // Add consistency issues to error log
            errorLog: [...state.errorLog, {
              id: `consistency_${Date.now()}`,
              message: `Consistency check failed: ${checkResult.revisionReason}`,
              timestamp: new Date().toISOString(),
              resolved: false,
            }],
          };
        } else {
          console.log('✅ Consistency check passed - proceeding with finalization');
          
          return {
            nodeHistory: [...state.nodeHistory, GRAPH_CONFIG.NODES.FINALIZE],
            consistencyChecker: updatedConsistencyChecker,
          };
        }
      } else {
        console.log('⏭️ Consistency checker disabled - skipping check');
        
        return {
          nodeHistory: [...state.nodeHistory, GRAPH_CONFIG.NODES.FINALIZE],
        };
      }
    };
  }

  /**
   * Route decision
   */
  private routeDecision(state: GameState): string {
    const action = state.narratorState.nextAction;
    console.log('🔀 Routing decision:', action);
    
    // Ensure we always return a valid route
    if (action === 'continue_narrative') {
      return GRAPH_CONFIG.ACTIONS.CONTINUE_NARRATIVE;
    } else if (action === 'handoff_to_specialist') {
      return GRAPH_CONFIG.ACTIONS.HANDOFF_TO_SPECIALIST;
    } else {
      // Default fallback
      console.log('⚠️ Unknown action, defaulting to continue_narrative');
      return GRAPH_CONFIG.ACTIONS.CONTINUE_NARRATIVE;
    }
  }

  /**
   * Process user input
   */
  async processUserInput(userInput: string, threadId: string = 'default'): Promise<GameState> {
    const initialState: Partial<GameState> = {
      narratorState: {
        userInput,
        currentNarrative: "",
        narrativeHistory: [],
        nextAction: 'continue_narrative',
        specialistType: null,
        specialistResult: "",
        decisionReasoning: "",
        nodeHistory: [],
        narrativeCache: createEmptyNarrativeCache(),
        recentlyIntroduced: [],
        storyPhase: 'setup',
        narrativeContext: "",
        messages: [],
      },
      playerLocation: 'unknown',
      gamePhase: 'active',
    };

    const result = await this.compiledGraph.invoke(initialState, {
      configurable: { thread_id: threadId }
    });

    return result;
  }

  /**
   * Get current game state
   */
  async getGameState(threadId: string = 'default'): Promise<GameState | null> {
    try {
      const state = await this.compiledGraph.getState({
        configurable: { thread_id: threadId }
      });
      return state.values;
    } catch (error) {
      console.error('Error getting game state:', error);
      return null;
    }
  }

  /**
   * Add item to inventory
   */
  async addInventoryItem(item: Omit<InventoryItem, 'acquiredAt'>, threadId: string = 'default'): Promise<void> {
    const currentState = await this.getGameState(threadId);
    if (!currentState) return;

    const updatedInventory = addInventoryItem(currentState.playerInventory, item);
    
    await this.compiledGraph.updateState({
      configurable: { thread_id: threadId }
    }, {
      playerInventory: updatedInventory,
    });
  }

  /**
   * Update player stats
   */
  async updatePlayerStats(updates: Partial<PlayerStats>, threadId: string = 'default'): Promise<void> {
    const currentState = await this.getGameState(threadId);
    if (!currentState) return;

    const updatedStats = updatePlayerStats(currentState.playerStats, updates);
    
    await this.compiledGraph.updateState({
      configurable: { thread_id: threadId }
    }, {
      playerStats: updatedStats,
    });
  }

  /**
   * Add world event
   */
  async addWorldEvent(event: Omit<WorldState['worldEvents'][0], 'id' | 'occurredAt'>, threadId: string = 'default'): Promise<void> {
    const currentState = await this.getGameState(threadId);
    if (!currentState) return;

    const updatedWorldState = addWorldEvent(currentState.worldState, event);
    
    await this.compiledGraph.updateState({
      configurable: { thread_id: threadId }
    }, {
      worldState: updatedWorldState,
    });
  }

  /**
   * Route specialist handoff
   */
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

  /**
   * Create handoff node
   */
  private createHandoffNode(): (state: GameState) => Promise<Partial<GameState>> {
    return async (state: GameState): Promise<Partial<GameState>> => {
      console.log(`🔄 Handing off to ${state.narratorState.specialistType} specialist...`);
      
      return {
        nodeHistory: [...state.nodeHistory, GRAPH_CONFIG.NODES.HANDOFF_TO_SPECIALIST],
      };
    };
  }

  /**
   * Create search specialist node
   */
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

  /**
   * Create character specialist node
   */
  private createCharacterSpecialistNode(): (state: GameState) => Promise<Partial<GameState>> {
    return async (state: GameState): Promise<Partial<GameState>> => {
      console.log('👤 Character specialist working...');
      
      const selector = new NarrativeSelector(state.narratorState.narrativeCache);
      const narrativeContext = selector.getAbbreviatedContext(state.narratorState.currentNarrative, 10);
      
      const prompt = PROMPTS.SPECIALIST_HANDOFF
        .replace('{specialist_type}', 'character development')
        .replace('{story_time_elapsed}', state.storyTimeElapsed.toFixed(1))
        .replace('{player_level}', state.playerStats.level.toString())
        .replace('{current_location}', state.playerLocation)
        .replace('{narrative_context}', narrativeContext)
        .replace('{user_input}', state.narratorState.userInput);

      const response = await this.characterModel.invoke([
        new SystemMessage(prompt),
        new HumanMessage(state.narratorState.userInput)
      ]);

      return {
        narratorState: {
          ...state.narratorState,
          specialistResult: response.content as string,
        },
        nodeHistory: [...state.nodeHistory, GRAPH_CONFIG.NODES.CHARACTER_SPECIALIST],
      };
    };
  }

  /**
   * Create world building specialist node
   */
  private createWorldBuildingSpecialistNode(): (state: GameState) => Promise<Partial<GameState>> {
    return async (state: GameState): Promise<Partial<GameState>> => {
      console.log('🏰 World building specialist working...');
      
      const selector = new NarrativeSelector(state.narratorState.narrativeCache);
      const narrativeContext = selector.getAbbreviatedContext(state.narratorState.currentNarrative, 10);
      
      const prompt = PROMPTS.SPECIALIST_HANDOFF
        .replace('{specialist_type}', 'world building')
        .replace('{story_time_elapsed}', state.storyTimeElapsed.toFixed(1))
        .replace('{player_level}', state.playerStats.level.toString())
        .replace('{current_location}', state.playerLocation)
        .replace('{narrative_context}', narrativeContext)
        .replace('{user_input}', state.narratorState.userInput);

      const response = await this.worldBuildingModel.invoke([
        new SystemMessage(prompt),
        new HumanMessage(state.narratorState.userInput)
      ]);

      return {
        narratorState: {
          ...state.narratorState,
          specialistResult: response.content as string,
        },
        nodeHistory: [...state.nodeHistory, GRAPH_CONFIG.NODES.WORLD_BUILDING_SPECIALIST],
      };
    };
  }

  /**
   * Create dialogue specialist node
   */
  private createDialogueSpecialistNode(): (state: GameState) => Promise<Partial<GameState>> {
    return async (state: GameState): Promise<Partial<GameState>> => {
      console.log('💬 Dialogue specialist working...');
      
      const selector = new NarrativeSelector(state.narratorState.narrativeCache);
      const narrativeContext = selector.getAbbreviatedContext(state.narratorState.currentNarrative, 10);
      
      const prompt = PROMPTS.SPECIALIST_HANDOFF
        .replace('{specialist_type}', 'dialogue')
        .replace('{story_time_elapsed}', state.storyTimeElapsed.toFixed(1))
        .replace('{player_level}', state.playerStats.level.toString())
        .replace('{current_location}', state.playerLocation)
        .replace('{narrative_context}', narrativeContext)
        .replace('{user_input}', state.narratorState.userInput);

      const response = await this.dialogueModel.invoke([
        new SystemMessage(prompt),
        new HumanMessage(state.narratorState.userInput)
      ]);

      return {
        narratorState: {
          ...state.narratorState,
          specialistResult: response.content as string,
        },
        nodeHistory: [...state.nodeHistory, GRAPH_CONFIG.NODES.DIALOGUE_SPECIALIST],
      };
    };
  }
}
