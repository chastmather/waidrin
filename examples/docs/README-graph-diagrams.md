# Narrator Agent Graph Diagrams

This directory contains Mermaid diagrams of the enhanced narrator agent graph structure.

## Files

### Basic Graph
- **Source**: `narrator-agent-graph.mmd`
- **Output**: 
  - `narrator-agent-graph.png` - PNG image
  - `narrator-agent-graph.svg` - SVG vector image

### Detailed Graph
- **Source**: `narrator-agent-detailed.mmd`
- **Output**:
  - `narrator-agent-detailed.png` - PNG image with descriptions
  - `narrator-agent-detailed.svg` - SVG vector image with descriptions

## Graph Structure

The narrator agent uses a **hub-and-spoke pattern** with enhanced flexibility:

### Core Components

1. **Entry Point**: `__start__` → `narrator_decision`
2. **Decision Hub**: `narrator_decision` (central routing point)
3. **Narrative Flow**: `continue_narrative` → `finalize` → `END`
4. **Specialist Hub**: `specialist_handoff` (routes to specialists)
5. **Specialist Nodes**: 4 specialized AI agents with different parameters

### Enhanced Flexibility

Each specialist can choose from 3 actions:
- **Continue Narrative**: Return to main story flow
- **Handoff to Specialist**: Pass control to another specialist
- **Finalize**: End the story directly

### Specialist Types

1. **Search Specialist** (Temperature: 0.1)
   - Research information
   - Factual and precise

2. **Character Specialist** (Temperature: 0.9)
   - Develop characters
   - Creative and imaginative

3. **World Building Specialist** (Temperature: 0.7)
   - Create world details
   - Balanced creativity

4. **Dialogue Specialist** (Temperature: 0.8)
   - Write conversations
   - Natural and engaging

## Example Workflows

### Simple Flow
```
User: "Continue the story"
→ narrator_decision → continue_narrative → finalize → END
```

### Single Specialist Flow
```
User: "What kind of character is the hero?"
→ narrator_decision → specialist_handoff → character_specialist → continue_narrative → finalize → END
```

### Complex Multi-Specialist Flow
```
User: "Research ancient ruins and develop a character who lived there"
→ narrator_decision → specialist_handoff → search_specialist
→ specialist_handoff → character_specialist
→ continue_narrative → finalize → END
```

## Key Features

- ✅ **Specialist-to-Specialist Handoffs**: Any specialist can hand off to any other
- ✅ **Conditional Routing**: AI-driven decisions at every step
- ✅ **Multiple Execution Paths**: Direct narrative, specialist chains, or finalization
- ✅ **Individual Sampling Parameters**: Each specialist optimized for its task
- ✅ **Structured Output**: Consistent decision making with confidence scores
- ✅ **LangGraph Best Practices**: Conditional edges, state management, checkpointing

## Viewing the Diagrams

### PNG Files
- Good for documentation and presentations
- High resolution, suitable for printing

### SVG Files
- Vector format, scalable
- Good for web display and further editing

### Mermaid Source
- Edit the `.mmd` files to modify diagrams
- Use Mermaid CLI to regenerate images:
  ```bash
  npm install -g @mermaid-js/mermaid-cli
  mmdc -i narrator-agent-graph.mmd -o narrator-agent-graph.png
  ```

## Technical Implementation

The graph is implemented using:
- **LangGraph StateGraph**: Core graph structure
- **Conditional Edges**: Dynamic routing based on state
- **Structured Output**: Zod schemas for decision making
- **MemorySaver**: Conversation persistence
- **Individual Model Parameters**: Specialized sampling for each agent

This architecture provides maximum flexibility while maintaining clean separation of concerns and following LangGraph best practices.
