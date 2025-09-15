/**
 * NARRATIVE ELEMENT CACHING SYSTEM
 * =================================
 * 
 * A sophisticated caching system for managing narrative elements like characters,
 * locations, plot twists, and story threads. Enables intelligent introduction
 * and reference without context bloat.
 * 
 * WIP: This is a draft implementation for the narrator agent
 */

import { z } from "zod";

// ============================================================================
// CORE DATA STRUCTURES
// ============================================================================

/**
 * Base interface for all narrative elements
 */
interface BaseNarrativeElement {
  id: string;
  name: string;
  description: string;
  status: 'unmet' | 'introduced' | 'developed' | 'resolved';
  importance: number; // 1-10 scale
  lastReferenced?: string; // ISO timestamp
  tags: string[];
  createdAt: string;
}

/**
 * Character element with role and relationship tracking
 */
export interface CharacterElement extends BaseNarrativeElement {
  type: 'character';
  role: 'protagonist' | 'antagonist' | 'supporting' | 'minor' | 'background';
  introductionHints: string[]; // Subtle ways to introduce them
  relationships: string[]; // Other character IDs
  personality: string; // Brief personality description
  motivation: string; // What drives this character
}

/**
 * Location element with atmosphere and connections
 */
export interface LocationElement extends BaseNarrativeElement {
  type: 'location';
  locationType: 'setting' | 'landmark' | 'secret' | 'historical' | 'mystical';
  atmosphere: string; // Mood/feeling description
  connectionTo: string[]; // Other location/character IDs
  significance: string; // Why this location matters
  accessibility: 'public' | 'restricted' | 'hidden' | 'legendary';
}

/**
 * Plot twist element with timing and impact
 */
export interface PlotTwistElement extends BaseNarrativeElement {
  type: 'plotTwist';
  twistType: 'revelation' | 'betrayal' | 'discovery' | 'tragedy' | 'victory' | 'mystery';
  setupRequired: string[]; // What needs to happen first
  impact: number; // 1-10 scale
  timing: 'early' | 'mid' | 'late' | 'climax';
  foreshadowingHints: string[]; // Subtle clues to plant
}

/**
 * Object element (items, artifacts, etc.)
 */
export interface ObjectElement extends BaseNarrativeElement {
  type: 'object';
  objectType: 'weapon' | 'tool' | 'artifact' | 'document' | 'treasure' | 'mystery';
  properties: string[]; // Special properties or abilities
  location: string; // Where it can be found
  significance: string; // Why it matters to the story
}

/**
 * Theme element for story depth
 */
export interface ThemeElement extends BaseNarrativeElement {
  type: 'theme';
  themeType: 'moral' | 'philosophical' | 'emotional' | 'social' | 'political';
  expression: string; // How this theme is expressed
  relatedElements: string[]; // IDs of elements that embody this theme
}

/**
 * Story thread for tracking ongoing plotlines
 */
export interface StoryThread {
  id: string;
  title: string;
  description: string;
  status: 'active' | 'paused' | 'resolved' | 'abandoned';
  priority: number; // 1-10 scale
  relatedElements: string[]; // IDs of characters, locations, etc.
  lastProgress: string; // Last narrative entry that advanced this thread
  nextSteps: string[]; // Suggested next developments
  createdAt: string;
  updatedAt: string;
}

/**
 * Foreshadowing element for planting clues
 */
export interface ForeshadowingElement {
  id: string;
  targetElement: string; // ID of what it foreshadows
  hint: string; // The foreshadowing hint
  subtlety: number; // 1-10 (1 = very subtle, 10 = obvious)
  status: 'planned' | 'planted' | 'recalled' | 'resolved';
  timing: 'immediate' | 'soon' | 'later' | 'much_later';
  context: string; // When/where to plant this hint
  createdAt: string;
}

/**
 * Union type for all narrative elements
 */
export type NarrativeElement = 
  | CharacterElement 
  | LocationElement 
  | PlotTwistElement 
  | ObjectElement 
  | ThemeElement;

/**
 * Main cache structure
 */
export interface NarrativeElementCache {
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

/**
 * Cache metadata for tracking and optimization
 */
export interface CacheMetadata {
  totalElements: number;
  lastUpdated: string;
  storyPhase: 'setup' | 'development' | 'climax' | 'resolution';
  activeThreads: number;
  pendingIntroductions: number;
  cacheVersion: string;
  storyGenre?: string;
  storyTone?: string;
}

// ============================================================================
// SELECTION CRITERIA
// ============================================================================

export interface ElementSelectionCriteria {
  type?: 'character' | 'location' | 'plotTwist' | 'object' | 'theme';
  status?: 'unmet' | 'introduced' | 'developed' | 'resolved';
  tags?: string[];
  minImportance?: number;
  maxImportance?: number;
  maxAge?: number; // Days since last reference
  role?: string; // For characters
  locationType?: string; // For locations
  twistType?: string; // For plot twists
  objectType?: string; // For objects
  themeType?: string; // For themes
}

// ============================================================================
// NARRATIVE SELECTOR CLASS
// ============================================================================

export class NarrativeSelector {
  private cache: NarrativeElementCache;

  constructor(cache: NarrativeElementCache) {
    this.cache = cache;
  }

  /**
   * Get elements ready for introduction based on criteria
   */
  getReadyForIntroduction(criteria: ElementSelectionCriteria = {}, maxCount: number = 5): NarrativeElement[] {
    const elements = this.getElementsByType(criteria.type || 'character');
    
    return elements
      .filter(element => {
        // Must be unmet or recently introduced
        if (element.status !== 'unmet' && element.status !== 'introduced') return false;
        
        // Check importance threshold
        if (criteria.minImportance && element.importance < criteria.minImportance) return false;
        if (criteria.maxImportance && element.importance > criteria.maxImportance) return false;
        
        // Check tags
        if (criteria.tags && !criteria.tags.some(tag => element.tags.includes(tag))) return false;
        
        // Check age (if specified)
        if (criteria.maxAge && element.lastReferenced) {
          const daysSinceReference = this.getDaysSince(element.lastReferenced);
          if (daysSinceReference > criteria.maxAge) return false;
        }
        
        // Type-specific criteria
        if (criteria.type === 'character') {
          const char = element as CharacterElement;
          if (criteria.role && char.role !== criteria.role) return false;
        }
        
        return true;
      })
      .sort((a, b) => b.importance - a.importance) // Sort by importance
      .slice(0, maxCount);
  }

  /**
   * Get elements that should be referenced/recalled based on context
   */
  getElementsForReference(context: string, maxCount: number = 5): NarrativeElement[] {
    const allElements = this.getAllElements();
    const contextWords = context.toLowerCase().split(/\s+/);
    
    return allElements
      .filter(element => {
        // Must be introduced or developed
        if (element.status === 'unmet') return false;
        
        // Check if context mentions this element
        const elementWords = [
          element.name.toLowerCase(),
          ...element.tags.map(tag => tag.toLowerCase()),
          element.description.toLowerCase()
        ].join(' ').split(/\s+/);
        
        const hasContextMatch = contextWords.some(word => 
          elementWords.some(elementWord => elementWord.includes(word))
        );
        
        return hasContextMatch;
      })
      .sort((a, b) => {
        // Prioritize by importance and recency
        const aRecency = a.lastReferenced ? this.getDaysSince(a.lastReferenced) : 999;
        const bRecency = b.lastReferenced ? this.getDaysSince(b.lastReferenced) : 999;
        return (b.importance - a.importance) + (aRecency - bRecency);
      })
      .slice(0, maxCount);
  }

  /**
   * Get foreshadowing opportunities for current context
   */
  getForeshadowingOpportunities(currentContext: string): ForeshadowingElement[] {
    return this.cache.foreshadowing
      .filter(foreshadowing => {
        // Must be planned or planted
        if (foreshadowing.status === 'resolved') return false;
        
        // Check if context is appropriate for this foreshadowing
        const contextWords = currentContext.toLowerCase().split(/\s+/);
        const hintWords = foreshadowing.hint.toLowerCase().split(/\s+/);
        const hasContextMatch = contextWords.some(word => 
          hintWords.some(hintWord => hintWord.includes(word))
        );
        
        return hasContextMatch;
      })
      .sort((a, b) => a.subtlety - b.subtlety); // More subtle first
  }

  /**
   * Get elements by importance and timing
   */
  getElementsByPriority(type: string, minImportance: number = 5): NarrativeElement[] {
    const elements = this.getElementsByType(type as any);
    
    return elements
      .filter(element => element.importance >= minImportance)
      .sort((a, b) => b.importance - a.importance);
  }

  /**
   * Get related elements for consistency
   */
  getRelatedElements(elementId: string): NarrativeElement[] {
    const element = this.findElementById(elementId);
    if (!element) return [];

    const relatedIds = this.getRelatedElementIds(element);
    return relatedIds.map(id => this.findElementById(id)).filter(Boolean) as NarrativeElement[];
  }

  /**
   * Get abbreviated context for narrator prompts
   */
  getAbbreviatedContext(currentNarrative: string, maxElements: number = 10): string {
    const relevantElements = this.getElementsForReference(currentNarrative, maxElements);
    const readyElements = this.getReadyForIntroduction({}, 5);
    
    const contextParts: string[] = [];
    
    if (relevantElements.length > 0) {
      contextParts.push("Recently mentioned elements:");
      contextParts.push(relevantElements.map(el => `- ${el.name}: ${el.description.slice(0, 100)}...`).join('\n'));
    }
    
    if (readyElements.length > 0) {
      contextParts.push("\nElements ready for introduction:");
      contextParts.push(readyElements.map(el => `- ${el.name}: ${el.description.slice(0, 100)}...`).join('\n'));
    }
    
    return contextParts.join('\n');
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private getElementsByType(type: string): NarrativeElement[] {
    switch (type) {
      case 'character': return this.cache.characters;
      case 'location': return this.cache.locations;
      case 'plotTwist': return this.cache.plotTwists;
      case 'object': return this.cache.objects;
      case 'theme': return this.cache.themes;
      default: return [];
    }
  }

  private getAllElements(): NarrativeElement[] {
    return [
      ...this.cache.characters,
      ...this.cache.locations,
      ...this.cache.plotTwists,
      ...this.cache.objects,
      ...this.cache.themes,
    ];
  }

  private findElementById(id: string): NarrativeElement | null {
    return this.getAllElements().find(element => element.id === id) || null;
  }

  private getRelatedElementIds(element: NarrativeElement): string[] {
    const relatedIds: string[] = [];
    
    if (element.type === 'character') {
      const char = element as CharacterElement;
      relatedIds.push(...char.relationships);
    } else if (element.type === 'location') {
      const loc = element as LocationElement;
      relatedIds.push(...loc.connectionTo);
    } else if (element.type === 'theme') {
      const theme = element as ThemeElement;
      relatedIds.push(...theme.relatedElements);
    }
    
    return relatedIds;
  }

  private getDaysSince(timestamp: string): number {
    const now = new Date();
    const then = new Date(timestamp);
    return Math.floor((now.getTime() - then.getTime()) / (1000 * 60 * 60 * 24));
  }
}

// ============================================================================
// CACHE MANAGEMENT UTILITIES
// ============================================================================

/**
 * Create an empty narrative cache
 */
export function createEmptyNarrativeCache(): NarrativeElementCache {
  return {
    characters: [],
    locations: [],
    plotTwists: [],
    objects: [],
    themes: [],
    storyThreads: [],
    foreshadowing: [],
    cacheMetadata: {
      totalElements: 0,
      lastUpdated: new Date().toISOString(),
      storyPhase: 'setup',
      activeThreads: 0,
      pendingIntroductions: 0,
      cacheVersion: '1.0.0',
    },
  };
}

/**
 * Merge narrative caches intelligently
 */
export function mergeNarrativeCache(
  existing: NarrativeElementCache, 
  updates: Partial<NarrativeElementCache>
): NarrativeElementCache {
  const merged = { ...existing };
  
  // Merge arrays by ID (update existing, add new)
  if (updates.characters) {
    merged.characters = mergeElementArrays(existing.characters, updates.characters);
  }
  if (updates.locations) {
    merged.locations = mergeElementArrays(existing.locations, updates.locations);
  }
  if (updates.plotTwists) {
    merged.plotTwists = mergeElementArrays(existing.plotTwists, updates.plotTwists);
  }
  if (updates.objects) {
    merged.objects = mergeElementArrays(existing.objects, updates.objects);
  }
  if (updates.themes) {
    merged.themes = mergeElementArrays(existing.themes, updates.themes);
  }
  
  // Update metadata
  if (updates.cacheMetadata) {
    merged.cacheMetadata = {
      ...existing.cacheMetadata,
      ...updates.cacheMetadata,
      lastUpdated: new Date().toISOString(),
    };
  }
  
  // Recalculate totals
  merged.cacheMetadata.totalElements = 
    merged.characters.length + 
    merged.locations.length + 
    merged.plotTwists.length + 
    merged.objects.length + 
    merged.themes.length;
  
  return merged;
}

/**
 * Merge element arrays by ID
 */
function mergeElementArrays<T extends BaseNarrativeElement>(
  existing: T[], 
  updates: T[]
): T[] {
  const merged = [...existing];
  
  for (const update of updates) {
    const existingIndex = merged.findIndex(item => item.id === update.id);
    if (existingIndex >= 0) {
      merged[existingIndex] = { ...merged[existingIndex], ...update };
    } else {
      merged.push(update);
    }
  }
  
  return merged;
}

/**
 * Update element status after introduction
 */
export function updateElementStatus(
  cache: NarrativeElementCache,
  elementId: string,
  newStatus: 'unmet' | 'introduced' | 'developed' | 'resolved'
): NarrativeElementCache {
  const updated = { ...cache };
  const now = new Date().toISOString();
  
  // Update in all element arrays
  updated.characters = updated.characters.map(char => 
    char.id === elementId ? { ...char, status: newStatus, lastReferenced: now } : char
  );
  updated.locations = updated.locations.map(loc => 
    loc.id === elementId ? { ...loc, status: newStatus, lastReferenced: now } : loc
  );
  updated.plotTwists = updated.plotTwists.map(twist => 
    twist.id === elementId ? { ...twist, status: newStatus, lastReferenced: now } : twist
  );
  updated.objects = updated.objects.map(obj => 
    obj.id === elementId ? { ...obj, status: newStatus, lastReferenced: now } : obj
  );
  updated.themes = updated.themes.map(theme => 
    theme.id === elementId ? { ...theme, status: newStatus, lastReferenced: now } : theme
  );
  
  // Update metadata
  updated.cacheMetadata.lastUpdated = now;
  
  return updated;
}

// ============================================================================
// EXAMPLE USAGE
// ============================================================================

/**
 * Example of how to use the narrative cache system
 */
export function exampleUsage() {
  // Create initial cache
  let cache = createEmptyNarrativeCache();
  
  // Add some example elements
  cache.characters.push({
    id: 'char_1',
    name: 'Elena the Mystic',
    description: 'A wise old woman who knows ancient secrets',
    type: 'character',
    status: 'unmet',
    importance: 8,
    tags: ['mystic', 'wise', 'ancient'],
    createdAt: new Date().toISOString(),
    role: 'supporting',
    introductionHints: ['mysterious figure in the shadows', 'voice from the darkness'],
    relationships: [],
    personality: 'Wise and mysterious',
    motivation: 'To guide the protagonist'
  });
  
  cache.locations.push({
    id: 'loc_1',
    name: 'The Crystal Caverns',
    description: 'A hidden underground network of crystal formations',
    type: 'location',
    status: 'undiscovered',
    importance: 7,
    tags: ['crystal', 'underground', 'hidden'],
    createdAt: new Date().toISOString(),
    locationType: 'secret',
    atmosphere: 'Mystical and otherworldly',
    connectionTo: ['char_1'],
    significance: 'Contains the source of magical power',
    accessibility: 'hidden'
  });
  
  // Create selector
  const selector = new NarrativeSelector(cache);
  
  // Get elements ready for introduction
  const readyCharacters = selector.getReadyForIntroduction(
    { type: 'character', minImportance: 5 }, 
    3
  );
  
  console.log('Ready characters:', readyCharacters.map(c => c.name));
  
  // Get abbreviated context for narrator
  const context = selector.getAbbreviatedContext('The hero enters a mysterious forest');
  console.log('Narrator context:', context);
  
  // Update element status after introduction
  cache = updateElementStatus(cache, 'char_1', 'introduced');
  console.log('Updated cache:', cache.characters[0].status);
}
