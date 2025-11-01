---
applyTo: "./src/hooks/**"
---

- hooks should use react 19 patterns

## Debugging and Console Logging

Choose the appropriate debug approach based on complexity:

### Simple Hooks (Recommended: Use Shared Logger)

For hooks with basic logging needs, use the shared `createLogger` utility from `src/lib/debug.ts`:

```typescript
import { createLogger } from "@/lib/debug";

export const useSimpleHook = () => {
  const logger = createLogger("useSimpleHook");

  const handleAction = () => {
    logger.start({ param: "value" });
    // ... logic
    logger.success("Action completed");
  };

  return { handleAction };
};
```

**When to use:**

- Basic start/success/error logging
- Performance timing needs
- Standard operations without complex debug requirements

### Complex Hooks (Custom Debug Object)

For hooks with many specific debug points and custom formatting, create a custom `debugLog` object at the bottom of the file:

```typescript
export const useComplexHook = () => {
  // ... main logic using custom debugLog methods
  debugLog.specificAction(detailedParams);

  return {
    /* hook return values */
  };
};

// ============================================================================
// DEBUG UTILITIES
// ============================================================================

const ENABLE_DEBUG = true; // or import { DEBUG } from '@/lib/debug';

const debugLog = {
  specificAction: (params: ComplexType) => {
    if (!ENABLE_DEBUG) return;
    console.log("🎯 [useComplexHook] Specific action:", params);
  },
  // ... more highly specific debug methods
};

function getDebugHandlers() {
  const debugHandler = (e: Event) => {
    debugLog.specificAction(/* ... */);
  };

  return { debugHandler };
}
```

**When to use:**

- Complex state machines with many transitions
- Detailed drag-and-drop or gesture handling
- Custom formatting or data inspection needs
- Debug-only event handlers (extract to `getDebugHandlers()`)

### Guidelines for All Approaches

- **Use shared logger for simple cases**: Import `createLogger` from `@/lib/debug` for standard logging
- **Create custom debugLog for complex cases**: When you need >5 specific debug methods with custom formatting
- **Extract debug-only handlers**: Put debug event handlers in helper functions at the bottom
- **Preserve emoji and formatting**: Keep emoji indicators for visual scanning (`🚀 🔄 ✅ ⚠️ ❌`)
- **Organize clearly**: Use section headers with dividers (`// ============================================================================`)
- **Use performance timing**: Leverage `logger.time()` / `logger.timeEnd()` or `createPerformanceLogger` for timing
- **Group related logs**: Use `logger.group()` / `logger.groupEnd()` for collapsible log groups

### Available Logger Methods

The shared logger provides:

- `logger.start(data?)` - Start of operation (🚀)
- `logger.success(data?)` - Successful completion (✅)
- `logger.error(err)` - Error logging (❌)
- `logger.warn(message, data?)` - Warnings (⚠️)
- `logger.info(message, data?)` - General info (ℹ️)
- `logger.custom(emoji, message, data?)` - Custom logging
- `logger.group(label)` / `logger.groupEnd()` - Grouped logs
- `logger.time(label)` / `logger.timeEnd(label)` - Performance timing

### Benefits

- **Shared logger**: Zero boilerplate, automatic production stripping, consistent formatting
- **Custom debugLog**: Granular control, domain-specific methods, preserved in same file
- **Production-ready**: All debug code stripped in production builds via `import.meta.env.DEV`
- **Type-safe**: TypeScript support for all parameters
- **Performance**: No overhead when debugging is disabled
