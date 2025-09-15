// ============================================================================
// NARRATOR AGENT TEST SUITE
// ============================================================================
// 
// This tests the narrator agent with various scenarios to demonstrate
// the decision making and specialist handoff functionality.
// 
// ============================================================================

import { NarratorAgent } from '../narrator-agent';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// ============================================================================
// TEST FUNCTIONS
// ============================================================================

/**
 * Test basic narrator functionality
 */
async function testBasicNarrator(): Promise<void> {
  console.log('\n=== Testing Basic Narrator ===');
  
  try {
    const narrator = new NarratorAgent();
    
    console.log('Testing simple narrative continuation...');
    await narrator.startConversation('Tell me a story about a brave knight', 'test_basic_1');
    
    console.log('✅ Basic narrator test passed');
  } catch (error) {
    console.error('❌ Basic narrator test failed:', error);
    throw error;
  }
}

/**
 * Test search specialist handoff
 */
async function testSearchSpecialist(): Promise<void> {
  console.log('\n=== Testing Search Specialist ===');
  
  try {
    const narrator = new NarratorAgent();
    
    console.log('Testing search specialist handoff...');
    await narrator.startConversation('I need to know more about the ancient magic system in this world', 'test_search_1');
    
    console.log('✅ Search specialist test passed');
  } catch (error) {
    console.error('❌ Search specialist test failed:', error);
    throw error;
  }
}

/**
 * Test character specialist handoff
 */
async function testCharacterSpecialist(): Promise<void> {
  console.log('\n=== Testing Character Specialist ===');
  
  try {
    const narrator = new NarratorAgent();
    
    console.log('Testing character specialist handoff...');
    await narrator.startConversation('Develop the backstory of the main character', 'test_character_1');
    
    console.log('✅ Character specialist test passed');
  } catch (error) {
    console.error('❌ Character specialist test failed:', error);
    throw error;
  }
}

/**
 * Test world building specialist handoff
 */
async function testWorldBuildingSpecialist(): Promise<void> {
  console.log('\n=== Testing World Building Specialist ===');
  
  try {
    const narrator = new NarratorAgent();
    
    console.log('Testing world building specialist handoff...');
    await narrator.startConversation('Create a detailed description of the capital city', 'test_world_1');
    
    console.log('✅ World building specialist test passed');
  } catch (error) {
    console.error('❌ World building specialist test failed:', error);
    throw error;
  }
}

/**
 * Test dialogue specialist handoff
 */
async function testDialogueSpecialist(): Promise<void> {
  console.log('\n=== Testing Dialogue Specialist ===');
  
  try {
    const narrator = new NarratorAgent();
    
    console.log('Testing dialogue specialist handoff...');
    await narrator.startConversation('Write a conversation between the hero and the villain', 'test_dialogue_1');
    
    console.log('✅ Dialogue specialist test passed');
  } catch (error) {
    console.error('❌ Dialogue specialist test failed:', error);
    throw error;
  }
}

/**
 * Test multi-turn conversation with different specialist types
 */
async function testMultiTurnConversation(): Promise<void> {
  console.log('\n=== Testing Multi-Turn Conversation ===');
  
  try {
    const narrator = new NarratorAgent();
    const threadId = 'test_multi_turn_1';
    
    console.log('Turn 1: Starting story...');
    await narrator.startConversation('Begin a fantasy adventure story', threadId);
    
    console.log('Turn 2: Character development...');
    await narrator.startConversation('Tell me about the main character\'s personality', threadId);
    
    console.log('Turn 3: World building...');
    await narrator.startConversation('Describe the magical forest they are entering', threadId);
    
    console.log('Turn 4: Dialogue...');
    await narrator.startConversation('Write dialogue between the character and a wise old tree', threadId);
    
    console.log('Turn 5: Search for information...');
    await narrator.startConversation('What are the dangers of this forest?', threadId);
    
    console.log('✅ Multi-turn conversation test passed');
  } catch (error) {
    console.error('❌ Multi-turn conversation test failed:', error);
    throw error;
  }
}

/**
 * Test decision making edge cases
 */
async function testDecisionEdgeCases(): Promise<void> {
  console.log('\n=== Testing Decision Edge Cases ===');
  
  try {
    const narrator = new NarratorAgent();
    
    // Test ambiguous input
    console.log('Testing ambiguous input...');
    await narrator.startConversation('I want to know more about the story', 'test_edge_1');
    
    // Test clear narrative continuation
    console.log('Testing clear narrative continuation...');
    await narrator.startConversation('The knight continued walking through the dark forest', 'test_edge_2');
    
    // Test mixed request
    console.log('Testing mixed request...');
    await narrator.startConversation('Continue the story and tell me about the character\'s motivation', 'test_edge_3');
    
    console.log('✅ Decision edge cases test passed');
  } catch (error) {
    console.error('❌ Decision edge cases test failed:', error);
    throw error;
  }
}

/**
 * Test graph structure and routing
 */
async function testGraphStructure(): Promise<void> {
  console.log('\n=== Testing Graph Structure ===');
  
  try {
    const narrator = new NarratorAgent();
    const graph = narrator.getGraph();
    
    console.log('Graph nodes:', Object.keys(graph.nodes));
    console.log('Graph edges:', graph.edges);
    
    // Test that all expected nodes exist
    const expectedNodes = [
      'narrator_decision',
      'continue_narrative', 
      'specialist_handoff',
      'search_specialist',
      'character_specialist',
      'world_building_specialist',
      'dialogue_specialist',
      'finalize'
    ];
    
    for (const node of expectedNodes) {
      if (!(node in graph.nodes)) {
        throw new Error(`Missing expected node: ${node}`);
      }
    }
    
    console.log('✅ Graph structure test passed');
  } catch (error) {
    console.error('❌ Graph structure test failed:', error);
    throw error;
  }
}

// ============================================================================
// MAIN TEST RUNNER
// ============================================================================

/**
 * Run all narrator agent tests
 */
async function runAllTests(): Promise<void> {
  console.log('🎭 Starting Narrator Agent Test Suite');
  console.log('=====================================');
  
  try {
    // Test basic functionality
    await testBasicNarrator();
    
    // Test individual specialists
    await testSearchSpecialist();
    await testCharacterSpecialist();
    await testWorldBuildingSpecialist();
    await testDialogueSpecialist();
    
    // Test complex scenarios
    await testMultiTurnConversation();
    await testDecisionEdgeCases();
    
    // Test technical aspects
    await testGraphStructure();
    
    console.log('\n🎉 All narrator agent tests passed!');
    console.log('=====================================');
    
  } catch (error) {
    console.error('\n💥 Narrator agent test suite failed:', error);
    process.exit(1);
  }
}

// ============================================================================
// RUN TESTS
// ============================================================================

if (require.main === module) {
  runAllTests().catch(console.error);
}

export { runAllTests };
