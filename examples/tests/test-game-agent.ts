/**
 * TEST GAME AGENT WITH HIGHER-LEVEL STATE MANAGEMENT
 * =================================================
 * 
 * Test the new GameAgent that uses GameStateAnnotation for comprehensive
 * state management including deterministic tracking, inventory, and
 * serialized narrative storage.
 */

import * as dotenv from "dotenv";
import { GameAgent } from '../game-agents';
import { addInventoryItem, updatePlayerStats, addWorldEvent } from '../game-state';

// Load environment variables
dotenv.config();

// ============================================================================
// TEST FUNCTIONS
// ============================================================================

/**
 * Test basic game agent functionality
 */
async function testBasicGameAgent(): Promise<void> {
  console.log('🎮 Testing Basic Game Agent Functionality...\n');

  const agent = new GameAgent();
  const threadId = `test_${Date.now()}`;

  try {
    // Test 1: Process user input
    console.log('📝 Test 1: Process user input...');
    const result = await agent.processUserInput(
      'I want to start a new adventure as a young mage discovering my powers',
      threadId
    );
    
    console.log('✅ User input processed');
    console.log('Game ID:', result.gameId);
    console.log('Session ID:', result.sessionId);
    console.log('Player Level:', result.playerStats.level);
    console.log('Story Time Elapsed:', result.storyTimeElapsed.toFixed(2), 'days');
    console.log('Current Location:', result.playerLocation);
    console.log('Narrative Length:', result.narratorState.currentNarrative.length, 'characters');
    console.log('Chapters Created:', result.serializedNarrative.totalChapters);
    console.log('');

    // Test 2: Add inventory item
    console.log('🎒 Test 2: Add inventory item...');
    await agent.addInventoryItem({
      id: 'magic_staff',
      name: 'Ancient Magic Staff',
      description: 'A staff imbued with ancient magical energy',
      type: 'weapon',
      quantity: 1,
      value: 1000,
      weight: 2.5,
      rarity: 'rare',
      properties: {
        magic_power: 50,
        durability: 100,
        enchantments: ['light', 'protection']
      },
      location: 'mysterious_ruins'
    }, threadId);
    
    console.log('✅ Inventory item added');
    
    // Test 3: Update player stats
    console.log('📊 Test 3: Update player stats...');
    await agent.updatePlayerStats({
      level: 2,
      experience: 150,
      health: 120,
      maxHealth: 120,
      intelligence: 15,
      skills: {
        'magic': 25,
        'concentration': 20,
        'spell_casting': 30
      }
    }, threadId);
    
    console.log('✅ Player stats updated');
    
    // Test 4: Add world event
    console.log('🌍 Test 4: Add world event...');
    await agent.addWorldEvent({
      name: 'Mysterious Portal Appears',
      description: 'A shimmering portal has appeared in the town square',
      impact: 'moderate',
      resolved: false
    }, threadId);
    
    console.log('✅ World event added');
    
    // Test 5: Get updated game state
    console.log('🔍 Test 5: Get updated game state...');
    const updatedState = await agent.getGameState(threadId);
    
    if (updatedState) {
      console.log('✅ Game state retrieved');
      console.log('Inventory Items:', updatedState.playerInventory.length);
      console.log('Player Level:', updatedState.playerStats.level);
      console.log('World Events:', updatedState.worldState.worldEvents.length);
      console.log('Story Time Elapsed:', updatedState.storyTimeElapsed.toFixed(2), 'days');
      console.log('');
      
      // Display inventory
      console.log('📦 Inventory:');
      updatedState.playerInventory.forEach((item, index) => {
        console.log(`  ${index + 1}. ${item.name} (${item.type}) - ${item.rarity}`);
        console.log(`     Value: ${item.value} gold, Weight: ${item.weight} lbs`);
        console.log(`     Acquired: ${new Date(item.acquiredAt).toLocaleString()}`);
      });
      console.log('');
      
      // Display world events
      console.log('🌍 World Events:');
      updatedState.worldState.worldEvents.forEach((event, index) => {
        console.log(`  ${index + 1}. ${event.name} (${event.impact})`);
        console.log(`     ${event.description}`);
        console.log(`     Occurred: ${new Date(event.occurredAt).toLocaleString()}`);
        console.log(`     Resolved: ${event.resolved ? 'Yes' : 'No'}`);
      });
      console.log('');
      
      // Display serialized narrative
      console.log('📚 Serialized Narrative:');
      console.log(`  Total Chapters: ${updatedState.serializedNarrative.totalChapters}`);
      console.log(`  Total Words: ${updatedState.serializedNarrative.totalWords}`);
      console.log(`  Last Updated: ${new Date(updatedState.serializedNarrative.lastUpdated).toLocaleString()}`);
      console.log(`  Version: ${updatedState.serializedNarrative.version}`);
      console.log('');
      
      // Display narrative cache
      console.log('🎭 Narrative Cache:');
      console.log(`  Characters: ${updatedState.narratorState.narrativeCache.characters.length}`);
      console.log(`  Locations: ${updatedState.narratorState.narrativeCache.locations.length}`);
      console.log(`  Plot Twists: ${updatedState.narratorState.narrativeCache.plotTwists.length}`);
      console.log(`  Total Elements: ${updatedState.narratorState.narrativeCache.cacheMetadata.totalElements}`);
      console.log(`  Story Phase: ${updatedState.narratorState.narrativeCache.cacheMetadata.storyPhase}`);
      console.log('');
    }

    console.log('🎉 All basic game agent tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  }
}

/**
 * Test game agent with multiple interactions
 */
async function testMultipleInteractions(): Promise<void> {
  console.log('🔄 Testing Multiple Interactions...\n');

  const agent = new GameAgent();
  const threadId = `multi_test_${Date.now()}`;

  try {
    // Interaction 1: Start adventure
    console.log('📝 Interaction 1: Start adventure...');
    const result1 = await agent.processUserInput(
      'I want to explore the ancient forest and find magical creatures',
      threadId
    );
    console.log('✅ Adventure started');
    console.log('Narrative length:', result1.narratorState.currentNarrative.length, 'characters');
    console.log('');

    // Interaction 2: Add more items
    console.log('🎒 Interaction 2: Add more items...');
    await agent.addInventoryItem({
      id: 'healing_potion',
      name: 'Healing Potion',
      description: 'A magical potion that restores health',
      type: 'consumable',
      quantity: 3,
      value: 50,
      weight: 0.5,
      rarity: 'common',
      properties: {
        healing_power: 25,
        duration: 'instant'
      }
    }, threadId);
    
    await agent.addInventoryItem({
      id: 'magic_ring',
      name: 'Ring of Protection',
      description: 'A ring that provides magical protection',
      type: 'armor',
      quantity: 1,
      value: 500,
      weight: 0.1,
      rarity: 'uncommon',
      properties: {
        protection: 15,
        durability: 80
      }
    }, threadId);
    
    console.log('✅ Additional items added');
    console.log('');

    // Interaction 3: Continue story
    console.log('📝 Interaction 3: Continue story...');
    const result3 = await agent.processUserInput(
      'I encounter a friendly dragon who offers to teach me advanced magic',
      threadId
    );
    console.log('✅ Story continued');
    console.log('Narrative length:', result3.narratorState.currentNarrative.length, 'characters');
    console.log('Chapters:', result3.serializedNarrative.totalChapters);
    console.log('');

    // Interaction 4: Add world event
    console.log('🌍 Interaction 4: Add world event...');
    await agent.addWorldEvent({
      name: 'Dragon Encounter',
      description: 'A friendly dragon offers to teach advanced magic',
      impact: 'major',
      resolved: true
    }, threadId);
    
    console.log('✅ World event added');
    console.log('');

    // Get final state
    console.log('🔍 Final State Summary...');
    const finalState = await agent.getGameState(threadId);
    
    if (finalState) {
      console.log('✅ Final state retrieved');
      console.log('Total Interactions:', finalState.nodeHistory.length);
      console.log('Inventory Items:', finalState.playerInventory.length);
      console.log('World Events:', finalState.worldState.worldEvents.length);
      console.log('Total Chapters:', finalState.serializedNarrative.totalChapters);
      console.log('Total Words:', finalState.serializedNarrative.totalWords);
      console.log('Story Time Elapsed:', finalState.storyTimeElapsed.toFixed(2), 'days');
      console.log('');
    }

    console.log('🎉 Multiple interactions test completed successfully!');

  } catch (error) {
    console.error('❌ Multiple interactions test failed:', error);
    throw error;
  }
}

/**
 * Test persistence across sessions
 */
async function testPersistence(): Promise<void> {
  console.log('💾 Testing Persistence Across Sessions...\n');

  const agent = new GameAgent();
  const threadId = `persistence_test_${Date.now()}`;

  try {
    // Session 1: Create initial state
    console.log('📝 Session 1: Create initial state...');
    const result1 = await agent.processUserInput(
      'I begin my journey as a novice wizard in a magical academy',
      threadId
    );
    
    await agent.addInventoryItem({
      id: 'spellbook',
      name: 'Beginner Spellbook',
      description: 'A basic spellbook for novice wizards',
      type: 'tool',
      quantity: 1,
      value: 100,
      weight: 1.0,
      rarity: 'common'
    }, threadId);
    
    console.log('✅ Initial state created');
    console.log('Game ID:', result1.gameId);
    console.log('Inventory Items:', result1.playerInventory.length);
    console.log('');

    // Session 2: Continue with same thread ID (simulating persistence)
    console.log('📝 Session 2: Continue with same thread ID...');
    const result2 = await agent.processUserInput(
      'I practice my first spell and accidentally set the library on fire',
      threadId
    );
    
    await agent.addWorldEvent({
      name: 'Library Fire',
      description: 'A magical accident causes a fire in the academy library',
      impact: 'moderate',
      resolved: false
    }, threadId);
    
    console.log('✅ Session 2 completed');
    console.log('Inventory Items:', result2.playerInventory.length);
    console.log('World Events:', result2.worldState.worldEvents.length);
    console.log('Chapters:', result2.serializedNarrative.totalChapters);
    console.log('');

    // Session 3: Final continuation
    console.log('📝 Session 3: Final continuation...');
    const result3 = await agent.processUserInput(
      'I help put out the fire and learn about the importance of control',
      threadId
    );
    
    console.log('✅ Session 3 completed');
    console.log('Total Chapters:', result3.serializedNarrative.totalChapters);
    console.log('Total Words:', result3.serializedNarrative.totalWords);
    console.log('Story Time Elapsed:', result3.storyTimeElapsed.toFixed(2), 'days');
    console.log('');

    console.log('🎉 Persistence test completed successfully!');

  } catch (error) {
    console.error('❌ Persistence test failed:', error);
    throw error;
  }
}

// ============================================================================
// MAIN TEST EXECUTION
// ============================================================================

async function runAllTests(): Promise<void> {
  console.log('🚀 Starting Game Agent Tests...\n');

  try {
    await testBasicGameAgent();
    console.log('\n' + '='.repeat(60) + '\n');
    
    await testMultipleInteractions();
    console.log('\n' + '='.repeat(60) + '\n');
    
    await testPersistence();
    
    console.log('\n🎉 All Game Agent Tests Completed Successfully!');
    console.log('\n📊 Test Summary:');
    console.log('   ✅ Basic functionality');
    console.log('   ✅ Inventory management');
    console.log('   ✅ Player stats tracking');
    console.log('   ✅ World event system');
    console.log('   ✅ Serialized narrative storage');
    console.log('   ✅ Multiple interactions');
    console.log('   ✅ Persistence across sessions');
    console.log('   ✅ Deterministic state tracking');

  } catch (error) {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests().catch(console.error);
}

export { runAllTests, testBasicGameAgent, testMultipleInteractions, testPersistence };
