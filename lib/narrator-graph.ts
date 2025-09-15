/**
 * Narrator Graph - LangGraph Implementation
 * 
 * A focused graph for narrative generation and story progression.
 * This demonstrates proper LangGraph patterns for a specific use case.
 */

import { StateGraph, END } from "@langchain/langgraph";
import { Annotation } from "@langchain/langgraph";

// ============================================================================
// Narrator State Annotation
// ============================================================================
export const NarratorStateAnnotation = Annotation.Root({
  // Core narrative state
  currentScene: Annotation<string>,
  sceneHistory: Annotation<Array<{ sceneId: string; timestamp: string; content: string }>>,
  narrativeContext: Annotation<{
    tone: string;
    perspective: string;
    setting: string;
    characters: string[];
    mood: string;
  }>,
  
  // Story progression
  storyBeat: Annotation<{
    currentBeat: string;
    completedBeats: string[];
    nextBeat: string | null;
    tension: number;
    pacing: "slow" | "medium" | "fast";
  }>,
  
  // Content generation
  generatedContent: Annotation<{
    narration: string;
    dialogue: string;
    description: string;
    action: string;
  }>,
  
  // User interaction
  userInput: Annotation<string>,
  pendingResponse: Annotation<boolean>,
  
  // System state
  isGenerating: Annotation<boolean>,
  errors: Annotation<Array<{ id: string; message: string; timestamp: string; resolved: boolean }>>,
});

export type NarratorState = typeof NarratorStateAnnotation.State;

// ============================================================================
// Narrator Graph Implementation
// ============================================================================
export class NarratorGraph {
  private compiledGraph: any;

  constructor() {
    this.compiledGraph = this.createNarratorGraph();
  }

  /**
   * Create the narrator graph using LangGraph fluent builder pattern
   */
  private createNarratorGraph(): any {
    return new StateGraph(NarratorStateAnnotation)
      // Core narrative nodes
      .addNode("scene_setup", this.createSceneSetupNode())
      .addNode("narrative_generation", this.createNarrativeGenerationNode())
      .addNode("dialogue_generation", this.createDialogueGenerationNode())
      .addNode("description_generation", this.createDescriptionGenerationNode())
      .addNode("action_generation", this.createActionGenerationNode())
      
      // Story progression nodes
      .addNode("beat_analysis", this.createBeatAnalysisNode())
      .addNode("tension_adjustment", this.createTensionAdjustmentNode())
      .addNode("pacing_control", this.createPacingControlNode())
      
      // User interaction nodes
      .addNode("user_input_processing", this.createUserInputProcessingNode())
      .addNode("response_generation", this.createResponseGenerationNode())
      
      // System nodes
      .addNode("error_handling", this.createErrorHandlingNode())
      .addNode("content_validation", this.createContentValidationNode())
      
      // Graph edges - main flow
      .addEdge("__start__", "scene_setup")
      .addEdge("scene_setup", "beat_analysis")
      .addEdge("beat_analysis", "narrative_generation")
      
      // Conditional edges for content generation
      .addConditionalEdges("narrative_generation", this.shouldGenerateDialogue.bind(this), {
        "dialogue_generation": "dialogue_generation",
        "description_generation": "description_generation",
        "action_generation": "action_generation",
        "user_input_processing": "user_input_processing",
      })
      
      // Content flow
      .addConditionalEdges("dialogue_generation", this.afterDialogue.bind(this), {
        "tension_adjustment": "tension_adjustment",
        "content_validation": "content_validation",
      })
      
      .addConditionalEdges("description_generation", this.afterDescription.bind(this), {
        "tension_adjustment": "tension_adjustment",
        "content_validation": "content_validation",
      })
      
      .addConditionalEdges("action_generation", this.afterAction.bind(this), {
        "tension_adjustment": "tension_adjustment",
        "content_validation": "content_validation",
      })
      
      // Story progression flow
      .addConditionalEdges("tension_adjustment", this.afterTensionAdjustment.bind(this), {
        "pacing_control": "pacing_control",
        "content_validation": "content_validation",
      })
      
      .addConditionalEdges("pacing_control", this.afterPacingControl.bind(this), {
        "content_validation": "content_validation",
        "narrative_generation": "narrative_generation",
      })
      
      // User interaction flow
      .addConditionalEdges("user_input_processing", this.afterUserInput.bind(this), {
        "response_generation": "response_generation",
        "narrative_generation": "narrative_generation",
      })
      
      .addConditionalEdges("response_generation", this.afterResponse.bind(this), {
        "content_validation": "content_validation",
        "narrative_generation": "narrative_generation",
      })
      
      // Content validation flow
      .addConditionalEdges("content_validation", this.afterContentValidation.bind(this), {
        "narrative_generation": "narrative_generation",
        "error_handling": "error_handling",
        "end": END,
      })
      
      // Error handling flow
      .addConditionalEdges("error_handling", this.afterErrorHandling.bind(this), {
        "narrative_generation": "narrative_generation",
        "end": END,
      })
      
      .compile();
  }

  // ============================================================================
  // Node Functions
  // ============================================================================
  
  private createSceneSetupNode() {
    return async (state: NarratorState): Promise<Partial<NarratorState>> => {
      console.log("Setting up scene...");
      
      return {
        currentScene: `scene_${Date.now()}`,
        sceneHistory: [
          ...state.sceneHistory,
          {
            sceneId: `scene_${Date.now()}`,
            timestamp: new Date().toISOString(),
            content: "Scene initialized",
          },
        ],
        narrativeContext: {
          ...state.narrativeContext,
          tone: state.narrativeContext.tone || "neutral",
          perspective: state.narrativeContext.perspective || "third_person",
          setting: state.narrativeContext.setting || "unknown",
          characters: state.narrativeContext.characters || [],
          mood: state.narrativeContext.mood || "neutral",
        },
      };
    };
  }

  private createNarrativeGenerationNode() {
    return async (state: NarratorState): Promise<Partial<NarratorState>> => {
      console.log("Generating narrative...");
      
      // Simulate narrative generation
      const narration = `The scene unfolds in ${state.narrativeContext.setting}, where the ${state.narrativeContext.mood} atmosphere sets the tone for what's to come.`;
      
      return {
        generatedContent: {
          ...state.generatedContent,
          narration,
        },
        isGenerating: false,
      };
    };
  }

  private createDialogueGenerationNode() {
    return async (state: NarratorState): Promise<Partial<NarratorState>> => {
      console.log("Generating dialogue...");
      
      const dialogue = `"I see what you mean," said the character, their voice echoing in the ${state.narrativeContext.setting}.`;
      
      return {
        generatedContent: {
          ...state.generatedContent,
          dialogue,
        },
        isGenerating: false,
      };
    };
  }

  private createDescriptionGenerationNode() {
    return async (state: NarratorState): Promise<Partial<NarratorState>> => {
      console.log("Generating description...");
      
      const description = `The ${state.narrativeContext.setting} was filled with a ${state.narrativeContext.mood} energy that seemed to permeate everything.`;
      
      return {
        generatedContent: {
          ...state.generatedContent,
          description,
        },
        isGenerating: false,
      };
    };
  }

  private createActionGenerationNode() {
    return async (state: NarratorState): Promise<Partial<NarratorState>> => {
      console.log("Generating action...");
      
      const action = `The character moved through the ${state.narrativeContext.setting} with purpose, their actions reflecting the ${state.narrativeContext.mood} mood.`;
      
      return {
        generatedContent: {
          ...state.generatedContent,
          action,
        },
        isGenerating: false,
      };
    };
  }

  private createBeatAnalysisNode() {
    return async (state: NarratorState): Promise<Partial<NarratorState>> => {
      console.log("Analyzing story beat...");
      
      const currentBeat = state.storyBeat.currentBeat || "opening";
      const tension = state.storyBeat.tension || 0.5;
      
      return {
        storyBeat: {
          ...state.storyBeat,
          currentBeat,
          tension,
          pacing: tension > 0.7 ? "fast" : tension > 0.3 ? "medium" : "slow",
        },
      };
    };
  }

  private createTensionAdjustmentNode() {
    return async (state: NarratorState): Promise<Partial<NarratorState>> => {
      console.log("Adjusting tension...");
      
      const currentTension = state.storyBeat.tension || 0.5;
      const newTension = Math.min(1.0, currentTension + 0.1);
      
      return {
        storyBeat: {
          ...state.storyBeat,
          tension: newTension,
        },
      };
    };
  }

  private createPacingControlNode() {
    return async (state: NarratorState): Promise<Partial<NarratorState>> => {
      console.log("Controlling pacing...");
      
      const pacing = state.storyBeat.pacing || "medium";
      
      return {
        storyBeat: {
          ...state.storyBeat,
          pacing,
        },
      };
    };
  }

  private createUserInputProcessingNode() {
    return async (state: NarratorState): Promise<Partial<NarratorState>> => {
      console.log("Processing user input...");
      
      return {
        pendingResponse: true,
        isGenerating: true,
      };
    };
  }

  private createResponseGenerationNode() {
    return async (state: NarratorState): Promise<Partial<NarratorState>> => {
      console.log("Generating response...");
      
      const response = `In response to "${state.userInput}", the narrative continues...`;
      
      return {
        generatedContent: {
          ...state.generatedContent,
          narration: response,
        },
        pendingResponse: false,
        isGenerating: false,
      };
    };
  }

  private createErrorHandlingNode() {
    return async (state: NarratorState): Promise<Partial<NarratorState>> => {
      console.log("Handling errors...");
      
      return {
        errors: [
          ...state.errors,
          {
            id: `error_${Date.now()}`,
            message: "Error handled",
            timestamp: new Date().toISOString(),
            resolved: true,
          },
        ],
        isGenerating: false,
      };
    };
  }

  private createContentValidationNode() {
    return async (state: NarratorState): Promise<Partial<NarratorState>> => {
      console.log("Validating content...");
      
      const hasContent = state.generatedContent.narration || 
                        state.generatedContent.dialogue || 
                        state.generatedContent.description || 
                        state.generatedContent.action;
      
      if (!hasContent) {
        return {
          errors: [
            ...state.errors,
            {
              id: `error_${Date.now()}`,
              message: "No content generated",
              timestamp: new Date().toISOString(),
              resolved: false,
            },
          ],
        };
      }
      
      return {
        isGenerating: false,
      };
    };
  }

  // ============================================================================
  // Conditional Edge Functions
  // ============================================================================
  
  private shouldGenerateDialogue(state: NarratorState): string {
    if (state.pendingResponse) return "user_input_processing";
    if (state.storyBeat.tension > 0.7) return "action_generation";
    if (state.storyBeat.tension > 0.3) return "dialogue_generation";
    return "description_generation";
  }

  private afterDialogue(_state: NarratorState): string {
    return "content_validation";
  }

  private afterDescription(_state: NarratorState): string {
    return "content_validation";
  }

  private afterAction(_state: NarratorState): string {
    return "tension_adjustment";
  }

  private afterTensionAdjustment(state: NarratorState): string {
    if (state.storyBeat.pacing === "fast") return "content_validation";
    return "pacing_control";
  }

  private afterPacingControl(state: NarratorState): string {
    if (state.storyBeat.pacing === "slow") return "narrative_generation";
    return "content_validation";
  }

  private afterUserInput(state: NarratorState): string {
    if (state.userInput) return "response_generation";
    return "narrative_generation";
  }

  private afterResponse(_state: NarratorState): string {
    return "content_validation";
  }

  private afterContentValidation(state: NarratorState): string {
    if (state.errors.length > 0) return "error_handling";
    if (state.storyBeat.nextBeat) return "narrative_generation";
    return "end";
  }

  private afterErrorHandling(state: NarratorState): string {
    const lastError = state.errors[state.errors.length - 1];
    if (lastError?.resolved) return "narrative_generation";
    return "end";
  }

  // ============================================================================
  // Public API
  // ============================================================================
  
  /**
   * Execute the narrator graph with initial state
   */
  async execute(initialState: NarratorState): Promise<NarratorState> {
    console.log("Executing narrator graph...");
    const result = await this.compiledGraph.invoke(initialState);
    return result as NarratorState;
  }

  /**
   * Stream the narrator graph execution
   */
  async *stream(initialState: NarratorState): AsyncGenerator<NarratorState, void, unknown> {
    console.log("Streaming narrator graph...");
    const stream = this.compiledGraph.stream(initialState);
    
    for await (const chunk of stream) {
      yield chunk as NarratorState;
    }
  }

  /**
   * Get the current state of the graph
   */
  getState(): any {
    return this.compiledGraph;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a new narrator graph instance
 */
export function createNarratorGraph(): NarratorGraph {
  return new NarratorGraph();
}

// ============================================================================
// Example Usage
// ============================================================================

/**
 * Example of how to use the narrator graph
 */
export async function exampleNarratorUsage() {
  const narrator = createNarratorGraph();
  
  const initialState: NarratorState = {
    currentScene: "",
    sceneHistory: [],
    narrativeContext: {
      tone: "mysterious",
      perspective: "third_person",
      setting: "ancient library",
      characters: ["protagonist", "mysterious figure"],
      mood: "tense",
    },
    storyBeat: {
      currentBeat: "opening",
      completedBeats: [],
      nextBeat: "conflict",
      tension: 0.3,
      pacing: "medium",
    },
    generatedContent: {
      narration: "",
      dialogue: "",
      description: "",
      action: "",
    },
    userInput: "",
    pendingResponse: false,
    isGenerating: false,
    errors: [],
  };
  
  console.log("Starting narrator graph execution...");
  const result = await narrator.execute(initialState);
  console.log("Narrator graph completed:", result);
  
  return result;
}
