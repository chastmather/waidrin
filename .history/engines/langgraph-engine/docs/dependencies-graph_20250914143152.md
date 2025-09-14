# LangGraph Game Engine Dependencies Graph

## Overview

This document provides a visual representation of the dependencies and relationships between different components in the Waidrin LangGraph Game Engine.

## Core Dependencies

```mermaid
graph TD
    A[LangGraphGameEngine] --> B[StateGraph]
    A --> C[NodeRegistry]
    A --> D[EventSystem]
    A --> E[GameState]
    
    B --> F[GameNodes]
    C --> G[NodeFactory]
    D --> H[GameEvents]
    E --> I[WaidrinState]
    
    F --> J[CoreNodes]
    F --> K[DynamicNodes]
    F --> L[UtilityNodes]
    
    J --> M[WelcomeNode]
    J --> N[ConnectionNode]
    J --> O[GenreNode]
    J --> P[CharacterNode]
    J --> Q[ScenarioNode]
    J --> R[ChatNode]
    
    K --> S[NarrationNode]
    K --> T[ActionGenerationNode]
    K --> U[LocationChangeNode]
    K --> V[CharacterIntroductionNode]
    K --> W[MemoryUpdateNode]
    K --> X[SceneSummaryNode]
    
    L --> Y[ErrorHandlingNode]
    L --> Z[UserInputNode]
    L --> AA[StreamingNode]
```

## State Management Dependencies

```mermaid
graph LR
    A[GameState] --> B[WaidrinState]
    A --> C[LangGraphState]
    A --> D[MemoryState]
    A --> E[PluginState]
    
    B --> F[ViewState]
    B --> G[GameData]
    B --> H[BackendConfig]
    
    C --> I[NodeHistory]
    C --> J[CurrentNode]
    C --> K[ExecutionContext]
    
    D --> L[ConversationHistory]
    D --> M[CharacterRelationships]
    D --> N[SceneMemory]
    D --> O[PlayerPreferences]
    
    E --> P[ActivePlugins]
    E --> Q[PluginStates]
    E --> R[PluginEvents]
```

## Node Execution Flow

```mermaid
graph TD
    A[NodeExecution] --> B[InputValidation]
    B --> C[PreExecution]
    C --> D[NodeExecute]
    D --> E[PostExecution]
    E --> F[OutputValidation]
    F --> G[StateUpdate]
    G --> H[EventEmission]
    H --> I[NextNodeSelection]
    
    B --> J[ValidationFailed]
    J --> K[ErrorHandling]
    
    D --> L[ExecutionError]
    L --> K
    
    K --> M[RetryLogic]
    M --> N[MaxRetriesReached]
    N --> O[ErrorState]
```

## Tool System Dependencies

```mermaid
graph TD
    A[GameTools] --> B[LLMTools]
    A --> C[CharacterTools]
    A --> D[LocationTools]
    A --> E[MemoryTools]
    A --> F[PluginTools]
    
    B --> G[OpenAIClient]
    B --> H[PromptBuilder]
    B --> I[StreamingHandler]
    
    C --> J[CharacterGenerator]
    C --> K[RelationshipTracker]
    C --> L[CharacterMemory]
    
    D --> M[LocationGenerator]
    D --> N[LocationMemory]
    D --> O[LocationValidator]
    
    E --> P[ConversationMemory]
    E --> Q[SceneMemory]
    E --> R[PreferenceMemory]
    
    F --> S[PluginLoader]
    F --> T[PluginExecutor]
    F --> U[PluginStateManager]
```

## Event System Dependencies

```mermaid
graph TD
    A[EventSystem] --> B[EventEmitter]
    A --> C[EventTypes]
    A --> D[EventHandlers]
    
    B --> E[NodeEvents]
    B --> F[GameEvents]
    B --> G[SystemEvents]
    
    E --> H[NodeStarted]
    E --> I[NodeCompleted]
    E --> J[NodeFailed]
    
    F --> K[GameStarted]
    F --> L[GamePaused]
    F --> M[GameEnded]
    
    G --> N[ErrorOccurred]
    G --> O[MemoryUpdated]
    G --> P[StreamingStarted]
```

## Plugin System Dependencies

```mermaid
graph TD
    A[PluginSystem] --> B[PluginRegistry]
    A --> C[PluginLoader]
    A --> D[PluginExecutor]
    
    B --> E[CustomNodes]
    B --> F[CustomTools]
    B --> G[CustomEvents]
    
    C --> H[ManifestParser]
    C --> I[DependencyResolver]
    C --> J[PluginValidator]
    
    D --> K[NodeExecution]
    D --> L[ToolExecution]
    D --> M[EventHandling]
    
    E --> N[PluginNodeFactory]
    F --> O[PluginToolFactory]
    G --> P[PluginEventFactory]
```

## Backend Integration Dependencies

```mermaid
graph TD
    A[BackendIntegration] --> B[WaidrinBackend]
    A --> C[LLMProvider]
    A --> D[StreamingProvider]
    
    B --> E[ExistingBackend]
    B --> F[BackendAdapter]
    
    C --> G[OpenAIProvider]
    C --> H[CustomProvider]
    
    D --> I[StreamingHandler]
    D --> J[ProgressTracker]
    
    E --> K[getBackend]
    E --> L[BackendInterface]
    
    F --> M[BackendWrapper]
    F --> N[StateAdapter]
```

## Memory System Dependencies

```mermaid
graph TD
    A[MemorySystem] --> B[ConversationMemory]
    A --> C[CharacterMemory]
    A --> D[SceneMemory]
    A --> E[PreferenceMemory]
    
    B --> F[MessageHistory]
    B --> G[ContextTracking]
    
    C --> H[RelationshipGraph]
    C --> I[CharacterTraits]
    C --> J[InteractionHistory]
    
    D --> K[LocationMemory]
    D --> L[EventTimeline]
    D --> M[SceneSummaries]
    
    E --> N[PlayerChoices]
    E --> O[GameSettings]
    E --> P[CustomPreferences]
```

## Data Flow Dependencies

```mermaid
graph LR
    A[UserInput] --> B[InputProcessor]
    B --> C[StateValidator]
    C --> D[NodeSelector]
    D --> E[NodeExecutor]
    E --> F[ToolExecutor]
    F --> G[LLMProvider]
    G --> H[ResponseProcessor]
    H --> I[StateUpdater]
    I --> J[EventEmitter]
    J --> K[UIUpdater]
    K --> L[UserFeedback]
    
    C --> M[ValidationError]
    M --> N[ErrorHandler]
    N --> O[RetryLogic]
    O --> P[FallbackResponse]
```

## Development Dependencies

```mermaid
graph TD
    A[Development] --> B[TypeScript]
    A --> C[Testing]
    A --> D[Linting]
    A --> E[Building]
    
    B --> F[TypeDefinitions]
    B --> G[ZodSchemas]
    B --> H[ImmerTypes]
    
    C --> I[UnitTests]
    C --> J[IntegrationTests]
    C --> K[MockNodes]
    
    D --> L[Biome]
    D --> M[ESLint]
    D --> N[Prettier]
    
    E --> O[TypeScriptCompiler]
    E --> P[BundleOptimizer]
    E --> Q[TypeGeneration]
```

## External Dependencies

```mermaid
graph TD
    A[ExternalDeps] --> B[LangGraph]
    A --> C[LangChain]
    A --> D[Zod]
    A --> E[Zustand]
    A --> F[Immer]
    
    B --> G[StateGraph]
    B --> H[NodeExecution]
    B --> I[ConditionalEdges]
    
    C --> J[OpenAI]
    C --> K[Streaming]
    C --> L[Tools]
    
    D --> M[Validation]
    D --> N[TypeInference]
    D --> O[SchemaDefinition]
    
    E --> P[StateManagement]
    E --> Q[Subscriptions]
    E --> R[Persistence]
    
    F --> S[ImmutableUpdates]
    F --> T[DraftState]
    F --> U[StatePatches]
```

## Key Relationships

### 1. **Core Engine**
- `LangGraphGameEngine` is the central orchestrator
- Manages the state graph and node execution
- Handles events and error recovery

### 2. **Node System**
- All nodes implement the `GameNode` interface
- Nodes are registered through the `NodeRegistry`
- Execution is managed by the state graph

### 3. **State Management**
- `GameState` extends existing Waidrin state
- Uses Zustand + Immer for immutable updates
- Integrates with LangGraph state channels

### 4. **Tool System**
- Tools provide functionality to nodes
- LLM tools handle AI interactions
- Memory tools manage context and relationships

### 5. **Event System**
- Events provide real-time updates
- Used for UI updates and debugging
- Supports plugin integration

### 6. **Plugin System**
- Allows custom nodes and tools
- Integrates with the event system
- Maintains plugin state and lifecycle

This dependency graph shows how all components work together to create a flexible, extensible game engine that can handle complex narrative flows while maintaining compatibility with the existing Waidrin codebase.
