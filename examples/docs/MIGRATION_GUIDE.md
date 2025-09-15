# State Architecture Migration Guide

## Overview

This document describes the migration from the original mixed state management approach to the new separated architecture with clear boundaries between LangGraph state and Immer state.

## Architecture Changes

### Before (Mixed State Management)
```typescript
// Single state annotation with mixed concerns
export const StreamingChatStateAnnotation = Annotation.Root({
  // Business logic
  messages: Annotation<Message[]>,
  currentNarrative: Annotation<string>,
  // UI state
  streamingProperties: Annotation<StreamingProperties>,
  // Action tracking
  agentActions: Annotation<Action[]>,
});

// Single state manager handling everything
class DraftImmerStateManager {
  private state: Draft<StreamingChatState>;
  // Mixed responsibilities
}
```

### After (Separated State Management)
```typescript
// LangGraph State (Business Logic)
export const ConversationStateAnnotation = Annotation.Root({
  messages: Annotation<Message[]>,
  currentNarrative: Annotation<string>,
  conversationId: Annotation<string>,
  isGenerating: Annotation<boolean>,
  errors: Annotation<ErrorEntry[]>,
  currentNode: Annotation<string>,
  nodeHistory: Annotation<string[]>,
  userInput: Annotation<string>,
});

// UI State (Real-time Updates)
export interface UIState {
  streamingProperties: StreamingProperties;
  agentActions: Action[];
  updateHistory: UpdateEntry[];
  isVisible: boolean;
  scrollPosition: number;
  selectedMessage?: string;
}

// Separate managers
class DraftUIStateManager {
  private state: Draft<UIState>;
  // UI-specific responsibilities
}

class DraftStateSynchronizer {
  // Synchronization between systems
}
```

## Key Benefits

### 1. Clear Separation of Concerns
- **LangGraph State**: Business logic, conversation data, flow control
- **Immer State**: UI updates, real-time streaming, action tracking

### 2. Performance Optimization
- LangGraph state updates are batched and efficient
- Immer state updates are fine-grained and real-time
- No unnecessary synchronization overhead

### 3. Maintainability
- Clear boundaries between systems
- Easier to debug and test
- Independent evolution of each system

### 4. Scalability
- LangGraph can handle complex conversation flows
- Immer can handle high-frequency UI updates
- Persistence layer can optimize for different patterns

## Migration Steps

### Step 1: Separate State Types
- Create `ConversationStateAnnotation` for LangGraph
- Create `UIState` interface for Immer
- Remove mixed concerns from single state

### Step 2: Create Separate Managers
- `DraftUIStateManager` for UI state
- `DraftStateSynchronizer` for coordination
- Remove mixed responsibilities from single manager

### Step 3: Update LangGraph Nodes
- Nodes work with `ConversationState` only
- Remove Immer state updates from nodes
- Use synchronizer for UI updates

### Step 4: Implement Synchronization
- `syncConversationToUI()` for LangGraph → UI updates
- `syncUIToConversation()` for UI → LangGraph updates
- Clear, unidirectional flow

## File Changes

### New Files
- `streaming-state-draft-v2.ts` - New separated architecture
- `test-streaming-draft-v2.ts` - Tests for new architecture
- `MIGRATION_GUIDE.md` - This guide

### Modified Files
- `package.json` - Added new test script

### Deprecated Files
- `streaming-state-draft.ts` - Original mixed architecture (kept for reference)

## Testing

### New Test Script
```bash
npm run draft:v2:test
```

### Test Coverage
- Basic agent creation
- UI state management
- Action tracking
- Token generation tracking
- State synchronizer
- Conversation flow

## Usage Examples

### Creating an Agent
```typescript
import { DraftHybridStreamingAgent } from './streaming-state-draft-v2';

const agent = new DraftHybridStreamingAgent();
await agent.startConversation('Hello, world!');
```

### Accessing States
```typescript
// UI state (real-time updates)
const uiState = agent.uiStateManager.getCurrentState();
console.log('Streaming progress:', uiState.streamingProperties.streamingProgress);

// Conversation state (business logic)
const conversationState = agent.getConversationState();
console.log('Current narrative:', conversationState.currentNarrative);
```

### Custom UI State Updates
```typescript
// Update UI state directly
agent.uiStateManager.updateUIState(draft => {
  draft.streamingProperties.streamingProgress = 75;
  draft.isVisible = true;
});

// Track custom actions
agent.uiStateManager.trackAction('custom_action', 'completed', { data: 'test' });
```

## Warnings

### ⚠️ DRAFT Implementation
- This is a DRAFT implementation
- Code is UNTESTED and may not work correctly
- State management architecture is experimental
- Error handling is incomplete
- Type safety is not fully implemented

### ⚠️ Breaking Changes
- State structure has changed significantly
- API methods have been renamed/restructured
- Synchronization is now explicit, not automatic

### ⚠️ Performance Considerations
- State synchronization adds overhead
- Event emission may impact performance
- Action tracking increases memory usage

## Future Improvements

### Phase 1: Testing and Validation
- Comprehensive test coverage
- Performance benchmarking
- Error handling validation

### Phase 2: Optimization
- Reduce synchronization overhead
- Optimize event emission
- Memory usage optimization

### Phase 3: Production Readiness
- Remove DRAFT warnings
- Complete type safety
- Production error handling

## Conclusion

The new separated architecture provides clear boundaries between LangGraph state (business logic) and Immer state (UI/real-time updates), improving maintainability, performance, and scalability. However, it is still a DRAFT implementation that requires extensive testing and validation before production use.
