#!/usr/bin/env tsx

import { WaidrinAgent } from "@/core/agent";
import { WaidrinTools } from "@/tools/waidrin-tools";
import { CodebaseTools } from "@/tools/codebase-tools";
import type { AgentConfig } from "@/types";

/**
 * Build Agent Example
 * 
 * This example shows how to use the WaidrinAgent for build and deployment tasks
 * like running builds, tests, and preparing for deployment.
 */

async function main() {
  const projectRoot = process.cwd();
  const config: AgentConfig = {
    model: "gpt-4",
    temperature: 0.1,
    maxIterations: 5,
    autoCommit: false,
    watchMode: false,
    projectRoot,
    openaiApiKey: process.env.OPENAI_API_KEY,
    openaiBaseUrl: process.env.OPENAI_BASE_URL,
  };

  // Create agent instance
  const agent = new WaidrinAgent(config);
  const waidrinTools = new WaidrinTools(projectRoot);
  const codebaseTools = new CodebaseTools(projectRoot);

  // Set up event listeners
  agent.onEvent("task_started", (event) => {
    console.log(`🔨 Build task started: ${event.data.task}`);
  });

  agent.onEvent("task_completed", (event) => {
    console.log(`✅ Build task completed: ${event.data.task}`);
  });

  agent.onEvent("error_occurred", (event) => {
    console.error(`❌ Build error: ${event.data.error}`);
  });

  try {
    console.log("🏗️  Starting Waidrin Build Agent...");

    // Check if we're in a clean git state
    const gitStatus = await codebaseTools.getGitStatus();
    if (gitStatus.success && gitStatus.data.stdout.trim()) {
      console.log("⚠️  Warning: Working directory has uncommitted changes");
      console.log("Git status:", gitStatus.data.stdout);
    }

    // Run linting
    console.log("🔍 Running linting...");
    const lintResult = await waidrinTools.runLinting();
    if (lintResult.success) {
      console.log("✅ Linting passed");
    } else {
      console.log("❌ Linting failed:", lintResult.error);
    }

    // Run tests
    console.log("🧪 Running tests...");
    const testResult = await waidrinTools.runTests();
    if (testResult.success) {
      console.log("✅ Tests passed");
    } else {
      console.log("❌ Tests failed:", testResult.error);
    }

    // Build project
    console.log("🏗️  Building project...");
    const buildResult = await waidrinTools.buildProject();
    if (buildResult.success) {
      console.log("✅ Build successful");
    } else {
      console.log("❌ Build failed:", buildResult.error);
      process.exit(1);
    }

    // Get build artifacts info
    const buildDir = "dist";
    const buildFiles = await codebaseTools.listDirectory(buildDir);
    if (buildFiles.success) {
      console.log("📦 Build artifacts:", buildFiles.data.items.map(item => item.name));
    }

    // Run the agent for build analysis
    const result = await agent.run({
      currentTask: "Analyze the build process and provide recommendations",
      codebaseContext: {
        projectRoot,
        currentFiles: [],
        modifiedFiles: [],
      },
    });

    console.log("🎉 Build agent completed successfully!");
    console.log("📊 Build analysis:", JSON.stringify(result, null, 2));

  } catch (error) {
    console.error("💥 Build agent failed:", error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on("SIGINT", async () => {
  console.log("\n🛑 Shutting down build agent...");
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("\n🛑 Shutting down build agent...");
  process.exit(0);
});

// Run the main function
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error("💥 Fatal error:", error);
    process.exit(1);
  });
}
