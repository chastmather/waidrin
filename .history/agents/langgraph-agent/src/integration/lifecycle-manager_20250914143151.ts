import { EventEmitter } from "events";
import type { AgentState, AgentEvent } from "@/types";
import { WaidrinIntegration } from "./waidrin-integration";

export interface LifecyclePhase {
  name: string;
  description: string;
  status: "pending" | "in_progress" | "completed" | "failed";
  startTime?: Date;
  endTime?: Date;
  error?: string;
}

export class WaidrinLifecycleManager extends EventEmitter {
  private integration: WaidrinIntegration;
  private currentPhase: LifecyclePhase | null = null;
  private phaseHistory: LifecyclePhase[] = [];
  private isRunning = false;

  constructor(projectRoot: string) {
    super();
    this.integration = new WaidrinIntegration(projectRoot);
  }

  /**
   * Start the Waidrin development lifecycle
   */
  async startLifecycle(initialTask?: string): Promise<void> {
    if (this.isRunning) {
      throw new Error("Lifecycle is already running");
    }

    this.isRunning = true;
    this.emit("lifecycle:started", { task: initialTask });

    try {
      // Phase 1: Environment Setup
      await this.runPhase("Environment Setup", "Setting up development environment", async () => {
        await this.setupEnvironment();
      });

      // Phase 2: Code Analysis
      await this.runPhase("Code Analysis", "Analyzing current codebase state", async () => {
        await this.analyzeCodebase();
      });

      // Phase 3: Task Planning
      if (initialTask) {
        await this.runPhase("Task Planning", `Planning task: ${initialTask}`, async () => {
          await this.planTask(initialTask);
        });
      }

      // Phase 4: Development Loop
      await this.runPhase("Development Loop", "Running development tasks", async () => {
        await this.runDevelopmentLoop();
      });

      // Phase 5: Quality Assurance
      await this.runPhase("Quality Assurance", "Running tests and quality checks", async () => {
        await this.runQualityChecks();
      });

      // Phase 6: Finalization
      await this.runPhase("Finalization", "Finalizing changes", async () => {
        await this.finalizeChanges();
      });

      this.emit("lifecycle:completed", { phases: this.phaseHistory });
    } catch (error) {
      this.emit("lifecycle:failed", { error, phases: this.phaseHistory });
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Stop the current lifecycle
   */
  async stopLifecycle(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    this.emit("lifecycle:stopped", { phases: this.phaseHistory });
  }

  /**
   * Run a specific phase
   */
  private async runPhase(
    name: string,
    description: string,
    phaseFunction: () => Promise<void>
  ): Promise<void> {
    const phase: LifecyclePhase = {
      name,
      description,
      status: "in_progress",
      startTime: new Date(),
    };

    this.currentPhase = phase;
    this.phaseHistory.push(phase);
    this.emit("phase:started", phase);

    try {
      await phaseFunction();
      phase.status = "completed";
      phase.endTime = new Date();
      this.emit("phase:completed", phase);
    } catch (error) {
      phase.status = "failed";
      phase.error = error instanceof Error ? error.message : String(error);
      phase.endTime = new Date();
      this.emit("phase:failed", phase);
      throw error;
    } finally {
      this.currentPhase = null;
    }
  }

  /**
   * Setup development environment
   */
  private async setupEnvironment(): Promise<void> {
    // Check if dependencies are installed
    const packageInfo = await this.integration.getPackageInfo();
    this.emit("environment:package_info", packageInfo);

    // Install dependencies if needed
    const nodeModulesExists = await this.integration.fileExists(
      join(this.integration.projectRoot, "node_modules")
    );
    
    if (!nodeModulesExists) {
      this.emit("environment:installing_dependencies");
      const result = await this.integration.installDependencies();
      if (!result.success) {
        throw new Error(`Failed to install dependencies: ${result.error}`);
      }
    }

    // Check git status
    const isClean = await this.integration.isCleanGitState();
    this.emit("environment:git_status", { isClean });

    if (!isClean) {
      const modifiedFiles = await this.integration.getModifiedFiles();
      this.emit("environment:modified_files", modifiedFiles);
    }
  }

  /**
   * Analyze the current codebase
   */
  private async analyzeCodebase(): Promise<void> {
    const context = await this.integration.getWaidrinContext();
    this.emit("analysis:context", context);

    // Run linting
    const lintResult = await this.integration.runLinting();
    this.emit("analysis:linting", lintResult);

    // Check for TypeScript errors
    const buildResult = await this.integration.buildProject();
    this.emit("analysis:build", buildResult);

    // Analyze file structure
    const files = await this.integration.getCodebaseFiles();
    this.emit("analysis:files", files);
  }

  /**
   * Plan a specific task
   */
  private async planTask(task: string): Promise<void> {
    this.emit("planning:task", { task });

    // Analyze task requirements
    const context = await this.integration.getWaidrinContext();
    const modifiedFiles = await this.integration.getModifiedFiles();

    // Create task plan
    const plan = {
      task,
      context,
      modifiedFiles,
      estimatedSteps: this.estimateTaskSteps(task),
      dependencies: this.identifyDependencies(task),
    };

    this.emit("planning:plan_created", plan);
  }

  /**
   * Run the main development loop
   */
  private async runDevelopmentLoop(): Promise<void> {
    this.emit("development:loop_started");

    // Watch for file changes
    await this.integration.watchCodebaseChanges((changedFiles) => {
      this.emit("development:files_changed", changedFiles);
    });

    // Run development server
    const devResult = await this.integration.startDevServer();
    this.emit("development:server_started", devResult);

    // Monitor for completion conditions
    // This would be implemented based on specific requirements
  }

  /**
   * Run quality assurance checks
   */
  private async runQualityChecks(): Promise<void> {
    // Run tests
    const testResult = await this.integration.runTests();
    this.emit("qa:tests", testResult);

    // Run linting
    const lintResult = await this.integration.runLinting();
    this.emit("qa:linting", lintResult);

    // Build project
    const buildResult = await this.integration.buildProject();
    this.emit("qa:build", buildResult);
  }

  /**
   * Finalize changes
   */
  private async finalizeChanges(): Promise<void> {
    // Check if changes should be committed
    const isClean = await this.integration.isCleanGitState();
    if (!isClean) {
      this.emit("finalization:changes_detected");
      // Auto-commit if configured
      // This would be implemented based on configuration
    }

    this.emit("finalization:completed");
  }

  /**
   * Estimate the number of steps for a task
   */
  private estimateTaskSteps(task: string): number {
    // Simple heuristic based on task keywords
    const keywords = {
      "bug": 3,
      "feature": 5,
      "refactor": 4,
      "test": 2,
      "documentation": 2,
      "optimization": 3,
    };

    for (const [keyword, steps] of Object.entries(keywords)) {
      if (task.toLowerCase().includes(keyword)) {
        return steps;
      }
    }

    return 3; // Default estimate
  }

  /**
   * Identify dependencies for a task
   */
  private identifyDependencies(task: string): string[] {
    const dependencies: string[] = [];

    if (task.toLowerCase().includes("test")) {
      dependencies.push("testing-framework");
    }

    if (task.toLowerCase().includes("ui") || task.toLowerCase().includes("component")) {
      dependencies.push("react", "radix-ui");
    }

    if (task.toLowerCase().includes("state")) {
      dependencies.push("zustand", "immer");
    }

    if (task.toLowerCase().includes("api") || task.toLowerCase().includes("backend")) {
      dependencies.push("openai", "langchain");
    }

    return dependencies;
  }

  /**
   * Get current phase
   */
  getCurrentPhase(): LifecyclePhase | null {
    return this.currentPhase;
  }

  /**
   * Get phase history
   */
  getPhaseHistory(): LifecyclePhase[] {
    return [...this.phaseHistory];
  }

  /**
   * Check if lifecycle is running
   */
  isLifecycleRunning(): boolean {
    return this.isRunning;
  }
}
