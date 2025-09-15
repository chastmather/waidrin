#!/usr/bin/env tsx

/**
 * Narrative CLI - Interactive Story Chat Interface
 * 
 * A simple CLI that maintains a persistent narrative thread and accepts user chat
 * with slash commands for interaction.
 * 
 * Run with: npx tsx examples/narrative-cli.ts
 */

import { DraftHybridStreamingAgentWithBackend } from './UI-manager';
import * as readline from 'readline';
import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// CLI Interface
// ============================================================================

interface NarrativeState {
  threadId: string;
  agent: DraftHybridStreamingAgentWithBackend;
  isActive: boolean;
  currentGeneration: string;
  generationCount: number;
  isFirstInput: boolean;
}

class NarrativeCLI {
  private rl: readline.Interface;
  private state: NarrativeState;
  private logDir: string;

  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: '> '
    });

    this.logDir = path.join(process.cwd(), 'examples', 'narrative-logs');
    this.ensureLogDirectory();

    this.state = {
      threadId: `narrative_${Date.now()}`,
      agent: new DraftHybridStreamingAgentWithBackend(),
      isActive: true,
      currentGeneration: '',
      generationCount: 0,
      isFirstInput: true
    };

    this.setupEventHandlers();
  }

  private ensureLogDirectory(): void {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  private setupEventHandlers(): void {
    this.rl.on('line', (input: string) => {
      this.handleInput(input.trim());
    });

    this.rl.on('close', () => {
      console.log('\n👋 Goodbye! Your narrative has been saved.');
      process.exit(0);
    });

    // Handle Ctrl+C gracefully
    process.on('SIGINT', () => {
      console.log('\n\n👋 Goodbye! Your narrative has been saved.');
      this.saveNarrativeState();
      process.exit(0);
    });
  }

  private async handleInput(input: string): Promise<void> {
    if (!input) {
      this.rl.prompt();
      return;
    }

    // Handle slash commands
    if (input.startsWith('/')) {
      await this.handleSlashCommand(input);
      return;
    }

    // Regular chat input
    await this.handleChatInput(input);
  }

  private async handleSlashCommand(command: string): Promise<void> {
    const [cmd, ...args] = command.slice(1).split(' ');

    switch (cmd.toLowerCase()) {
      case 'help':
        this.showHelp();
        break;
      
      case 'status':
        this.showStatus();
        break;
      
      case 'clear':
        await this.clearNarrative();
        break;
      
      case 'save':
        this.saveNarrativeState();
        break;
      
      case 'load':
        if (args[0]) {
          await this.loadNarrativeState(args[0]);
        } else {
          console.log('❌ Usage: /load <thread-id>');
        }
        break;
      
      case 'list':
        this.listSavedNarratives();
        break;
      
      case 'quit':
      case 'exit':
        console.log('👋 Goodbye!');
        this.saveNarrativeState();
        process.exit(0);
        break;
      
      default:
        console.log(`❌ Unknown command: /${cmd}`);
        console.log('Type /help for available commands');
    }

    this.rl.prompt();
  }

  private async handleChatInput(input: string): Promise<void> {
    try {
      // Start new generation for this input
      this.state.agent.uiStateManager.startNewGeneration();
      
      // Process the conversation - use different methods for first vs subsequent inputs
      if (this.state.isFirstInput) {
        await this.state.agent.startConversation(input, this.state.threadId);
        this.state.isFirstInput = false;
      } else {
        await this.state.agent.processAdditionalInput(input, this.state.threadId);
      }
      
      // Get the current generation content
      const generationContent = this.state.agent.uiStateManager.getCurrentGenerationContent();
      
      if (generationContent) {
        this.state.currentGeneration = generationContent;
        this.state.generationCount++;
        
        // Display the response with visual formatting
        this.displayResponse(generationContent);
        
        // Save the narrative state
        this.saveNarrativeState();
      }
      
    } catch (error) {
      console.error('❌ Error processing input:', error);
    }

    this.rl.prompt();
  }

  private displayResponse(content: string): void {
    console.log('\n' + '─'.repeat(60));
    console.log('📖 NARRATIVE RESPONSE:');
    console.log('─'.repeat(60));
    console.log(content);
    console.log('─'.repeat(60));
    console.log(`📊 Generation #${this.state.generationCount} | Thread: ${this.state.threadId}`);
    console.log('─'.repeat(60) + '\n');
  }

  private showHelp(): void {
    console.log('\n📚 AVAILABLE COMMANDS:');
    console.log('─'.repeat(40));
    console.log('/help     - Show this help message');
    console.log('/status   - Show current narrative status');
    console.log('/clear    - Clear current narrative thread');
    console.log('/save     - Save current narrative state');
    console.log('/load <id>- Load a saved narrative thread');
    console.log('/list     - List all saved narratives');
    console.log('/quit     - Exit the application');
    console.log('─'.repeat(40));
    console.log('💡 Just type normally to chat with the narrative AI!');
    console.log('─'.repeat(40) + '\n');
  }

  private showStatus(): void {
    const summary = this.state.agent.getConversationSummary();
    console.log('\n📊 NARRATIVE STATUS:');
    console.log('─'.repeat(40));
    console.log(`Thread ID: ${this.state.threadId}`);
    console.log(`Generations: ${this.state.generationCount}`);
    console.log(`Current Generation Length: ${this.state.currentGeneration.length} chars`);
    console.log(`Backend Connected: ${summary.backendConnected ? '✅' : '❌'}`);
    console.log(`Streaming Progress: ${summary.streamingProgress}%`);
    console.log('─'.repeat(40) + '\n');
  }

  private async clearNarrative(): Promise<void> {
    console.log('\n🗑️  Clearing narrative thread...');
    this.state.threadId = `narrative_${Date.now()}`;
    this.state.currentGeneration = '';
    this.state.generationCount = 0;
    this.state.isFirstInput = true;
    this.state.agent = new DraftHybridStreamingAgentWithBackend();
    console.log('✅ Narrative cleared! Starting fresh...\n');
  }

  private saveNarrativeState(): void {
    try {
      const stateFile = path.join(this.logDir, `${this.state.threadId}.json`);
      const stateData = {
        threadId: this.state.threadId,
        generationCount: this.state.generationCount,
        currentGeneration: this.state.currentGeneration,
        timestamp: new Date().toISOString(),
        agentSummary: this.state.agent.getConversationSummary()
      };
      
      fs.writeFileSync(stateFile, JSON.stringify(stateData, null, 2));
      console.log(`💾 Narrative saved: ${this.state.threadId}`);
    } catch (error) {
      console.error('❌ Failed to save narrative:', error);
    }
  }

  private async loadNarrativeState(threadId: string): Promise<void> {
    try {
      const stateFile = path.join(this.logDir, `${threadId}.json`);
      
      if (!fs.existsSync(stateFile)) {
        console.log(`❌ Narrative not found: ${threadId}`);
        return;
      }
      
      const stateData = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
      
      this.state.threadId = stateData.threadId;
      this.state.generationCount = stateData.generationCount || 0;
      this.state.currentGeneration = stateData.currentGeneration || '';
      
      console.log(`📂 Loaded narrative: ${threadId}`);
      console.log(`📊 Generations: ${this.state.generationCount}`);
      console.log(`📝 Content length: ${this.state.currentGeneration.length} chars\n`);
      
    } catch (error) {
      console.error('❌ Failed to load narrative:', error);
    }
  }

  private listSavedNarratives(): void {
    try {
      const files = fs.readdirSync(this.logDir)
        .filter(file => file.endsWith('.json'))
        .map(file => {
          const filePath = path.join(this.logDir, file);
          const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          return {
            threadId: data.threadId,
            timestamp: data.timestamp,
            generationCount: data.generationCount || 0,
            contentLength: data.currentGeneration?.length || 0
          };
        })
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      if (files.length === 0) {
        console.log('\n📂 No saved narratives found.\n');
        return;
      }

      console.log('\n📂 SAVED NARRATIVES:');
      console.log('─'.repeat(80));
      files.forEach((file, index) => {
        const date = new Date(file.timestamp).toLocaleString();
        console.log(`${index + 1}. ${file.threadId}`);
        console.log(`   📅 ${date} | 📊 ${file.generationCount} gens | 📝 ${file.contentLength} chars`);
      });
      console.log('─'.repeat(80) + '\n');
      
    } catch (error) {
      console.error('❌ Failed to list narratives:', error);
    }
  }

  public async start(): Promise<void> {
    console.log('🎭 NARRATIVE CLI - Interactive Story Chat');
    console.log('═'.repeat(50));
    console.log('Welcome to your personal narrative assistant!');
    console.log('Type your messages to continue the story, or use /help for commands.');
    console.log('═'.repeat(50) + '\n');
    
    this.showStatus();
    this.rl.prompt();
  }
}

// ============================================================================
// Main Execution
// ============================================================================

async function main(): Promise<void> {
  const cli = new NarrativeCLI();
  await cli.start();
}

// Run if this file is executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('❌ CLI failed to start:', error);
    process.exit(1);
  });
}

export { NarrativeCLI };
