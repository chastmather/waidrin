# Waidrin LangGraph Agent Development Guide

## 🎯 Overview

This subdirectory will contain a complete LangGraph agent implementation designed to integrate with the Waidrin codebase lifecycle. The agent provides intelligent automation for development, testing, building, and deployment tasks.

## 📁 Directory Structure

```
agents/langgraph-agent/
├── src/
│   ├── core/                    # Core agent implementation
│   │   └── agent.ts            # Main WaidrinAgent class
│   ├── integration/            # Waidrin integration layer
│   │   ├── waidrin-integration.ts
│   │   └── lifecycle-manager.ts
│   ├── tools/                  # Tool implementations
│   │   ├── codebase-tools.ts   # General codebase tools
│   │   └── waidrin-tools.ts    # Waidrin-specific tools
│   ├── types/                  # TypeScript definitions
│   │   └── index.ts
│   ├── utils/                  # Utility functions
│   ├── examples/               # Example implementations
│   │   ├── dev-agent.ts
│   │   ├── build-agent.ts
│   │   └── test-agent.ts
│   └── index.ts               # Main exports
├── tests/                      # Test files
│   └── agent.test.ts
├── docs/                       # Documentation
│   └── architecture.md
├── config/                     # Configuration
│   └── agent.config.ts
├── package.json               # Dependencies and scripts
├── tsconfig.json             # TypeScript configuration
├── biome.json                # Linting configuration
├── README.md                 # Main documentation
└── DEVELOPMENT_GUIDE.md      # This file
```

## 🚀 Quick Start

### 1. Installation

```bash
cd agents/langgraph-agent
npm install
```

### 2. Configuration

Create a `.env` file:

```env
OPENAI_API_KEY=your_openai_api_key
OPENAI_BASE_URL=http://localhost:8080/v1/  # Optional
```

### 3. Run Examples

```bash
# Development agent
npm run agent:dev "Fix the character selection bug"

# Build agent
npm run agent:build

# Test agent
npm run agent:test
```

## 🏗️ Architecture Components

### Core Agent (`src/core/agent.ts`)

The main `WaidrinAgent` class implements a LangGraph state machine:

- **State Machine**: Analyze → Plan → Execute → Review → Finalize
- **Event System**: Real-time event handling and monitoring
- **LLM Integration**: OpenAI API integration with streaming support
- **Error Handling**: Comprehensive error recovery strategies

### Integration Layer (`src/integration/`)

- **WaidrinIntegration**: Direct integration with Waidrin's codebase
- **LifecycleManager**: Orchestrates development lifecycle phases
- **Event Monitoring**: Real-time file change detection
- **Command Execution**: Safe execution of Waidrin commands

### Tool System (`src/tools/`)

- **CodebaseTools**: General-purpose code manipulation
- **WaidrinTools**: Waidrin-specific operations
- **File Operations**: Read, write, search, analyze files
- **Git Integration**: Status, commits, diffs, history
- **Component Management**: React component creation/modification

## 🛠️ Available Tools

### Codebase Tools

```typescript
const codebaseTools = new CodebaseTools(projectRoot);

// File operations
await codebaseTools.readFile("lib/state.ts");
await codebaseTools.writeFile("new-file.ts", content);
await codebaseTools.searchFiles("**/*.tsx");
await codebaseTools.searchText("function", "**/*.ts");

// Code analysis
await codebaseTools.analyzeCodeStructure("lib/engine.ts");

// Git operations
await codebaseTools.getGitStatus();
await codebaseTools.getGitLog(10);
await codebaseTools.getGitDiff();
```

### Waidrin Tools

```typescript
const waidrinTools = new WaidrinTools(projectRoot);

// Game state management
await waidrinTools.getGameState();
await waidrinTools.updateGameState({ view: "chat" });

// Schema management
await waidrinTools.getSchemas();
await waidrinTools.addSchema("NewSchema", "z.string()");

// Component management
await waidrinTools.getComponents();
await waidrinTools.createComponent("NewComponent", componentCode);

// Plugin management
await waidrinTools.getPlugins();
await waidrinTools.createPlugin("new-plugin", manifest, code);
```

## 📊 State Management

The agent uses a comprehensive state schema:

```typescript
interface AgentState {
  currentTask: string;           // Current task being processed
  taskHistory: TaskHistory[];    // History of completed tasks
  codebaseContext: {             // Current codebase state
    projectRoot: string;
    currentFiles: string[];
    modifiedFiles: string[];
    gitStatus: string;
    lastCommit: string;
  };
  config: AgentConfig;           // Agent configuration
  memory: {                      // Agent memory
    recentActions: string[];
    learnedPatterns: string[];
    userPreferences: Record<string, unknown>;
  };
  conversation: {                // Conversation context
    messages: Message[];
    currentGoal: string;
  };
}
```

## 🔄 Event System

The agent emits events for monitoring and integration:

```typescript
agent.onEvent("task_started", (event) => {
  console.log(`Task started: ${event.data.task}`);
});

agent.onEvent("task_completed", (event) => {
  console.log(`Task completed: ${event.data.task}`);
});

agent.onEvent("error_occurred", (event) => {
  console.error(`Error: ${event.data.error}`);
});
```

## 🧪 Testing

### Run Tests

```bash
npm run test              # Run all tests
npm run test:watch        # Watch mode
```

### Test Structure

- **Unit Tests**: Test individual components
- **Integration Tests**: Test component interactions
- **Mocking**: Mock external dependencies
- **Error Scenarios**: Test error handling

## 📝 Development Workflow

### 1. Development Mode

```bash
npm run dev                # Watch mode compilation
npm run agent:dev "Task"   # Run development agent
```

### 2. Building

```bash
npm run build             # Build for production
npm run agent:build       # Run build agent
```

### 3. Linting

```bash
npm run lint              # Check for issues
npm run lint:fix          # Auto-fix issues
```

## 🔧 Configuration

### Environment-Specific Configs

- **Development**: Higher temperature, more iterations, watch mode
- **Production**: Lower temperature, fewer iterations, auto-commit
- **Test**: Focused on testing tasks
- **Build**: Optimized for build processes

### Custom Configuration

```typescript
import { WaidrinAgent, mergeConfigs, devAgentConfig } from "@waidrin/langgraph-agent";

const customConfig = mergeConfigs(devAgentConfig, {
  temperature: 0.3,
  maxIterations: 20,
  autoCommit: true,
});

const agent = new WaidrinAgent(customConfig);
```

## 🚀 Integration with Waidrin

The agent integrates seamlessly with Waidrin's architecture:

- **State Management**: Works with Zustand state store
- **Plugin System**: Can create and manage plugins
- **Game Engine**: Understands game state and events
- **Component System**: Can create and modify React components
- **Backend Integration**: Works with LLM backends

## 📚 Examples

### Bug Fix Example

```bash
npm run agent:dev "Fix the character selection bug in CharacterSelect.tsx"
```

### Feature Implementation

```bash
npm run agent:dev "Add a new location type 'dungeon' to the game"
```

### Refactoring

```bash
npm run agent:dev "Refactor the state management to use a more efficient pattern"
```

## 🔍 Monitoring and Debugging

### Event Monitoring

```typescript
agent.onEvent("phase:started", (phase) => {
  console.log(`Phase: ${phase.name} - ${phase.description}`);
});

agent.onEvent("phase:completed", (phase) => {
  console.log(`Phase completed in ${phase.endTime - phase.startTime}ms`);
});
```

### State Inspection

```typescript
const state = agent.getCurrentState();
console.log("Current task:", state.currentTask);
console.log("Task history:", state.taskHistory);
console.log("Modified files:", state.codebaseContext.modifiedFiles);
```

## 🛡️ Security Considerations

- **Input Validation**: All inputs are validated and sanitized
- **File Path Security**: Path traversal protection
- **Command Execution**: Safe command execution with proper escaping
- **API Key Security**: Secure storage and transmission of API keys

## 🚀 Future Enhancements

- **Multi-Agent Support**: Multiple agents working together
- **Learning Capabilities**: Learn from past experiences
- **Advanced Planning**: More sophisticated task planning
- **Real-time Collaboration**: Live collaboration features
- **IDE Integration**: Direct IDE integration
- **CI/CD Integration**: Automated pipeline integration

## 📖 Documentation

- **README.md**: Main documentation
- **docs/architecture.md**: Detailed architecture documentation
- **src/examples/**: Example implementations
- **tests/**: Test examples and patterns

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

AGPL-3.0-or-later (same as Waidrin)

---

This LangGraph agent provides a powerful foundation for automating Waidrin development tasks while maintaining the flexibility and intelligence needed for complex software development workflows.
