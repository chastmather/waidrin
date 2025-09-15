# Narrative CLI

# NARRATIVE IS NOT ACCUMULATING IN STATE!!!

A simple command-line interface for interactive story chat with AI-powered narrative generation.

## Features

- **Real-time streaming** - See tokens as they're generated
- **Visual formatting** - Clean, bordered output with status information
- **Persistent threads** - Save and load conversation threads
- **Slash commands** - Built-in commands for managing narratives
- **Auto-save** - Automatically saves after each interaction

## Usage

### Start the CLI
```bash
npm run narrative:cli
# or
npx tsx examples/narrative-cli.ts
```

### Interactive Commands

#### Chat Commands
- Just type normally to chat with the AI
- Each message continues the narrative thread
- Responses are streamed in real-time

#### Slash Commands
- `/help` - Show available commands
- `/status` - Display current narrative status
- `/clear` - Clear current narrative thread
- `/save` - Manually save current state
- `/load <id>` - Load a saved narrative thread
- `/list` - List all saved narratives
- `/quit` - Exit the application

## Data Persistence

### Narrative Logs
- **Location**: `examples/narrative-logs/`
- **Format**: JSON files with thread metadata
- **Content**: Thread ID, generation count, current content, timestamps

### Generation Logs
- **Location**: `examples/logs/`
- **Format**: JSON files with full generation data
- **Content**: Complete generation objects with tokens, timing, metadata

## Example Session

```
🎭 NARRATIVE CLI - Interactive Story Chat
══════════════════════════════════════════════════
Welcome to your personal narrative assistant!
Type your messages to continue the story, or use /help for commands.
══════════════════════════════════════════════════

> Tell me a story about a dragon

────────────────────────────────────────────────────────────
📖 NARRATIVE RESPONSE:
────────────────────────────────────────────────────────────
Once upon a time, in a land far beyond the mountains, there lived an ancient dragon named Emberwing. Her scales shimmered like molten gold in the sunlight, and her eyes held the wisdom of a thousand years...

[Story continues...]
────────────────────────────────────────────────────────────
📊 Generation #1 | Thread: narrative_1757903539103
────────────────────────────────────────────────────────────
💾 Narrative saved: narrative_1757903539103

> The dragon meets a young knight

────────────────────────────────────────────────────────────
📖 NARRATIVE RESPONSE:
────────────────────────────────────────────────────────────
As Emberwing soared through the clouds, she spotted a young knight in shining armor standing at the edge of a cliff. His name was Sir Gareth, and he had been searching for the legendary dragon for months...

[Story continues...]
────────────────────────────────────────────────────────────
📊 Generation #2 | Thread: narrative_1757903539103
────────────────────────────────────────────────────────────
💾 Narrative saved: narrative_1757903539103

> /status

📊 NARRATIVE STATUS:
────────────────────────────────────────
Thread ID: narrative_1757903539103
Generations: 2
Current Generation Length: 1247 chars
Backend Connected: ✅
Streaming Progress: 100%
────────────────────────────────────────
```

## Technical Details

### Architecture
- Built on top of `DraftHybridStreamingAgentWithBackend`
- Uses LangGraph for conversation flow
- Real-time token streaming with visual feedback
- Thread-based persistence with unique IDs

### Backend Integration
- Connects to DeepSeek API via OpenAI-compatible interface
- Streaming responses with token accumulation
- Error handling and graceful degradation

### State Management
- UI state for real-time updates
- Conversation state for LangGraph
- Persistent state for thread management
- Auto-save after each interaction

## Troubleshooting

### Common Issues
1. **API Key Not Found**: Ensure `.env` file contains `OPENAI_API_KEY`
2. **Connection Errors**: Check internet connection and API endpoint
3. **Save Errors**: Verify write permissions in `examples/` directory

### Debug Mode
- Check `examples/logs/` for detailed generation logs
- Check `examples/narrative-logs/` for thread state
- Use `/status` command to verify backend connection

## Development

### File Structure
```
examples/
├── narrative-cli.ts          # Main CLI application
├── test-narrative-cli.ts     # Test script
├── narrative-logs/           # Thread persistence
├── logs/                     # Generation logs
└── README-narrative-cli.md   # This file
```

### Adding Features
- Extend slash commands in `handleSlashCommand()`
- Add new UI elements in `displayResponse()`
- Modify persistence in `saveNarrativeState()`
- Add new tools in the streaming implementation
