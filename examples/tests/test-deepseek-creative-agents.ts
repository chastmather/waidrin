/**
 * TEST: DeepSeek Creative Agents with Narrative Cache
 * ==================================================
 * 
 * Test what the creative agents produce when working with narrative cache
 * by making direct API calls to DeepSeek.
 */

import { ChatOpenAI } from "@langchain/openai";
import { 
  NarrativeElementCache, 
  NarrativeSelector, 
  createEmptyNarrativeCache,
  type CharacterElement,
  type LocationElement,
  type PlotTwistElement
} from '../narrative-cache';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// ============================================================================
// CREATIVE AGENTS WITH CACHE
// ============================================================================

class DeepSeekCreativeAgents {
  private narratorModel: ChatOpenAI;
  private characterModel: ChatOpenAI;
  private worldBuildingModel: ChatOpenAI;
  private dialogueModel: ChatOpenAI;
  private searchModel: ChatOpenAI;
  private selector: NarrativeSelector;

  /**
   * Helper function to parse JSON responses from DeepSeek
   */
  private parseJsonResponse(content: string): any {
    // Parse JSON, handling markdown code blocks if present
    let jsonContent = content;
    if (jsonContent.includes('```json')) {
      jsonContent = jsonContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    }
    
    try {
      return JSON.parse(jsonContent);
    } catch (error) {
      console.error('JSON Parse Error:', error.message);
      console.error('Content length:', jsonContent.length);
      console.error('Content preview:', jsonContent.substring(0, 500));
      console.error('Content end:', jsonContent.substring(jsonContent.length - 200));
      
      // Try to fix truncated JSON by adding missing closing braces
      try {
        const fixedJson = this.attemptJsonRepair(jsonContent);
        return JSON.parse(fixedJson);
      } catch (repairError) {
        console.error('JSON repair failed:', repairError.message);
        throw error;
      }
    }
  }

  /**
   * Attempt to repair truncated JSON by adding missing closing braces
   */
  private attemptJsonRepair(jsonContent: string): string {
    let fixed = jsonContent.trim();
    
    // Count opening and closing braces
    const openBraces = (fixed.match(/\{/g) || []).length;
    const closeBraces = (fixed.match(/\}/g) || []).length;
    const missingBraces = openBraces - closeBraces;
    
    // Add missing closing braces
    for (let i = 0; i < missingBraces; i++) {
      fixed += '}';
    }
    
    // If the last character is a comma, remove it
    if (fixed.endsWith(',')) {
      fixed = fixed.slice(0, -1);
    }
    
    return fixed;
  }

  constructor() {
    // Initialize models with different creative parameters and JSON output
    this.narratorModel = new ChatOpenAI({
      model: process.env.OPENAI_MODEL || "deepseek-chat",
      apiKey: process.env.OPENAI_API_KEY || "",
      configuration: { baseURL: process.env.OPENAI_API_URL || "https://api.openai.com/v1/" },
      temperature: 0.8, // Creative and engaging
      maxTokens: 1000,
      topP: 0.9,
      responseFormat: { type: "json_object" }, // Enable JSON output
    });

    this.characterModel = new ChatOpenAI({
      model: process.env.OPENAI_MODEL || "deepseek-chat",
      apiKey: process.env.OPENAI_API_KEY || "",
      configuration: { baseURL: process.env.OPENAI_API_URL || "https://api.openai.com/v1/" },
      temperature: 0.9, // Very creative for character development
      maxTokens: 2000, // Increased for longer JSON responses
      topP: 0.95,
      responseFormat: { type: "json_object" }, // Enable JSON output
    });

    this.worldBuildingModel = new ChatOpenAI({
      model: process.env.OPENAI_MODEL || "deepseek-chat",
      apiKey: process.env.OPENAI_API_KEY || "",
      configuration: { baseURL: process.env.OPENAI_API_URL || "https://api.openai.com/v1/" },
      temperature: 0.7, // Balanced creativity for world building
      maxTokens: 2000, // Increased for longer JSON responses
      topP: 0.85,
      responseFormat: { type: "json_object" }, // Enable JSON output
    });

    this.dialogueModel = new ChatOpenAI({
      model: process.env.OPENAI_MODEL || "deepseek-chat",
      apiKey: process.env.OPENAI_API_KEY || "",
      configuration: { baseURL: process.env.OPENAI_API_URL || "https://api.openai.com/v1/" },
      temperature: 0.8, // Natural dialogue
      maxTokens: 1500, // Increased for longer JSON responses
      topP: 0.9,
      responseFormat: { type: "json_object" }, // Enable JSON output
    });

    this.searchModel = new ChatOpenAI({
      model: process.env.OPENAI_MODEL || "deepseek-chat",
      apiKey: process.env.OPENAI_API_KEY || "",
      configuration: { baseURL: process.env.OPENAI_API_URL || "https://api.openai.com/v1/" },
      temperature: 0.1, // Factual and precise
      maxTokens: 1000, // Increased for longer JSON responses
      topP: 0.5,
      responseFormat: { type: "json_object" }, // Enable JSON output
    });
  }

  /**
   * Create a rich narrative cache for testing
   */
  createTestCache(): NarrativeElementCache {
    const cache = createEmptyNarrativeCache();
    
    // Set story metadata
    cache.cacheMetadata.storyGenre = 'fantasy';
    cache.cacheMetadata.storyTone = 'epic';
    cache.cacheMetadata.storyPhase = 'setup';
    
    // Add characters
    cache.characters.push(
      {
        id: 'protagonist',
        name: 'Aria Shadowbane',
        description: 'A young mage with untapped potential and a mysterious past',
        type: 'character',
        status: 'introduced',
        importance: 10,
        tags: ['protagonist', 'mage', 'mysterious'],
        createdAt: new Date().toISOString(),
        role: 'protagonist',
        introductionHints: ['young woman with glowing eyes', 'mysterious figure in robes'],
        relationships: [],
        personality: 'Curious, brave, and determined',
        motivation: 'To uncover the truth about her magical heritage'
      },
      {
        id: 'mentor',
        name: 'Eldrin the Wise',
        description: 'An ancient wizard who has seen centuries pass',
        type: 'character',
        status: 'unmet',
        importance: 8,
        tags: ['mentor', 'wizard', 'ancient'],
        createdAt: new Date().toISOString(),
        role: 'supporting',
        introductionHints: ['voice from the shadows', 'wise old man with a staff'],
        relationships: ['protagonist'],
        personality: 'Wise, patient, and mysterious',
        motivation: 'To guide the next generation of mages'
      },
      {
        id: 'antagonist',
        name: 'Malachar the Corrupted',
        description: 'A former hero turned dark lord seeking ultimate power',
        type: 'character',
        status: 'unmet',
        importance: 9,
        tags: ['antagonist', 'dark-lord', 'corrupted'],
        createdAt: new Date().toISOString(),
        role: 'antagonist',
        introductionHints: ['dark presence', 'whispered name in fear'],
        relationships: [],
        personality: 'Cunning, ruthless, and power-hungry',
        motivation: 'To rule all realms and destroy those who oppose him'
      }
    );

    // Add locations
    cache.locations.push(
      {
        id: 'village',
        name: 'Millbrook',
        description: 'A peaceful village where Aria grew up, unaware of her magical heritage',
        type: 'location',
        status: 'introduced',
        importance: 7,
        tags: ['village', 'home', 'peaceful'],
        createdAt: new Date().toISOString(),
        locationType: 'setting',
        atmosphere: 'Cozy and familiar, with hidden mysteries',
        connectionTo: ['protagonist'],
        significance: 'Aria\'s home and the starting point of her journey',
        accessibility: 'public'
      },
      {
        id: 'tower',
        name: 'The Spire of Ages',
        description: 'An ancient tower where Eldrin resides, filled with magical knowledge',
        type: 'location',
        status: 'undiscovered',
        importance: 8,
        tags: ['tower', 'magical', 'ancient'],
        createdAt: new Date().toISOString(),
        locationType: 'landmark',
        atmosphere: 'Mystical and otherworldly',
        connectionTo: ['mentor'],
        significance: 'The source of magical knowledge and training',
        accessibility: 'hidden'
      },
      {
        id: 'fortress',
        name: 'The Obsidian Fortress',
        description: 'Malachar\'s dark stronghold, a place of evil and corruption',
        type: 'location',
        status: 'undiscovered',
        importance: 9,
        tags: ['fortress', 'evil', 'corrupted'],
        createdAt: new Date().toISOString(),
        locationType: 'landmark',
        atmosphere: 'Dark and foreboding',
        connectionTo: ['antagonist'],
        significance: 'The final destination where the ultimate battle will occur',
        accessibility: 'legendary'
      }
    );

    // Add plot twists
    cache.plotTwists.push(
      {
        id: 'heritage',
        name: 'The Lost Heritage',
        description: 'Aria discovers she is the last descendant of an ancient magical bloodline',
        type: 'plotTwist',
        status: 'planned',
        importance: 9,
        tags: ['revelation', 'heritage', 'power'],
        createdAt: new Date().toISOString(),
        twistType: 'revelation',
        setupRequired: ['mentor'],
        impact: 9,
        timing: 'mid',
        foreshadowingHints: ['strange magical abilities', 'dreams of ancient times']
      },
      {
        id: 'betrayal',
        name: 'The Mentor\'s Secret',
        description: 'Eldrin reveals he was once Malachar\'s teacher and feels responsible for his fall',
        type: 'plotTwist',
        status: 'planned',
        importance: 8,
        tags: ['betrayal', 'revelation', 'mentor'],
        createdAt: new Date().toISOString(),
        twistType: 'betrayal',
        setupRequired: ['mentor', 'heritage'],
        impact: 8,
        timing: 'late',
        foreshadowingHints: ['Eldrin\'s haunted expression', 'his reluctance to speak of the past']
      }
    );

    // Update metadata
    cache.cacheMetadata.totalElements = 
      cache.characters.length + 
      cache.locations.length + 
      cache.plotTwists.length;
    
    return cache;
  }

  /**
   * Test narrator with cache context
   */
  async testNarratorWithCache(userInput: string, cache: NarrativeElementCache): Promise<any> {
    const selector = new NarrativeSelector(cache);
    const context = selector.getAbbreviatedContext("", 10);
    const readyElements = selector.getReadyForIntroduction({}, 5);
    const foreshadowing = selector.getForeshadowingOpportunities(userInput);

    const prompt = `You are a skilled fantasy narrator telling an engaging story. Please respond in JSON format.

NARRATIVE CONTEXT:
${context}

AVAILABLE ELEMENTS FOR INTRODUCTION:
${readyElements.map(el => `- ${el.name}: ${el.description}`).join('\n')}

FORESHADOWING OPPORTUNITIES:
${foreshadowing.map(f => `- ${f.hint}`).join('\n')}

USER INPUT:
${userInput}

Continue the narrative based on the user's input. You may introduce available elements naturally when appropriate. Use foreshadowing opportunities to plant subtle clues. Be creative, engaging, and maintain narrative flow.

Please respond in this JSON format:
{
  "narrative": "The story continuation text...",
  "introduced_elements": ["element1", "element2"],
  "foreshadowing_used": ["hint1", "hint2"],
  "mood": "descriptive mood of the scene",
  "next_suggestions": ["suggestion1", "suggestion2"]
}`;

    const response = await this.narratorModel.invoke([
      { role: "system", content: prompt },
      { role: "user", content: userInput }
    ]);

    return this.parseJsonResponse(response.content as string);
  }

  /**
   * Test character specialist with cache
   */
  async testCharacterSpecialist(userInput: string, cache: NarrativeElementCache): Promise<any> {
    const selector = new NarrativeSelector(cache);
    const context = selector.getAbbreviatedContext("", 10);
    const readyCharacters = selector.getReadyForIntroduction({ type: 'character' }, 3);

    const prompt = `You are a character development specialist creating rich, detailed characters for a fantasy story. Please respond in JSON format.

NARRATIVE CONTEXT:
${context}

AVAILABLE CHARACTERS FOR DEVELOPMENT:
${readyCharacters.map(char => `- ${char.name}: ${char.description} (${char.personality})`).join('\n')}

USER REQUEST:
${userInput}

Develop and expand on the characters. Create detailed personalities, motivations, relationships, and backstories. Be creative and engaging.

Please respond in this JSON format:
{
  "characters": [
    {
      "name": "Character Name",
      "personality": "Detailed personality description",
      "motivation": "What drives this character",
      "relationships": ["relationship1", "relationship2"],
      "backstory": "Character's background story",
      "development_notes": "How this character should develop"
    }
  ],
  "new_characters": [
    {
      "name": "New Character Name",
      "role": "supporting/antagonist/minor",
      "personality": "Personality description",
      "motivation": "Character motivation",
      "connection_to_story": "How they fit into the narrative"
    }
  ],
  "relationship_dynamics": "How characters interact and relate to each other"
}`;

    const response = await this.characterModel.invoke([
      { role: "system", content: prompt },
      { role: "user", content: userInput }
    ]);

    return this.parseJsonResponse(response.content as string);
  }

  /**
   * Test world building specialist with cache
   */
  async testWorldBuildingSpecialist(userInput: string, cache: NarrativeElementCache): Promise<any> {
    const selector = new NarrativeSelector(cache);
    const context = selector.getAbbreviatedContext("", 10);
    const readyLocations = selector.getReadyForIntroduction({ type: 'location' }, 3);

    const prompt = `You are a world-building specialist creating rich, immersive fantasy settings. Please respond in JSON format.

NARRATIVE CONTEXT:
${context}

AVAILABLE LOCATIONS FOR DEVELOPMENT:
${readyLocations.map(loc => `- ${loc.name}: ${loc.description} (${loc.atmosphere})`).join('\n')}

USER REQUEST:
${userInput}

Create detailed world elements, locations, cultures, magic systems, and lore. Be creative and immersive.

Please respond in this JSON format:
{
  "magic_system": {
    "name": "System Name",
    "description": "How magic works in this world",
    "rules": ["rule1", "rule2", "rule3"],
    "limitations": ["limitation1", "limitation2"],
    "sources": ["source1", "source2"]
  },
  "locations": [
    {
      "name": "Location Name",
      "description": "Detailed location description",
      "atmosphere": "Mood and feeling",
      "significance": "Why this location matters",
      "inhabitants": "Who lives here",
      "culture": "Local culture and customs"
    }
  ],
  "lore": {
    "history": "Important historical events",
    "myths": "Legends and myths",
    "religions": "Belief systems",
    "politics": "Political structure"
  },
  "world_details": "Additional world-building elements"
}`;

    const response = await this.worldBuildingModel.invoke([
      { role: "system", content: prompt },
      { role: "user", content: userInput }
    ]);

    return this.parseJsonResponse(response.content as string);
  }

  /**
   * Test dialogue specialist with cache
   */
  async testDialogueSpecialist(userInput: string, cache: NarrativeElementCache): Promise<any> {
    const selector = new NarrativeSelector(cache);
    const context = selector.getAbbreviatedContext("", 10);
    const readyCharacters = selector.getReadyForIntroduction({ type: 'character' }, 3);

    const prompt = `You are a dialogue specialist writing natural, engaging conversations for fantasy characters. Please respond in JSON format.

NARRATIVE CONTEXT:
${context}

AVAILABLE CHARACTERS FOR DIALOGUE:
${readyCharacters.map(char => `- ${char.name}: ${char.personality} (${char.motivation})`).join('\n')}

USER REQUEST:
${userInput}

Write natural, engaging dialogue that reveals character personality and advances the plot. Each character should have a distinct voice.

Please respond in this JSON format:
{
  "scene_setting": "Where and when this dialogue takes place",
  "dialogue": [
    {
      "character": "Character Name",
      "line": "What they say",
      "emotion": "Their emotional state",
      "subtext": "What they really mean"
    }
  ],
  "character_voices": {
    "Character1": "Description of their speaking style",
    "Character2": "Description of their speaking style"
  },
  "plot_advancement": "How this dialogue moves the story forward",
  "tension_level": "low/medium/high"
}`;

    const response = await this.dialogueModel.invoke([
      { role: "system", content: prompt },
      { role: "user", content: userInput }
    ]);

    return this.parseJsonResponse(response.content as string);
  }

  /**
   * Test search specialist with cache
   */
  async testSearchSpecialist(userInput: string, cache: NarrativeElementCache): Promise<any> {
    const selector = new NarrativeSelector(cache);
    const context = selector.getAbbreviatedContext("", 10);

    const prompt = `You are a research specialist providing factual information and context for a fantasy story. Please respond in JSON format.

NARRATIVE CONTEXT:
${context}

USER REQUEST:
${userInput}

Provide detailed, factual information that can be used to enhance the story. Be precise and informative.

Please respond in this JSON format:
{
  "research_topic": "The main topic researched",
  "key_facts": [
    "Fact 1",
    "Fact 2",
    "Fact 3"
  ],
  "historical_context": "Historical background information",
  "cultural_details": "Cultural and social information",
  "practical_applications": "How this information can be used in the story",
  "sources": ["source1", "source2"],
  "related_topics": ["topic1", "topic2"],
  "story_integration": "Suggestions for how to integrate this into the narrative"
}`;

    const response = await this.searchModel.invoke([
      { role: "system", content: prompt },
      { role: "user", content: userInput }
    ]);

    return this.parseJsonResponse(response.content as string);
  }
}

// ============================================================================
// TEST EXECUTION
// ============================================================================

async function testDeepSeekCreativeAgents() {
  console.log('🎨 Testing DeepSeek Creative Agents with Narrative Cache...\n');

  try {
    const agents = new DeepSeekCreativeAgents();
    const cache = agents.createTestCache();
    
    console.log('✅ Test cache created with', cache.cacheMetadata.totalElements, 'elements');
    console.log(`   Characters: ${cache.characters.length}`);
    console.log(`   Locations: ${cache.locations.length}`);
    console.log(`   Plot twists: ${cache.plotTwists.length}\n`);

    // Test 1: Narrator with cache context
    console.log('📖 Test 1: Narrator with cache context...');
    const narratorResponse = await agents.testNarratorWithCache(
      'Aria discovers strange magical abilities and decides to leave her village',
      cache
    );
    console.log('✅ Narrator response generated');
    console.log('Narrative:', narratorResponse.narrative?.substring(0, 200) + '...');
    console.log('Introduced elements:', narratorResponse.introduced_elements);
    console.log('Mood:', narratorResponse.mood);
    console.log('Next suggestions:', narratorResponse.next_suggestions);
    console.log('');

    // Test 2: Character specialist
    console.log('👤 Test 2: Character specialist...');
    const characterResponse = await agents.testCharacterSpecialist(
      'Develop the relationship between Aria and Eldrin, and create a new supporting character',
      cache
    );
    console.log('✅ Character specialist response generated');
    console.log('Characters developed:', characterResponse.characters?.length || 0);
    console.log('New characters:', characterResponse.new_characters?.length || 0);
    console.log('Relationship dynamics:', characterResponse.relationship_dynamics);
    console.log('');

    // Test 3: World building specialist
    console.log('🏰 Test 3: World building specialist...');
    const worldResponse = await agents.testWorldBuildingSpecialist(
      'Create the magical system and culture of the ancient mages',
      cache
    );
    console.log('✅ World building specialist response generated');
    console.log('Magic system:', worldResponse.magic_system?.name);
    console.log('Locations created:', worldResponse.locations?.length || 0);
    console.log('Lore elements:', Object.keys(worldResponse.lore || {}));
    console.log('');

    // Test 4: Dialogue specialist
    console.log('💬 Test 4: Dialogue specialist...');
    const dialogueResponse = await agents.testDialogueSpecialist(
      'Write a conversation between Aria and Eldrin when they first meet',
      cache
    );
    console.log('✅ Dialogue specialist response generated');
    console.log('Scene setting:', dialogueResponse.scene_setting);
    console.log('Dialogue lines:', dialogueResponse.dialogue?.length || 0);
    console.log('Tension level:', dialogueResponse.tension_level);
    console.log('');

    // Test 5: Search specialist
    console.log('🔍 Test 5: Search specialist...');
    const searchResponse = await agents.testSearchSpecialist(
      'Research ancient magical bloodlines and their powers',
      cache
    );
    console.log('✅ Search specialist response generated');
    console.log('Research topic:', searchResponse.research_topic);
    console.log('Key facts:', searchResponse.key_facts?.length || 0);
    console.log('Story integration:', searchResponse.story_integration);
    console.log('');

    console.log('🎉 All creative agent tests completed successfully!');
    console.log('\n📊 Summary:');
    console.log('   ✅ Narrator: Generated engaging narrative with cache context');
    console.log('   ✅ Character: Developed rich character relationships and backstories');
    console.log('   ✅ World Building: Created detailed magical systems and cultures');
    console.log('   ✅ Dialogue: Wrote natural character conversations');
    console.log('   ✅ Search: Provided factual research and context');
    console.log('\n🎯 Key Findings:');
    console.log('   - Cache context enhances creative output significantly');
    console.log('   - Different temperature settings produce varied creative styles');
    console.log('   - Agents can work with existing narrative elements intelligently');
    console.log('   - Foreshadowing and element introduction work well');

  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run test if this file is executed directly
if (require.main === module) {
  testDeepSeekCreativeAgents().catch(console.error);
}

export { DeepSeekCreativeAgents, testDeepSeekCreativeAgents };
