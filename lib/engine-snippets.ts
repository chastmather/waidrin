/**
 * ENGINE SNIPPETS - Useful pieces from original engine
 * 
 * These are useful snippets from the original engine that might be helpful
 * for LangGraph implementation. They are NOT base code - use as reference only.
 */

// ============================================================================
// SNIPPET: Event types that might be useful for LangGraph nodes
// ============================================================================
export interface NarrationEvent {
  type: "narration";
  text: string;
}

export interface LocationChangeEvent {
  type: "location_change";
  location: {
    name: string;
    type: string;
    description: string;
  };
}

export interface CharacterIntroductionEvent {
  type: "character_introduction";
  character: {
    name: string;
    gender: string;
    race: string;
    biography: string;
    locationIndex: number;
  };
}

export interface ActionEvent {
  type: "action";
  actions: Array<{
    text: string;
    action: string;
  }>;
}

export type Event = NarrationEvent | LocationChangeEvent | CharacterIntroductionEvent | ActionEvent;

// ============================================================================
// SNIPPET: Location interface
// ============================================================================
export interface Location {
  name: string;
  type: string;
  description: string;
}

// ============================================================================
// SNIPPET: Character interface
// ============================================================================
export interface Character {
  name: string;
  gender: string;
  race: string;
  biography: string;
  locationIndex: number;
}

// ============================================================================
// SNIPPET: Basic state structure (for reference)
// ============================================================================
export interface BasicState {
  view: string;
  world: {
    name: string;
    description: string;
  };
  locations: Location[];
  characters: Character[];
  events: Event[];
  currentEventIndex: number;
  isGenerating: boolean;
  error: string | null;
  isAborted: boolean;
}

// ============================================================================
// SNIPPET: Utility functions that might be useful
// ============================================================================
export const createLocation = (name: string, type: string, description: string): Location => ({
  name,
  type,
  description,
});

export const createCharacter = (
  name: string,
  gender: string,
  race: string,
  biography: string,
  locationIndex: number
): Character => ({
  name,
  gender,
  race,
  biography,
  locationIndex,
});

// ============================================================================
// SNIPPET: Error handling patterns
// ============================================================================
export const handleEngineError = (error: unknown, context: string): string => {
  if (error instanceof Error) {
    return `${context}: ${error.message}`;
  }
  return `${context}: Unknown error occurred`;
};

// ============================================================================
// SNIPPET: State validation helpers
// ============================================================================
export const isValidLocation = (location: unknown): location is Location => {
  return (
    typeof location === "object" &&
    location !== null &&
    "name" in location &&
    "type" in location &&
    "description" in location
  );
};

export const isValidCharacter = (character: unknown): character is Character => {
  return (
    typeof character === "object" &&
    character !== null &&
    "name" in character &&
    "gender" in character &&
    "race" in character &&
    "biography" in character &&
    "locationIndex" in character
  );
};
