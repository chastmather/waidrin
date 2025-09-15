#!/usr/bin/env node

/**
 * CLI Chat Interface for Toy Narrative Chat
 * 
 * A simple command-line interface for the toy narrative chat agent.
 * Run with: npx tsx examples/cli-chat.ts
 */

import { ToyNarrativeChatAgent, type ChatState } from "./toy-narrative-chat";
import * as readline from "readline";

// ============================================================================
// CLI Interface
// ============================================================================

class CLIChatInterface {
  private agent: ToyNarrativeChatAgent;
  private rl: readline.Interface;
  private currentState: ChatState | null = null;

  constructor() {
    this.agent = new ToyNarrativeChatAgent();
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
  }

  async start() {
    console.log("🎭 Toy Narrative Chat - CLI Interface");
    console.log("=====================================");
    console.log("Type your messages to continue the story!");
    console.log("Commands:");
    console.log("  /help     - Show this help message");
    console.log("  /summary  - Show conversation summary");
    console.log("  /history  - Show conversation history");
    console.log("  /clear    - Start a new conversation");
    console.log("  /quit     - Exit the chat");
    console.log("");

    this.promptUser();
  }

  private promptUser() {
    this.rl.question("You: ", async (input) => {
      if (input.trim() === "") {
        this.promptUser();
        return;
      }

      // Handle commands
      if (input.startsWith("/")) {
        await this.handleCommand(input);
        this.promptUser();
        return;
      }

      // Process user input
      await this.processUserInput(input);
    });
  }

  private async handleCommand(command: string) {
    switch (command.toLowerCase()) {
      case "/help":
        console.log("\n📖 Available Commands:");
        console.log("  /help     - Show this help message");
        console.log("  /summary  - Show conversation summary");
        console.log("  /history  - Show conversation history");
        console.log("  /clear    - Start a new conversation");
        console.log("  /quit     - Exit the chat");
        break;

      case "/summary":
        if (this.currentState) {
          const summary = this.agent.getConversationSummary(this.currentState);
          console.log("\n📊 Conversation Summary:");
          console.log(`  ID: ${summary.conversationId}`);
          console.log(`  Messages: ${summary.messageCount}`);
          console.log(`  Narratives: ${summary.narrativeCount}`);
          console.log(`  Errors: ${summary.errors}`);
          console.log(`  Last Message: ${summary.lastMessage.substring(0, 100)}...`);
        } else {
          console.log("\n❌ No active conversation");
        }
        break;

      case "/history":
        if (this.currentState) {
          console.log("\n📚 Conversation History:");
          this.currentState.messages.forEach((msg, index) => {
            const role = msg.role === "user" ? "You" : "Assistant";
            console.log(`  ${index + 1}. ${role}: ${msg.content}`);
          });
        } else {
          console.log("\n❌ No active conversation");
        }
        break;

      case "/clear":
        this.currentState = null;
        console.log("\n🔄 Started new conversation");
        break;

      case "/quit":
        console.log("\n👋 Goodbye!");
        this.rl.close();
        process.exit(0);
        break;

      default:
        console.log(`\n❌ Unknown command: ${command}`);
        console.log("Type /help for available commands");
        break;
    }
  }

  private async processUserInput(input: string) {
    try {
      console.log("\n🤖 Assistant is thinking...");

      if (this.currentState) {
        // Continue existing conversation
        this.currentState = await this.agent.continueConversation(this.currentState, input);
      } else {
        // Start new conversation
        this.currentState = await this.agent.processInput(input);
      }

      // Display the response
      console.log("\n🤖 Assistant:");
      console.log(this.currentState.currentNarrative);
      console.log("");

      // Show any errors
      if (this.currentState.errors.length > 0) {
        const unresolvedErrors = this.currentState.errors.filter(e => !e.resolved);
        if (unresolvedErrors.length > 0) {
          console.log("⚠️ Errors occurred:");
          unresolvedErrors.forEach(error => {
            console.log(`  - ${error.message}`);
          });
        }
      }

    } catch (error) {
      console.error("\n❌ Error processing input:", error);
    }

    this.promptUser();
  }
}

// ============================================================================
// Main Execution
// ============================================================================

async function main() {
  // Check for required environment variables
  if (!process.env.OPENAI_API_KEY) {
    console.error("❌ OPENAI_API_KEY environment variable is required");
    console.log("Please set your OpenAI API key:");
    console.log("export OPENAI_API_KEY='your-api-key-here'");
    process.exit(1);
  }

  // Check for optional environment variables
  if (process.env.OPENAI_API_URL) {
    console.log(`🔗 Using custom API URL: ${process.env.OPENAI_API_URL}`);
  }
  if (process.env.OPENAI_MODEL) {
    console.log(`🤖 Using model: ${process.env.OPENAI_MODEL}`);
  }

  // Start the CLI interface
  const cli = new CLIChatInterface();
  await cli.start();
}

// Handle process termination
process.on('SIGINT', () => {
  console.log("\n\n👋 Goodbye!");
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log("\n\n👋 Goodbye!");
  process.exit(0);
});

// Run the CLI
main().catch((error) => {
  console.error("❌ Fatal error:", error);
  process.exit(1);
});
