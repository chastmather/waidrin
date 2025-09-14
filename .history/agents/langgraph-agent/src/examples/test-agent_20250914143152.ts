#!/usr/bin/env tsx

import { WaidrinAgent } from "@/core/agent";
import { WaidrinTools } from "@/tools/waidrin-tools";
import { CodebaseTools } from "@/tools/codebase-tools";
import type { AgentConfig } from "@/types";

/**
 * Test Agent Example
 * 
 * This example shows how to use the WaidrinAgent for testing tasks
 * like running tests, analyzing test coverage, and generating test cases.
 */

async function main() {
  const projectRoot = process.cwd();
  const config: AgentConfig = {
    model: "gpt-4",
    temperature: 0.1,
    maxIterations: 8,
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
    console.log(`🧪 Test task started: ${event.data.task}`);
  });

  agent.onEvent("task_completed", (event) => {
    console.log(`✅ Test task completed: ${event.data.task}`);
  });

  agent.onEvent("error_occurred", (event) => {
    console.error(`❌ Test error: ${event.data.error}`);
  });

  try {
    console.log("🧪 Starting Waidrin Test Agent...");

    // Find test files
    console.log("🔍 Finding test files...");
    const testFiles = await codebaseTools.searchFiles("**/*.test.{ts,tsx,js,jsx}");
    if (testFiles.success) {
      console.log(`📁 Found ${testFiles.data.count} test files:`, testFiles.data.files);
    }

    // Find spec files
    const specFiles = await codebaseTools.searchFiles("**/*.spec.{ts,tsx,js,jsx}");
    if (specFiles.success) {
      console.log(`📁 Found ${specFiles.data.count} spec files:`, specFiles.data.files);
    }

    // Run existing tests
    console.log("🏃 Running existing tests...");
    const testResult = await waidrinTools.runTests();
    if (testResult.success) {
      console.log("✅ Tests passed");
      console.log("Test output:", testResult.data.stdout);
    } else {
      console.log("❌ Tests failed:", testResult.error);
      console.log("Test output:", testResult.data?.stdout);
      console.log("Test errors:", testResult.data?.stderr);
    }

    // Analyze test coverage (if available)
    console.log("📊 Analyzing test coverage...");
    const coverageResult = await codebaseTools.executeCommand("npm", ["run", "test:coverage"]);
    if (coverageResult.success) {
      console.log("✅ Coverage analysis completed");
      console.log("Coverage output:", coverageResult.data.stdout);
    } else {
      console.log("ℹ️  Coverage analysis not available or failed");
    }

    // Analyze code for potential test cases
    console.log("🔍 Analyzing code for test opportunities...");
    const libFiles = await codebaseTools.searchFiles("lib/**/*.ts");
    if (libFiles.success) {
      console.log(`📁 Analyzing ${libFiles.data.count} library files for test opportunities`);
      
      for (const file of libFiles.data.files.slice(0, 3)) { // Analyze first 3 files
        const analysis = await codebaseTools.analyzeCodeStructure(file);
        if (analysis.success) {
          console.log(`📋 Analysis for ${file}:`, {
            functions: analysis.data.functions.length,
            classes: analysis.data.classes.length,
            interfaces: analysis.data.interfaces.length,
            types: analysis.data.types.length,
          });
        }
      }
    }

    // Run the agent for test analysis and recommendations
    const result = await agent.run({
      currentTask: "Analyze the test suite and provide recommendations for improving test coverage and quality",
      codebaseContext: {
        projectRoot,
        currentFiles: [],
        modifiedFiles: [],
      },
    });

    console.log("🎉 Test agent completed successfully!");
    console.log("📊 Test analysis:", JSON.stringify(result, null, 2));

    // Generate test recommendations
    console.log("💡 Test recommendations:");
    console.log("1. Consider adding unit tests for utility functions");
    console.log("2. Add integration tests for the game engine");
    console.log("3. Add component tests for React components");
    console.log("4. Add end-to-end tests for the complete user flow");
    console.log("5. Consider adding performance tests for the LLM integration");

  } catch (error) {
    console.error("💥 Test agent failed:", error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on("SIGINT", async () => {
  console.log("\n🛑 Shutting down test agent...");
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("\n🛑 Shutting down test agent...");
  process.exit(0);
});

// Run the main function
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error("💥 Fatal error:", error);
    process.exit(1);
  });
}
