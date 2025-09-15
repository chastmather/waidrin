#!/usr/bin/env tsx

/**
 * Test script for Narrative CLI
 * 
 * This script tests the CLI functionality without requiring interactive input.
 */

import { NarrativeCLI } from './narrative-cli';

async function testNarrativeCLI(): Promise<void> {
  console.log('🧪 Testing Narrative CLI...\n');
  
  try {
    // Create CLI instance
    const cli = new (NarrativeCLI as any)();
    
    // Test slash commands
    console.log('Testing /help command:');
    await (cli as any).handleSlashCommand('/help');
    
    console.log('\nTesting /status command:');
    await (cli as any).handleSlashCommand('/status');
    
    console.log('\nTesting /list command:');
    await (cli as any).handleSlashCommand('/list');
    
    console.log('\n✅ CLI test completed successfully!');
    
  } catch (error) {
    console.error('❌ CLI test failed:', error);
    process.exit(1);
  }
}

// Run test
testNarrativeCLI();
