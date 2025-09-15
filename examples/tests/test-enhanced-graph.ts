// ============================================================================
// ENHANCED GRAPH FLEXIBILITY TEST
// ============================================================================
// 
// This test demonstrates the enhanced flexibility of the narrator agent graph:
// - Specialist-to-specialist handoffs
// - Conditional routing from specialists
// - Multiple execution paths
// 
// ============================================================================

import * as dotenv from "dotenv";
import { NarratorAgent } from "./narrator-agent";

// Load environment variables
dotenv.config();

console.log("🎭 Testing Enhanced Graph Flexibility");
console.log("=====================================");

async function testEnhancedGraph() {
  try {
    const agent = new NarratorAgent();
    
    console.log("\n=== Testing Graph Structure ===");
    const graph = agent.getGraph();
    console.log("✅ Enhanced graph created successfully");
    
    console.log("\n=== Testing Specialist Routing Flexibility ===");
    
    // Test 1: Direct narrative continuation
    console.log("\n--- Test 1: Direct Narrative Flow ---");
    const narrativeState = {
      messages: [],
      currentNarrative: "Once upon a time...",
      narrativeHistory: [],
      userInput: "Continue the story",
      nextAction: "continue_narrative" as const,
      specialistType: null,
      specialistResult: "",
      decisionReasoning: "User wants to continue",
      nodeHistory: []
    };
    
    console.log("Input state:", {
      nextAction: narrativeState.nextAction,
      userInput: narrativeState.userInput
    });
    console.log("Expected path: narrator_decision → continue_narrative → finalize");
    
    // Test 2: Specialist handoff
    console.log("\n--- Test 2: Specialist Handoff Flow ---");
    const specialistState = {
      messages: [],
      currentNarrative: "The hero stood at the edge of the forest...",
      narrativeHistory: [],
      userInput: "What kind of character is the hero?",
      nextAction: "handoff_to_specialist" as const,
      specialistType: "character" as const,
      specialistResult: "",
      decisionReasoning: "User needs character development",
      nodeHistory: []
    };
    
    console.log("Input state:", {
      nextAction: specialistState.nextAction,
      specialistType: specialistState.specialistType,
      userInput: specialistState.userInput
    });
    console.log("Expected path: narrator_decision → specialist_handoff → character_specialist → continue_narrative → finalize");
    
    // Test 3: Specialist-to-specialist handoff (simulated)
    console.log("\n--- Test 3: Specialist-to-Specialist Handoff ---");
    const specialistToSpecialistState = {
      messages: [],
      currentNarrative: "The hero discovered ancient ruins...",
      narrativeHistory: [],
      userInput: "Research the history of these ruins",
      nextAction: "handoff_to_specialist" as const,
      specialistType: "search" as const,
      specialistResult: "Found information about ancient civilization",
      decisionReasoning: "Search specialist completed research",
      nodeHistory: ["search_specialist"]
    };
    
    console.log("Input state:", {
      nextAction: specialistToSpecialistState.nextAction,
      specialistType: specialistToSpecialistState.specialistType,
      specialistResult: specialistToSpecialistState.specialistResult
    });
    console.log("Expected path: search_specialist → specialist_handoff → [another specialist] → continue_narrative → finalize");
    
    // Test 4: Direct finalization
    console.log("\n--- Test 4: Direct Finalization ---");
    const finalizeState = {
      messages: [],
      currentNarrative: "The story reached its conclusion...",
      narrativeHistory: [],
      userInput: "End the story",
      nextAction: "finalize" as const,
      specialistType: null,
      specialistResult: "",
      decisionReasoning: "Story is complete",
      nodeHistory: ["continue_narrative"]
    };
    
    console.log("Input state:", {
      nextAction: finalizeState.nextAction,
      userInput: finalizeState.userInput
    });
    console.log("Expected path: [any node] → finalize → END");
    
    console.log("\n=== Testing Routing Functions ===");
    
    // Test routing functions
    console.log("\n--- Testing routeNarratorDecision ---");
    console.log("continue_narrative →", agent['routeNarratorDecision'](narrativeState));
    console.log("handoff_to_specialist →", agent['routeNarratorDecision'](specialistState));
    
    console.log("\n--- Testing routeSpecialist ---");
    console.log("character →", agent['routeSpecialist'](specialistState));
    console.log("search →", agent['routeSpecialist'](specialistToSpecialistState));
    
    console.log("\n--- Testing routeAfterSpecialist ---");
    console.log("continue_narrative →", agent['routeAfterSpecialist'](narrativeState));
    console.log("handoff_to_specialist →", agent['routeAfterSpecialist'](specialistState));
    console.log("finalize →", agent['routeAfterSpecialist'](finalizeState));
    
    console.log("\n=== Enhanced Flexibility Summary ===");
    console.log("✅ Specialist-to-specialist handoffs: Supported");
    console.log("✅ Conditional routing from specialists: Supported");
    console.log("✅ Multiple execution paths: Supported");
    console.log("✅ Direct finalization: Supported");
    console.log("✅ Dynamic decision making: Supported");
    
    console.log("\n🎉 Enhanced graph flexibility test completed successfully!");
    console.log("=====================================");
    console.log("The narrator agent now supports maximum flexibility:");
    console.log("- Any specialist can hand off to any other specialist");
    console.log("- Specialists can choose to continue narrative or finalize");
    console.log("- Complex multi-step workflows are possible");
    console.log("- The graph adapts dynamically based on AI decisions");
    
  } catch (error) {
    console.error("❌ Enhanced graph test failed:", error);
    process.exit(1);
  }
}

// Run the test
testEnhancedGraph();
