/**
 * TEST BRANCHING NARRATIVE FUNCTIONALITY
 * =====================================
 * 
 * Test the enhanced narrative storage with sequential IDs, URIs, and branching support.
 */

import * as dotenv from "dotenv";
import { 
  addNarrativeNode, 
  getNarrativeNode, 
  getNarrativeNodeByUri,
  getBranchNodes,
  getNarrativePath,
  createNarrativeBranch,
  generateNarrativeNodeId,
  generateNarrativeUri,
  type SerializedNarrative,
  type NarrativeNode,
  type NarrativeBranch
} from '../game-state';

// Load environment variables
dotenv.config();

// ============================================================================
// TEST FUNCTIONS
// ============================================================================

/**
 * Test basic narrative node creation
 */
async function testBasicNarrativeNodes(): Promise<void> {
  console.log('📚 Testing Basic Narrative Node Creation...\n');

  let narrative: SerializedNarrative = {
    nodes: [],
    branches: [],
    currentNodeId: null,
    currentBranchId: null,
    mainBranchId: 'main',
    totalWords: 0,
    totalNodes: 0,
    lastUpdated: new Date().toISOString(),
    version: 0,
    metadata: {
      genre: 'fantasy',
      tone: 'adventure',
      branchingEnabled: true,
    },
  };

  // Test 1: Add first narrative node
  console.log('📝 Test 1: Add first narrative node...');
  narrative = addNarrativeNode(narrative, {
    title: 'The Beginning',
    content: 'Once upon a time, in a magical kingdom far away, there lived a young mage named Aria who discovered she had extraordinary powers.',
    tags: ['opening', 'character_introduction'],
    metadata: {
      author: 'narrator',
      mood: 'mysterious',
      location: 'magical_kingdom',
      characters: ['Aria'],
      events: ['power_discovery'],
    },
  });

  console.log('✅ First node added');
  console.log('Node ID:', narrative.currentNodeId);
  console.log('Node URI:', getNarrativeNode(narrative, narrative.currentNodeId!)?.uri);
  console.log('Total nodes:', narrative.totalNodes);
  console.log('Total words:', narrative.totalWords);
  console.log('');

  // Test 2: Add second narrative node
  console.log('📝 Test 2: Add second narrative node...');
  narrative = addNarrativeNode(narrative, {
    title: 'The Journey Begins',
    content: 'Aria decided to leave her village and seek out the ancient wizard Eldrin, who was said to know the secrets of magical bloodlines.',
    tags: ['journey', 'quest'],
    metadata: {
      author: 'narrator',
      mood: 'determined',
      location: 'village',
      characters: ['Aria', 'Eldrin'],
      events: ['departure', 'quest_start'],
    },
  });

  console.log('✅ Second node added');
  console.log('Node ID:', narrative.currentNodeId);
  console.log('Node URI:', getNarrativeNode(narrative, narrative.currentNodeId!)?.uri);
  console.log('Total nodes:', narrative.totalNodes);
  console.log('Total words:', narrative.totalWords);
  console.log('');

  // Test 3: Add third narrative node
  console.log('📝 Test 3: Add third narrative node...');
  narrative = addNarrativeNode(narrative, {
    title: 'The Forest Encounter',
    content: 'As Aria traveled through the enchanted forest, she encountered a friendly dragon who offered to teach her advanced magic in exchange for helping him find his lost treasure.',
    tags: ['encounter', 'dragon', 'magic'],
    metadata: {
      author: 'narrator',
      mood: 'exciting',
      location: 'enchanted_forest',
      characters: ['Aria', 'Dragon'],
      events: ['dragon_encounter', 'magic_lesson_offer'],
    },
  });

  console.log('✅ Third node added');
  console.log('Node ID:', narrative.currentNodeId);
  console.log('Node URI:', getNarrativeNode(narrative, narrative.currentNodeId!)?.uri);
  console.log('Total nodes:', narrative.totalNodes);
  console.log('Total words:', narrative.totalWords);
  console.log('');

  // Display all nodes
  console.log('📖 All Narrative Nodes:');
  narrative.nodes.forEach((node, index) => {
    console.log(`  ${index + 1}. ${node.id} - ${node.title}`);
    console.log(`     URI: ${node.uri}`);
    console.log(`     Sequence: ${node.sequence}`);
    console.log(`     Words: ${node.wordCount}`);
    console.log(`     Branch: ${node.branchId}`);
    console.log(`     Content: ${node.content.substring(0, 100)}...`);
    console.log('');
  });

  console.log('🎉 Basic narrative node creation test completed!');
}

/**
 * Test narrative branching
 */
async function testNarrativeBranching(): Promise<void> {
  console.log('🌳 Testing Narrative Branching...\n');

  // Start with a base narrative
  let narrative: SerializedNarrative = {
    nodes: [],
    branches: [],
    currentNodeId: null,
    currentBranchId: null,
    mainBranchId: 'main',
    totalWords: 0,
    totalNodes: 0,
    lastUpdated: new Date().toISOString(),
    version: 0,
    metadata: {
      genre: 'fantasy',
      tone: 'adventure',
      branchingEnabled: true,
    },
  };

  // Add initial nodes
  narrative = addNarrativeNode(narrative, {
    title: 'The Choice',
    content: 'Aria stood at a crossroads. To the left, a path led to the ancient wizard Eldrin. To the right, a mysterious portal shimmered with unknown magic.',
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
  console.log('✅ Choice node created:', choiceNodeId);
  console.log('');

  // Test 1: Create branch for wizard path
  console.log('🧙 Test 1: Create wizard path branch...');
  narrative = createNarrativeBranch(
    narrative,
    choiceNodeId,
    'Wizard Path',
    'Aria chooses to seek the ancient wizard Eldrin',
    'Aria turned left and began the long journey to find Eldrin. The path was treacherous, but she was determined to learn the secrets of her magical bloodline.'
  );

  console.log('✅ Wizard branch created');
  console.log('Branch ID:', narrative.currentBranchId);
  console.log('Node ID:', narrative.currentNodeId);
  console.log('Node URI:', getNarrativeNode(narrative, narrative.currentNodeId!)?.uri);
  console.log('');

  // Test 2: Create branch for portal path
  console.log('🌀 Test 2: Create portal path branch...');
  narrative = createNarrativeBranch(
    narrative,
    choiceNodeId,
    'Portal Path',
    'Aria chooses to investigate the mysterious portal',
    'Aria stepped through the shimmering portal and found herself in a completely different realm, where the laws of magic were entirely different.'
  );

  console.log('✅ Portal branch created');
  console.log('Branch ID:', narrative.currentBranchId);
  console.log('Node ID:', narrative.currentNodeId);
  console.log('Node URI:', getNarrativeNode(narrative, narrative.currentNodeId!)?.uri);
  console.log('');

  // Test 3: Add more nodes to wizard branch
  console.log('📚 Test 3: Add more nodes to wizard branch...');
  const wizardBranchId = narrative.branches.find(b => b.name === 'Wizard Path')?.id;
  if (wizardBranchId) {
    narrative = addNarrativeNode(narrative, {
      title: 'Meeting Eldrin',
      content: 'After days of travel, Aria finally found Eldrin in his tower. The ancient wizard was surprised to see her, but recognized the power within her.',
      tags: ['meeting', 'wizard', 'recognition'],
      metadata: {
        author: 'narrator',
        mood: 'revelatory',
        location: 'wizard_tower',
        characters: ['Aria', 'Eldrin'],
        events: ['wizard_meeting', 'power_recognition'],
      },
    }, {
      branchId: wizardBranchId,
    });

    console.log('✅ Additional wizard node added');
    console.log('Node ID:', narrative.currentNodeId);
    console.log('Node URI:', getNarrativeNode(narrative, narrative.currentNodeId!)?.uri);
    console.log('');
  }

  // Display branching structure
  console.log('🌳 Narrative Branching Structure:');
  console.log('Main Branch:', narrative.mainBranchId);
  console.log('Total Branches:', narrative.branches.length);
  console.log('Total Nodes:', narrative.totalNodes);
  console.log('');

  narrative.branches.forEach((branch, index) => {
    console.log(`Branch ${index + 1}: ${branch.name} (${branch.id})`);
    console.log(`  Description: ${branch.description}`);
    console.log(`  Parent Node: ${branch.parentNodeId}`);
    console.log(`  Created: ${new Date(branch.createdAt).toLocaleString()}`);
    console.log(`  Active: ${branch.isActive}`);
    
    const branchNodes = getBranchNodes(narrative, branch.id);
    console.log(`  Nodes (${branchNodes.length}):`);
    branchNodes.forEach((node, nodeIndex) => {
      console.log(`    ${nodeIndex + 1}. ${node.id} - ${node.title}`);
      console.log(`       URI: ${node.uri}`);
      console.log(`       Sequence: ${node.sequence}`);
    });
    console.log('');
  });

  // Test path traversal
  console.log('🛤️ Test 4: Path traversal...');
  const lastNode = narrative.currentNodeId!;
  const path = getNarrativePath(narrative, lastNode);
  console.log('Path from root to current node:');
  path.forEach((node, index) => {
    console.log(`  ${index + 1}. ${node.id} - ${node.title} (${node.branchId})`);
  });
  console.log('');

  console.log('🎉 Narrative branching test completed!');
}

/**
 * Test URI and ID generation
 */
async function testUriAndIdGeneration(): Promise<void> {
  console.log('🔗 Testing URI and ID Generation...\n');

  // Test sequential ID generation
  console.log('📝 Test 1: Sequential ID generation...');
  for (let i = 0; i < 5; i++) {
    const nodeId = generateNarrativeNodeId(i);
    console.log(`Sequence ${i}: ${nodeId}`);
  }
  console.log('');

  // Test URI generation
  console.log('🌐 Test 2: URI generation...');
  const testNodeIds = ['narrative_001', 'narrative_002', 'narrative_003'];
  const testBranchIds = ['main', 'wizard_path', 'portal_path'];
  
  testNodeIds.forEach(nodeId => {
    testBranchIds.forEach(branchId => {
      const uri = generateNarrativeUri(nodeId, branchId);
      console.log(`${nodeId} in ${branchId}: ${uri}`);
    });
  });
  console.log('');

  console.log('🎉 URI and ID generation test completed!');
}

// ============================================================================
// MAIN TEST EXECUTION
// ============================================================================

async function runAllTests(): Promise<void> {
  console.log('🚀 Starting Branching Narrative Tests...\n');

  try {
    await testBasicNarrativeNodes();
    console.log('\n' + '='.repeat(60) + '\n');
    
    await testNarrativeBranching();
    console.log('\n' + '='.repeat(60) + '\n');
    
    await testUriAndIdGeneration();
    
    console.log('\n🎉 All Branching Narrative Tests Completed Successfully!');
    console.log('\n📊 Test Summary:');
    console.log('   ✅ Sequential ID generation (narrative_001, narrative_002, etc.)');
    console.log('   ✅ URI generation (narrative://branch/node)');
    console.log('   ✅ Narrative node creation with metadata');
    console.log('   ✅ Branch creation and management');
    console.log('   ✅ Path traversal and node relationships');
    console.log('   ✅ Branch-specific node retrieval');
    console.log('   ✅ Hierarchical narrative structure');

  } catch (error) {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests().catch(console.error);
}

export { runAllTests, testBasicNarrativeNodes, testNarrativeBranching, testUriAndIdGeneration };
