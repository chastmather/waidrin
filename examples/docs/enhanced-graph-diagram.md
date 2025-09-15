# Enhanced Narrator Agent Graph Structure

## Overview
The enhanced graph provides maximum flexibility with specialist-to-specialist handoffs and conditional routing.

## Graph Flow Diagram

```
                    __start__
                        ↓
                narrator_decision
                        ↓
        ┌─────────────────┼─────────────────┐
        ↓                 ↓                 ↓
continue_narrative  specialist_handoff  [finalize]
        ↓                 ↓
    finalize ─────────────┼─────────────────┐
        ↓                 ↓                 ↓
       END         [specialist routing]    END
                        ↓
        ┌───────────────┼───────────────┐
        ↓               ↓               ↓
search_specialist  character_specialist  world_building_specialist  dialogue_specialist
        ↓               ↓               ↓               ↓
    [conditional routing - any specialist can choose:]
        ↓               ↓               ↓               ↓
    continue_narrative OR specialist_handoff OR finalize
        ↓               ↓               ↓
    [back to narrative flow or handoff to another specialist]
```

## Key Enhancements

### 1. Conditional Edges from Specialists
Each specialist now has conditional edges that allow them to choose:
- **Continue Narrative**: Return to the main narrative flow
- **Handoff to Specialist**: Pass control to another specialist
- **Finalize**: End the story directly

### 2. Specialist-to-Specialist Handoffs
Specialists can now hand off to other specialists, enabling complex workflows:
- Search → Character (research character background)
- Character → World Building (develop character's world)
- World Building → Dialogue (create dialogue for the world)
- Any specialist → Any other specialist

### 3. Dynamic Decision Making
Each specialist sets `nextAction` in the state, allowing for intelligent routing:
```typescript
// Example: Search specialist decides to hand off to character specialist
return {
  specialistResult: "Found character background information",
  nextAction: "handoff_to_specialist",
  specialistType: "character",
  // ... other state
};
```

## Routing Functions

### `routeNarratorDecision(state)`
Routes from the main decision node based on `state.nextAction`:
- `"continue_narrative"` → `continue_narrative` node
- `"handoff_to_specialist"` → `specialist_handoff` node

### `routeSpecialist(state)`
Routes from specialist handoff node based on `state.specialistType`:
- `"search"` → `search_specialist` node
- `"character"` → `character_specialist` node
- `"world_building"` → `world_building_specialist` node
- `"dialogue"` → `dialogue_specialist` node

### `routeAfterSpecialist(state)`
Routes from any specialist node based on `state.nextAction`:
- `"continue_narrative"` → `continue_narrative` node
- `"handoff_to_specialist"` → `specialist_handoff` node
- `"finalize"` → `finalize` node

## Example Workflows

### Simple Narrative Flow
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
User: "Research the ancient ruins and develop a character who lived there"
→ narrator_decision → specialist_handoff → search_specialist
→ specialist_handoff → character_specialist
→ continue_narrative → finalize → END
```

### Direct Finalization
```
User: "End the story"
→ [any node] → finalize → END
```

## Benefits

1. **Maximum Flexibility**: Any specialist can hand off to any other specialist
2. **Intelligent Routing**: AI-driven decision making at every step
3. **Complex Workflows**: Support for multi-step specialist chains
4. **Clean Architecture**: Maintains the hub-and-spoke pattern while adding flexibility
5. **Extensible**: Easy to add new specialists or routing logic

## Implementation Notes

- All specialist nodes now set `nextAction` in their return state
- The `routeAfterSpecialist` function enables conditional routing from specialists
- The graph structure uses conditional edges instead of fixed edges for specialist returns
- Each specialist can make intelligent decisions about the next step in the workflow
