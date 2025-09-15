H/**
 * NARRATOR AGENT WITH PERSISTENT NARRATIVE CACHE
 * ==============================================
 * 
 * Enhanced narrator agent that integrates the narrative cache system
 * with LangGraph's persistent state management (MemorySaver).
 * 
 * This ensures the narrative cache is automatically saved and restored
 * across conversation sessions.
 */

import { StateGraph, Annotation, END } from "@langchain/langgraph";
import { MessagesAnnotation } from "@langchain/langgraph";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { MemorySaver } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { type Runnable } from "@langchain/core/runnables";
import { type BaseLanguageModelInput } from "@langchain/core/language_models/base";
import { z } from "zod";
import * as dotenv from "dotenv";

// Import the narrative cache system
import { 
  NarrativeElementCache, 
  NarrativeSelector, 
  createEmptyNarrativeCache,
  updateElementStatus,
  mergeNarrativeCache,
  type NarrativeElement,
  type CharacterElement,
  type LocationElement,
  type PlotTwistElement
} from './narrative-cache';

// Load environment variables
dotenv.config();

// ============================================================================
// ENHANCED NARRATOR STATE WITH PERSISTENT CACHE
// ============================================================================

/**
 * Enhanced narrator state that includes persistent narrative cache
 * 
 * This state is automatically persisted by LangGraph's MemorySaver,
 * ensuring the narrative cache survives across conversation sessions.
 */
export const EnhancedNarratorStateAnnotation = Annotation.Root({
  // Inherit standard message handling
  ...MessagesAnnotation.spec,
  
  // Current narrative content
  currentNarrative: Annotation<string>({
    reducer: (existing: string, updates: string) => updates || existing,
    default: () => "",
  }),
  
  // Narrative history for context
  narrativeHistory: Annotation<Array<{ id: string; content: string; timestamp: string }>>({
    reducer: (existing: Array<{ id: string; content: string; timestamp: string }>, updates: Array<{ id: string; content: string; timestamp: string }>) => {
      if (Array.isArray(updates)) {
        return [...existing, ...updates];
      }
      return existing;
    },
    default: () => [],
  }),
  
  // User input
  userInput: Annotation<string>({
    reducer: (existing: string, updates: string) => updates || existing,
    default: () => "",
  }),
  
  // Decision state
  nextAction: Annotation<'continue_narrative' | 'handoff_to_specialist'>({
    reducer: (existing: 'continue_narrative' | 'handoff_to_specialist', updates: 'continue_narrative' | 'handoff_to_specialist') => updates || existing,
    default: () => 'continue_narrative',
  }),
  
  // Specialist information
  specialistType: Annotation<'search' | 'character' | 'world_building' | 'dialogue' | null>({
    reducer: (existing: 'search' | 'character' | 'world_building' | 'dialogue' | null, updates: 'search' | 'character' | 'world_building' | 'dialogue' | null) => updates || existing,
    default: () => null,
  }),
  
  // Specialist result
  specialistResult: Annotation<string>({
    reducer: (existing: string, updates: string) => updates || existing,
    default: () => "",
  }),
  
  // Decision reasoning
  decisionReasoning: Annotation<string>({
    reducer: (existing: string, updates: string) => updates || existing,
    default: () => "",
  }),
  
  // Node history for debugging
  nodeHistory: Annotation<string[]>({
    reducer: (existing: string[], updates: string[]) => {
      if (Array.isArray(updates)) {
        return [...existing, ...updates];
      }
      return existing;
    },
    default: () => [],
  }),
  
  // ============================================================================
  // PERSISTENT NARRATIVE CACHE - AUTOMATICALLY SAVED/RESTORED
  // ============================================================================
  
  /**
   * Narrative element cache - automatically persisted by LangGraph
   * 
   * This cache survives across conversation sessions and is automatically
   * saved/restored by the MemorySaver checkpointer.
   */
  narrativeCache: Annotation<NarrativeElementCache>({
    reducer: (existing: NarrativeElementCache, updates: NarrativeElementCache) => {
      // Use intelligent merge to combine cache updates
      return mergeNarrativeCache(existing, updates);
    },
    default: () => createEmptyNarrativeCache(),
  }),
  
  /**
   * Recently introduced elements for continuity
   * 
   * Tracks elements introduced in recent turns for better context.
   */
  recentlyIntroduced: Annotation<string[]>({
    reducer: (existing: string[], updates: string[]) => {
      if (Array.isArray(updates)) {
        // Keep only the last 10 recently introduced elements
        return [...existing, ...updates].slice(-10);
      }
      return existing;
    },
    default: () => [],
  }),
  
  /**
   * Current story phase for context-aware element selection
   */
  storyPhase: Annotation<'setup' | 'development' | 'climax' | 'resolution'>({
    reducer: (existing: 'setup' | 'development' | 'climax' | 'resolution', updates: 'setup' | 'development' | 'climax' | 'resolution') => updates || existing,
    default: () => 'setup',
  }),
  
  /**
   * Narrative context for prompts (abbreviated)
   * 
   * This is generated from the cache and used in prompts.
   */
  narrativeContext: Annotation<string>({
    reducer: (existing: string, updates: string) => updates || existing,
    default: () => "",
  }),
});

export type EnhancedNarratorState = typeof EnhancedNarratorStateAnnotation.State;

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
    TOP_P: 0.8,
    FREQUENCY_PENALTY: 0.1,
  },
  
  DECISION: {
    TEMPERATURE: 0.2,
    MAX_TOKENS: 200,
    TOP_P: 0.7,
  },
};

const GRAPH_CONFIG = {
  NODES: {
    NARRATOR_DECISION: "narrator_decision",
    CONTINUE_NARRATIVE: "continue_narrative",
    SPECIALIST_HANDOFF: "specialist_handoff",
    SEARCH_SPECIALIST: "search_specialist",
    CHARACTER_SPECIALIST: "character_specialist",
    WORLD_BUILDING_SPECIALIST: "world_building_specialist",
    DIALOGUE_SPECIALIST: "dialogue_specialist",
    FINALIZE: "finalize",
  },
  
  ACTIONS: {
    CONTINUE_NARRATIVE: "continue_narrative",
    HANDOFF_TO_SPECIALIST: "handoff_to_specialist",
  },
  
  SPECIALIST_TYPES: {
    SEARCH: "search",
    CHARACTER: "character",
    WORLD_BUILDING: "world_building",
    DIALOGUE: "dialogue",
  },
};

// ============================================================================
// ENHANCED NARRATOR AGENT WITH PERSISTENT CACHE
// ============================================================================

export class PersistentCacheNarratorAgent {
  private narratorModel: ChatOpenAI;
  private decisionModel: Runnable<BaseLanguageModelInput, NarratorDecision>;
  private checkpointer: MemorySaver;
  private compiledGraph: any; // CompiledStateGraph type
  private selector: NarrativeSelector;

  constructor() {
    // Initialize models
    this.initializeModels();
    
    // Initialize checkpointer for conversation persistence
    this.checkpointer = new MemorySaver();
    
    // Create and compile the graph
    const graph = this.createGraph();
    this.compiledGraph = graph.compile({
      checkpointer: this.checkpointer,
    });
  }

  /**
   * Initialize story with narrative elements
   * 
   * This will be persisted automatically by LangGraph's MemorySaver.
   */
  async initializeStory(genre: string, tone: string, threadId: string): Promise<void> {
    const initialCache = this.generateInitialStoryElements(genre, tone);
    
    // Create initial state with cache
    const initialState: Partial<EnhancedNarratorState> = {
      narrativeCache: initialCache,
      storyPhase: 'setup',
      narrativeContext: "",
      recentlyIntroduced: [],
    };
    
    // Save initial state to checkpointer
    await this.compiledGraph.updateState({
      configurable: { thread_id: threadId }
    }, initialState);
    
    // Initialize selector
    this.selector = new NarrativeSelector(initialCache);
  }

  /**
   * Process conversation with persistent cache
   */
  async processConversation(
    userInput: string, 
    threadId: string
  ): Promise<{
    response: string;
    introducedElements: string[];
    cache: NarrativeElementCache;
  }> {
    // Get current state from checkpointer
    const currentState = await this.compiledGraph.getState({
      configurable: { thread_id: threadId }
    });
    
    if (!currentState.values) {
      throw new Error("No conversation state found. Please initialize story first.");
    }
    
    const state = currentState.values as EnhancedNarratorState;
    
    // Initialize selector with current cache
    this.selector = new NarrativeSelector(state.narrativeCache);
    
    // Update state with user input
    await this.compiledGraph.updateState({
      configurable: { thread_id: threadId }
    }, {
      userInput,
    });
    
    // Process the conversation
    const result = await this.compiledGraph.invoke({}, {
      configurable: { thread_id: threadId }
    });
    
    // Extract introduced elements and update cache
    const introducedElements = this.extractIntroducedElements(result, state.narrativeCache);
    
    // Update cache with introduced elements
    let updatedCache = state.narrativeCache;
    for (const elementId of introducedElements) {
      updatedCache = updateElementStatus(updatedCache, elementId, 'introduced');
    }
    
    // Update recently introduced
    const recentlyIntroduced = [...state.recentlyIntroduced, ...introducedElements].slice(-10);
    
    // Save updated cache back to checkpointer
    await this.compiledGraph.updateState({
      configurable: { thread_id: threadId }
    }, {
      narrativeCache: updatedCache,
      recentlyIntroduced,
      narrativeContext: this.selector.getAbbreviatedContext(result.currentNarrative || "", 10),
    });
    
    return {
      response: result.currentNarrative || "",
      introducedElements,
      cache: updatedCache,
    };
  }

  /**
   * Get current narrative cache
   */
  async getNarrativeCache(threadId: string): Promise<NarrativeElementCache> {
    const state = await this.compiledGraph.getState({
      configurable: { thread_id: threadId }
    });
    return state.values?.narrativeCache || createEmptyNarrativeCache();
  }

  /**
   * Update narrative cache manually
   */
  async updateNarrativeCache(
    threadId: string, 
    updates: Partial<NarrativeElementCache>
  ): Promise<void> {
    const currentState = await this.compiledGraph.getState({
      configurable: { thread_id: threadId }
    });
    const currentCache = currentState.values?.narrativeCache || createEmptyNarrativeCache();
    
    const updatedCache = mergeNarrativeCache(currentCache, updates);
    
    await this.compiledGraph.updateState({
      configurable: { thread_id: threadId }
    }, {
      narrativeCache: updatedCache,
    });
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

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
    });

    // Decision model with structured output
    const decisionModel = new ChatOpenAI({
      model: MODEL_CONFIG.MODEL,
      apiKey: MODEL_CONFIG.API_KEY,
      configuration: { baseURL: MODEL_CONFIG.BASE_URL },
      temperature: MODEL_CONFIG.DECISION.TEMPERATURE,
      maxTokens: MODEL_CONFIG.DECISION.MAX_TOKENS,
      topP: MODEL_CONFIG.DECISION.TOP_P,
    });

    this.decisionModel = decisionModel.withStructuredOutput(NarratorDecisionSchema);
  }

  private createGraph(): StateGraph<EnhancedNarratorState, Partial<EnhancedNarratorState>> {
    return new StateGraph(EnhancedNarratorStateAnnotation)
      .addNode(GRAPH_CONFIG.NODES.NARRATOR_DECISION, this.createNarratorDecisionNode())
      .addNode(GRAPH_CONFIG.NODES.CONTINUE_NARRATIVE, this.createNarrativeNode())
      .addNode(GRAPH_CONFIG.NODES.SPECIALIST_HANDOFF, this.createSpecialistHandoffNode())
      .addNode(GRAPH_CONFIG.NODES.SEARCH_SPECIALIST, this.createSearchSpecialistNode())
      .addNode(GRAPH_CONFIG.NODES.CHARACTER_SPECIALIST, this.createCharacterSpecialistNode())
      .addNode(GRAPH_CONFIG.NODES.WORLD_BUILDING_SPECIALIST, this.createWorldBuildingSpecialistNode())
      .addNode(GRAPH_CONFIG.NODES.DIALOGUE_SPECIALIST, this.createDialogueSpecialistNode())
      .addNode(GRAPH_CONFIG.NODES.FINALIZE, this.createFinalizeNode())
      
      // Main flow
      .addEdge("__start__", GRAPH_CONFIG.NODES.NARRATOR_DECISION)
      .addConditionalEdges(GRAPH_CONFIG.NODES.NARRATOR_DECISION, this.routeNarratorDecision.bind(this), {
        [GRAPH_CONFIG.ACTIONS.CONTINUE_NARRATIVE]: GRAPH_CONFIG.NODES.CONTINUE_NARRATIVE,
        [GRAPH_CONFIG.ACTIONS.HANDOFF_TO_SPECIALIST]: GRAPH_CONFIG.NODES.SPECIALIST_HANDOFF,
      })
      .addEdge(GRAPH_CONFIG.NODES.CONTINUE_NARRATIVE, GRAPH_CONFIG.NODES.FINALIZE)
      
      // Specialist routing
      .addConditionalEdges(GRAPH_CONFIG.NODES.SPECIALIST_HANDOFF, this.routeSpecialist.bind(this), {
        [GRAPH_CONFIG.SPECIALIST_TYPES.SEARCH]: GRAPH_CONFIG.NODES.SEARCH_SPECIALIST,
        [GRAPH_CONFIG.SPECIALIST_TYPES.CHARACTER]: GRAPH_CONFIG.NODES.CHARACTER_SPECIALIST,
        [GRAPH_CONFIG.SPECIALIST_TYPES.WORLD_BUILDING]: GRAPH_CONFIG.NODES.WORLD_BUILDING_SPECIALIST,
        [GRAPH_CONFIG.SPECIALIST_TYPES.DIALOGUE]: GRAPH_CONFIG.NODES.DIALOGUE_SPECIALIST,
      })
      
      // Enhanced: Specialists can choose next action
      .addConditionalEdges(GRAPH_CONFIG.NODES.SEARCH_SPECIALIST, this.routeAfterSpecialist.bind(this), {
        [GRAPH_CONFIG.ACTIONS.CONTINUE_NARRATIVE]: GRAPH_CONFIG.NODES.CONTINUE_NARRATIVE,
        [GRAPH_CONFIG.ACTIONS.HANDOFF_TO_SPECIALIST]: GRAPH_CONFIG.NODES.SPECIALIST_HANDOFF,
        "finalize": GRAPH_CONFIG.NODES.FINALIZE,
      })
      .addConditionalEdges(GRAPH_CONFIG.NODES.CHARACTER_SPECIALIST, this.routeAfterSpecialist.bind(this), {
        [GRAPH_CONFIG.ACTIONS.CONTINUE_NARRATIVE]: GRAPH_CONFIG.NODES.CONTINUE_NARRATIVE,
        [GRAPH_CONFIG.ACTIONS.HANDOFF_TO_SPECIALIST]: GRAPH_CONFIG.NODES.SPECIALIST_HANDOFF,
        "finalize": GRAPH_CONFIG.NODES.FINALIZE,
      })
      .addConditionalEdges(GRAPH_CONFIG.NODES.WORLD_BUILDING_SPECIALIST, this.routeAfterSpecialist.bind(this), {
        [GRAPH_CONFIG.ACTIONS.CONTINUE_NARRATIVE]: GRAPH_CONFIG.NODES.CONTINUE_NARRATIVE,
        [GRAPH_CONFIG.ACTIONS.HANDOFF_TO_SPECIALIST]: GRAPH_CONFIG.NODES.SPECIALIST_HANDOFF,
        "finalize": GRAPH_CONFIG.NODES.FINALIZE,
      })
      .addConditionalEdges(GRAPH_CONFIG.NODES.DIALOGUE_SPECIALIST, this.routeAfterSpecialist.bind(this), {
        [GRAPH_CONFIG.ACTIONS.CONTINUE_NARRATIVE]: GRAPH_CONFIG.NODES.CONTINUE_NARRATIVE,
        [GRAPH_CONFIG.ACTIONS.HANDOFF_TO_SPECIALIST]: GRAPH_CONFIG.NODES.SPECIALIST_HANDOFF,
        "finalize": GRAPH_CONFIG.NODES.FINALIZE,
      })
      
      .addEdge(GRAPH_CONFIG.NODES.FINALIZE, END);
  }

  private createNarratorDecisionNode(): (state: EnhancedNarratorState) => Promise<Partial<EnhancedNarratorState>> {
    return async (state: EnhancedNarratorState): Promise<Partial<EnhancedNarratorState>> => {
      console.log("Narrator Decision: Analyzing user input...");
      
      // Get intelligent context from cache
      const context = this.selector.getAbbreviatedContext(state.currentNarrative || "", 10);
      
      const prompt = `You are a skilled narrator deciding how to continue the story.

CURRENT NARRATIVE:
${state.currentNarrative || "Beginning of story"}

NARRATIVE CONTEXT:
${context}

USER INPUT:
${state.userInput}

Decide whether to:
1. continue_narrative - Continue telling the story directly
2. handoff_to_specialist - Hand off to a specialist for specific development

Choose the most appropriate action and specialist type if needed.`;

      const decision = await this.decisionModel.invoke([
        new SystemMessage(prompt),
        new HumanMessage(state.userInput)
      ]);

      console.log(`Narrator Decision: ${decision.action} (confidence: ${decision.confidence})`);

      return {
        nextAction: decision.action,
        specialistType: decision.specialist_type,
        decisionReasoning: decision.reasoning,
        nodeHistory: [...state.nodeHistory, GRAPH_CONFIG.NODES.NARRATOR_DECISION],
      };
    };
  }

  private createNarrativeNode(): (state: EnhancedNarratorState) => Promise<Partial<EnhancedNarratorState>> {
    return async (state: EnhancedNarratorState): Promise<Partial<EnhancedNarratorState>> => {
      console.log("Narrator: Continuing narrative...");
      
      // Get intelligent context from cache
      const context = this.selector.getAbbreviatedContext(state.currentNarrative || "", 10);
      
      // Get elements ready for introduction
      const readyElements = this.selector.getReadyForIntroduction({}, 5);
      
      // Get foreshadowing opportunities
      const foreshadowing = this.selector.getForeshadowingOpportunities(state.currentNarrative || "");
      
      const specialistInfo = state.specialistResult ? `Use this specialist information: ${state.specialistResult}` : '';
      
      const prompt = `You are a skilled narrator telling an engaging story.

CURRENT NARRATIVE:
${state.currentNarrative || "Beginning of story"}

NARRATIVE CONTEXT:
${context}

AVAILABLE ELEMENTS FOR INTRODUCTION:
${readyElements.map(el => `- ${el.name}: ${el.description}`).join('\n')}

FORESHADOWING OPPORTUNITIES:
${foreshadowing.map(f => `- ${f.hint}`).join('\n')}

SPECIALIST INFORMATION:
${specialistInfo}

USER INPUT:
${state.userInput}

Continue the narrative based on the user's input. You may introduce available elements naturally when appropriate. Use foreshadowing opportunities to plant subtle clues. Be creative, engaging, and maintain narrative flow.`;

      const response = await this.narratorModel.invoke([
        new SystemMessage(prompt),
        new HumanMessage(state.userInput)
      ]);
      
      const narrativeContent = response.content as string;
      
      // Add to narrative history
      const narrativeEntry = {
        id: `narrative_${Date.now()}`,
        content: narrativeContent,
        timestamp: new Date().toISOString(),
      };
      
      return {
        currentNarrative: narrativeContent,
        narrativeHistory: [...state.narrativeHistory, narrativeEntry],
        nodeHistory: [...state.nodeHistory, GRAPH_CONFIG.NODES.CONTINUE_NARRATIVE],
        specialistResult: "", // Clear specialist result after use
      };
    };
  }

  private createSpecialistHandoffNode(): (state: EnhancedNarratorState) => Promise<Partial<EnhancedNarratorState>> {
    return async (state: EnhancedNarratorState): Promise<Partial<EnhancedNarratorState>> => {
      console.log(`Specialist Handoff: Routing to ${state.specialistType} specialist...`);
      
      return {
        nodeHistory: [...state.nodeHistory, GRAPH_CONFIG.NODES.SPECIALIST_HANDOFF],
      };
    };
  }

  private createSearchSpecialistNode(): (state: EnhancedNarratorState) => Promise<Partial<EnhancedNarratorState>> {
    return async (state: EnhancedNarratorState): Promise<Partial<EnhancedNarratorState>> => {
      console.log("Search Specialist: Processing search request...");
      
      const response = await this.narratorModel.invoke([
        new SystemMessage("You are a research specialist. Provide factual information and context."),
        new HumanMessage(`Research: ${state.userInput}`)
      ]);

      return {
        specialistResult: response.content as string,
        nextAction: GRAPH_CONFIG.ACTIONS.CONTINUE_NARRATIVE,
        nodeHistory: [...state.nodeHistory, GRAPH_CONFIG.NODES.SEARCH_SPECIALIST],
      };
    };
  }

  private createCharacterSpecialistNode(): (state: EnhancedNarratorState) => Promise<Partial<EnhancedNarratorState>> {
    return async (state: EnhancedNarratorState): Promise<Partial<EnhancedNarratorState>> => {
      console.log("Character Specialist: Developing character...");
      
      const response = await this.narratorModel.invoke([
        new SystemMessage("You are a character development specialist. Create rich, detailed characters."),
        new HumanMessage(`Develop character: ${state.userInput}`)
      ]);

      return {
        specialistResult: response.content as string,
        nextAction: GRAPH_CONFIG.ACTIONS.CONTINUE_NARRATIVE,
        nodeHistory: [...state.nodeHistory, GRAPH_CONFIG.NODES.CHARACTER_SPECIALIST],
      };
    };
  }

  private createWorldBuildingSpecialistNode(): (state: EnhancedNarratorState) => Promise<Partial<EnhancedNarratorState>> {
    return async (state: EnhancedNarratorState): Promise<Partial<EnhancedNarratorState>> => {
      console.log("World Building Specialist: Creating world details...");
      
      const response = await this.narratorModel.invoke([
        new SystemMessage("You are a world-building specialist. Create rich, immersive settings."),
        new HumanMessage(`Build world: ${state.userInput}`)
      ]);

      return {
        specialistResult: response.content as string,
        nextAction: GRAPH_CONFIG.ACTIONS.CONTINUE_NARRATIVE,
        nodeHistory: [...state.nodeHistory, GRAPH_CONFIG.NODES.WORLD_BUILDING_SPECIALIST],
      };
    };
  }

  private createDialogueSpecialistNode(): (state: EnhancedNarratorState) => Promise<Partial<EnhancedNarratorState>> {
    return async (state: EnhancedNarratorState): Promise<Partial<EnhancedNarratorState>> => {
      console.log("Dialogue Specialist: Writing conversations...");
      
      const response = await this.narratorModel.invoke([
        new SystemMessage("You are a dialogue specialist. Write natural, engaging conversations."),
        new HumanMessage(`Write dialogue: ${state.userInput}`)
      ]);

      return {
        specialistResult: response.content as string,
        nextAction: GRAPH_CONFIG.ACTIONS.CONTINUE_NARRATIVE,
        nodeHistory: [...state.nodeHistory, GRAPH_CONFIG.NODES.DIALOGUE_SPECIALIST],
      };
    };
  }

  private createFinalizeNode(): (state: EnhancedNarratorState) => Promise<Partial<EnhancedNarratorState>> {
    return async (state: EnhancedNarratorState): Promise<Partial<EnhancedNarratorState>> => {
      console.log("Finalizing conversation...");
      
      return {
        nodeHistory: [...state.nodeHistory, GRAPH_CONFIG.NODES.FINALIZE],
      };
    };
  }

  private routeNarratorDecision(state: EnhancedNarratorState): string {
    return state.nextAction;
  }

  private routeSpecialist(state: EnhancedNarratorState): string {
    if (!state.specialistType) {
      throw new Error("No specialist type specified");
    }
    return state.specialistType;
  }

  private routeAfterSpecialist(state: EnhancedNarratorState): string {
    return state.nextAction || GRAPH_CONFIG.ACTIONS.CONTINUE_NARRATIVE;
  }

  private extractIntroducedElements(result: any, cache: NarrativeElementCache): string[] {
    const introduced: string[] = [];
    const content = result.currentNarrative || "";
    
    // Check all elements in cache for mentions
    const allElements = [
      ...cache.characters,
      ...cache.locations,
      ...cache.plotTwists,
      ...cache.objects,
      ...cache.themes,
    ];
    
    for (const element of allElements) {
      if (element.status === 'unmet' && content.toLowerCase().includes(element.name.toLowerCase())) {
        introduced.push(element.id);
      }
    }
    
    return introduced;
  }

  private generateInitialStoryElements(genre: string, tone: string): NarrativeElementCache {
    const cache = createEmptyNarrativeCache();
    
    // Set story metadata
    cache.cacheMetadata.storyGenre = genre;
    cache.cacheMetadata.storyTone = tone;
    cache.cacheMetadata.storyPhase = 'setup';
    
    // Generate basic elements based on genre
    if (genre === 'fantasy') {
      cache.characters.push({
        id: 'protagonist',
        name: 'The Hero',
        description: 'The main character of the story',
        type: 'character',
        status: 'introduced',
        importance: 10,
        tags: ['protagonist', 'hero'],
        createdAt: new Date().toISOString(),
        role: 'protagonist',
        introductionHints: [],
        relationships: [],
        personality: 'Determined and brave',
        motivation: 'To achieve their goal'
      });
      
      cache.locations.push({
        id: 'village',
        name: 'Hobbiton',
        description: 'A peaceful village where the story begins',
        type: 'location',
        status: 'introduced',
        importance: 7,
        tags: ['village', 'home', 'peaceful'],
        createdAt: new Date().toISOString(),
        locationType: 'setting',
        atmosphere: 'Cozy and peaceful',
        connectionTo: ['protagonist'],
        significance: 'The hero\'s home and starting point',
        accessibility: 'public'
      });
    }
    
    // Update metadata
    cache.cacheMetadata.totalElements = 
      cache.characters.length + 
      cache.locations.length + 
      cache.plotTwists.length + 
      cache.objects.length + 
      cache.themes.length;
    
    return cache;
  }
}

// ============================================================================
// DECISION SCHEMA
// ============================================================================

const NarratorDecisionSchema = z.object({
  action: z.enum(['continue_narrative', 'handoff_to_specialist']).describe('The action to take next'),
  specialist_type: z.enum(['search', 'character', 'world_building', 'dialogue']).nullable().describe('The type of specialist to hand off to, if applicable'),
  confidence: z.number().min(0).max(1).describe('Confidence in the decision (0-1)'),
  reasoning: z.string().describe('Brief explanation of the decision'),
});

type NarratorDecision = z.infer<typeof NarratorDecisionSchema>;
