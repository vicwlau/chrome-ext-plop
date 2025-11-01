# Drop Validation Guide

## Overview

All drag-and-drop validation logic is centralized in `integration/drop-validation.ts`. This module defines what can be dropped where and provides helpful utilities.

## Quick Reference

### Checking if a drop is valid

```typescript
import { isValidDropTarget } from "@/hooks/drag-drop";

const isValid = isValidDropTarget("element-gallery", "canvas");
// true - elements can be dropped on canvas
```

### Getting valid targets for a source

```typescript
import { getValidTargets } from "@/hooks/drag-drop";

const targets = getValidTargets("generated-gallery");
// ["source-panel", "canvas"]
```

### Getting valid sources for a target

```typescript
import { getValidSources } from "@/hooks/drag-drop";

const sources = getValidSources("canvas");
// ["browser", "element-gallery", "generated-gallery", "desktop"]
```

### Getting UI messages

```typescript
import { getDropMessage } from "@/hooks/drag-drop";

const message = getDropMessage("element-gallery", "canvas", true);
// "Drop to position element on canvas"

const errorMessage = getDropMessage(
  "generated-gallery",
  "element-gallery",
  false
);
// "Cannot drop generated image here"
```

## Current Validation Rules

| Source                | Valid Targets                         | Description                                       |
| --------------------- | ------------------------------------- | ------------------------------------------------- |
| **browser**           | source-panel, element-gallery, canvas | Browser images can be dropped anywhere            |
| **element-gallery**   | canvas                                | Elements can only be positioned on canvas         |
| **generated-gallery** | source-panel, canvas                  | Generated images can be source or canvas elements |
| **desktop**           | source-panel, element-gallery, canvas | Desktop files can be dropped anywhere             |

## Modifying Rules

### Option 1: Update DROP_RULES (Recommended)

Edit `integration/drop-validation.ts`:

```typescript
export const DROP_RULES = {
  "generated-gallery": {
    targets: ["source-panel", "canvas", "element-gallery"], // ← Add new target
    description: "Generated images can be used anywhere",
  },
  // ...
};
```

### Option 2: Check Validation Matrix

View all combinations:

```typescript
import { getValidationMatrix } from "@/hooks/drag-drop";

console.table(getValidationMatrix());
```

Output:

```
┌───────────────────┬──────────────┬─────────────────┬────────┐
│                   │ source-panel │ element-gallery │ canvas │
├───────────────────┼──────────────┼─────────────────┼────────┤
│ browser           │ true         │ true            │ true   │
│ element-gallery   │ false        │ false           │ true   │
│ generated-gallery │ true         │ false           │ true   │
│ desktop           │ true         │ true            │ true   │
└───────────────────┴──────────────┴─────────────────┴────────┘
```

## Common Patterns

### In Drop Zone Components

```typescript
import { useCanvasDrop, getValidSources } from "@/hooks/drag-drop";

function Canvas() {
  const { isDragging, canAcceptDrop, dragSource, dropProps } = useCanvasDrop();

  // Get what this canvas accepts
  const acceptedSources = getValidSources("canvas");
  // ["browser", "element-gallery", "generated-gallery", "desktop"]

  return (
    <div {...dropProps}>
      {isDragging && (
        <div>
          {canAcceptDrop
            ? `Drop ${dragSource} here`
            : `This canvas doesn't accept ${dragSource}`}
        </div>
      )}
    </div>
  );
}
```

### In Drag Source Components

```typescript
import { useElementGalleryDrag, getValidTargets } from "@/hooks/drag-drop";

function ElementItem({ element }) {
  const { isDragging, dragProps } = useElementGalleryDrag({ element });

  // Show where this can be dropped
  const validTargets = getValidTargets("element-gallery");
  // ["canvas"]

  return (
    <div {...dragProps} title={`Can drop on: ${validTargets.join(", ")}`}>
      <img src={element.dataUrl} />
    </div>
  );
}
```

## Testing Validation

```typescript
import { isValidDropTarget, getValidationMatrix } from "@/hooks/drag-drop";

describe("Drop Validation", () => {
  it("allows element gallery to canvas", () => {
    expect(isValidDropTarget("element-gallery", "canvas")).toBe(true);
  });

  it("blocks generated gallery to element gallery", () => {
    expect(isValidDropTarget("generated-gallery", "element-gallery")).toBe(
      false
    );
  });

  it("generates correct matrix", () => {
    const matrix = getValidationMatrix();
    expect(matrix["browser"]["canvas"]).toBe(true);
    expect(matrix["element-gallery"]["source-panel"]).toBe(false);
  });
});
```

## Architecture Benefits

✅ **Single Source of Truth** - All rules in one file  
✅ **Type Safe** - TypeScript enforces valid sources/targets  
✅ **Testable** - Validation logic isolated and easy to test  
✅ **Discoverable** - Clear file structure and exports  
✅ **Flexible** - Helper functions for common use cases  
✅ **Documented** - Rules include descriptions

## Migration from Old System

### Before (app-store.ts)

```typescript
// Validation was spread across app-store.ts
export const isValidDropTarget = (source, target) => {
  if (source === "browser") {
    return target === "source-panel" || target === "element-gallery";
  }
  // ... more if statements
};
```

### After (drop-validation.ts)

```typescript
// Centralized configuration
export const DROP_RULES = {
  browser: {
    targets: ["source-panel", "element-gallery", "canvas"],
    description: "Browser images can be dropped anywhere"
  }
};

// Generated validation function
export function isValidDropTarget(source, target) { ... }
```

### Updating Imports

**Old:**

```typescript
import { isValidDropTarget } from "@/store/app-store";
```

**New:**

```typescript
import { isValidDropTarget } from "@/hooks/drag-drop";
```

## Questions?

- **Where are the rules?** `src/hooks/drag-drop/integration/drop-validation.ts`
- **How do I add a new combination?** Edit `DROP_RULES` in that file
- **Can I add custom validation?** Yes, modify `isValidDropTarget()` function
- **Are there helpers?** Yes, `getValidTargets`, `getValidSources`, `getDropMessage`, etc.

See `DRAG_DROP_ARCHITECTURE.md` for full system documentation.
