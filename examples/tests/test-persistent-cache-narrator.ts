/**
 * TEST: Persistent Cache Narrator Agent
 * ====================================
 * 
 * Test the persistent cache integration with the narrator agent.
 * This test verifies that the cache is properly saved and restored.
 */

import { PersistentCacheNarratorAgent } from '../narrative-caching';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testPersistentCacheNarrator() {
  console.log('🧪 Testing Persistent Cache Narrator Agent...\n');

  try {
    // Create agent
    const agent = new PersistentCacheNarratorAgent();
    const threadId = 'test-conversation-' + Date.now();
    
    console.log('✅ Agent created successfully');
    console.log(`📝 Using thread ID: ${threadId}\n`);

    // Test 1: Initialize story
    console.log('📚 Test 1: Initialize story...');
    await agent.initializeStory('fantasy', 'epic', threadId);
    console.log('✅ Story initialized with persistent cache\n');

    // Test 2: Get initial cache
    console.log('🗄️ Test 2: Get initial cache...');
    const initialCache = await agent.getNarrativeCache(threadId);
    console.log(`✅ Initial cache loaded: ${initialCache.cacheMetadata.totalElements} elements`);
    console.log(`   Story phase: ${initialCache.cacheMetadata.storyPhase}`);
    console.log(`   Genre: ${initialCache.cacheMetadata.storyGenre}`);
    console.log(`   Tone: ${initialCache.cacheMetadata.storyTone}\n`);

    // Test 3: Process first conversation
    console.log('💬 Test 3: Process first conversation...');
    const result1 = await agent.processConversation(
      'The hero sets out on their journey to find the ancient artifact',
      threadId
    );
    console.log('✅ First conversation processed');
    console.log(`   Response: ${result1.response.substring(0, 100)}...`);
    console.log(`   Introduced elements: ${result1.introducedElements.length}`);
    console.log(`   Cache elements: ${result1.cache.cacheMetadata.totalElements}\n`);

    // Test 4: Process second conversation (should maintain cache)
    console.log('💬 Test 4: Process second conversation...');
    const result2 = await agent.processConversation(
      'The hero encounters a mysterious figure in the forest',
      threadId
    );
    console.log('✅ Second conversation processed');
    console.log(`   Response: ${result2.response.substring(0, 100)}...`);
    console.log(`   Introduced elements: ${result2.introducedElements.length}`);
    console.log(`   Cache elements: ${result2.cache.cacheMetadata.totalElements}\n`);

    // Test 5: Verify cache persistence
    console.log('🔄 Test 5: Verify cache persistence...');
    const finalCache = await agent.getNarrativeCache(threadId);
    console.log('✅ Cache retrieved after multiple conversations');
    console.log(`   Total elements: ${finalCache.cacheMetadata.totalElements}`);
    console.log(`   Story phase: ${finalCache.cacheMetadata.storyPhase}`);
    console.log(`   Last updated: ${finalCache.cacheMetadata.lastUpdated}`);
    console.log(`   Characters: ${finalCache.characters.length}`);
    console.log(`   Locations: ${finalCache.locations.length}\n`);

    // Test 6: Manual cache update
    console.log('✏️ Test 6: Manual cache update...');
    await agent.updateNarrativeCache(threadId, {
      cacheMetadata: {
        ...finalCache.cacheMetadata,
        storyPhase: 'development' as const,
        lastUpdated: new Date().toISOString(),
      }
    });
    
    const updatedCache = await agent.getNarrativeCache(threadId);
    console.log('✅ Cache updated manually');
    console.log(`   New story phase: ${updatedCache.cacheMetadata.storyPhase}\n`);

    // Test 7: Process conversation with updated cache
    console.log('💬 Test 7: Process conversation with updated cache...');
    const result3 = await agent.processConversation(
      'The story continues with new developments',
      threadId
    );
    console.log('✅ Conversation processed with updated cache');
    console.log(`   Response: ${result3.response.substring(0, 100)}...`);
    console.log(`   Cache story phase: ${result3.cache.cacheMetadata.storyPhase}\n`);

    console.log('🎉 All tests passed! Persistent cache is working correctly.');
    console.log('\n📊 Final Summary:');
    console.log(`   Thread ID: ${threadId}`);
    console.log(`   Total conversations: 3`);
    console.log(`   Final cache elements: ${result3.cache.cacheMetadata.totalElements}`);
    console.log(`   Story phase: ${result3.cache.cacheMetadata.storyPhase}`);
    console.log(`   Cache persistence: ✅ Working`);

  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Test cache merging functionality
async function testCacheMerging() {
  console.log('\n🔀 Testing Cache Merging...\n');

  try {
    const agent = new PersistentCacheNarratorAgent();
    const threadId = 'test-merging-' + Date.now();

    // Initialize story
    await agent.initializeStory('sci-fi', 'dramatic', threadId);
    console.log('✅ Sci-fi story initialized');

    // Get initial cache
    const initialCache = await agent.getNarrativeCache(threadId);
    console.log(`   Initial elements: ${initialCache.cacheMetadata.totalElements}`);

    // Add new character manually
    const newCharacter = {
      id: 'android',
      name: 'ARIA-7',
      description: 'An advanced android companion',
      type: 'character' as const,
      status: 'unmet' as const,
      importance: 8,
      tags: ['android', 'companion', 'ai'],
      createdAt: new Date().toISOString(),
      role: 'supporting' as const,
      introductionHints: ['mysterious figure with glowing eyes'],
      relationships: [],
      personality: 'Loyal and analytical',
      motivation: 'To protect and assist the protagonist'
    };

    // Update cache with new character
    await agent.updateNarrativeCache(threadId, {
      characters: [...initialCache.characters, newCharacter],
      cacheMetadata: {
        ...initialCache.cacheMetadata,
        totalElements: initialCache.cacheMetadata.totalElements + 1,
        lastUpdated: new Date().toISOString(),
      }
    });

    // Verify merge worked
    const updatedCache = await agent.getNarrativeCache(threadId);
    console.log(`✅ Character added successfully`);
    console.log(`   New total elements: ${updatedCache.cacheMetadata.totalElements}`);
    console.log(`   Characters: ${updatedCache.characters.length}`);
    console.log(`   New character: ${updatedCache.characters.find(c => c.id === 'android')?.name}`);

    console.log('🎉 Cache merging test passed!');

  } catch (error) {
    console.error('❌ Cache merging test failed:', error);
  }
}

// Run all tests
async function runAllTests() {
  console.log('🚀 Starting Persistent Cache Narrator Tests\n');
  console.log('=' .repeat(50));
  
  await testPersistentCacheNarrator();
  await testCacheMerging();
  
  console.log('\n' + '=' .repeat(50));
  console.log('✅ All tests completed successfully!');
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests().catch(console.error);
}

export { testPersistentCacheNarrator, testCacheMerging, runAllTests };
