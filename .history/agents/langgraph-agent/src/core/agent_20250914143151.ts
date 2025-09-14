import { StateGraph, END } from "@langchain/langgraph";
import { BaseMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";
import type { AgentState, AgentConfig, AgentEvent } from "@/types";
import { AgentStateSchema } from "@/types";

export class WaidrinAgent {
  private graph: StateGraph<AgentState>;
  private config: AgentConfig;
  private eventListeners: Map<string, ((event: AgentEvent) => void)[]> = new Map();

  constructor(config: AgentConfig) {
    this.config = config;
    this.graph = this.createGraph();
  }

  private createGraph(): StateGraph<AgentState> {
    const graph = new StateGraph<AgentState>({
      channels: AgentStateSchema,
    });

    // Add nodes
    graph.addNode("analyze", this.analyzeNode.bind(this));
    graph.addNode("plan", this.planNode.bind(this));
    graph.addNode("execute", this.executeNode.bind(this));
    graph.addNode("review", this.reviewNode.bind(this));
    graph.addNode("ask_user", this.askUserNode.bind(this));
    graph.addNode("finalize", this.finalizeNode.bind(this));

    // Add edges
    graph.addEdge("analyze", "plan");
    graph.addEdge("plan", "execute");
    graph.addEdge("execute", "review");
    graph.addEdge("review", "finalize");
    graph.addEdge("ask_user", "plan");

    // Add conditional edges
    graph.addConditionalEdges(
      "analyze",
      this.shouldAskUser.bind(this),
      {
        "ask_user": "ask_user",
        "plan": "plan",
      }
    );

    graph.addConditionalEdges(
      "review",
      this.shouldContinue.bind(this),
      {
        "continue": "execute",
        "finalize": "finalize",
        "ask_user": "ask_user",
      }
    );

    graph.addEdge("finalize", END);

    return graph;
  }

  private async analyzeNode(state: AgentState): Promise<Partial<AgentState>> {
    this.emitEvent({
      type: "task_started",
      data: { task: "analyze", currentTask: state.currentTask },
      timestamp: new Date().toISOString(),
    });

    const llm = this.createLLM();
    const messages: BaseMessage[] = [
      new SystemMessage(`
You are a Waidrin codebase analysis agent. Your role is to analyze the current state of the codebase and understand what needs to be done.

Current context:
- Project: Waidrin (AI role-playing game engine)
- Current task: ${state.currentTask || "No specific task"}
- Modified files: ${state.codebaseContext.modifiedFiles.join(", ") || "None"}
- Git status: ${state.codebaseContext.gitStatus || "Clean"}

Analyze the current state and provide insights about:
1. What files have been modified and why
2. What the current development focus should be
3. Any potential issues or improvements needed
4. Next steps for development

Respond with a JSON object containing your analysis.
      `),
      new HumanMessage(state.currentTask || "Please analyze the current codebase state."),
    ];

    try {
      const response = await llm.invoke(messages);
      const analysis = JSON.parse(response.content as string);

      return {
        memory: {
          ...state.memory,
          recentActions: [...state.memory.recentActions, "analyze_codebase"],
        },
        conversation: {
          ...state.conversation,
          messages: [
            ...state.conversation.messages,
            {
              role: "assistant",
              content: response.content as string,
              timestamp: new Date().toISOString(),
            },
          ],
        },
      };
    } catch (error) {
      this.emitEvent({
        type: "error_occurred",
        data: { error: error instanceof Error ? error.message : String(error) },
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }

  private async planNode(state: AgentState): Promise<Partial<AgentState>> {
    this.emitEvent({
      type: "task_started",
      data: { task: "plan", currentTask: state.currentTask },
      timestamp: new Date().toISOString(),
    });

    const llm = this.createLLM();
    const messages: BaseMessage[] = [
      new SystemMessage(`
You are a Waidrin development planning agent. Create a detailed plan for the current development task.

Based on the analysis, create a step-by-step plan that includes:
1. Specific actions to take
2. Files that need to be modified
3. Dependencies and considerations
4. Testing requirements
5. Documentation updates needed

Respond with a JSON object containing the detailed plan.
      `),
      new HumanMessage(`Create a plan for: ${state.currentTask || "current development task"}`),
    ];

    try {
      const response = await llm.invoke(messages);
      const plan = JSON.parse(response.content as string);

      return {
        memory: {
          ...state.memory,
          recentActions: [...state.memory.recentActions, "create_plan"],
        },
        conversation: {
          ...state.conversation,
          messages: [
            ...state.conversation.messages,
            {
              role: "assistant",
              content: response.content as string,
              timestamp: new Date().toISOString(),
            },
          ],
        },
      };
    } catch (error) {
      this.emitEvent({
        type: "error_occurred",
        data: { error: error instanceof Error ? error.message : String(error) },
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }

  private async executeNode(state: AgentState): Promise<Partial<AgentState>> {
    this.emitEvent({
      type: "task_started",
      data: { task: "execute", currentTask: state.currentTask },
      timestamp: new Date().toISOString(),
    });

    // This would integrate with the tools system
    // For now, we'll simulate execution
    const executionResult = {
      success: true,
      actions: ["read_files", "analyze_code", "make_changes"],
      modifiedFiles: state.codebaseContext.modifiedFiles,
    };

    return {
      memory: {
        ...state.memory,
        recentActions: [...state.memory.recentActions, "execute_plan"],
      },
      conversation: {
        ...state.conversation,
        messages: [
          ...state.conversation.messages,
          {
            role: "assistant",
            content: `Execution completed: ${JSON.stringify(executionResult)}`,
            timestamp: new Date().toISOString(),
          },
        ],
      },
    };
  }

  private async reviewNode(state: AgentState): Promise<Partial<AgentState>> {
    this.emitEvent({
      type: "task_started",
      data: { task: "review", currentTask: state.currentTask },
      timestamp: new Date().toISOString(),
    });

    const llm = this.createLLM();
    const messages: BaseMessage[] = [
      new SystemMessage(`
You are a Waidrin code review agent. Review the changes made and determine if they are complete and correct.

Review the following:
1. Code quality and adherence to project standards
2. Completeness of the implementation
3. Potential issues or bugs
4. Missing tests or documentation
5. Whether the task is complete

Respond with a JSON object containing your review.
      `),
      new HumanMessage(`Review the current changes and determine next steps.`),
    ];

    try {
      const response = await llm.invoke(messages);
      const review = JSON.parse(response.content as string);

      return {
        memory: {
          ...state.memory,
          recentActions: [...state.memory.recentActions, "review_changes"],
        },
        conversation: {
          ...state.conversation,
          messages: [
            ...state.conversation.messages,
            {
              role: "assistant",
              content: response.content as string,
              timestamp: new Date().toISOString(),
            },
          ],
        },
      };
    } catch (error) {
      this.emitEvent({
        type: "error_occurred",
        data: { error: error instanceof Error ? error.message : String(error) },
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }

  private async askUserNode(state: AgentState): Promise<Partial<AgentState>> {
    this.emitEvent({
      type: "user_interaction",
      data: { action: "ask_user", currentTask: state.currentTask },
      timestamp: new Date().toISOString(),
    });

    // This would integrate with the UI to ask the user for input
    // For now, we'll simulate a user response
    const userResponse = "Please proceed with the plan";

    return {
      conversation: {
        ...state.conversation,
        messages: [
          ...state.conversation.messages,
          {
            role: "user",
            content: userResponse,
            timestamp: new Date().toISOString(),
          },
        ],
      },
    };
  }

  private async finalizeNode(state: AgentState): Promise<Partial<AgentState>> {
    this.emitEvent({
      type: "task_completed",
      data: { task: "finalize", currentTask: state.currentTask },
      timestamp: new Date().toISOString(),
    });

    return {
      taskHistory: [
        ...state.taskHistory,
        {
          id: crypto.randomUUID(),
          task: state.currentTask || "Unknown task",
          status: "completed",
          result: "Task completed successfully",
          timestamp: new Date().toISOString(),
        },
      ],
      currentTask: undefined,
    };
  }

  private shouldAskUser(state: AgentState): string {
    // Logic to determine if user input is needed
    return state.conversation.messages.length === 0 ? "ask_user" : "plan";
  }

  private shouldContinue(state: AgentState): string {
    // Logic to determine if execution should continue
    const lastMessage = state.conversation.messages[state.conversation.messages.length - 1];
    if (lastMessage?.content.includes("incomplete")) {
      return "continue";
    }
    if (lastMessage?.content.includes("ask_user")) {
      return "ask_user";
    }
    return "finalize";
  }

  private createLLM(): ChatOpenAI {
    return new ChatOpenAI({
      model: this.config.model,
      temperature: this.config.temperature,
      openAIApiKey: this.config.openaiApiKey,
      configuration: {
        baseURL: this.config.openaiBaseUrl,
      },
    });
  }

  private emitEvent(event: AgentEvent): void {
    const listeners = this.eventListeners.get(event.type) || [];
    listeners.forEach(listener => listener(event));
  }

  // Public API
  public async run(initialState: Partial<AgentState>): Promise<AgentState> {
    const state: AgentState = {
      currentTask: undefined,
      taskHistory: [],
      codebaseContext: {
        projectRoot: this.config.projectRoot,
        currentFiles: [],
        modifiedFiles: [],
      },
      config: {
        model: this.config.model,
        temperature: this.config.temperature,
        maxIterations: this.config.maxIterations,
        autoCommit: this.config.autoCommit,
        watchMode: this.config.watchMode,
      },
      memory: {
        recentActions: [],
        learnedPatterns: [],
        userPreferences: {},
      },
      conversation: {
        messages: [],
        currentGoal: undefined,
      },
      ...initialState,
    };

    const compiledGraph = this.graph.compile();
    return await compiledGraph.invoke(state);
  }

  public onEvent(eventType: string, listener: (event: AgentEvent) => void): void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, []);
    }
    this.eventListeners.get(eventType)!.push(listener);
  }

  public offEvent(eventType: string, listener: (event: AgentEvent) => void): void {
    const listeners = this.eventListeners.get(eventType) || [];
    const index = listeners.indexOf(listener);
    if (index > -1) {
      listeners.splice(index, 1);
    }
  }
}
