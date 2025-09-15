// ============================================================================
// DRAFT STREAMING STATE IMPLEMENTATION WITH REAL BACKEND - WORK IN PROGRESS
// ============================================================================
// 
// ⚠️  WARNING: This is a DRAFT implementation
// ⚠️  WARNING: This code is UNTESTED and may not work correctly
// ⚠️  WARNING: State management architecture is experimental
// ⚠️  WARNING: Error handling is incomplete
// ⚠️  WARNING: Type safety is not fully implemented
// 
// This file implements LangGraph best practices with REAL BACKEND INTEGRATION:
// - LangChain Messages for proper message handling
// - Native LangGraph streaming
// - Checkpointing system
// - Proper state reducers
// - Conditional edges and routing
// - Tool integration with real backend
// - Interrupt system
// 
// ============================================================================

import { StateGraph, Annotation, END, type StateGraph as StateGraphType } from "@langchain/langgraph";
import { MessagesAnnotation } from "@langchain/langgraph";
import { BaseMessage, HumanMessage, AIMessage } from "@langchain/core/messages";
import { MemorySaver } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { produce, Draft } from "immer";
import { EventEmitter } from "events";
import OpenAI from "openai";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

// ============================================================================
// REAL BACKEND INTEGRATION - WORK IN PROGRESS
// ============================================================================

export interface Prompt {
  system: string;
  user: string;
}

export type TokenCallback = (token: string, count: number) => void;

export interface Backend {
  getNarration(prompt: Prompt, onToken?: TokenCallback): Promise<string>;
  getObject<Schema extends z.ZodType, Type extends z.infer<Schema>>(
    prompt: Prompt,
    schema: Schema,
    onToken?: TokenCallback,
  ): Promise<Type>;
  abort(): void;
  isAbortError(error: unknown): boolean;
}

export class RealBackend implements Backend {
  private client: OpenAI;
  private controller = new AbortController();

  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || "",
      baseURL: process.env.OPENAI_API_URL || "https://api.openai.com/v1/",
      dangerouslyAllowBrowser: true,
    });
  }

  async *getResponseStream(prompt: Prompt, params: Record<string, unknown> = {}): AsyncGenerator<string> {
    try {
      const stream = await this.client.chat.completions.create(
        {
          stream: true,
          model: process.env.OPENAI_MODEL || "gpt-4",
          messages: [
            { role: "system", content: prompt.system },
            { role: "user", content: prompt.user },
          ],
          max_tokens: 1000,
          max_completion_tokens: 1000,
          ...params,
        },
        { signal: this.controller.signal },
      );

      for await (const chunk of stream) {
        if (chunk.choices.length === 0) {
          continue;
        }

        const delta = chunk.choices[0]?.delta;
        if (delta?.content) {
          yield delta.content;
        }
      }
    } catch (error) {
      if (this.isAbortError(error)) {
        // console.log("DRAFT: Stream aborted by user");
        return;
      }
      throw error;
    }
  }

  async getNarration(prompt: Prompt, onToken?: TokenCallback): Promise<string> {
    let fullResponse = "";
    let tokenCount = 0;

    try {
      for await (const token of this.getResponseStream(prompt)) {
        fullResponse += token;
        tokenCount++;
        
        if (onToken) {
          onToken(token, tokenCount);
        }
      }

      return fullResponse;
    } catch (error) {
      if (this.isAbortError(error)) {
        // console.log("DRAFT: Narration aborted by user");
        return fullResponse;
      }
      throw error;
    }
  }

  async getObject<Schema extends z.ZodType, Type extends z.infer<Schema>>(
    prompt: Prompt,
    schema: Schema,
    onToken?: TokenCallback,
  ): Promise<Type> {
    const response = await this.getNarration(prompt, onToken);
    
    try {
      // DRAFT: Parse JSON response - WORK IN PROGRESS
      const parsed = JSON.parse(response);
      return schema.parse(parsed);
    } catch (error) {
      console.error("DRAFT: Failed to parse response as JSON:", error);
      throw new Error(`DRAFT: Invalid JSON response: ${response}`);
    }
  }

  abort(): void {
    this.controller.abort();
  }

  isAbortError(error: unknown): boolean {
    return error instanceof Error && error.name === "AbortError";
  }
}

// ============================================================================
// DRAFT STATE ANNOTATIONS - WORK IN PROGRESS
// ============================================================================

/**
 * DRAFT: LangGraph State Annotation (Business Logic)
 * 
 * This extends MessagesAnnotation with custom conversation fields.
 * Uses LangChain messages for proper message handling.
 * 
 * ⚠️  WARNING: This is a DRAFT implementation
 */
export const ConversationStateAnnotation = Annotation.Root({
  // Inherit standard message handling from MessagesAnnotation
  ...MessagesAnnotation.spec,
  
  // Custom conversation fields
  currentNarrative: Annotation<string>({
    reducer: (existing: string, updates: string) => updates || existing,
    default: () => "",
  }),
  narrativeHistory: Annotation<Array<{ id: string; content: string; timestamp: string }>>({
    reducer: (existing: Array<{ id: string; content: string; timestamp: string }>, updates: Array<{ id: string; content: string; timestamp: string }>) => {
      if (Array.isArray(updates)) {
        return [...existing, ...updates];
      }
      return existing;
    },
    default: () => [],
  }),
  conversationId: Annotation<string>({
    reducer: (existing: string, updates: string) => updates || existing,
    default: () => `conv_${Date.now()}`,
  }),
  
  // Business logic state
  isGenerating: Annotation<boolean>({
    reducer: (existing: boolean, updates: boolean) => updates !== undefined ? updates : existing,
    default: () => false,
  }),
  errors: Annotation<Array<{ id: string; message: string; nodeId: string; timestamp: string; resolved: boolean }>>({
    reducer: (existing: Array<{ id: string; message: string; nodeId: string; timestamp: string; resolved: boolean }>, updates: Array<{ id: string; message: string; nodeId: string; timestamp: string; resolved: boolean }>) => {
      if (Array.isArray(updates)) {
        return [...existing, ...updates];
      }
      return existing;
    },
    default: () => [],
  }),
  
  // Flow control state
  currentNode: Annotation<string>({
    reducer: (existing: string, updates: string) => updates || existing,
    default: () => "",
  }),
  nodeHistory: Annotation<string[]>({
    reducer: (existing: string[], updates: string[]) => {
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
  
  // Tool calling state
  toolCalls: Annotation<Array<{ id: string; name: string; args: unknown; result?: unknown }>>({
    reducer: (existing: Array<{ id: string; name: string; args: unknown; result?: unknown }>, updates: Array<{ id: string; name: string; args: unknown; result?: unknown }>) => {
      if (Array.isArray(updates)) {
        return [...existing, ...updates];
      }
      return existing;
    },
    default: () => [],
  }),
  
  // Decision state for routing
  nextAction: Annotation<'continue' | 'use_tool' | 'end' | 'error'>({
    reducer: (existing: 'continue' | 'use_tool' | 'end' | 'error', updates: 'continue' | 'use_tool' | 'end' | 'error') => updates || existing,
    default: () => 'continue',
  }),
});

/**
 * DRAFT: UI State Interface (Real-time Updates)
 * 
 * This manages UI-specific state, real-time updates, and action tracking.
 * This is managed by Immer for high-frequency updates during streaming.
 * 
 * ⚠️  WARNING: This is a DRAFT implementation
 */
export interface UIState {
  // Real-time streaming properties
  streamingProperties: {
    currentGeneration: {
      id: string;
      content: string;
      startTime: string;
      endTime?: string;
      tokenCount: number;
      isComplete: boolean;
    };
    streamingProgress: number; // 0-100
  };
  
  // Action tracking (for debugging/monitoring)
  agentActions: Array<{
    id: string;
    actionType: 'node_start' | 'node_complete' | 'token_generated' | 'state_update' | 'error_handled' | 'persistence_save' | 'tool_call' | 'tool_result';
    nodeId?: string;
    timestamp: string;
    duration?: number; // milliseconds
    data: unknown;
    status: 'pending' | 'in_progress' | 'completed' | 'failed';
  }>;
  
  // Update history for debugging
  updateHistory: Array<{
    id: string;
    type: 'token' | 'state' | 'error' | 'action' | 'tool';
    timestamp: string;
    data: unknown;
  }>;
  
  // UI-specific state
  isVisible: boolean;
  scrollPosition: number;
  selectedMessage?: string;
  
  // Tool execution state
  activeTools: Array<{
    id: string;
    name: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    startTime: string;
    endTime?: string;
  }>;
}

/**
 * DRAFT: Synchronized State Interface
 * 
 * This combines both state systems for unified access.
 * 
 * ⚠️  WARNING: This is a DRAFT implementation
 */
export interface SynchronizedState {
  conversation: ConversationState;
  ui: UIState;
}

// Type aliases for clarity
export type ConversationState = typeof ConversationStateAnnotation.State;
export type StreamingChatState = ConversationState; // For backward compatibility

// ============================================================================
// REAL TOOLS WITH BACKEND INTEGRATION - WORK IN PROGRESS
// ============================================================================

/**
 * DRAFT: Create tools with real backend integration
 * 
 * ⚠️  WARNING: This is a DRAFT implementation
 */
function createToolsWithBackend(backend: Backend) {
  const narrativeTool = tool(async ({ prompt }: { prompt: string }) => {
    // DRAFT: Use real backend for narrative generation - WORK IN PROGRESS
    // console.log('DRAFT: Generating narrative with real backend for:', prompt);
    
    try {
      const response = await backend.getNarration({
        system: "You are a creative narrative generator. Create engaging, immersive stories based on user prompts.",
        user: prompt
      });
      
      return response;
    } catch (error) {
      console.error('DRAFT: Narrative generation failed:', error);
      return `Error generating narrative: ${(error as Error).message}`;
    }
  }, {
    name: "generate_narrative",
    description: "Generate narrative content based on user input using the real backend",
    schema: z.object({
      prompt: z.string().describe("The narrative prompt to generate content for"),
    }),
  });

  const searchTool = tool(async ({ query }: { query: string }) => {
    // DRAFT: Use real backend for search - WORK IN PROGRESS
    // console.log('DRAFT: Searching with real backend for:', query);
    
    try {
      const response = await backend.getNarration({
        system: "You are a helpful search assistant. Provide relevant information based on the user's query.",
        user: `Search for information about: ${query}`
      });
      
      return response;
    } catch (error) {
      console.error('DRAFT: Search failed:', error);
      return `Error searching: ${(error as Error).message}`;
    }
  }, {
    name: "search",
    description: "Search for information on a given topic using the real backend",
    schema: z.object({
      query: z.string().describe("The search query"),
    }),
  });

  return [narrativeTool, searchTool];
}

// ============================================================================
// DRAFT UI STATE MANAGER - WORK IN PROGRESS
// ============================================================================

/**
 * DRAFT: UI State Manager
 * 
 * This manages UI-specific state using Immer for real-time updates.
 * This is separate from LangGraph state management.
 * 
 * ⚠️  WARNING: This is a DRAFT implementation
 * ⚠️  WARNING: Error handling is incomplete
 * ⚠️  WARNING: Type safety is not fully implemented
 */
export class DraftUIStateManager {
  private state: Draft<UIState>;
  private eventEmitter: EventEmitter;
  private actionId: number = 0;
  private updateId: number = 0;
  private actionTimers: Map<string, number> = new Map();

  constructor(initialState: UIState, eventEmitter: EventEmitter) {
    this.state = produce(initialState, draft => draft);
    this.eventEmitter = eventEmitter;
  }

  /**
   * DRAFT: Get current UI state
   * 
   * ⚠️  WARNING: This is a DRAFT implementation
   */
  getCurrentState(): UIState {
    return this.state;
  }

  /**
   * DRAFT: Update UI state with Immer
   * 
   * This handles real-time UI updates during streaming.
   * 
   * ⚠️  WARNING: This is a DRAFT implementation
   * ⚠️  WARNING: Error handling is incomplete
   */
  updateUIState(updater: (draft: Draft<UIState>) => void): void {
    // DRAFT: Track state update start - WORK IN PROGRESS
    this.trackAction('state_update', 'in_progress', { type: 'ui_state_update' });
    
    try {
      // DRAFT: State update with Immer - WORK IN PROGRESS
      this.state = produce(this.state, (draft) => {
        updater(draft);
        
        // DRAFT: Add update tracking - WORK IN PROGRESS
        draft.updateHistory.push({
          id: `update_${this.updateId++}`,
          type: 'state',
          timestamp: new Date().toISOString(),
          data: { /* DRAFT: What data to track? */ }
        });
      });

      // DRAFT: Track state update completion - WORK IN PROGRESS
      this.trackAction('state_update', 'completed', { type: 'ui_state_update' });

      // DRAFT: Emit UI state change event - WORK IN PROGRESS
      this.eventEmitter.emit('uiStateChange', this.getCurrentState());
        
    } catch (error) {
      // DRAFT: Track state update failure - WORK IN PROGRESS
      this.trackAction('state_update', 'failed', { error: (error as Error).message });
      
      // DRAFT: Error handling - WORK IN PROGRESS
      console.error('DRAFT: UI state update error:', error);
      this.eventEmitter.emit('uiStateError', error);
    }
  }

  /**
   * DRAFT: Track agent action
   * 
   * This method tracks agent actions for monitoring and debugging.
   * The implementation is experimental and may not work correctly.
   * 
   * ⚠️  WARNING: This is a DRAFT implementation
   */
  private trackAction(
    actionType: 'node_start' | 'node_complete' | 'token_generated' | 'state_update' | 'error_handled' | 'persistence_save' | 'tool_call' | 'tool_result',
    status: 'pending' | 'in_progress' | 'completed' | 'failed',
    data: unknown,
    nodeId?: string
  ): string {
    const actionId = `action_${this.actionId++}`;
    const timestamp = new Date().toISOString();
    
    // DRAFT: Calculate duration if action was in progress - WORK IN PROGRESS
    let duration: number | undefined;
    if (status === 'completed' || status === 'failed') {
      const startTime = this.actionTimers.get(actionId);
      if (startTime) {
        duration = Date.now() - startTime;
        this.actionTimers.delete(actionId);
      }
    } else if (status === 'in_progress') {
      this.actionTimers.set(actionId, Date.now());
    }
    
    // DRAFT: Create action record - WORK IN PROGRESS
    const action = {
      id: actionId,
      actionType,
      nodeId,
      timestamp,
      duration,
      data,
      status,
    };
    
    // DRAFT: Update UI state with action - WORK IN PROGRESS
    this.state = produce(this.state, (draft) => {
      draft.agentActions.push(action);
      
      // DRAFT: Add to update history - WORK IN PROGRESS
      draft.updateHistory.push({
        id: `update_${this.updateId++}`,
        type: 'action',
        timestamp,
        data: { actionType, nodeId, status }
      });
    });

    // DRAFT: Emit action event - WORK IN PROGRESS
    this.eventEmitter.emit('actionTracked', action);

    return actionId;
  }

  /**
   * DRAFT: Track tool execution
   * 
   * This tracks tool calls and results.
   * 
   * ⚠️  WARNING: This is a DRAFT implementation
   */
  trackToolCall(toolName: string, args: unknown): string {
    const toolId = `tool_${Date.now()}`;
    const timestamp = new Date().toISOString();
    
    this.updateUIState(draft => {
      draft.activeTools.push({
        id: toolId,
        name: toolName,
        status: 'running',
        startTime: timestamp,
      });
    });
    
    this.trackAction('tool_call', 'in_progress', { toolName, args }, 'tools');
    
    return toolId;
  }

  /**
   * DRAFT: Track tool result
   * 
   * This tracks tool execution results.
   * 
   * ⚠️  WARNING: This is a DRAFT implementation
   */
  trackToolResult(toolId: string, result: unknown, success: boolean = true): void {
    const timestamp = new Date().toISOString();
    
    this.updateUIState(draft => {
      const tool = draft.activeTools.find(t => t.id === toolId);
      if (tool) {
        tool.status = success ? 'completed' : 'failed';
        tool.endTime = timestamp;
      }
    });
    
    this.trackAction('tool_result', success ? 'completed' : 'failed', { toolId, result }, 'tools');
  }

  /**
   * DRAFT: Update streaming properties
   * 
   * This handles real-time streaming updates.
   * 
   * ⚠️  WARNING: This is a DRAFT implementation
   */
  updateStreamingProperties(updater: (draft: Draft<UIState['streamingProperties']>) => void): void {
    this.updateUIState(draft => {
      updater(draft.streamingProperties);
    });
  }

  /**
   * DRAFT: Track token generation
   * 
   * This accumulates tokens into the current generation object.
   * 
   * ⚠️  WARNING: This is a DRAFT implementation
   */
  trackTokenGeneration(token: string, count: number): void {
    // Print token for real-time feedback
    process.stdout.write(token);
    
    this.updateStreamingProperties(draft => {
      // Accumulate tokens into the current generation
      draft.currentGeneration.content += token;
      draft.currentGeneration.tokenCount = count;
    });
    
    this.trackAction('token_generated', 'completed', { token, count });
  }

  /**
   * DRAFT: Start streaming
   * 
   * This initializes a new generation object for streaming.
   * 
   * ⚠️  WARNING: This is a DRAFT implementation
   */
  startStreaming(): void {
    this.updateStreamingProperties(draft => {
      // Create a new generation object
      draft.currentGeneration = {
        id: `gen_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        content: '',
        startTime: new Date().toISOString(),
        tokenCount: 0,
        isComplete: false,
      };
      draft.streamingProgress = 0;
    });
  }

  /**
   * DRAFT: End streaming
   * 
   * This finalizes the current generation object and saves it to disk.
   * 
   * ⚠️  WARNING: This is a DRAFT implementation
   */
  endStreaming(): void {
    this.updateStreamingProperties(draft => {
      // Complete the current generation
      draft.currentGeneration.endTime = new Date().toISOString();
      draft.currentGeneration.isComplete = true;
      draft.streamingProgress = 100;
    });
    
    // Save the full generation object to disk
    this.saveGenerationToDisk();
  }

  /**
   * DRAFT: Save generation to disk
   * 
   * This saves the current generation object to a log file.
   * 
   * ⚠️  WARNING: This is a DRAFT implementation
   */
  private saveGenerationToDisk(): void {
    try {
      const fs = require('fs');
      const path = require('path');
      
      const generation = this.getCurrentState().streamingProperties.currentGeneration;
      const logDir = path.join(process.cwd(), 'examples', 'logs');
      
      // Create logs directory if it doesn't exist
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
      
      // Save generation to file
      const filename = `generation_${generation.id}_${Date.now()}.json`;
      const filepath = path.join(logDir, filename);
      
      fs.writeFileSync(filepath, JSON.stringify(generation, null, 2));
      
      // console.log(`\nDRAFT: Generation saved to disk: ${filename}`);
    } catch (error) {
      console.error('DRAFT: Failed to save generation to disk:', error);
    }
  }

  /**
   * DRAFT: Get current generation content
   * 
   * This returns the accumulated content of the current generation.
   * 
   * ⚠️  WARNING: This is a DRAFT implementation
   */
  getCurrentGenerationContent(): string {
    return this.getCurrentState().streamingProperties.currentGeneration.content;
  }

  /**
   * DRAFT: Start new generation
   * 
   * This starts a new generation object (for function calls/agent switches).
   * 
   * ⚠️  WARNING: This is a DRAFT implementation
   */
  startNewGeneration(): void {
    // Save the current generation before starting a new one
    const currentGeneration = this.getCurrentState().streamingProperties.currentGeneration;
    if (currentGeneration.content.length > 0) {
      // Mark current generation as complete and save it
      this.updateStreamingProperties(draft => {
        draft.currentGeneration.endTime = new Date().toISOString();
        draft.currentGeneration.isComplete = true;
      });
      this.saveGenerationToDisk();
    }
    
    this.updateStreamingProperties(draft => {
      // Create a new generation object
      draft.currentGeneration = {
        id: `gen_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        content: '',
        startTime: new Date().toISOString(),
        tokenCount: 0,
        isComplete: false,
      };
      draft.streamingProgress = 0;
    });
  }
}

// ============================================================================
// DRAFT STATE SYNCHRONIZER - WORK IN PROGRESS
// ============================================================================

/**
 * DRAFT: State Synchronizer
 * 
 * This synchronizes between LangGraph state and UI state.
 * 
 * ⚠️  WARNING: This is a DRAFT implementation
 * ⚠️  WARNING: Error handling is incomplete
 */
export class DraftStateSynchronizer {
  private eventEmitter: EventEmitter;

  constructor(eventEmitter: EventEmitter) {
    this.eventEmitter = eventEmitter;
  }

  /**
   * DRAFT: Synchronize conversation state to UI state
   * 
   * This updates UI state based on conversation state changes.
   * 
   * ⚠️  WARNING: This is a DRAFT implementation
   */
  syncConversationToUI(
    conversationState: ConversationState, 
    uiStateManager: DraftUIStateManager
  ): void {
    // DRAFT: Update UI state based on conversation changes - WORK IN PROGRESS
    uiStateManager.updateUIState(draft => {
      // Sync generation status
      if (conversationState.isGenerating !== undefined) {
        // Update streaming progress based on generation status
        draft.streamingProperties.streamingProgress = conversationState.isGenerating ? 50 : 100;
        if (!conversationState.isGenerating && draft.streamingProperties.currentGeneration.isComplete === false) {
          // Mark generation as complete if not already
          draft.streamingProperties.currentGeneration.isComplete = true;
          draft.streamingProperties.currentGeneration.endTime = new Date().toISOString();
        }
      }
      
      // Sync current node
      if (conversationState.currentNode) {
        // Track node changes in action history
        uiStateManager['trackAction']('node_start', 'completed', { 
          nodeId: conversationState.currentNode 
        }, conversationState.currentNode);
      }
      
      // Sync tool calls
      if (conversationState.toolCalls && conversationState.toolCalls.length > 0) {
        const lastToolCall = conversationState.toolCalls[conversationState.toolCalls.length - 1];
        if (lastToolCall) {
          uiStateManager.trackToolCall(lastToolCall.name, lastToolCall.args);
        }
      }
    });
  }

  /**
   * DRAFT: Synchronize UI state to conversation state
   * 
   * This updates conversation state based on UI state changes.
   * 
   * ⚠️  WARNING: This is a DRAFT implementation
   */
  syncUIToConversation(
    uiState: UIState, 
    _conversationState: ConversationState
  ): Partial<ConversationState> {
    // DRAFT: Update conversation state based on UI changes - WORK IN PROGRESS
    const updates: Partial<ConversationState> = {};
    
    // Sync streaming progress to generation status
    if (uiState.streamingProperties.streamingProgress < 100) {
      updates.isGenerating = true;
    } else if (uiState.streamingProperties.currentGeneration.isComplete) {
      updates.isGenerating = false;
    }
    
    return updates;
  }
}

// ============================================================================
// DRAFT HYBRID STREAMING AGENT WITH REAL BACKEND - WORK IN PROGRESS
// ============================================================================

/**
 * DRAFT: Hybrid Streaming Agent with Real Backend
 * 
 * This combines LangGraph for business logic with Immer for real-time updates.
 * Implements LangGraph best practices with REAL BACKEND INTEGRATION.
 * 
 * ⚠️  WARNING: This is a DRAFT implementation
 * ⚠️  WARNING: This code is UNTESTED and may not work correctly
 * ⚠️  WARNING: State management architecture is experimental
 * ⚠️  WARNING: Error handling is incomplete
 * ⚠️  WARNING: Type safety is not fully implemented
 */
export class DraftHybridStreamingAgentWithBackend {
  private compiledGraph: ReturnType<StateGraph<typeof ConversationStateAnnotation.State, Partial<typeof ConversationStateAnnotation.State>>['compile']>;
  private uiStateManager: DraftUIStateManager;
  private stateSynchronizer: DraftStateSynchronizer;
  private eventEmitter: EventEmitter;
  private checkpointer: MemorySaver;
  private backend: Backend;
  private tools: any[];
  private toolNode: ToolNode;

  constructor() {
    // DRAFT: Initialize components with real backend - WORK IN PROGRESS
    this.eventEmitter = new EventEmitter();
    this.checkpointer = new MemorySaver();
    this.backend = new RealBackend();
    this.tools = createToolsWithBackend(this.backend);
    this.toolNode = new ToolNode(this.tools);
    this.uiStateManager = new DraftUIStateManager(this.createInitialUIState(), this.eventEmitter);
    this.stateSynchronizer = new DraftStateSynchronizer(this.eventEmitter);
    this.compiledGraph = this.createGraph();
    
    // DRAFT: Setup event listeners - WORK IN PROGRESS
    this.setupEventListeners();
  }

  /**
   * DRAFT: Create initial UI state
   * 
   * ⚠️  WARNING: This is a DRAFT implementation
   */
  private createInitialUIState(): UIState {
    return {
      streamingProperties: {
        currentGeneration: {
          id: '',
          content: '',
          startTime: '',
          tokenCount: 0,
          isComplete: false,
        },
        streamingProgress: 0,
      },
      agentActions: [],
      updateHistory: [],
      isVisible: true,
      scrollPosition: 0,
      activeTools: [],
    };
  }

  /**
   * DRAFT: Create initial conversation state
   * 
   * ⚠️  WARNING: This is a DRAFT implementation
   */
  private createInitialConversationState(): ConversationState {
    return {
      messages: [],
      currentNarrative: '',
      narrativeHistory: [],
      conversationId: `conv_${Date.now()}`,
      isGenerating: false,
      errors: [],
      currentNode: '',
      nodeHistory: [],
      userInput: '',
      toolCalls: [],
      nextAction: 'continue',
    };
  }

  /**
   * DRAFT: Setup event listeners
   * 
   * ⚠️  WARNING: This is a DRAFT implementation
   */
  private setupEventListeners(): void {
    // DRAFT: Listen for UI state changes - WORK IN PROGRESS
    this.eventEmitter.on('uiStateChange', (uiState: UIState) => {
      // console.log('DRAFT: UI state changed:', uiState);
    });

    // DRAFT: Listen for action tracking - WORK IN PROGRESS
    this.eventEmitter.on('actionTracked', (action: unknown) => {
      // console.log('DRAFT: Action tracked:', action);
    });

    // DRAFT: Listen for errors - WORK IN PROGRESS
    this.eventEmitter.on('uiStateError', (error: unknown) => {
      console.error('DRAFT: UI state error:', error);
    });
  }

  /**
   * DRAFT: Create LangGraph with real backend integration
   * 
   * This creates the LangGraph with conversation state management, checkpointing,
   * conditional edges, and REAL BACKEND tool integration.
   * 
   * ⚠️  WARNING: This is a DRAFT implementation
   */
  private createGraph(): ReturnType<StateGraph<typeof ConversationStateAnnotation.State, Partial<typeof ConversationStateAnnotation.State>>['compile']> {
    // DRAFT: Graph creation with real backend - WORK IN PROGRESS
    return new StateGraph(ConversationStateAnnotation)
      .addNode("process_input", this.createProcessInputNode())
      .addNode("decide_action", this.createDecideActionNode())
      .addNode("generate_response", this.createGenerateResponseNode())
      .addNode("tools", this.createToolsNode())
      .addNode("finalize", this.createFinalizeNode())
      .addEdge("__start__", "process_input")
      .addEdge("process_input", "decide_action")
      .addConditionalEdges("decide_action", this.routeAfterDecision.bind(this), {
        "generate_response": "generate_response",
        "tools": "tools",
        "finalize": "finalize",
      })
      .addEdge("tools", "generate_response")
      .addEdge("generate_response", "finalize")
      .addEdge("finalize", END)
      .compile({
        checkpointer: this.checkpointer,
        interruptBefore: ["tools"], // Interrupt before tool execution for human review
      });
  }

  /**
   * DRAFT: Create process input node
   * 
   * This node processes user input using LangChain messages.
   * 
   * ⚠️  WARNING: This is a DRAFT implementation
   */
  private createProcessInputNode(): (state: ConversationState) => Promise<Partial<ConversationState>> {
    return async (state: ConversationState): Promise<Partial<ConversationState>> => {
      // DRAFT: Track node start in UI state - WORK IN PROGRESS
      this.uiStateManager['trackAction']('node_start', 'in_progress', { nodeId: 'process_input' }, 'process_input');
      
      // DRAFT: Process input - WORK IN PROGRESS
      // console.log("DRAFT: Processing input...");
      
      // DRAFT: Create LangChain message - WORK IN PROGRESS
      const userMessage = new HumanMessage(state.userInput);
      
      // DRAFT: Update conversation state - WORK IN PROGRESS
      const updates: Partial<ConversationState> = {
        messages: [...(state.messages || []), userMessage], // Append to existing messages
        currentNode: 'process_input',
        isGenerating: true,
        nodeHistory: [...(state.nodeHistory || []), 'process_input'],
      };

      // DRAFT: Track node completion in UI state - WORK IN PROGRESS
      this.uiStateManager['trackAction']('node_complete', 'completed', { nodeId: 'process_input' }, 'process_input');
      
      return updates;
    };
  }

  /**
   * DRAFT: Create decide action node
   * 
   * This node decides what action to take next based on the input.
   * 
   * ⚠️  WARNING: This is a DRAFT implementation
   */
  private createDecideActionNode(): (state: ConversationState) => Promise<Partial<ConversationState>> {
    return async (state: ConversationState): Promise<Partial<ConversationState>> => {
      // DRAFT: Track node start in UI state - WORK IN PROGRESS
      this.uiStateManager['trackAction']('node_start', 'in_progress', { nodeId: 'decide_action' }, 'decide_action');
      
      // DRAFT: Simple decision logic - WORK IN PROGRESS
      // console.log("DRAFT: Deciding action...");
      
      let nextAction: 'continue' | 'use_tool' | 'end' | 'error' = 'continue';
      
      // DRAFT: Simple heuristics for decision making - WORK IN PROGRESS
      if (state.userInput.toLowerCase().includes('search')) {
        nextAction = 'use_tool';
      } else if (state.userInput.toLowerCase().includes('narrative')) {
        nextAction = 'use_tool';
      } else if (state.userInput.toLowerCase().includes('end') || state.userInput.toLowerCase().includes('stop')) {
        nextAction = 'end';
      } else if (state.userInput.toLowerCase().includes('error')) {
        nextAction = 'error';
      }
      
      // DRAFT: Update conversation state - WORK IN PROGRESS
      const updates: Partial<ConversationState> = {
        currentNode: 'decide_action',
        nextAction,
        nodeHistory: [...state.nodeHistory, 'decide_action'],
      };

      // DRAFT: Track node completion in UI state - WORK IN PROGRESS
      this.uiStateManager['trackAction']('node_complete', 'completed', { nodeId: 'decide_action' }, 'decide_action');
      
      return updates;
    };
  }

  /**
   * DRAFT: Create generate response node with real backend
   * 
   * This node generates responses using the REAL BACKEND with streaming.
   * 
   * ⚠️  WARNING: This is a DRAFT implementation
   */
  private createGenerateResponseNode(): (state: ConversationState) => Promise<Partial<ConversationState>> {
    return async (state: ConversationState): Promise<Partial<ConversationState>> => {
      // DRAFT: Track node start in UI state - WORK IN PROGRESS
      this.uiStateManager['trackAction']('node_start', 'in_progress', { nodeId: 'generate_response' }, 'generate_response');
      
      // DRAFT: Start streaming in UI state - WORK IN PROGRESS
      this.uiStateManager.startStreaming();
      
      try {
        // DRAFT: Use real backend for response generation - WORK IN PROGRESS
        // console.log("DRAFT: Generating response with real backend...");
        
        const response = await this.backend.getNarration({
          system: "You are a helpful AI assistant. Provide clear, helpful responses to user queries.",
          user: state.userInput
        }, (token: string, count: number) => {
          // DRAFT: Track real tokens from backend - WORK IN PROGRESS
          this.uiStateManager.trackTokenGeneration(token, count);
        });
        
        // DRAFT: End streaming in UI state - WORK IN PROGRESS
        this.uiStateManager.endStreaming();
        
        // DRAFT: Get the accumulated generation content - WORK IN PROGRESS
        const generationContent = this.uiStateManager.getCurrentGenerationContent();
        
        // DRAFT: Create LangChain message with accumulated content - WORK IN PROGRESS
        const assistantMessage = new AIMessage(generationContent || response);
        
        // DRAFT: Update conversation state - WORK IN PROGRESS
        const updates: Partial<ConversationState> = {
          messages: [...(state.messages || []), assistantMessage], // Append to existing messages
          currentNode: 'generate_response',
          currentNarrative: response,
          nodeHistory: [...(state.nodeHistory || []), 'generate_response'],
        };

        // DRAFT: Track node completion in UI state - WORK IN PROGRESS
        this.uiStateManager['trackAction']('node_complete', 'completed', { nodeId: 'generate_response' }, 'generate_response');
        
        return updates;
        
      } catch (error) {
        // DRAFT: Handle backend errors - WORK IN PROGRESS
        console.error('DRAFT: Backend error:', error);
        
        this.uiStateManager.endStreaming();
        
        const errorMessage = new AIMessage(`I apologize, but I encountered an error: ${(error as Error).message}`);
        
        const updates: Partial<ConversationState> = {
          messages: [...(state.messages || []), errorMessage],
          currentNode: 'generate_response',
          errors: [{
            id: `error_${Date.now()}`,
            message: (error as Error).message,
            nodeId: 'generate_response',
            timestamp: new Date().toISOString(),
            resolved: false
          }],
          nodeHistory: [...state.nodeHistory, 'generate_response'],
        };

        this.uiStateManager['trackAction']('node_complete', 'failed', { nodeId: 'generate_response', error: (error as Error).message }, 'generate_response');
        
        return updates;
      }
    };
  }

  /**
   * DRAFT: Create tools node
   * 
   * This node executes tools and starts a new generation.
   * 
   * ⚠️  WARNING: This is a DRAFT implementation
   */
  private createToolsNode(): (state: ConversationState) => Promise<Partial<ConversationState>> {
    return async (state: ConversationState): Promise<Partial<ConversationState>> => {
      // DRAFT: Start new generation for tool execution - WORK IN PROGRESS
      this.uiStateManager.startNewGeneration();
      
      // DRAFT: Track node start in UI state - WORK IN PROGRESS
      this.uiStateManager['trackAction']('node_start', 'in_progress', { nodeId: 'tools' }, 'tools');
      
      try {
        // DRAFT: Execute tools using LangGraph ToolNode - WORK IN PROGRESS
        // console.log("DRAFT: Executing tools...");
        
        const toolResult = await this.toolNode.invoke(state);
        
        // DRAFT: Track tool completion - WORK IN PROGRESS
        this.uiStateManager['trackAction']('tool_result', 'completed', { 
          nodeId: 'tools',
          result: toolResult 
        }, 'tools');
        
        return {
          ...toolResult,
          currentNode: 'tools',
        };
      } catch (error) {
        console.error("DRAFT: Tool execution failed:", error);
        this.uiStateManager['trackAction']('error_handled', 'failed', { 
          error: (error as Error).message,
          nodeId: 'tools' 
        }, 'tools');
        
        return {
          currentNode: 'tools',
          errors: [{
            id: `error_${Date.now()}`,
            message: (error as Error).message,
            nodeId: 'tools',
            timestamp: new Date().toISOString(),
            resolved: false
          }]
        };
      }
    };
  }

  /**
   * DRAFT: Create finalize node
   * 
   * This node finalizes the conversation using LangGraph state only.
   * 
   * ⚠️  WARNING: This is a DRAFT implementation
   */
  private createFinalizeNode(): (state: ConversationState) => Promise<Partial<ConversationState>> {
    return async (state: ConversationState): Promise<Partial<ConversationState>> => {
      // DRAFT: Track node start in UI state - WORK IN PROGRESS
      this.uiStateManager['trackAction']('node_start', 'in_progress', { nodeId: 'finalize' }, 'finalize');
      
      // DRAFT: Finalize conversation - WORK IN PROGRESS
      // console.log("DRAFT: Finalizing conversation...");
      
      // DRAFT: Update conversation state - WORK IN PROGRESS
      const updates: Partial<ConversationState> = {
        currentNode: 'finalize',
        isGenerating: false,
        nodeHistory: [...state.nodeHistory, 'finalize'],
      };

      // DRAFT: Track node completion in UI state - WORK IN PROGRESS
      this.uiStateManager['trackAction']('node_complete', 'completed', { nodeId: 'finalize' }, 'finalize');
      
      return updates;
    };
  }

  /**
   * DRAFT: Route after decision
   * 
   * This function determines the next node based on the decision.
   * 
   * ⚠️  WARNING: This is a DRAFT implementation
   */
  private routeAfterDecision(state: ConversationState): string {
    // DRAFT: Route based on nextAction - WORK IN PROGRESS
    switch (state.nextAction) {
      case 'use_tool':
        return 'tools';
      case 'end':
        return 'finalize';
      case 'error':
        return 'finalize'; // Handle error by ending
      case 'continue':
      default:
        return 'generate_response';
    }
  }

  /**
   * DRAFT: Process additional input in existing conversation
   * 
   * This processes new input while maintaining conversation history.
   * 
   * ⚠️  WARNING: This is a DRAFT implementation
   * ⚠️  WARNING: Error handling is incomplete
   */
  async processAdditionalInput(userInput: string, threadId?: string): Promise<void> {
    try {
      // DRAFT: Get existing conversation state - WORK IN PROGRESS
      const existingState = await this.compiledGraph.getState({
        configurable: { 
          thread_id: threadId || `thread_${Date.now()}` 
        }
      });

      // DRAFT: Create state with existing messages and new input - WORK IN PROGRESS
      const initialState = {
        ...existingState.values,
        userInput: userInput,
        isGenerating: true,
        currentNode: 'process_input', // Start from the beginning of the flow
      };
      
      // DRAFT: Use thread ID for checkpointing - WORK IN PROGRESS
      const config = {
        configurable: { 
          thread_id: threadId || `thread_${Date.now()}` 
        },
        streamMode: "values" as const, // Native LangGraph streaming
      };
      
      // DRAFT: Use native LangGraph streaming with real backend - WORK IN PROGRESS
      const stream = await this.compiledGraph.stream(initialState, config);
      
      for await (const event of stream) {
        // DRAFT: Handle streaming events - WORK IN PROGRESS
        // console.log('DRAFT: Stream event:', event); // Commented out to reduce noise
        
        // DRAFT: Synchronize states - WORK IN PROGRESS
        this.stateSynchronizer.syncConversationToUI(event, this.uiStateManager);
      }
      
      // console.log('DRAFT: Conversation started successfully with real backend integration');
    } catch (error) {
      console.error('DRAFT: Failed to start conversation:', error);
      this.uiStateManager['trackAction']('error_handled', 'failed', { error: (error as Error).message });
    }
  }

  /**
   * DRAFT: Start conversation with real backend
   * 
   * This starts a new conversation using LangGraph native streaming with REAL BACKEND.
   * 
   * ⚠️  WARNING: This is a DRAFT implementation
   * ⚠️  WARNING: Error handling is incomplete
   */
  async startConversation(userInput: string, threadId?: string): Promise<void> {
    try {
      // DRAFT: Create initial conversation state - WORK IN PROGRESS
      const initialState = this.createInitialConversationState();
      initialState.userInput = userInput;
      
      // DRAFT: Use thread ID for checkpointing - WORK IN PROGRESS
      const config = {
        configurable: { 
          thread_id: threadId || `thread_${Date.now()}` 
        },
        streamMode: "values" as const, // Native LangGraph streaming
      };
      
      // DRAFT: Use native LangGraph streaming with real backend - WORK IN PROGRESS
      const stream = await this.compiledGraph.stream(initialState, config);
      
      for await (const event of stream) {
        // DRAFT: Handle streaming events - WORK IN PROGRESS
        // console.log('DRAFT: Stream event:', event); // Commented out to reduce noise
        
        // DRAFT: Synchronize states - WORK IN PROGRESS
        this.stateSynchronizer.syncConversationToUI(event, this.uiStateManager);
      }
      
      // console.log('DRAFT: Conversation started successfully with real backend integration');
    } catch (error) {
      console.error('DRAFT: Failed to start conversation:', error);
      this.uiStateManager['trackAction']('error_handled', 'failed', { error: (error as Error).message });
    }
  }

  /**
   * DRAFT: Get conversation summary
   * 
   * This provides a summary of the current conversation state.
   * 
   * ⚠️  WARNING: This is a DRAFT implementation
   */
  getConversationSummary(): unknown {
    const uiState = this.uiStateManager.getCurrentState();
    
    return {
      // DRAFT: Conversation summary - WORK IN PROGRESS
      messageCount: uiState.streamingProperties.currentGeneration.tokenCount,
      streamingProgress: uiState.streamingProperties.streamingProgress,
      currentGeneration: {
        id: uiState.streamingProperties.currentGeneration.id,
        contentLength: uiState.streamingProperties.currentGeneration.content.length,
        isComplete: uiState.streamingProperties.currentGeneration.isComplete,
        startTime: uiState.streamingProperties.currentGeneration.startTime,
        endTime: uiState.streamingProperties.currentGeneration.endTime,
      },
      actionCount: uiState.agentActions.length,
      lastActionType: uiState.agentActions[uiState.agentActions.length - 1]?.actionType,
      activeTools: uiState.activeTools,
      backendConnected: !!this.backend,
      // DRAFT: Add more summary data as needed
    };
  }
}

// ============================================================================
// DRAFT EXPORTS - WORK IN PROGRESS
// ============================================================================

// DRAFT: Types are exported inline above - WORK IN PROGRESS
