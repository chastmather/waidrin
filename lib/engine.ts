/**
 * Current Engine Wrapper
 * 
 * This is a wrapper around the original engine implementation that re-exports
 * all the necessary functions while maintaining backward compatibility.
 * 
 * The current engine uses a linear state machine approach.
 */

// Re-export all functions from the original engine
export {
  next,
  back,
  reset,
  abort,
  isAbortError,
  getEngineStatus,
} from "./engine-original";

// Re-export types
export type {
  Location,
  NarrationEvent,
  LocationChangeEvent,
  CharacterIntroductionEvent,
  ActionEvent,
  Event,
} from "./schemas";
