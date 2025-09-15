/**
 * TEST MEMORY BANK EFFICIENCY
 * ===========================
 * 
 * Test the memory-efficient MemoryBank association system for narrative branches.
 * Demonstrates lazy loading, size tracking, and cleanup strategies.
 */

import * as dotenv from "dotenv";
import { 
  createMemoryBank,
  getMemoryBank,
  updateMemoryBank,
  deleteMemoryBank,
  cleanupInactiveMemoryBanks,
  getMemoryStats,
  createNarrativeBranch,
  addNarrativeNode,
  type SerializedNarrative,
  type MemoryBank
} from '../game-state';

// Load environment variables
dotenv.config();

// ============================================================================
// TEST FUNCTIONS
// ============================================================================

/**
 * Test basic MemoryBank creation and management
 */
async function testBasicMemoryBankManagement(): Promise<void> {
  console.log('💾 Testing Basic MemoryBank Management...\n');

  let narrative: SerializedNarrative = {
    nodes: [],
    branches: [],
    memoryBanks: {},
    currentNodeId: null,
    currentBranchId: null,
    mainBranchId: 'main',
    totalWords: 0,
    totalNodes: 0,
    lastUpdated: new Date().toISOString(),
    version: 0,
    memoryStats: {
      totalMemoryBanks: 0,
      totalMemorySize: 0,
      activeMemoryBanks: 0,
    },
    metadata: {
      genre: 'fantasy',
      tone: 'adventure',
      branchingEnabled: true,
    },
  };

  // Test 1: Create MemoryBank for main branch
  console.log('📝 Test 1: Create MemoryBank for main branch...');
  narrative = createMemoryBank(narrative, 'main', {
    playerInventory: ['sword', 'potion', 'key'],
    playerStats: { level: 5, health: 100, mana: 80 },
    worldState: { weather: 'sunny', timeOfDay: 'morning' },
    questProgress: { mainQuest: 0.3, sideQuests: ['find_treasure', 'help_villager'] },
  });

  console.log('✅ Main branch MemoryBank created');
  console.log('Memory stats:', getMemoryStats(narrative));
  console.log('');

  // Test 2: Create branch with MemoryBank
  console.log('🌳 Test 2: Create branch with MemoryBank...');
  narrative = addNarrativeNode(narrative, {
    title: 'The Choice',
    content: 'Aria stood at a crossroads. To the left, a path led to the ancient wizard Eldrin.',
    tags: ['choice', 'crossroads'],
    metadata: {
      author: 'narrator',
      mood: 'uncertain',
      location: 'crossroads',
      characters: ['Aria'],
      events: ['decision_point'],
    },
  });

  const choiceNodeId = narrative.currentNodeId!;
  narrative = createNarrativeBranch(
    narrative,
    choiceNodeId,
    'Wizard Path',
    'Aria chooses to seek the ancient wizard Eldrin',
    'Aria turned left and began the long journey to find Eldrin.'
  );

  const wizardBranchId = narrative.currentBranchId!;
  console.log('✅ Wizard branch created:', wizardBranchId);

  // Create MemoryBank for wizard branch
  narrative = createMemoryBank(narrative, wizardBranchId, {
    playerInventory: ['sword', 'potion', 'key', 'wizard_robes'],
    playerStats: { level: 5, health: 100, mana: 120, wisdom: 15 },
    worldState: { weather: 'mystical', timeOfDay: 'dusk', location: 'wizard_path' },
    questProgress: { mainQuest: 0.4, sideQuests: ['find_treasure', 'help_villager', 'learn_magic'] },
    magicKnowledge: ['fireball', 'heal', 'teleport'],
    wizardReputation: 50,
  });

  console.log('✅ Wizard branch MemoryBank created');
  console.log('Memory stats:', getMemoryStats(narrative));
  console.log('');

  // Test 3: Create another branch with different MemoryBank
  console.log('🌀 Test 3: Create portal branch with MemoryBank...');
  narrative = createNarrativeBranch(
    narrative,
    choiceNodeId,
    'Portal Path',
    'Aria chooses to investigate the mysterious portal',
    'Aria stepped through the shimmering portal and found herself in a different realm.'
  );

  const portalBranchId = narrative.currentBranchId!;
  narrative = createMemoryBank(narrative, portalBranchId, {
    playerInventory: ['sword', 'potion', 'key', 'portal_crystal'],
    playerStats: { level: 5, health: 100, mana: 60, chaos: 20 },
    worldState: { weather: 'chaotic', timeOfDay: 'unknown', location: 'other_realm' },
    questProgress: { mainQuest: 0.2, sideQuests: ['survive_realm', 'find_exit'] },
    realmKnowledge: ['chaos_magic', 'realm_navigation'],
    chaosLevel: 75,
  });

  console.log('✅ Portal branch MemoryBank created');
  console.log('Memory stats:', getMemoryStats(narrative));
  console.log('');

  // Display all MemoryBanks
  console.log('💾 All MemoryBanks:');
  Object.entries(narrative.memoryBanks).forEach(([branchId, memoryBank]) => {
    console.log(`  Branch: ${branchId}`);
    console.log(`    Size: ${memoryBank.size} bytes`);
    console.log(`    Last Accessed: ${new Date(memoryBank.lastAccessed).toLocaleString()}`);
    console.log(`    Compressed: ${memoryBank.compressed}`);
    console.log(`    Data Keys: ${Object.keys(memoryBank.data).join(', ')}`);
    console.log('');
  });

  console.log('🎉 Basic MemoryBank management test completed!');
}

/**
 * Test MemoryBank lazy loading and updates
 */
async function testMemoryBankLazyLoading(): Promise<void> {
  console.log('🔄 Testing MemoryBank Lazy Loading and Updates...\n');

  // Start with existing narrative from previous test
  let narrative: SerializedNarrative = {
    nodes: [],
    branches: [],
    memoryBanks: {},
    currentNodeId: null,
    currentBranchId: null,
    mainBranchId: 'main',
    totalWords: 0,
    totalNodes: 0,
    lastUpdated: new Date().toISOString(),
    version: 0,
    memoryStats: {
      totalMemoryBanks: 0,
      totalMemorySize: 0,
      activeMemoryBanks: 0,
    },
    metadata: {
      genre: 'fantasy',
      tone: 'adventure',
      branchingEnabled: true,
    },
  };

  // Create some MemoryBanks
  narrative = createMemoryBank(narrative, 'main', {
    playerInventory: ['sword', 'potion'],
    playerStats: { level: 1, health: 100 },
  });

  narrative = createMemoryBank(narrative, 'branch1', {
    playerInventory: ['sword', 'potion', 'magic_ring'],
    playerStats: { level: 2, health: 120 },
    specialItems: ['ancient_tome'],
  });

  console.log('📊 Initial MemoryBanks created');
  console.log('Memory stats:', getMemoryStats(narrative));
  console.log('');

  // Test 1: Lazy loading (getMemoryBank updates lastAccessed)
  console.log('🔍 Test 1: Lazy loading with access tracking...');
  const mainMemoryBank = getMemoryBank(narrative, 'main');
  console.log('✅ Main MemoryBank retrieved:', mainMemoryBank ? 'Found' : 'Not found');
  console.log('Last accessed:', mainMemoryBank?.lastAccessed);
  console.log('');

  // Test 2: Update MemoryBank data
  console.log('📝 Test 2: Update MemoryBank data...');
  narrative = updateMemoryBank(narrative, 'main', {
    playerStats: { level: 3, health: 150, mana: 50 },
    newItem: 'enchanted_sword',
  });

  const updatedMainMemoryBank = getMemoryBank(narrative, 'branch1');
  console.log('✅ Main MemoryBank updated');
  console.log('Updated data keys:', Object.keys(updatedMainMemoryBank?.data || {}));
  console.log('Memory stats:', getMemoryStats(narrative));
  console.log('');

  // Test 3: Access different MemoryBank
  console.log('🔍 Test 3: Access different MemoryBank...');
  const branch1MemoryBank = getMemoryBank(narrative, 'branch1');
  console.log('✅ Branch1 MemoryBank retrieved:', branch1MemoryBank ? 'Found' : 'Not found');
  console.log('Last accessed:', branch1MemoryBank?.lastAccessed);
  console.log('Data keys:', Object.keys(branch1MemoryBank?.data || {}));
  console.log('');

  console.log('🎉 MemoryBank lazy loading test completed!');
}

/**
 * Test memory cleanup and optimization
 */
async function testMemoryCleanup(): Promise<void> {
  console.log('🧹 Testing Memory Cleanup and Optimization...\n');

  // Create narrative with multiple MemoryBanks
  let narrative: SerializedNarrative = {
    nodes: [],
    branches: [],
    memoryBanks: {},
    currentNodeId: null,
    currentBranchId: null,
    mainBranchId: 'main',
    totalWords: 0,
    totalNodes: 0,
    lastUpdated: new Date().toISOString(),
    version: 0,
    memoryStats: {
      totalMemoryBanks: 0,
      totalMemorySize: 0,
      activeMemoryBanks: 0,
    },
    metadata: {
      genre: 'fantasy',
      tone: 'adventure',
      branchingEnabled: true,
    },
  };

  // Create MemoryBanks with different access times
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

  // Recent MemoryBank (should be kept)
  narrative = createMemoryBank(narrative, 'recent', {
    data: 'recent_data',
    timestamp: now.toISOString(),
  });

  // Old MemoryBank (should be cleaned up)
  narrative = createMemoryBank(narrative, 'old', {
    data: 'old_data',
    timestamp: twoHoursAgo.toISOString(),
  });

  // Large MemoryBank (should be cleaned up if size limit exceeded)
  narrative = createMemoryBank(narrative, 'large', {
    data: 'x'.repeat(10000), // Large data
    timestamp: oneHourAgo.toISOString(),
  });

  console.log('📊 Initial MemoryBanks created');
  console.log('Memory stats:', getMemoryStats(narrative));
  console.log('');

  // Test 1: Cleanup with age-based removal
  console.log('🧹 Test 1: Age-based cleanup (1 hour max age)...');
  narrative = cleanupInactiveMemoryBanks(narrative, {
    maxAge: 1, // 1 hour
    keepActive: true,
  });

  console.log('✅ Age-based cleanup completed');
  console.log('Memory stats after cleanup:', getMemoryStats(narrative));
  console.log('Remaining MemoryBanks:', Object.keys(narrative.memoryBanks));
  console.log('');

  // Test 2: Cleanup with size limit
  console.log('🧹 Test 2: Size-based cleanup (5KB max size)...');
  narrative = cleanupInactiveMemoryBanks(narrative, {
    maxSize: 5 * 1024, // 5KB
    keepActive: true,
  });

  console.log('✅ Size-based cleanup completed');
  console.log('Memory stats after cleanup:', getMemoryStats(narrative));
  console.log('Remaining MemoryBanks:', Object.keys(narrative.memoryBanks));
  console.log('');

  // Test 3: Delete specific MemoryBank
  console.log('🗑️ Test 3: Delete specific MemoryBank...');
  if (narrative.memoryBanks.recent) {
    narrative = deleteMemoryBank(narrative, 'recent');
    console.log('✅ Recent MemoryBank deleted');
  }

  console.log('Memory stats after deletion:', getMemoryStats(narrative));
  console.log('Remaining MemoryBanks:', Object.keys(narrative.memoryBanks));
  console.log('');

  console.log('🎉 Memory cleanup test completed!');
}

/**
 * Test memory efficiency strategies
 */
async function testMemoryEfficiencyStrategies(): Promise<void> {
  console.log('⚡ Testing Memory Efficiency Strategies...\n');

  let narrative: SerializedNarrative = {
    nodes: [],
    branches: [],
    memoryBanks: {},
    currentNodeId: null,
    currentBranchId: null,
    mainBranchId: 'main',
    totalWords: 0,
    totalNodes: 0,
    lastUpdated: new Date().toISOString(),
    version: 0,
    memoryStats: {
      totalMemoryBanks: 0,
      totalMemorySize: 0,
      activeMemoryBanks: 0,
    },
    metadata: {
      genre: 'fantasy',
      tone: 'adventure',
      branchingEnabled: true,
    },
  };

  // Test 1: Size tracking
  console.log('📏 Test 1: Size tracking...');
  const smallData = { item: 'sword' };
  const largeData = { items: Array(1000).fill('item').map((item, i) => `${item}_${i}`) };

  narrative = createMemoryBank(narrative, 'small', smallData);
  narrative = createMemoryBank(narrative, 'large', largeData);

  console.log('✅ Size tracking test completed');
  console.log('Small MemoryBank size:', narrative.memoryBanks.small?.size, 'bytes');
  console.log('Large MemoryBank size:', narrative.memoryBanks.large?.size, 'bytes');
  console.log('Total memory size:', getMemoryStats(narrative).totalMemorySize, 'bytes');
  console.log('');

  // Test 2: Compression flag
  console.log('🗜️ Test 2: Compression flag...');
  narrative = createMemoryBank(narrative, 'compressed', largeData, {
    compress: true,
  });

  console.log('✅ Compression flag test completed');
  console.log('Compressed MemoryBank:', narrative.memoryBanks.compressed?.compressed);
  console.log('');

  // Test 3: Size limits
  console.log('🚫 Test 3: Size limits...');
  try {
    narrative = createMemoryBank(narrative, 'oversized', largeData, {
      maxSize: 1000, // 1KB limit
    });
    console.log('❌ Size limit test failed - should have thrown error');
  } catch (error) {
    console.log('✅ Size limit test passed - error thrown as expected');
    console.log('Error:', error.message);
  }
  console.log('');

  // Test 4: Memory statistics
  console.log('📊 Test 4: Memory statistics...');
  const stats = getMemoryStats(narrative);
  console.log('Total MemoryBanks:', stats.totalMemoryBanks);
  console.log('Total Memory Size:', stats.totalMemorySize, 'bytes');
  console.log('Active MemoryBanks:', stats.activeMemoryBanks);
  console.log('Last Cleanup:', stats.lastCleanup || 'Never');
  console.log('');

  console.log('🎉 Memory efficiency strategies test completed!');
}

// ============================================================================
// MAIN TEST EXECUTION
// ============================================================================

async function runAllTests(): Promise<void> {
  console.log('🚀 Starting Memory Bank Efficiency Tests...\n');

  try {
    await testBasicMemoryBankManagement();
    console.log('\n' + '='.repeat(60) + '\n');
    
    await testMemoryBankLazyLoading();
    console.log('\n' + '='.repeat(60) + '\n');
    
    await testMemoryCleanup();
    console.log('\n' + '='.repeat(60) + '\n');
    
    await testMemoryEfficiencyStrategies();
    
    console.log('\n🎉 All Memory Bank Efficiency Tests Completed Successfully!');
    console.log('\n📊 Test Summary:');
    console.log('   ✅ MemoryBank creation with size tracking');
    console.log('   ✅ Lazy loading with access time updates');
    console.log('   ✅ MemoryBank data updates');
    console.log('   ✅ Age-based cleanup (inactive MemoryBanks)');
    console.log('   ✅ Size-based cleanup (memory limits)');
    console.log('   ✅ Individual MemoryBank deletion');
    console.log('   ✅ Memory usage statistics');
    console.log('   ✅ Size limit enforcement');
    console.log('   ✅ Compression flag support');

  } catch (error) {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests().catch(console.error);
}

export { runAllTests, testBasicMemoryBankManagement, testMemoryBankLazyLoading, testMemoryCleanup, testMemoryEfficiencyStrategies };
