# Narrative Element Caching System

## Overview

This system provides intelligent caching and management of narrative elements (characters, locations, plot twists, etc.) to enable sophisticated story development without context bloat.

## Problem Solved

**Without caching**: All narrative elements must be included in every LLM prompt, leading to:
- Context bloat and token waste
- Inconsistent element introduction
- Lost story opportunities
- Poor pacing control

**With caching**: Intelligent element management enables:
- Context-aware element selection
- Controlled introduction timing
- Consistent story continuity
- Dynamic story development

## Architecture

### Core Components

1. **NarrativeElementCache**: Central data structure storing all narrative elements
2. **NarrativeSelector**: Intelligent selection and filtering system
3. **Cache Management**: Utilities for merging, updating, and persisting cache
4. **Integration Layer**: Seamless integration with LangGraph narrator agent

### Data Structures

```typescript
interface NarrativeElementCache {
  characters: CharacterElement[];
  locations: LocationElement[];
  plotTwists: PlotTwistElement[];
  objects: ObjectElement[];
  themes: ThemeElement[];
  storyThreads: StoryThread[];
  foreshadowing: ForeshadowingElement[];
  cacheMetadata: CacheMetadata;
}
```

### Element Types

- **Characters**: With roles, relationships, personality, motivation
- **Locations**: With atmosphere, connections, accessibility
- **Plot Twists**: With timing, impact, setup requirements
- **Objects**: With properties, significance, location
- **Themes**: With expression, related elements
- **Story Threads**: Ongoing plotlines with progress tracking
- **Foreshadowing**: Clues and hints for future reveals

## Key Features

### 1. Intelligent Selection

```typescript
// Get elements ready for introduction
const readyCharacters = selector.getReadyForIntroduction(
  { type: 'character', minImportance: 5 }, 
  3
);

// Get elements for reference based on context
const relevantElements = selector.getElementsForReference(
  currentNarrative, 
  5
);

// Get foreshadowing opportunities
const foreshadowing = selector.getForeshadowingOpportunities(
  currentContext
);
```

### 2. Context-Aware Filtering

- **Importance-based**: Prioritize elements by story significance
- **Timing-based**: Control when elements are introduced
- **Relationship-based**: Find related elements for consistency
- **Status-based**: Track introduction and development stages

### 3. Smart Context Generation

```typescript
// Get abbreviated context for narrator prompts
const context = selector.getAbbreviatedContext(currentNarrative, 10);

// Output: "Recently mentioned elements: - Elena: A wise old woman...\nElements ready for introduction: - Dragon: A fearsome beast..."
```

### 4. Dynamic Story Development

- **Story Threads**: Track ongoing plotlines
- **Foreshadowing System**: Plant and recall clues
- **Phase Management**: Adapt to story development stages
- **Relationship Tracking**: Maintain character/location connections

## Integration with LangGraph

### Enhanced State

```typescript
export const EnhancedNarratorStateAnnotation = Annotation.Root({
  // Existing fields...
  narrativeCache: Annotation<NarrativeElementCache>({
    reducer: mergeNarrativeCache,
    default: createEmptyNarrativeCache,
  }),
  narrativeContext: Annotation<string>({
    reducer: (existing, updates) => updates || existing,
    default: () => "",
  }),
  recentlyIntroduced: Annotation<string[]>({
    reducer: (existing, updates) => [...existing, ...updates].slice(-10),
    default: () => [],
  }),
});
```

### Enhanced Prompts

```typescript
const prompt = `You are a skilled narrator telling an engaging story.

CURRENT STORY CONTEXT:
${narrativeContext}

AVAILABLE ELEMENTS FOR INTRODUCTION:
${readyElements.map(el => `- ${el.name}: ${el.description}`).join('\n')}

FORESHADOWING OPPORTUNITIES:
${foreshadowing.map(f => `- ${f.hint}`).join('\n')}

Continue the story based on the user's input...`;
```

## Usage Examples

### Basic Setup

```typescript
// Create agent with cache
const agent = new CacheEnhancedNarratorAgent();

// Initialize story with genre and tone
const cache = agent.initializeStory('fantasy', 'epic');

// Process narrative with cache intelligence
const result = await agent.processNarrativeContinuation(
  'The hero sets out on their journey',
  'Once upon a time, in a peaceful village...'
);
```

### Advanced Usage

```typescript
// Get specific elements
const importantCharacters = selector.getElementsByPriority('character', 8);

// Get related elements
const relatedElements = selector.getRelatedElements('protagonist');

// Update element status
const updatedCache = updateElementStatus(cache, 'wizard', 'introduced');
```

## Benefits

### 1. **Efficient Context Management**
- Only relevant elements in prompts
- Abbreviated summaries instead of full descriptions
- Smart filtering reduces token usage

### 2. **Intelligent Story Development**
- Controlled element introduction timing
- Consistent character and location references
- Dynamic plot development

### 3. **Performance Optimization**
- Lazy loading of elements
- Efficient queries and filtering
- Reduced LLM context requirements

### 4. **Story Coherence**
- Relationship tracking between elements
- Consistent world-building
- Proper foreshadowing and payoff

## Implementation Status

- ✅ **Core Data Structures**: Complete
- ✅ **Selection System**: Complete
- ✅ **Cache Management**: Complete
- ✅ **Integration Example**: Complete
- ⚠️ **LangGraph Integration**: Draft (needs testing)
- ⚠️ **Persistence**: Not implemented
- ⚠️ **Advanced Features**: Partial

## Next Steps

1. **Integrate with existing narrator agent**
2. **Add persistence layer for cache**
3. **Implement advanced story thread management**
4. **Add cache analytics and optimization**
5. **Create genre-specific element generators**

## Files

- `narrative-cache.ts` - Core caching system
- `narrator-with-cache.ts` - Integration example
- `narrative-cache-design.md` - Detailed design document
- `README-narrative-caching.md` - This overview

This system provides a robust foundation for intelligent narrative management while maintaining the flexibility and power of the LangGraph architecture.
