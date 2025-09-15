# Narrative Element Caching System Design

## Problem Analysis

The current `NarratorState` lacks a structured way to cache narrative elements like:
- Unmet characters
- Unintroduced plot twists  
- Undiscovered locations
- Pending story threads
- Foreshadowing opportunities

This leads to:
- **Context bloat**: All narrative elements in every prompt
- **Inconsistent introduction**: No systematic way to track what's been revealed
- **Lost opportunities**: Elements get forgotten or inconsistently referenced
- **Poor pacing**: No control over when/how elements are introduced

## Optimal Data Structure Design

### 1. Hierarchical Cache with Metadata

```typescript
interface NarrativeElementCache {
  // Core narrative elements
  characters: CharacterElement[];
  locations: LocationElement[];
  plotTwists: PlotTwistElement[];
  objects: ObjectElement[];
  themes: ThemeElement[];
  
  // Story structure
  storyThreads: StoryThread[];
  foreshadowing: ForeshadowingElement[];
  
  // Metadata for intelligent selection
  cacheMetadata: CacheMetadata;
}

interface CharacterElement {
  id: string;
  name: string;
  description: string;
  role: 'protagonist' | 'antagonist' | 'supporting' | 'minor';
  status: 'unmet' | 'introduced' | 'developed' | 'resolved';
  introductionHints: string[]; // Subtle ways to introduce them
  relationships: string[]; // Other character IDs
  importance: number; // 1-10 scale
  lastReferenced?: string; // Timestamp
  tags: string[]; // For filtering/grouping
}

interface LocationElement {
  id: string;
  name: string;
  description: string;
  type: 'setting' | 'landmark' | 'secret' | 'historical';
  status: 'undiscovered' | 'mentioned' | 'visited' | 'explored';
  connectionTo: string[]; // Other location/character IDs
  atmosphere: string; // Mood/feeling description
  importance: number;
  lastReferenced?: string;
  tags: string[];
}

interface PlotTwistElement {
  id: string;
  title: string;
  description: string;
  type: 'revelation' | 'betrayal' | 'discovery' | 'tragedy' | 'victory';
  status: 'planned' | 'foreshadowed' | 'revealed' | 'resolved';
  setupRequired: string[]; // What needs to happen first
  impact: number; // 1-10 scale
  timing: 'early' | 'mid' | 'late' | 'climax';
  lastReferenced?: string;
  tags: string[];
}

interface StoryThread {
  id: string;
  title: string;
  description: string;
  status: 'active' | 'paused' | 'resolved' | 'abandoned';
  priority: number;
  relatedElements: string[]; // IDs of characters, locations, etc.
  lastProgress: string; // Last narrative entry that advanced this thread
  nextSteps: string[]; // Suggested next developments
}

interface ForeshadowingElement {
  id: string;
  targetElement: string; // ID of what it foreshadows
  hint: string; // The foreshadowing hint
  subtlety: number; // 1-10 (1 = very subtle, 10 = obvious)
  status: 'planned' | 'planted' | 'recalled' | 'resolved';
  timing: 'immediate' | 'soon' | 'later' | 'much_later';
}

interface CacheMetadata {
  totalElements: number;
  lastUpdated: string;
  storyPhase: 'setup' | 'development' | 'climax' | 'resolution';
  activeThreads: number;
  pendingIntroductions: number;
  cacheVersion: string;
}
```

### 2. Smart Selection System

```typescript
interface NarrativeSelector {
  // Get elements ready for introduction
  getReadyForIntroduction(type: ElementType, maxCount?: number): NarrativeElement[];
  
  // Get elements that should be referenced/recalled
  getElementsForReference(context: string, maxCount?: number): NarrativeElement[];
  
  // Get foreshadowing opportunities
  getForeshadowingOpportunities(currentContext: string): ForeshadowingElement[];
  
  // Get elements by importance and timing
  getElementsByPriority(type: ElementType, minImportance?: number): NarrativeElement[];
  
  // Get related elements (for consistency)
  getRelatedElements(elementId: string): NarrativeElement[];
}

interface ElementType {
  type: 'character' | 'location' | 'plotTwist' | 'object' | 'theme';
  status?: 'unmet' | 'introduced' | 'developed' | 'resolved';
  tags?: string[];
  minImportance?: number;
  maxAge?: number; // Days since last reference
}
```

### 3. Integration with LangGraph State

```typescript
// Add to NarratorStateAnnotation
export const NarratorStateAnnotation = Annotation.Root({
  // ... existing fields ...
  
  // Narrative element cache
  narrativeCache: Annotation<NarrativeElementCache>({
    reducer: (existing: NarrativeElementCache, updates: NarrativeElementCache) => {
      // Merge updates intelligently
      return mergeNarrativeCache(existing, updates);
    },
    default: () => createEmptyNarrativeCache(),
  }),
  
  // Current narrative context (abbreviated)
  narrativeContext: Annotation<string>({
    reducer: (existing: string, updates: string) => updates || existing,
    default: () => "",
  }),
  
  // Recently introduced elements (for continuity)
  recentlyIntroduced: Annotation<string[]>({
    reducer: (existing: string[], updates: string[]) => {
      if (Array.isArray(updates)) {
        return [...existing, ...updates].slice(-10); // Keep last 10
      }
      return existing;
    },
    default: () => [],
  }),
});
```

## Benefits of This Design

### 1. **Efficient Context Management**
- Only relevant elements in prompts
- Abbreviated summaries instead of full descriptions
- Smart filtering based on story phase and context

### 2. **Intelligent Introduction Control**
- Track introduction status and timing
- Control pacing through importance and timing metadata
- Prevent premature reveals or missed opportunities

### 3. **Consistency and Continuity**
- Track relationships between elements
- Ensure consistent references and callbacks
- Maintain story coherence across sessions

### 4. **Dynamic Story Development**
- Story threads that can evolve
- Foreshadowing system for better pacing
- Adaptive element selection based on story phase

### 5. **Performance Optimization**
- Lazy loading of elements
- Caching of frequently accessed elements
- Efficient queries and filtering

## Implementation Strategy

### Phase 1: Core Cache Structure
1. Define the data structures
2. Create basic CRUD operations
3. Add to LangGraph state

### Phase 2: Smart Selection
1. Implement NarrativeSelector
2. Create filtering and ranking algorithms
3. Add context-aware selection

### Phase 3: Integration
1. Update narrator prompts to use cache
2. Add cache management to specialist nodes
3. Implement cache persistence

### Phase 4: Advanced Features
1. Story thread management
2. Foreshadowing system
3. Dynamic element generation
4. Cache analytics and optimization

## Example Usage

```typescript
// In narrator decision node
const readyCharacters = narrativeSelector.getReadyForIntroduction(
  { type: 'character', status: 'unmet' }, 
  3
);

const context = `Available characters: ${readyCharacters.map(c => c.name).join(', ')}`;
const prompt = `Continue the story. You can introduce: ${context}`;

// In narrative continuation node
const elementsToReference = narrativeSelector.getElementsForReference(
  currentNarrative, 
  5
);

// Update cache after introduction
narrativeCache.characters = narrativeCache.characters.map(char => 
  char.id === introducedCharacterId 
    ? { ...char, status: 'introduced', lastReferenced: new Date().toISOString() }
    : char
);
```

This design provides a robust, scalable system for managing narrative elements while keeping context manageable and enabling intelligent story development.
