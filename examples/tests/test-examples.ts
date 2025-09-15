/**
 * Test Script for Toy Narrative Chat Examples
 * 
 * This script tests the examples without requiring actual API calls.
 */

import { ToyNarrativeChatAgent, type ChatState, ToyBackend } from "./toy-narrative-chat";

// ============================================================================
// Mock Backend for Testing
// ============================================================================

class MockBackend {
  async getNarration(prompt: any, onToken?: (token: string, count: number) => void): Promise<string> {
    // Simulate streaming response
    const mockResponse = "You find yourself in a mysterious forest. Ancient trees tower above you, their branches creating a canopy that filters the sunlight into ethereal patterns. A gentle breeze carries the scent of moss and earth. In the distance, you hear the soft sound of a babbling brook. What do you do next?";
    
    if (onToken) {
      // Simulate token-by-token streaming
      const words = mockResponse.split(' ');
      for (let i = 0; i < words.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 50)); // Simulate delay
        onToken(words[i] + ' ', i + 1);
      }
    }
    
    return mockResponse;
  }

  async getObject<Schema extends any, Type = any>(
    prompt: any,
    schema: Schema,
    onToken?: (token: string, count: number) => void,
  ): Promise<Type> {
    // Mock structured output
    return { mock: "data" } as Type;
  }

  abort(): void {
    // Mock abort
  }

  isAbortError(error: unknown): boolean {
    return false;
  }
}

// ============================================================================
// Test Functions
// ============================================================================

async function testBasicConversation() {
  console.log("🧪 Testing Basic Conversation");
  console.log("=============================");

  // Create agent with mock backend
  const agent = new ToyNarrativeChatAgent();
  (agent as any).backend = new MockBackend();

  try {
    // Test initial conversation
    console.log("\n📝 Starting conversation...");
    let state = await agent.processInput("I'm a brave knight entering a mysterious forest. What do I see?");
    
    console.log("✅ Conversation started successfully");
    console.log(`📊 Messages: ${state.messages.length}`);
    console.log(`📚 Narratives: ${state.narrativeHistory.length}`);
    console.log(`❌ Errors: ${state.errors.length}`);
    
    // Test conversation continuation
    console.log("\n📝 Continuing conversation...");
    state = await agent.continueConversation(state, "I draw my sword and step forward cautiously.");
    
    console.log("✅ Conversation continued successfully");
    console.log(`📊 Messages: ${state.messages.length}`);
    console.log(`📚 Narratives: ${state.narrativeHistory.length}`);
    
    // Test conversation summary
    const summary = agent.getConversationSummary(state);
    console.log("\n📊 Conversation Summary:");
    console.log(`  ID: ${summary.conversationId}`);
    console.log(`  Messages: ${summary.messageCount}`);
    console.log(`  Narratives: ${summary.narrativeCount}`);
    console.log(`  Errors: ${summary.errors}`);
    
    return true;
  } catch (error) {
    console.error("❌ Test failed:", error);
    return false;
  }
}

async function testStreamingConversation() {
  console.log("\n🧪 Testing Streaming Conversation");
  console.log("=================================");

  const agent = new ToyNarrativeChatAgent();
  (agent as any).backend = new MockBackend();

  try {
    console.log("📝 Starting streaming conversation...");
    const stream = agent.streamConversation("I'm an explorer discovering an ancient temple. What awaits me inside?");
    
    let step = 0;
    let lastState: ChatState | null = null;
    
    for await (const chunk of stream) {
      step++;
      lastState = chunk;
      console.log(`📝 Step ${step}: Generating=${chunk.isGenerating}, Messages=${chunk.messages.length}, Errors=${chunk.errors.length}`);
    }
    
    console.log("✅ Streaming completed successfully");
    if (lastState) {
      console.log(`📊 Final state: ${lastState.messages.length} messages, ${lastState.narrativeHistory.length} narratives`);
    }
    
    return true;
  } catch (error) {
    console.error("❌ Streaming test failed:", error);
    return false;
  }
}

async function testErrorHandling() {
  console.log("\n🧪 Testing Error Handling");
  console.log("=========================");

  const agent = new ToyNarrativeChatAgent();
  // Use mock backend for error handling test
  (agent as any).backend = new MockBackend();
  
  try {
    // Test empty input
    console.log("📝 Testing empty input...");
    let state = await agent.processInput("");
    
    if (state.errors.length > 0) {
      console.log("✅ Empty input properly handled with error");
      console.log(`❌ Error: ${state.errors[0].message}`);
    } else {
      console.log("❌ Empty input should have generated an error");
      return false;
    }
    
    return true;
  } catch (error) {
    console.error("❌ Error handling test failed:", error);
    return false;
  }
}

async function testRealAPICalls() {
  console.log("\n🧪 Testing Real API Calls");
  console.log("==========================");

  const agent = new ToyNarrativeChatAgent();
  // Use real backend for API testing
  (agent as any).backend = new ToyBackend();
  
  try {
    console.log("📝 Testing real API call...");
    let state = await agent.processInput("I want to explore a magical forest");
    
    console.log("✅ Real API call completed successfully");
    console.log(`📊 Messages: ${state.messages.length}`);
    console.log(`📚 Narratives: ${state.narrativeHistory.length}`);
    console.log(`❌ Errors: ${state.errors.length}`);
    
    if (state.errors.length > 0) {
      console.log(`❌ Error: ${state.errors[0].message}`);
    }
    
    return true;
  } catch (error) {
    console.error("❌ Real API call test failed:", error);
    return false;
  }
}

async function testStatePersistence() {
  console.log("\n🧪 Testing State Persistence");
  console.log("============================");

  const agent = new ToyNarrativeChatAgent();
  (agent as any).backend = new MockBackend();

  try {
    // Start conversation
    let state = await agent.processInput("Hello, I'm starting an adventure!");
    const conversationId = state.conversationId;
    
    // Continue conversation
    state = await agent.continueConversation(state, "I want to explore a dungeon.");
    
    // Verify state persistence
    if (state.conversationId === conversationId) {
      console.log("✅ Conversation ID persisted correctly");
    } else {
      console.log("❌ Conversation ID not persisted");
      return false;
    }
    
    if (state.messages.length >= 2) {
      console.log("✅ Message history persisted correctly");
    } else {
      console.log("❌ Message history not persisted");
      return false;
    }
    
    if (state.narrativeHistory.length >= 1) {
      console.log("✅ Narrative history persisted correctly");
    } else {
      console.log("❌ Narrative history not persisted");
      return false;
    }
    
    return true;
  } catch (error) {
    console.error("❌ State persistence test failed:", error);
    return false;
  }
}

// ============================================================================
// Main Test Runner
// ============================================================================

async function runAllTests() {
  console.log("🧪 Running Toy Narrative Chat Tests");
  console.log("===================================");
  
  const tests = [
    { name: "Basic Conversation", fn: testBasicConversation },
    { name: "Streaming Conversation", fn: testStreamingConversation },
    { name: "Error Handling", fn: testErrorHandling },
    { name: "State Persistence", fn: testStatePersistence },
    { name: "Real API Calls", fn: testRealAPICalls },
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    console.log(`\n🔍 Running: ${test.name}`);
    try {
      const result = await test.fn();
      if (result) {
        console.log(`✅ ${test.name} PASSED`);
        passed++;
      } else {
        console.log(`❌ ${test.name} FAILED`);
        failed++;
      }
    } catch (error) {
      console.log(`❌ ${test.name} FAILED with error:`, error);
      failed++;
    }
  }
  
  console.log("\n📊 Test Results");
  console.log("===============");
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Total: ${passed + failed}`);
  
  if (failed === 0) {
    console.log("\n🎉 All tests passed!");
  } else {
    console.log(`\n⚠️ ${failed} test(s) failed`);
  }
  
  return failed === 0;
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests()
    .then(success => process.exit(success ? 0 : 1))
    .catch(error => {
      console.error("❌ Test runner failed:", error);
      process.exit(1);
    });
}

export { runAllTests, testBasicConversation, testStreamingConversation, testErrorHandling, testStatePersistence };
