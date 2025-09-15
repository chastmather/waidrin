/**
 * GAME STATE ARCHITECTURE
 * =======================
 * 
 * Higher-level persistent state object that contains all game-related state,
 * including the narrator state, deterministic tracking, and serialized narrative.
 * 
 * This provides a clean separation between conversation-level state (narrator)
 * and game-level state (inventory, time, progression, etc.).
 */

import { Annotation, MessagesAnnotation } from "@langchain/langgraph";
import { z } from "zod";

// Import the existing narrator state
import { EnhancedNarratorStateAnnotation, type EnhancedNarratorState } from './narrative-caching';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Inventory item schema
 */
export const InventoryItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  type: z.enum(['weapon', 'armor', 'consumable', 'tool', 'misc', 'key', 'quest_item']),
  quantity: z.number().min(1),
  value: z.number().min(0),
  weight: z.number().min(0),
  rarity: z.enum(['common', 'uncommon', 'rare', 'epic', 'legendary']),
  properties: z.record(z.any()).optional(),
  acquiredAt: z.string(), // ISO timestamp
  location: z.string().optional(), // Where it was found
});

export type InventoryItem = z.infer<typeof InventoryItemSchema>;

/**
 * Player stats schema
 */
export const PlayerStatsSchema = z.object({
  level: z.number().min(1),
  experience: z.number().min(0),
  health: z.number().min(0),
  maxHealth: z.number().min(1),
  mana: z.number().min(0),
  maxMana: z.number().min(0),
  strength: z.number().min(0),
  intelligence: z.number().min(0),
  wisdom: z.number().min(0),
  charisma: z.number().min(0),
  dexterity: z.number().min(0),
  constitution: z.number().min(0),
  skills: z.record(z.number()).optional(),
  achievements: z.array(z.string()).optional(),
});

export type PlayerStats = z.infer<typeof PlayerStatsSchema>;

/**
 * Narrative node schema for branching support
 */
export const NarrativeNodeSchema = z.object({
  id: z.string(), // Sequential identifier (e.g., "narrative_001", "narrative_002")
  uri: z.string(), // Unique URI for this narrative node
  parentId: z.string().nullable(), // Parent node ID for branching
  branchId: z.string().nullable(), // Branch identifier
  sequence: z.number().min(0), // Sequential order within branch
  title: z.string(),
  content: z.string(),
  wordCount: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
  tags: z.array(z.string()).optional(),
  metadata: z.object({
    author: z.string().optional(),
    mood: z.string().optional(),
    location: z.string().optional(),
    characters: z.array(z.string()).optional(),
    events: z.array(z.string()).optional(),
  }).optional(),
});

/**
 * MemoryBank schema for deterministic data storage
 */
export const MemoryBankSchema = z.object({
  branchId: z.string(),
  data: z.record(z.unknown()), // Generic data storage
  checksum: z.string(), // For data integrity
  lastAccessed: z.string(),
  size: z.number().min(0), // Size in bytes for memory tracking
  compressed: z.boolean().default(false), // Compression flag
});

/**
 * Consistency check result schema
 */
export const ConsistencyCheckResultSchema = z.object({
  isConsistent: z.boolean(),
  inconsistencies: z.array(z.object({
    type: z.enum(['character', 'location', 'timeline', 'plot', 'world_state', 'inventory', 'other']),
    description: z.string(),
    severity: z.enum(['minor', 'moderate', 'major', 'critical']),
    turnNumber: z.number(),
    suggestedFix: z.string().optional(),
  })),
  overallScore: z.number().min(0).max(100), // Consistency score 0-100
  needsRevision: z.boolean(),
  revisionReason: z.string().optional(),
});

/**
 * Consistency checker agent schema
 */
export const ConsistencyCheckerSchema = z.object({
  enabled: z.boolean().default(true),
  checkLastTurns: z.number().min(1).max(50).default(10),
  strictMode: z.boolean().default(false),
  autoFix: z.boolean().default(false),
  lastCheck: z.string().optional(),
  checkHistory: z.array(ConsistencyCheckResultSchema).default([]),
});

/**
 * Debug log entry schema
 */
export const DebugLogEntrySchema = z.object({
  id: z.string(),
  timestamp: z.string(),
  nodeId: z.string(),
  agentType: z.enum(['narrator', 'decision', 'consistency_checker', 'finalize', 'other']),
  action: z.string(),
  input: z.record(z.unknown()).optional(),
  output: z.record(z.unknown()).optional(),
  duration: z.number().optional(), // milliseconds
  success: z.boolean(),
  error: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

/**
 * Debug mode configuration schema
 */
export const DebugModeSchema = z.object({
  enabled: z.boolean().default(false),
  logLevel: z.enum(['minimal', 'detailed', 'verbose']).default('detailed'),
  maxLogEntries: z.number().min(10).max(1000).default(100),
  logAgentCalls: z.boolean().default(true),
  logStateChanges: z.boolean().default(true),
  logConsistencyChecks: z.boolean().default(true),
  logMemoryOperations: z.boolean().default(false),
  debugLog: z.array(DebugLogEntrySchema).default([]),
});

/**
 * Branch schema for narrative branching with memory bank reference
 */
export const NarrativeBranchSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  parentNodeId: z.string(), // Node where this branch starts
  createdAt: z.string(),
  isActive: z.boolean(),
  memoryBankId: z.string().optional(), // Reference to MemoryBank (lazy loaded)
  metadata: z.object({
    reason: z.string().optional(),
    choice: z.string().optional(),
    impact: z.enum(['minor', 'moderate', 'major']).optional(),
  }).optional(),
});

/**
 * Serialized narrative schema with branching support and memory bank management
 */
export const SerializedNarrativeSchema = z.object({
  nodes: z.array(NarrativeNodeSchema),
  branches: z.array(NarrativeBranchSchema),
  memoryBanks: z.record(MemoryBankSchema), // Map of branchId -> MemoryBank
  currentNodeId: z.string().nullable(),
  currentBranchId: z.string().nullable(),
  mainBranchId: z.string(), // Primary narrative branch
  totalWords: z.number().min(0),
  totalNodes: z.number().min(0),
  lastUpdated: z.string(),
  version: z.number().min(0),
  memoryStats: z.object({
    totalMemoryBanks: z.number().min(0),
    totalMemorySize: z.number().min(0), // Total size in bytes
    activeMemoryBanks: z.number().min(0),
    lastCleanup: z.string().optional(),
  }).optional(),
  metadata: z.object({
    genre: z.string().optional(),
    tone: z.string().optional(),
    themes: z.array(z.string()).optional(),
    characters: z.array(z.string()).optional(),
    locations: z.array(z.string()).optional(),
    branchingEnabled: z.boolean().default(true),
  }).optional(),
});

export type SerializedNarrative = z.infer<typeof SerializedNarrativeSchema>;
export type NarrativeNode = z.infer<typeof NarrativeNodeSchema>;
export type NarrativeBranch = z.infer<typeof NarrativeBranchSchema>;
export type MemoryBank = z.infer<typeof MemoryBankSchema>;
export type ConsistencyCheckResult = z.infer<typeof ConsistencyCheckResultSchema>;
export type ConsistencyChecker = z.infer<typeof ConsistencyCheckerSchema>;
export type DebugLogEntry = z.infer<typeof DebugLogEntrySchema>;
export type DebugMode = z.infer<typeof DebugModeSchema>;

/**
 * Game rules schema
 */
export const GameRulesSchema = z.object({
  difficulty: z.enum(['easy', 'normal', 'hard', 'expert']),
  timeScale: z.number().min(0.1).max(10), // Real time to story time ratio
  inventoryLimit: z.number().min(1),
  autoSave: z.boolean(),
  debugMode: z.boolean(),
  customRules: z.record(z.any()).optional(),
});

export type GameRules = z.infer<typeof GameRulesSchema>;

/**
 * World state schema
 */
export const WorldStateSchema = z.object({
  currentLocation: z.string(),
  discoveredLocations: z.array(z.string()),
  worldEvents: z.array(z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    occurredAt: z.string(),
    impact: z.enum(['minor', 'moderate', 'major', 'catastrophic']),
    resolved: z.boolean(),
  })),
  weather: z.string().optional(),
  season: z.enum(['spring', 'summer', 'autumn', 'winter']).optional(),
  timeOfDay: z.enum(['dawn', 'morning', 'afternoon', 'evening', 'night', 'midnight']).optional(),
});

export type WorldState = z.infer<typeof WorldStateSchema>;

// ============================================================================
// GAME STATE ANNOTATION
// ============================================================================

/**
 * Top-level game state annotation
 * 
 * This is the root persistent state object that contains all game-related state,
 * including the narrator state, deterministic tracking, and serialized narrative.
 */
export const GameStateAnnotation = Annotation.Root({
  // Inherit standard message handling
  ...MessagesAnnotation.spec,
  
  // ============================================================================
  // GAME METADATA
  // ============================================================================
  
  /**
   * Unique game identifier
   */
  gameId: Annotation<string>({
    reducer: (existing: string, updates: string) => updates || existing,
    default: () => `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  }),
  
  /**
   * Current session identifier
   */
  sessionId: Annotation<string>({
    reducer: (existing: string, updates: string) => updates || existing,
    default: () => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  }),
  
  /**
   * Player identifier
   */
  playerId: Annotation<string>({
    reducer: (existing: string, updates: string) => updates || existing,
    default: () => `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  }),
  
  // ============================================================================
  // TIME AND PROGRESSION TRACKING
  // ============================================================================
  
  /**
   * Time elapsed in the story (in days)
   */
  storyTimeElapsed: Annotation<number>({
    reducer: (existing: number, updates: number) => {
      if (typeof updates === 'number') {
        return updates;
      }
      return existing;
    },
    default: () => 0,
  }),
  
  /**
   * Real-world timestamp when the game started
   */
  realTimeStarted: Annotation<string>({
    reducer: (existing: string, updates: string) => updates || existing,
    default: () => new Date().toISOString(),
  }),
  
  /**
   * Last activity timestamp
   */
  lastActivity: Annotation<string>({
    reducer: (existing: string, updates: string) => updates || existing,
    default: () => new Date().toISOString(),
  }),
  
  /**
   * Game phase (setup, active, paused, completed)
   */
  gamePhase: Annotation<'setup' | 'active' | 'paused' | 'completed'>({
    reducer: (existing: 'setup' | 'active' | 'paused' | 'completed', updates: 'setup' | 'active' | 'paused' | 'completed') => updates || existing,
    default: () => 'setup',
  }),
  
  // ============================================================================
  // PLAYER STATE
  // ============================================================================
  
  /**
   * Player inventory
   */
  playerInventory: Annotation<InventoryItem[]>({
    reducer: (existing: InventoryItem[], updates: InventoryItem[]) => {
      if (Array.isArray(updates)) {
        return [...existing, ...updates];
      }
      return existing;
    },
    default: () => [],
  }),
  
  /**
   * Player statistics and attributes
   */
  playerStats: Annotation<PlayerStats>({
    reducer: (existing: PlayerStats, updates: Partial<PlayerStats>) => {
      return { ...existing, ...updates };
    },
    default: () => ({
      level: 1,
      experience: 0,
      health: 100,
      maxHealth: 100,
      mana: 50,
      maxMana: 50,
      strength: 10,
      intelligence: 10,
      wisdom: 10,
      charisma: 10,
      dexterity: 10,
      constitution: 10,
      skills: {},
      achievements: [],
    }),
  }),
  
  /**
   * Current player location
   */
  playerLocation: Annotation<string>({
    reducer: (existing: string, updates: string) => updates || existing,
    default: () => 'unknown',
  }),
  
  // ============================================================================
  // NARRATIVE STATE
  // ============================================================================
  
  /**
   * Narrator state (conversation-level state)
   */
  narratorState: Annotation<EnhancedNarratorState>({
    reducer: (existing: EnhancedNarratorState, updates: Partial<EnhancedNarratorState>) => {
      return { ...existing, ...updates };
    },
    default: () => createEmptyNarratorState(),
  }),
  
  /**
   * Long-term serialized narrative storage
   */
  serializedNarrative: Annotation<SerializedNarrative>({
    reducer: (existing: SerializedNarrative, updates: Partial<SerializedNarrative>) => {
      const now = new Date().toISOString();
      return {
        ...existing,
        ...updates,
        lastUpdated: now,
        version: (existing.version || 0) + 1,
      };
    },
    default: () => ({
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
        lastCleanup: undefined,
      },
      metadata: {
        genre: 'fantasy',
        tone: 'adventure',
        themes: [],
        characters: [],
        locations: [],
        branchingEnabled: true,
      },
    }),
  }),
  
  // ============================================================================
  // GAME MECHANICS
  // ============================================================================
  
  /**
   * Game rules and configuration
   */
  gameRules: Annotation<GameRules>({
    reducer: (existing: GameRules, updates: Partial<GameRules>) => {
      return { ...existing, ...updates };
    },
    default: () => ({
      difficulty: 'normal',
      timeScale: 1.0, // 1 real day = 1 story day
      inventoryLimit: 50,
      autoSave: true,
      debugMode: false,
      customRules: {},
    }),
  }),
  
  /**
   * World state and events
   */
  worldState: Annotation<WorldState>({
    reducer: (existing: WorldState, updates: Partial<WorldState>) => {
      return { ...existing, ...updates };
    },
    default: () => ({
      currentLocation: 'unknown',
      discoveredLocations: [],
      worldEvents: [],
      weather: 'clear',
      season: 'spring',
      timeOfDay: 'morning',
    }),
  }),
  
  // ============================================================================
  // DEBUGGING AND METADATA
  // ============================================================================
  
  /**
   * Node history for debugging
   */
  nodeHistory: Annotation<string[]>({
    reducer: (existing: string[], updates: string[]) => {
      if (Array.isArray(updates)) {
        return [...existing, ...updates];
      }
      return existing;
    },
    default: () => [],
  }),
  
  /**
   * Error log
   */
  errorLog: Annotation<Array<{ id: string; message: string; timestamp: string; resolved: boolean }>>({
    reducer: (existing: Array<{ id: string; message: string; timestamp: string; resolved: boolean }>, updates: Array<{ id: string; message: string; timestamp: string; resolved: boolean }>) => {
      if (Array.isArray(updates)) {
        return [...existing, ...updates];
      }
      return existing;
    },
    default: () => [],
  }),

  // ============================================================================
  // CONSISTENCY CHECKER
  // ============================================================================
  
  /**
   * Consistency checker agent for story validation
   */
  consistencyChecker: Annotation<ConsistencyChecker>({
    reducer: (existing: ConsistencyChecker, updates: Partial<ConsistencyChecker>) => {
      return { ...existing, ...updates };
    },
    default: () => ({
      enabled: true,
      checkLastTurns: 10,
      strictMode: false,
      autoFix: false,
      lastCheck: undefined,
      checkHistory: [],
    }),
  }),

  // ============================================================================
  // DEBUG MODE
  // ============================================================================
  
  /**
   * Debug mode configuration and logging
   */
  debugMode: Annotation<DebugMode>({
    reducer: (existing: DebugMode, updates: Partial<DebugMode>) => {
      return { ...existing, ...updates };
    },
    default: () => ({
      enabled: false,
      logLevel: 'detailed',
      maxLogEntries: 100,
      logAgentCalls: true,
      logStateChanges: true,
      logConsistencyChecks: true,
      logMemoryOperations: false,
      debugLog: [],
    }),
  }),
});

export type GameState = typeof GameStateAnnotation.State;

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Create an empty narrator state
 */
function createEmptyNarratorState(): EnhancedNarratorState {
  // This would need to be implemented based on the actual EnhancedNarratorState structure
  // For now, return a minimal structure
  return {
    currentNarrative: "",
    narrativeHistory: [],
    userInput: "",
    nextAction: 'continue_narrative',
    specialistType: null,
    specialistResult: "",
    decisionReasoning: "",
    nodeHistory: [],
    narrativeCache: {
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
        version: 0,
        storyPhase: 'setup',
      },
    },
    recentlyIntroduced: [],
    storyPhase: 'setup',
    narrativeContext: "",
  } as EnhancedNarratorState;
}

/**
 * Calculate story time elapsed based on real time
 */
export function calculateStoryTimeElapsed(
  realTimeStarted: string,
  timeScale: number = 1.0
): number {
  const startTime = new Date(realTimeStarted).getTime();
  const currentTime = Date.now();
  const realTimeElapsed = (currentTime - startTime) / (1000 * 60 * 60 * 24); // Days
  return realTimeElapsed * timeScale;
}

/**
 * Update story time based on real time
 */
export function updateStoryTime(gameState: GameState): Partial<GameState> {
  const storyTimeElapsed = calculateStoryTimeElapsed(
    gameState.realTimeStarted,
    gameState.gameRules.timeScale
  );
  
  return {
    storyTimeElapsed,
    lastActivity: new Date().toISOString(),
  };
}

/**
 * Add item to inventory
 */
export function addInventoryItem(
  inventory: InventoryItem[],
  item: Omit<InventoryItem, 'acquiredAt'>
): InventoryItem[] {
  const newItem: InventoryItem = {
    ...item,
    acquiredAt: new Date().toISOString(),
  };
  
  return [...inventory, newItem];
}

/**
 * Remove item from inventory
 */
export function removeInventoryItem(
  inventory: InventoryItem[],
  itemId: string,
  quantity: number = 1
): InventoryItem[] {
  return inventory.map(item => {
    if (item.id === itemId) {
      const newQuantity = item.quantity - quantity;
      if (newQuantity <= 0) {
        return null; // Remove item
      }
      return { ...item, quantity: newQuantity };
    }
    return item;
  }).filter(Boolean) as InventoryItem[];
}

/**
 * Generate sequential narrative node ID
 */
export function generateNarrativeNodeId(sequence: number): string {
  return `narrative_${sequence.toString().padStart(3, '0')}`;
}

/**
 * Generate URI for narrative node
 */
export function generateNarrativeUri(nodeId: string, branchId: string): string {
  return `narrative://${branchId}/${nodeId}`;
}

/**
 * Add narrative node to serialized narrative
 */
export function addNarrativeNode(
  narrative: SerializedNarrative,
  node: Omit<NarrativeNode, 'id' | 'uri' | 'createdAt' | 'updatedAt' | 'wordCount' | 'sequence'>,
  options: {
    parentId?: string | null;
    branchId?: string;
    createBranch?: boolean;
    branchName?: string;
    branchReason?: string;
  } = {}
): SerializedNarrative {
  const now = new Date().toISOString();
  const sequence = narrative.totalNodes;
  const nodeId = generateNarrativeNodeId(sequence);
  const branchId = options.branchId || narrative.currentBranchId || narrative.mainBranchId;
  const uri = generateNarrativeUri(nodeId, branchId);
  
  const newNode: NarrativeNode = {
    ...node,
    id: nodeId,
    uri,
    parentId: options.parentId || null,
    branchId,
    sequence,
    createdAt: now,
    updatedAt: now,
    wordCount: node.content.split(/\s+/).length,
  };

  let updatedBranches = [...narrative.branches];
  
  // Create new branch if requested
  if (options.createBranch && options.branchName) {
    const branchId = `branch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newBranch: NarrativeBranch = {
      id: branchId,
      name: options.branchName,
      description: options.branchReason,
      parentNodeId: options.parentId || '',
      createdAt: now,
      isActive: true,
      metadata: {
        reason: options.branchReason,
        impact: 'moderate',
      },
    };
    updatedBranches.push(newBranch);
    newNode.branchId = branchId;
    newNode.uri = generateNarrativeUri(nodeId, branchId);
  }
  
  return {
    ...narrative,
    nodes: [...narrative.nodes, newNode],
    branches: updatedBranches,
    currentNodeId: nodeId,
    currentBranchId: newNode.branchId,
    totalNodes: narrative.totalNodes + 1,
    totalWords: narrative.totalWords + newNode.wordCount,
    lastUpdated: now,
    version: narrative.version + 1,
  };
}

/**
 * Get narrative node by ID
 */
export function getNarrativeNode(narrative: SerializedNarrative, nodeId: string): NarrativeNode | null {
  return narrative.nodes.find(node => node.id === nodeId) || null;
}

/**
 * Get narrative node by URI
 */
export function getNarrativeNodeByUri(narrative: SerializedNarrative, uri: string): NarrativeNode | null {
  return narrative.nodes.find(node => node.uri === uri) || null;
}

/**
 * Get all nodes in a branch
 */
export function getBranchNodes(narrative: SerializedNarrative, branchId: string): NarrativeNode[] {
  return narrative.nodes
    .filter(node => node.branchId === branchId)
    .sort((a, b) => a.sequence - b.sequence);
}

/**
 * Get narrative path (sequence of nodes from root to current)
 */
export function getNarrativePath(narrative: SerializedNarrative, nodeId: string): NarrativeNode[] {
  const path: NarrativeNode[] = [];
  let currentNode = getNarrativeNode(narrative, nodeId);
  
  while (currentNode) {
    path.unshift(currentNode);
    currentNode = currentNode.parentId ? getNarrativeNode(narrative, currentNode.parentId) : null;
  }
  
  return path;
}

/**
 * Create a branch from a specific node
 */
export function createNarrativeBranch(
  narrative: SerializedNarrative,
  parentNodeId: string,
  branchName: string,
  branchReason: string,
  initialContent: string
): SerializedNarrative {
  const parentNode = getNarrativeNode(narrative, parentNodeId);
  if (!parentNode) {
    throw new Error(`Parent node ${parentNodeId} not found`);
  }

  return addNarrativeNode(
    narrative,
    {
      title: `${branchName} - ${parentNode.title}`,
      content: initialContent,
      tags: ['branch', branchName.toLowerCase()],
      metadata: {
        author: 'narrator',
        mood: 'exploratory',
        location: parentNode.metadata?.location,
        characters: parentNode.metadata?.characters,
        events: [`Branch: ${branchName}`],
      },
    },
    {
      parentId: parentNodeId,
      createBranch: true,
      branchName,
      branchReason,
    }
  );
}

// ============================================================================
// MEMORY BANK MANAGEMENT (Memory-Efficient)
// ============================================================================

/**
 * Create or update a MemoryBank for a branch
 */
export function createMemoryBank(
  narrative: SerializedNarrative,
  branchId: string,
  data: Record<string, unknown>,
  options: {
    compress?: boolean;
    maxSize?: number;
  } = {}
): SerializedNarrative {
  const now = new Date().toISOString();
  const dataString = JSON.stringify(data);
  const size = new Blob([dataString]).size;
  
  // Check size limit
  if (options.maxSize && size > options.maxSize) {
    throw new Error(`MemoryBank data exceeds size limit: ${size} > ${options.maxSize}`);
  }

  const memoryBank: MemoryBank = {
    branchId,
    data,
    checksum: generateChecksum(dataString),
    lastAccessed: now,
    size,
    compressed: options.compress || false,
  };

  const updatedMemoryBanks = {
    ...narrative.memoryBanks,
    [branchId]: memoryBank,
  };

  return {
    ...narrative,
    memoryBanks: updatedMemoryBanks,
    memoryStats: {
      totalMemoryBanks: Object.keys(updatedMemoryBanks).length,
      totalMemorySize: Object.values(updatedMemoryBanks).reduce((sum, mb) => sum + mb.size, 0),
      activeMemoryBanks: Object.values(updatedMemoryBanks).filter(mb => mb.lastAccessed > new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()).length,
      lastCleanup: narrative.memoryStats?.lastCleanup,
    },
    lastUpdated: now,
    version: narrative.version + 1,
  };
}

/**
 * Get MemoryBank for a branch (lazy loading)
 */
export function getMemoryBank(narrative: SerializedNarrative, branchId: string): MemoryBank | null {
  const memoryBank = narrative.memoryBanks[branchId];
  if (!memoryBank) {
    return null;
  }

  // Update last accessed time
  const updatedMemoryBank = {
    ...memoryBank,
    lastAccessed: new Date().toISOString(),
  };

  return updatedMemoryBank;
}

/**
 * Update MemoryBank data for a branch
 */
export function updateMemoryBank(
  narrative: SerializedNarrative,
  branchId: string,
  updates: Partial<Record<string, unknown>>
): SerializedNarrative {
  const existingMemoryBank = narrative.memoryBanks[branchId];
  if (!existingMemoryBank) {
    throw new Error(`MemoryBank for branch ${branchId} not found`);
  }

  const updatedData = {
    ...existingMemoryBank.data,
    ...updates,
  };

  return createMemoryBank(narrative, branchId, updatedData, {
    compress: existingMemoryBank.compressed,
  });
}

/**
 * Delete MemoryBank for a branch
 */
export function deleteMemoryBank(narrative: SerializedNarrative, branchId: string): SerializedNarrative {
  const { [branchId]: deleted, ...remainingMemoryBanks } = narrative.memoryBanks;
  
  return {
    ...narrative,
    memoryBanks: remainingMemoryBanks,
    memoryStats: {
      totalMemoryBanks: Object.keys(remainingMemoryBanks).length,
      totalMemorySize: Object.values(remainingMemoryBanks).reduce((sum, mb) => sum + mb.size, 0),
      activeMemoryBanks: Object.values(remainingMemoryBanks).filter(mb => mb.lastAccessed > new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()).length,
      lastCleanup: narrative.memoryStats?.lastCleanup,
    },
    lastUpdated: new Date().toISOString(),
    version: narrative.version + 1,
  };
}

/**
 * Clean up inactive MemoryBanks (memory optimization)
 */
export function cleanupInactiveMemoryBanks(
  narrative: SerializedNarrative,
  options: {
    maxAge?: number; // Hours
    maxSize?: number; // Bytes
    keepActive?: boolean;
  } = {}
): SerializedNarrative {
  const now = new Date();
  const maxAge = options.maxAge || 24; // Default 24 hours
  const maxSize = options.maxSize || 10 * 1024 * 1024; // Default 10MB
  const keepActive = options.keepActive !== false; // Default true

  const cutoffTime = new Date(now.getTime() - maxAge * 60 * 60 * 1000).toISOString();
  
  let cleanedMemoryBanks = { ...narrative.memoryBanks };
  let totalSize = 0;

  // Remove inactive MemoryBanks
  Object.entries(cleanedMemoryBanks).forEach(([branchId, memoryBank]) => {
    const isActive = memoryBank.lastAccessed > cutoffTime;
    const wouldExceedSize = totalSize + memoryBank.size > maxSize;
    
    if (!isActive && (!keepActive || wouldExceedSize)) {
      delete cleanedMemoryBanks[branchId];
    } else {
      totalSize += memoryBank.size;
    }
  });

  return {
    ...narrative,
    memoryBanks: cleanedMemoryBanks,
    memoryStats: {
      totalMemoryBanks: Object.keys(cleanedMemoryBanks).length,
      totalMemorySize: totalSize,
      activeMemoryBanks: Object.values(cleanedMemoryBanks).filter(mb => mb.lastAccessed > cutoffTime).length,
      lastCleanup: now.toISOString(),
    },
    lastUpdated: now.toISOString(),
    version: narrative.version + 1,
  };
}

/**
 * Get memory usage statistics
 */
export function getMemoryStats(narrative: SerializedNarrative) {
  return narrative.memoryStats || {
    totalMemoryBanks: 0,
    totalMemorySize: 0,
    activeMemoryBanks: 0,
    lastCleanup: undefined,
  };
}

/**
 * Generate checksum for data integrity
 */
function generateChecksum(data: string): string {
  // Simple checksum implementation - in production, use crypto.createHash
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString(36);
}

// ============================================================================
// CONSISTENCY CHECKER UTILITIES
// ============================================================================

/**
 * Check story consistency over the last N turns
 */
export function checkStoryConsistency(
  narrative: SerializedNarrative,
  lastTurns: number = 10
): ConsistencyCheckResult {
  const inconsistencies: ConsistencyCheckResult['inconsistencies'] = [];
  let overallScore = 100; // Start with perfect score

  // Get the last N narrative nodes
  const recentNodes = narrative.nodes
    .sort((a, b) => b.sequence - a.sequence)
    .slice(0, lastTurns)
    .reverse(); // Oldest first

  if (recentNodes.length === 0) {
    return {
      isConsistent: true,
      inconsistencies: [],
      overallScore: 100,
      needsRevision: false,
    };
  }

  // Check for character inconsistencies
  const characterInconsistencies = checkCharacterConsistency(recentNodes);
  inconsistencies.push(...characterInconsistencies);
  overallScore -= characterInconsistencies.length * 10;

  // Check for location inconsistencies
  const locationInconsistencies = checkLocationConsistency(recentNodes);
  inconsistencies.push(...locationInconsistencies);
  overallScore -= locationInconsistencies.length * 8;

  // Check for timeline inconsistencies
  const timelineInconsistencies = checkTimelineConsistency(recentNodes);
  inconsistencies.push(...timelineInconsistencies);
  overallScore -= timelineInconsistencies.length * 15;

  // Check for plot inconsistencies
  const plotInconsistencies = checkPlotConsistency(recentNodes);
  inconsistencies.push(...plotInconsistencies);
  overallScore -= plotInconsistencies.length * 12;

  // Check for world state inconsistencies
  const worldStateInconsistencies = checkWorldStateConsistency(recentNodes);
  inconsistencies.push(...worldStateInconsistencies);
  overallScore -= worldStateInconsistencies.length * 7;

  // Determine if revision is needed
  const criticalIssues = inconsistencies.filter(inc => inc.severity === 'critical').length;
  const majorIssues = inconsistencies.filter(inc => inc.severity === 'major').length;
  const needsRevision = criticalIssues > 0 || majorIssues > 2 || overallScore < 60;

  return {
    isConsistent: inconsistencies.length === 0,
    inconsistencies,
    overallScore: Math.max(0, overallScore),
    needsRevision,
    revisionReason: needsRevision ? 
      `Found ${criticalIssues} critical and ${majorIssues} major inconsistencies` : 
      undefined,
  };
}

/**
 * Check character consistency across narrative nodes
 */
function checkCharacterConsistency(nodes: NarrativeNode[]): ConsistencyCheckResult['inconsistencies'] {
  const inconsistencies: ConsistencyCheckResult['inconsistencies'] = [];
  const characterStates = new Map<string, any>();

  nodes.forEach((node, index) => {
    const characters = node.metadata?.characters || [];
    const events = node.metadata?.events || [];

    characters.forEach(character => {
      const previousState = characterStates.get(character);
      
      // Check for character death/revival inconsistencies
      if (events.some(event => event.includes('death') || event.includes('died'))) {
        if (previousState?.alive === true) {
          characterStates.set(character, { ...previousState, alive: false, deathTurn: index });
        }
      } else if (events.some(event => event.includes('revive') || event.includes('resurrect'))) {
        if (previousState?.alive === false) {
          characterStates.set(character, { ...previousState, alive: true, revivalTurn: index });
        }
      } else {
        characterStates.set(character, { ...previousState, alive: true, lastSeen: index });
      }

      // Check for impossible character appearances
      if (previousState?.alive === false && !events.some(event => event.includes('revive') || event.includes('resurrect'))) {
        inconsistencies.push({
          type: 'character',
          description: `Character "${character}" appears after being killed without revival`,
          severity: 'critical',
          turnNumber: index,
          suggestedFix: `Either revive ${character} or remove their appearance from this turn`,
        });
      }
    });
  });

  return inconsistencies;
}

/**
 * Check location consistency across narrative nodes
 */
function checkLocationConsistency(nodes: NarrativeNode[]): ConsistencyCheckResult['inconsistencies'] {
  const inconsistencies: ConsistencyCheckResult['inconsistencies'] = [];
  const locationTransitions = new Map<string, number>();

  nodes.forEach((node, index) => {
    const location = node.metadata?.location;
    const events = node.metadata?.events || [];

    if (location) {
      const previousLocation = locationTransitions.get('current');
      
      // Check for impossible location changes
      if (previousLocation && !events.some(event => 
        event.includes('travel') || event.includes('move') || event.includes('teleport') || event.includes('portal')
      )) {
        // This is a potential inconsistency - character changed location without explanation
        if (previousLocation !== location) {
          inconsistencies.push({
            type: 'location',
            description: `Location changed from "${previousLocation}" to "${location}" without travel event`,
            severity: 'moderate',
            turnNumber: index,
            suggestedFix: `Add a travel event or explain how the character moved between locations`,
          });
        }
      }
      
      locationTransitions.set('current', location);
    }
  });

  return inconsistencies;
}

/**
 * Check timeline consistency across narrative nodes
 */
function checkTimelineConsistency(nodes: NarrativeNode[]): ConsistencyCheckResult['inconsistencies'] {
  const inconsistencies: ConsistencyCheckResult['inconsistencies'] = [];
  const timeReferences = new Map<string, number>();

  nodes.forEach((node, index) => {
    const content = node.content.toLowerCase();
    const events = node.metadata?.events || [];

    // Look for time references
    const timePatterns = [
      /(\d+)\s+(day|days|hour|hours|minute|minutes|second|seconds)\s+(ago|later|before|after)/g,
      /(yesterday|today|tomorrow|morning|afternoon|evening|night)/g,
      /(dawn|dusk|sunrise|sunset)/g,
    ];

    timePatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const timeRef = match[0];
        const previousRef = timeReferences.get(timeRef);
        
        if (previousRef !== undefined && previousRef !== index - 1) {
          inconsistencies.push({
            type: 'timeline',
            description: `Time reference "${timeRef}" appears inconsistently across turns`,
            severity: 'moderate',
            turnNumber: index,
            suggestedFix: `Ensure time references are consistent with the story timeline`,
          });
        }
        
        timeReferences.set(timeRef, index);
      }
    });
  });

  return inconsistencies;
}

/**
 * Check plot consistency across narrative nodes
 */
function checkPlotConsistency(nodes: NarrativeNode[]): ConsistencyCheckResult['inconsistencies'] {
  const inconsistencies: ConsistencyCheckResult['inconsistencies'] = [];
  const plotPoints = new Map<string, { introduced: number; resolved: number | null }>();

  nodes.forEach((node, index) => {
    const events = node.metadata?.events || [];
    const content = node.content.toLowerCase();

    // Look for plot point introductions and resolutions
    events.forEach(event => {
      if (event.includes('quest') || event.includes('mission') || event.includes('goal')) {
        const plotKey = `plot_${event}`;
        if (!plotPoints.has(plotKey)) {
          plotPoints.set(plotKey, { introduced: index, resolved: null });
        }
      }
      
      if (event.includes('complete') || event.includes('finish') || event.includes('resolve')) {
        // Look for corresponding plot point
        for (const [key, value] of plotPoints.entries()) {
          if (value.resolved === null && event.includes(key.split('_')[1])) {
            plotPoints.set(key, { ...value, resolved: index });
            break;
          }
        }
      }
    });
  });

  // Check for unresolved plot points
  plotPoints.forEach((value, key) => {
    if (value.resolved === null && nodes.length - value.introduced > 5) {
      inconsistencies.push({
        type: 'plot',
        description: `Plot point "${key}" was introduced but never resolved`,
        severity: 'moderate',
        turnNumber: value.introduced,
        suggestedFix: `Either resolve this plot point or remove it from the story`,
      });
    }
  });

  return inconsistencies;
}

/**
 * Check world state consistency across narrative nodes
 */
function checkWorldStateConsistency(nodes: NarrativeNode[]): ConsistencyCheckResult['inconsistencies'] {
  const inconsistencies: ConsistencyCheckResult['inconsistencies'] = [];
  const worldStates = new Map<string, any>();

  nodes.forEach((node, index) => {
    const events = node.metadata?.events || [];
    const content = node.content.toLowerCase();

    // Track world state changes
    if (events.some(event => event.includes('destroy') || event.includes('burn') || event.includes('collapse'))) {
      worldStates.set('destruction', { level: 'high', turn: index });
    } else if (events.some(event => event.includes('build') || event.includes('create') || event.includes('restore'))) {
      worldStates.set('construction', { level: 'high', turn: index });
    }

    // Check for contradictory world states
    const destruction = worldStates.get('destruction');
    const construction = worldStates.get('construction');
    
    if (destruction && construction && Math.abs(destruction.turn - construction.turn) < 3) {
      inconsistencies.push({
        type: 'world_state',
        description: `World state shows both destruction and construction in close succession`,
        severity: 'moderate',
        turnNumber: index,
        suggestedFix: `Clarify the world state or add explanation for the rapid changes`,
      });
    }
  });

  return inconsistencies;
}

// ============================================================================
// DEBUG MODE UTILITIES
// ============================================================================

/**
 * Add debug log entry
 */
export function addDebugLogEntry(
  state: GameState,
  entry: Omit<DebugLogEntry, 'id' | 'timestamp'>
): GameState {
  if (!state.debugMode.enabled) {
    return state;
  }

  const debugEntry: DebugLogEntry = {
    ...entry,
    id: `debug_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
  };

  const updatedDebugLog = [...state.debugMode.debugLog, debugEntry]
    .slice(-state.debugMode.maxLogEntries); // Keep only last N entries

  return {
    ...state,
    debugMode: {
      ...state.debugMode,
      debugLog: updatedDebugLog,
    },
  };
}

/**
 * Log agent call with input/output
 */
export function logAgentCall(
  state: GameState,
  nodeId: string,
  agentType: DebugLogEntry['agentType'],
  action: string,
  input?: Record<string, unknown>,
  output?: Record<string, unknown>,
  duration?: number,
  success: boolean = true,
  error?: string,
  metadata?: Record<string, unknown>
): GameState {
  if (!state.debugMode.enabled || !state.debugMode.logAgentCalls) {
    return state;
  }

  return addDebugLogEntry(state, {
    nodeId,
    agentType,
    action,
    input,
    output,
    duration,
    success,
    error,
    metadata,
  });
}

/**
 * Log state change
 */
export function logStateChange(
  state: GameState,
  nodeId: string,
  changeType: string,
  beforeState: Record<string, unknown>,
  afterState: Record<string, unknown>,
  metadata?: Record<string, unknown>
): GameState {
  if (!state.debugMode.enabled || !state.debugMode.logStateChanges) {
    return state;
  }

  return addDebugLogEntry(state, {
    nodeId,
    agentType: 'other',
    action: `state_change_${changeType}`,
    input: beforeState,
    output: afterState,
    success: true,
    metadata: {
      changeType,
      ...metadata,
    },
  });
}

/**
 * Log consistency check
 */
export function logConsistencyCheck(
  state: GameState,
  checkResult: ConsistencyCheckResult,
  duration?: number
): GameState {
  if (!state.debugMode.enabled || !state.debugMode.logConsistencyChecks) {
    return state;
  }

  return addDebugLogEntry(state, {
    nodeId: 'consistency_checker',
    agentType: 'consistency_checker',
    action: 'consistency_check',
    input: {
      lastTurns: state.consistencyChecker.checkLastTurns,
      strictMode: state.consistencyChecker.strictMode,
    },
    output: {
      isConsistent: checkResult.isConsistent,
      overallScore: checkResult.overallScore,
      inconsistencyCount: checkResult.inconsistencies.length,
      needsRevision: checkResult.needsRevision,
    },
    duration,
    success: checkResult.isConsistent,
    error: checkResult.needsRevision ? checkResult.revisionReason : undefined,
    metadata: {
      inconsistencies: checkResult.inconsistencies,
    },
  });
}

/**
 * Log memory operation
 */
export function logMemoryOperation(
  state: GameState,
  nodeId: string,
  operation: string,
  memoryBankId: string,
  size: number,
  success: boolean = true,
  error?: string
): GameState {
  if (!state.debugMode.enabled || !state.debugMode.logMemoryOperations) {
    return state;
  }

  return addDebugLogEntry(state, {
    nodeId,
    agentType: 'other',
    action: `memory_${operation}`,
    input: { memoryBankId },
    output: { size },
    success,
    error,
    metadata: {
      operation,
      memoryBankId,
      size,
    },
  });
}

/**
 * Get debug log summary
 */
export function getDebugLogSummary(state: GameState) {
  if (!state.debugMode.enabled) {
    return { enabled: false, message: 'Debug mode is disabled' };
  }

  const log = state.debugMode.debugLog;
  const totalEntries = log.length;
  const successCount = log.filter(entry => entry.success).length;
  const errorCount = log.filter(entry => !entry.success).length;
  const agentTypes = [...new Set(log.map(entry => entry.agentType))];
  const averageDuration = log
    .filter(entry => entry.duration)
    .reduce((sum, entry) => sum + (entry.duration || 0), 0) / 
    log.filter(entry => entry.duration).length || 0;

  return {
    enabled: true,
    totalEntries,
    successCount,
    errorCount,
    successRate: totalEntries > 0 ? (successCount / totalEntries) * 100 : 0,
    agentTypes,
    averageDuration: Math.round(averageDuration),
    lastEntry: log[log.length - 1],
    recentErrors: log.filter(entry => !entry.success).slice(-5),
  };
}

/**
 * Clear debug log
 */
export function clearDebugLog(state: GameState): GameState {
  return {
    ...state,
    debugMode: {
      ...state.debugMode,
      debugLog: [],
    },
  };
}

/**
 * Update player stats
 */
export function updatePlayerStats(
  stats: PlayerStats,
  updates: Partial<PlayerStats>
): PlayerStats {
  return { ...stats, ...updates };
}

/**
 * Add world event
 */
export function addWorldEvent(
  worldState: WorldState,
  event: Omit<WorldState['worldEvents'][0], 'id' | 'occurredAt'>
): WorldState {
  const newEvent = {
    ...event,
    id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    occurredAt: new Date().toISOString(),
  };
  
  return {
    ...worldState,
    worldEvents: [...worldState.worldEvents, newEvent],
  };
}
