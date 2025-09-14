#!/usr/bin/env tsx

import { WaidrinAgent } from "@/core/agent";
import { WaidrinLifecycleManager } from "@/integration/lifecycle-manager";
import { WaidrinTools } from "@/tools/waidrin-tools";
import { CodebaseTools } from "@/tools/codebase-tools";
import type { AgentConfig } from "@/types";

/**
 * Development Agent Example
 * 
 * This example shows how to use the WaidrinAgent for development tasks
 * like bug fixes, feature implementation, and code refactoring.
 */

async function main() {
  const projectRoot = process.cwd();
  const config: AgentConfig = {
    model: "gpt-4",
    temperature: 0.1,
    maxIterations: 10,
    autoCommit: false,
    watchMode: true,
    projectRoot,
    openaiApiKey: process.env.OPENAI_API_KEY,
    openaiBaseUrl: process.env.OPENAI_BASE_URL,
  };

  // Create agent instance
  const agent = new WaidrinAgent(config);
  const lifecycleManager = new WaidrinLifecycleManager(projectRoot);
  const waidrinTools = new WaidrinTools(projectRoot);
  const codebaseTools = new CodebaseTools(projectRoot);

  // Set up event listeners
  agent.onEvent("task_started", (event) => {
    console.log(`🚀 Task started: ${event.data.task}`);
  });

  agent.onEvent("task_completed", (event) => {
    console.log(`✅ Task completed: ${event.data.task}`);
  });

  agent.onEvent("error_occurred", (event) => {
    console.error(`❌ Error: ${event.data.error}`);
  });

  lifecycleManager.on("phase:started", (phase) => {
    console.log(`📋 Phase started: ${phase.name}`);
  });

  lifecycleManager.on("phase:completed", (phase) => {
    console.log(`✅ Phase completed: ${phase.name}`);
  });

  lifecycleManager.on("phase:failed", (phase) => {
    console.error(`❌ Phase failed: ${phase.name} - ${phase.error}`);
  });

  // Get command line arguments
  const args = process.argv.slice(2);
  const task = args[0] || "Analyze the current codebase and suggest improvements";

  try {
    console.log("🤖 Starting Waidrin Development Agent...");
    console.log(`📝 Task: ${task}`);

    // Start the lifecycle
    await lifecycleManager.startLifecycle(task);

    // Run the agent
    const result = await agent.run({
      currentTask: task,
      codebaseContext: {
        projectRoot,
        currentFiles: [],
        modifiedFiles: [],
      },
    });

    console.log("🎉 Agent completed successfully!");
    console.log("📊 Final state:", JSON.stringify(result, null, 2));

  } catch (error) {
    console.error("💥 Agent failed:", error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on("SIGINT", async () => {
  console.log("\n🛑 Shutting down agent...");
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("\n🛑 Shutting down agent...");
  process.exit(0);
});

// Run the main function
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error("💥 Fatal error:", error);
    process.exit(1);
  });
}
