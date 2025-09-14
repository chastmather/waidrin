# Branch Structure Documentation

## Overview

This document describes the current branch structure and how to work with different engine implementations in the Waidrin project.

## Branch Organization

### Master Branch (Stable)
- **Purpose**: Production-ready, stable code
- **Engine**: Current linear state machine only
- **Directory Structure**:
  ```
  waidrin/
  ├── lib/
  │   ├── engine.ts          # Main engine interface
  │   ├── state.ts           # State management
  │   ├── backend.ts         # Backend integration
  │   └── [other core files]
  ├── components/            # UI components
  ├── views/                 # Page views
  └── [other shared files]
  ```

### Loops Branch (Experimental)
- **Purpose**: LangGraph engine development and experimentation
- **Engines**: Both current and LangGraph engines
- **Directory Structure**:
  ```
  waidrin/
  ├── lib/
  │   ├── engines/
  │   │   ├── current/       # Stable engine (same as master)
  │   │   └── langgraph/     # LangGraph engine development
  │   ├── engine.ts          # Engine switcher interface
  │   └── [other core files]
  ├── components/            # UI components (includes EngineSwitcher)
  ├── views/                 # Page views
  └── [other shared files]
  ```

## Engine Switching

### Runtime Engine Selection
The application supports runtime engine switching through the `EngineSwitcher` component:

```typescript
// Available engines
type EngineType = "current" | "langgraph";

// Switch engines at runtime
const switcher = new EngineSwitcher(config);
await switcher.switchTo("current");    // Use stable engine
await switcher.switchTo("langgraph");  // Use LangGraph engine
```

### Engine Interface
Both engines implement the same `GameEngine` interface:

```typescript
interface GameEngine {
  execute(initialState: State): Promise<State>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  stop(): Promise<void>;
  getStatus(): EngineStatus;
}
```

## Development Workflow

### Working on Stable Features
1. **Start on master branch**: `git checkout master`
2. **Make changes**: Work on stable engine or UI components
3. **Test thoroughly**: Ensure no regressions
4. **Commit and push**: `git add . && git commit -m "..." && git push`

### Working on LangGraph Features
1. **Start on loops branch**: `git checkout loops`
2. **Make changes**: Work on LangGraph engine or experimental features
3. **Test both engines**: Ensure both current and LangGraph engines work
4. **Commit and push**: `git add . && git commit -m "..." && git push`

### Merging Experimental Features
1. **Test thoroughly**: Ensure LangGraph features are stable
2. **Switch to master**: `git checkout master`
3. **Merge loops**: `git merge loops`
4. **Update master**: Remove experimental code, keep only stable features
5. **Push master**: `git push origin master`

## File Organization

### Core Engine Files
- `lib/engine.ts` - Main engine interface and switcher
- `lib/engines/index.ts` - Engine factory and switcher logic
- `lib/engines/current/` - Stable engine implementation
- `lib/engines/langgraph/` - LangGraph engine implementation

### UI Components
- `components/EngineSwitcher.tsx` - Runtime engine selection UI
- `components/` - All other UI components (shared between branches)

### Views
- `views/` - Page-level view components (shared between branches)

## Best Practices

### Branch Switching
- **Always commit work** before switching branches
- **Test both engines** when working on loops branch
- **Keep master clean** - only stable, production-ready code
- **Use descriptive commit messages** for easy tracking

### Development
- **Work on features** in appropriate branches
- **Test thoroughly** before merging
- **Document changes** in commit messages
- **Keep experimental code** in loops branch only

### Code Organization
- **Shared code** goes in common directories (components/, views/)
- **Engine-specific code** goes in lib/engines/[engine-name]/
- **Interface code** goes in lib/engines/index.ts
- **Main entry point** is always lib/engine.ts

## Troubleshooting

### Branch Switch Issues
- **Stash changes**: `git stash` before switching
- **Check status**: `git status` to see uncommitted changes
- **Force switch**: `git checkout -f [branch]` (loses uncommitted changes)

### Engine Issues
- **Check engine type**: Verify which engine is active
- **Test both engines**: Ensure compatibility
- **Check imports**: Verify all imports are correct
- **Check dependencies**: Ensure all packages are installed

### Development Issues
- **Clear cache**: `rm -rf .next && npm run dev`
- **Reinstall deps**: `rm -rf node_modules && npm install`
- **Check logs**: Look for error messages in console
- **Test incrementally**: Make small changes and test frequently

## Migration Path

### From Current to LangGraph
1. **Develop on loops branch**: All LangGraph work happens here
2. **Test thoroughly**: Ensure LangGraph engine is stable
3. **Merge to master**: When ready for production
4. **Update documentation**: Reflect new engine as default
5. **Deprecate current**: Mark current engine as legacy

### Rollback Strategy
1. **Keep current engine**: Always available as fallback
2. **Feature flags**: Use runtime switching for gradual rollout
3. **Monitoring**: Track engine performance and stability
4. **Quick rollback**: Switch engines without code changes

## Conclusion

This branch structure provides:
- **Clean separation** between stable and experimental code
- **Easy switching** between engine implementations
- **Safe development** without affecting production
- **Flexible deployment** with runtime engine selection
- **Clear migration path** from current to LangGraph engine

The structure supports both immediate development needs and long-term architectural evolution.
