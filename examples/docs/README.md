# Toy Narrative Chat Examples

This directory contains examples demonstrating how to use LangGraph with the existing Waidrin backend for persistent narrative chat.

## Examples

### 1. Basic Toy Narrative Chat (`toy-narrative-chat.ts`)

A simple LangGraph agent that demonstrates:
- Persistent conversation state
- Integration with the real Waidrin backend
- Narrative generation using OpenAI
- Error handling and recovery
- Streaming support

**Features:**
- ✅ Uses actual Waidrin backend implementation
- ✅ Persistent conversation history
- ✅ Real-time narrative generation
- ✅ Error handling and recovery
- ✅ Streaming conversation processing
- ✅ Conversation management

### 2. CLI Chat Interface (`cli-chat.ts`)

An interactive command-line interface for the toy narrative chat.

**Features:**
- ✅ Interactive chat interface
- ✅ Command system (`/help`, `/summary`, `/history`, `/clear`, `/quit`)
- ✅ Real-time conversation processing
- ✅ Error handling and display
- ✅ Conversation state management

## Quick Start

### Prerequisites

1. Set up your environment variables:
```bash
export OPENAI_API_KEY="your-openai-api-key"
export OPENAI_API_URL="https://api.openai.com/v1/"  # Optional
export OPENAI_MODEL="gpt-4"  # Optional
```

2. Install dependencies:
```bash
npm install
```

### Running the Examples

#### Basic Example
```bash
npx tsx examples/toy-narrative-chat.ts
```

#### CLI Chat Interface
```bash
npx tsx examples/cli-chat.ts
```

## Architecture

### LangGraph Agent Structure

```
User Input → Process Input → Generate Narrative → Update History → End
     ↓              ↓              ↓
Error Handling ← Error Handling ← Error Handling
```

### State Management

The chat agent maintains persistent state including:
- **Messages**: Full conversation history
- **Narrative History**: Generated narrative entries
- **User Input**: Current user input
- **Generation State**: Whether currently generating
- **Error Tracking**: Error handling and recovery
- **Conversation ID**: Unique conversation identifier

### Backend Integration

The agent uses the actual Waidrin backend implementation:
- **Real OpenAI Integration**: Uses the same client setup as Waidrin
- **Streaming Support**: Real-time token streaming
- **Error Handling**: Proper abort handling and error detection
- **Structured Output**: Support for JSON schema validation
- **Token Callbacks**: Real-time progress tracking

## Usage Examples

### Basic Conversation

```typescript
import { ToyNarrativeChatAgent } from './toy-narrative-chat';

const agent = new ToyNarrativeChatAgent();

// Start a new conversation
let state = await agent.processInput("I'm a brave knight entering a mysterious forest.");

// Continue the conversation
state = await agent.continueConversation(state, "I draw my sword and step forward cautiously.");

// Get conversation summary
const summary = agent.getConversationSummary(state);
console.log(summary);
```

### Streaming Conversation

```typescript
// Stream the conversation processing
const stream = agent.streamConversation("I'm an explorer discovering an ancient temple.");

for await (const chunk of stream) {
  console.log(`Step: ${chunk.isGenerating ? 'Generating...' : 'Complete'}`);
  if (chunk.currentNarrative) {
    console.log(chunk.currentNarrative);
  }
}
```

### CLI Commands

When using the CLI interface:

- **Type normally** to send messages
- **`/help`** - Show available commands
- **`/summary`** - Show conversation summary
- **`/history`** - Show full conversation history
- **`/clear`** - Start a new conversation
- **`/quit`** - Exit the chat

## Key Features Demonstrated

### 1. LangGraph Compliance
- ✅ Fluent builder pattern
- ✅ Simple node functions returning `Partial<State>`
- ✅ Conditional edges for error handling
- ✅ Proper state annotation usage
- ✅ Compile once, execute many

### 2. Backend Integration
- ✅ Real Waidrin backend implementation
- ✅ OpenAI streaming support
- ✅ Error handling and abort support
- ✅ Token callback integration
- ✅ Structured output support

### 3. Persistent State
- ✅ Conversation history maintenance
- ✅ Narrative tracking
- ✅ Error state management
- ✅ Conversation continuity

### 4. User Experience
- ✅ Real-time generation feedback
- ✅ Error handling and recovery
- ✅ Interactive CLI interface
- ✅ Command system for management

## Error Handling

The agent includes comprehensive error handling:
- **Input Validation**: Checks for empty or invalid input
- **Backend Errors**: Handles OpenAI API errors and timeouts
- **Abort Support**: Proper handling of user-initiated cancellations
- **Error Recovery**: Automatic retry and fallback mechanisms
- **Error Reporting**: Clear error messages and status tracking

## Environment Configuration

The examples support the same environment variables as the main Waidrin project:

- `OPENAI_API_KEY` (required): Your OpenAI API key
- `OPENAI_API_URL` (optional): Custom API endpoint
- `OPENAI_MODEL` (optional): Model to use (default: gpt-4)

## Development

To extend or modify the examples:

1. **Add New Nodes**: Create new node functions in the agent
2. **Modify State**: Update the `ChatStateAnnotation` as needed
3. **Add Commands**: Extend the CLI command system
4. **Custom Backend**: Implement custom backend integration
5. **New Features**: Add new LangGraph patterns and flows

## Troubleshooting

### Common Issues

1. **Missing API Key**: Ensure `OPENAI_API_KEY` is set
2. **Network Errors**: Check your internet connection and API endpoint
3. **Model Errors**: Verify the model name is correct
4. **Memory Issues**: Long conversations may hit token limits

### Debug Mode

Set `NODE_ENV=development` for additional logging:

```bash
NODE_ENV=development npx tsx examples/toy-narrative-chat.ts
```

## Next Steps

This toy model demonstrates the core patterns for building LangGraph agents with Waidrin's backend. You can extend it by:

1. Adding more sophisticated narrative logic
2. Implementing character and world state management
3. Adding structured output for game mechanics
4. Creating more complex conversation flows
5. Integrating with the full Waidrin game engine
