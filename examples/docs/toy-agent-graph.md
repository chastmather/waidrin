# Toy Narrative Chat Agent - LangGraph Structure

## Graph Overview

The ToyNarrativeChatAgent implements a LangGraph-based conversational AI that generates persistent narrative responses using the Waidrin backend.

## LangGraph Node Structure

```
                    ┌─────────────────┐
                    │   __start__     │
                    └─────────┬───────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │  process_input  │
                    │                 │
                    │ • Validates user│
                    │   input         │
                    │ • Adds user msg │
                    │ • Sets generating│
                    │   flag          │
                    └─────────┬───────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │generate_narrative│
                    │                 │
                    │ • Creates prompt│
                    │ • Calls backend │
                    │ • Streams tokens│
                    │ • Adds assistant│
                    │   message       │
                    └─────────┬───────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │ update_history  │
                    │                 │
                    │ • Saves current │
                    │   narrative     │
                    │ • Updates       │
                    │   history array │
                    └─────────┬───────┘
                              │
                              │ shouldHandleError()
                              ▼
                    ┌─────────────────┐
                    │  error_handling │◄─────────────┐
                    │                 │              │
                    │ • Marks errors  │              │
                    │   as resolved   │              │
                    │ • Cleans up     │              │
                    │   error state   │              │
                    └─────────┬───────┘              │
                              │                      │
                              │ afterErrorHandling() │
                              ▼                      │
                    ┌─────────────────┐              │
                    │      END        │              │
                    └─────────────────┘              │
                                                     │
                    ┌─────────────────┐              │
                    │generate_narrative│◄─────────────┘
                    │                 │
                    │ (Retry after    │
                    │  error handling)│
                    └─────────────────┘
```

## State Structure

### ChatStateAnnotation
```typescript
{
  // Conversation state
  messages: Array<{
    role: "user" | "assistant";
    content: string;
    timestamp: string;
  }>;
  
  currentNarrative: string;
  narrativeHistory: Array<{
    id: string;
    content: string;
    timestamp: string;
  }>;
  
  // User interaction
  userInput: string;
  isGenerating: boolean;
  
  // System state
  errors: Array<{
    id: string;
    message: string;
    timestamp: string;
    resolved: boolean;
  }>;
  conversationId: string;
}
```

## Node Functions

### 1. process_input
**Purpose**: Validates and processes user input
**Actions**:
- Validates user input is not empty
- Creates user message object
- Adds message to conversation
- Sets `isGenerating: true`
- Returns error if input is invalid

**Input**: `ChatState` with `userInput`
**Output**: `Partial<ChatState>` with updated messages and generation flag

### 2. generate_narrative
**Purpose**: Generates AI narrative response using backend
**Actions**:
- Creates conversation context from messages
- Builds narrative prompt with system/user instructions
- Calls `backend.getNarration()` with streaming
- Creates assistant message
- Updates conversation with response
- Sets `isGenerating: false`
- Handles errors and adds to error state

**Input**: `ChatState` with conversation messages
**Output**: `Partial<ChatState>` with assistant message and narrative

### 3. update_history
**Purpose**: Saves current narrative to history
**Actions**:
- Creates narrative entry with ID and timestamp
- Adds to narrative history array
- Preserves conversation continuity

**Input**: `ChatState` with `currentNarrative`
**Output**: `Partial<ChatState>` with updated history

### 4. error_handling
**Purpose**: Processes and resolves errors
**Actions**:
- Finds last unresolved error
- Marks error as resolved
- Cleans up error state
- Enables retry flow

**Input**: `ChatState` with errors
**Output**: `Partial<ChatState>` with resolved errors

## Conditional Edge Functions

### shouldHandleError()
**Logic**: 
```typescript
if (state.errors.length > 0) {
  const lastError = state.errors[state.errors.length - 1];
  if (!lastError.resolved) {
    return "error_handling";
  }
}
return "end";
```

**Routes**:
- `error_handling` → If unresolved errors exist
- `end` → If no errors or all resolved

### afterErrorHandling()
**Logic**:
```typescript
const lastError = state.errors[state.errors.length - 1];
if (lastError?.resolved) {
  return "generate_narrative";
}
return "end";
```

**Routes**:
- `generate_narrative` → If error was resolved (retry)
- `end` → If error persists or no errors

## Backend Integration

### ToyBackend
**Implements**: `Backend` interface
**Features**:
- OpenAI client integration
- Streaming token callbacks
- Error handling with abort support
- Environment variable configuration

**Key Methods**:
- `getNarration(prompt, onToken)` → Generates narrative with streaming
- `getObject<Schema>(prompt, schema, onToken)` → Structured output generation
- `abort()` → Cancels ongoing requests
- `isAbortError(error)` → Detects user cancellations

## Flow Patterns

### Normal Flow
```
__start__ → process_input → generate_narrative → update_history → END
```

### Error Flow
```
__start__ → process_input → generate_narrative → update_history → error_handling → generate_narrative → update_history → END
```

### Retry Flow
```
error_handling → generate_narrative → update_history → (conditional)
```

## Key Features

1. **Persistent Conversation**: Maintains message history across interactions
2. **Streaming Support**: Real-time token generation with callbacks
3. **Error Recovery**: Automatic retry after error resolution
4. **Narrative History**: Saves generated narratives for continuity
5. **Conversation Management**: Supports both new and continued conversations
6. **Backend Abstraction**: Clean separation between graph logic and LLM calls

## Usage Patterns

### Single Interaction
```typescript
const agent = new ToyNarrativeChatAgent();
const result = await agent.processInput("Tell me a story about a robot");
```

### Continued Conversation
```typescript
const agent = new ToyNarrativeChatAgent();
const result1 = await agent.processInput("Start a story");
const result2 = await agent.continueConversation(result1, "Continue the story");
```

### Streaming Conversation
```typescript
const agent = new ToyNarrativeChatAgent();
for await (const state of agent.streamConversation("Tell me a story")) {
  console.log("Current state:", state);
}
```

## Error Handling Strategy

1. **Input Validation**: Catches empty or invalid user input
2. **Backend Errors**: Captures LLM API failures
3. **Retry Logic**: Automatically retries after error resolution
4. **Graceful Degradation**: Continues conversation even with errors
5. **Error Tracking**: Maintains error history for debugging

This graph structure provides a robust, scalable foundation for conversational AI with proper error handling, streaming support, and conversation persistence.
