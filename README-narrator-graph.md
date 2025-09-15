# Narrator Graph

A focused LangGraph implementation for narrative generation and story progression.

## Overview

The Narrator Graph demonstrates proper LangGraph patterns for a specific use case - generating narrative content with dynamic story flow, tension management, and user interaction.

## Key Features

- **Focused State**: Narrative-specific state annotation with story beats, tension, and content generation
- **Dynamic Flow**: Conditional edges based on story tension, pacing, and user input
- **Content Generation**: Separate nodes for narration, dialogue, description, and action
- **Story Progression**: Beat analysis, tension adjustment, and pacing control
- **User Interaction**: Input processing and response generation
- **Error Handling**: Robust error handling and content validation

## Architecture

### State Structure

```typescript
NarratorState = {
  currentScene: string,
  sceneHistory: Array<{sceneId, timestamp, content}>,
  narrativeContext: {
    tone: string,
    perspective: string,
    setting: string,
    characters: string[],
    mood: string
  },
  storyBeat: {
    currentBeat: string,
    completedBeats: string[],
    nextBeat: string | null,
    tension: number,
    pacing: "slow" | "medium" | "fast"
  },
  generatedContent: {
    narration: string,
    dialogue: string,
    description: string,
    action: string
  },
  userInput: string,
  pendingResponse: boolean,
  isGenerating: boolean,
  errors: Array<{id, message, timestamp, resolved}>
}
```

### Graph Flow

```
__start__ → scene_setup → beat_analysis → narrative_generation
                                                      ↓
user_input_processing ← response_generation ← content_validation
         ↓                        ↓
narrative_generation ← tension_adjustment ← dialogue_generation
         ↓                        ↓
content_validation ← pacing_control ← description_generation
         ↓                        ↓
    error_handling ← action_generation
```

### Node Types

1. **Setup Nodes**: `scene_setup`, `beat_analysis`
2. **Content Generation**: `narrative_generation`, `dialogue_generation`, `description_generation`, `action_generation`
3. **Story Progression**: `tension_adjustment`, `pacing_control`
4. **User Interaction**: `user_input_processing`, `response_generation`
5. **System**: `error_handling`, `content_validation`

## Usage

### Basic Execution

```typescript
import { createNarratorGraph } from './narrator-graph';

const narrator = createNarratorGraph();
const result = await narrator.execute(initialState);
```

### Streaming

```typescript
const stream = narrator.stream(initialState);
for await (const chunk of stream) {
  console.log('Step:', chunk);
}
```

### Example

See `examples/narrator-example.ts` for a complete working example.

## LangGraph Compliance

This implementation follows LangGraph best practices:

- ✅ **Fluent Builder Pattern**: Uses `new StateGraph(Annotation).addNode().addEdge().compile()`
- ✅ **Simple Node Functions**: Returns `Partial<State>` updates
- ✅ **Conditional Edges**: Dynamic flow based on state
- ✅ **Compile Once**: Graph compiled in constructor
- ✅ **Proper Types**: Uses `Annotation.Root` for state definition

## Benefits

1. **Focused**: Single responsibility for narrative generation
2. **Extensible**: Easy to add new content types or story beats
3. **Testable**: Clear separation of concerns
4. **Maintainable**: Follows LangGraph patterns
5. **Performant**: Compiled graph with efficient execution

## Future Enhancements

- Add LLM integration for actual content generation
- Implement more sophisticated story beat analysis
- Add character relationship tracking
- Include plot twist generation
- Add genre-specific narrative patterns
