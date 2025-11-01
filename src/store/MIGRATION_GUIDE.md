# Migration Guide: Three-Store → Two-Store Architecture

## Overview

This guide helps you migrate components from the old three-store architecture (`useImageStore`, `useUIStore`, `useWorkflowStore`) to the new two-store architecture (`useImageStore`, `useAppStore`).

## Key Changes

### Store Consolidation

- ✅ **`useImageStore`** - Stays the same (pure data layer)
- ❌ **`useUIStore`** - Merged into `useAppStore`
- ❌ **`useWorkflowStore`** - Merged into `useAppStore`

### Unified Interaction Model

The biggest change is how interactions are tracked. Instead of scattered state across multiple stores, everything is now in a single `interaction` object.

---

## Quick Migration Patterns

### Pattern 1: Drag & Drop

#### Before (UIStore)

```typescript
import { useUIStore } from "@/store";

function Component() {
  const drag = useUIStore((state) => state.drag);
  const startDrag = useUIStore((state) => state.startDrag);
  const endDrag = useUIStore((state) => state.endDrag);
  const isDragging = drag.isDragging;

  // ...
}
```

#### After (AppStore)

```typescript
import { useAppStore, selectIsDragging } from "@/store";

function Component() {
  const startDragging = useAppStore((state) => state.startDragging);
  const completeDragging = useAppStore((state) => state.completeDragging);
  const isDragging = useAppStore(selectIsDragging);

  // Or get full drag data if needed:
  const dragData = useAppStore(selectDragData);

  // ...
}
```

---

### Pattern 2: Capture

#### Before (WorkflowStore)

```typescript
import { useWorkflowStore, useUIStore } from "@/store";

function Component() {
  const startCapture = useWorkflowStore((state) => state.startCapture);
  const completeCapture = useWorkflowStore((state) => state.completeCapture);
  const isCaptureActive = useWorkflowStore((state) => state.isCaptureActive);
  const showOverlay = useUIStore((state) => state.showOverlay);

  const handleCapture = async () => {
    startCapture("element");
    showOverlay("capture", true);
    // ... do work
    completeCapture();
    showOverlay("capture", false);
  };
}
```

#### After (AppStore)

```typescript
import { useAppStore, selectIsCapturing } from "@/store";

function Component() {
  const startCapturing = useAppStore((state) => state.startCapturing);
  const completeCapturing = useAppStore((state) => state.completeCapturing);
  const isCapturing = useAppStore(selectIsCapturing);

  const handleCapture = async () => {
    startCapturing("element"); // Overlay managed automatically
    // ... do work
    completeCapturing();
  };
}
```

**Key Change**: Overlays are now managed automatically within the interaction state.

---

### Pattern 3: Generation

#### Before (WorkflowStore)

```typescript
import { useWorkflowStore } from "@/store";

function Component() {
  const startGeneration = useWorkflowStore((state) => state.startGeneration);
  const updateProgress = useWorkflowStore(
    (state) => state.updateGenerationProgress
  );
  const complete = useWorkflowStore((state) => state.completeGeneration);
  const progress = useWorkflowStore((state) => state.generation);

  // ...
}
```

#### After (AppStore)

```typescript
import { useAppStore, selectGenerationProgress } from "@/store";

function Component() {
  const startGenerating = useAppStore((state) => state.startGenerating);
  const updateGenerating = useAppStore((state) => state.updateGenerating);
  const completeGenerating = useAppStore((state) => state.completeGenerating);
  const progress = useAppStore(selectGenerationProgress);

  // ...
}
```

---

### Pattern 4: Modals & Views

#### Before (UIStore)

```typescript
import { useUIStore } from "@/store";

function Component() {
  const openModal = useUIStore((state) => state.openModal);
  const closeModal = useUIStore((state) => state.closeModal);
  const setView = useUIStore((state) => state.setView);
  const currentView = useUIStore((state) => state.currentView);

  // ...
}
```

#### After (AppStore)

```typescript
import { useAppStore, selectCurrentView } from "@/store";

function Component() {
  const openModal = useAppStore((state) => state.openModal);
  const closeModal = useAppStore((state) => state.closeModal);
  const setView = useAppStore((state) => state.setView);
  const currentView = useAppStore(selectCurrentView);

  // ...
}
```

**Note**: Same API, just different import!

---

### Pattern 5: Checking Interaction State

#### Before (Multiple Stores)

```typescript
import { useWorkflowStore, useUIStore } from "@/store";

function Component() {
  const mode = useWorkflowStore((state) => state.mode);
  const isDragging = useUIStore((state) => state.drag.isDragging);
  const isCaptureActive = useWorkflowStore((state) => state.isCaptureActive);
  const isGenerating = mode === "generating";
  const isBusy = mode !== "idle" && mode !== "error";

  // ...
}
```

#### After (AppStore with Selectors)

```typescript
import {
  useAppStore,
  selectIsDragging,
  selectIsCapturing,
  selectIsGenerating,
  selectIsBusy,
} from "@/store";

function Component() {
  const isDragging = useAppStore(selectIsDragging);
  const isCapturing = useAppStore(selectIsCapturing);
  const isGenerating = useAppStore(selectIsGenerating);
  const isBusy = useAppStore(selectIsBusy);

  // ...
}
```

**Key Benefit**: Use specific selectors to avoid unnecessary re-renders!

---

## Complete Component Migration Examples

### Example 1: Capture Button

#### Before

```typescript
import { useImageStore, useWorkflowStore, useUIStore } from "@/store";

function CaptureButton() {
  const addElement = useImageStore((state) => state.addElement);
  const startCapture = useWorkflowStore((state) => state.startCapture);
  const completeCapture = useWorkflowStore((state) => state.completeCapture);
  const cancelCapture = useWorkflowStore((state) => state.cancelCapture);
  const showOverlay = useUIStore((state) => state.showOverlay);

  const handleCapture = async () => {
    startCapture("element");
    showOverlay("capture", true);

    try {
      const dataUrl = await captureElement();
      const dimensions = await getImageDimensions(dataUrl);
      addElement(null, dataUrl, dimensions);

      completeCapture();
      showOverlay("capture", false);
    } catch (error) {
      cancelCapture();
      showOverlay("capture", false);
    }
  };

  return <button onClick={handleCapture}>Capture</button>;
}
```

#### After

```typescript
import { useImageStore, useAppStore } from "@/store";

function CaptureButton() {
  const addElement = useImageStore((state) => state.addElement);
  const startCapturing = useAppStore((state) => state.startCapturing);
  const completeCapturing = useAppStore((state) => state.completeCapturing);
  const cancelCapturing = useAppStore((state) => state.cancelCapturing);

  const handleCapture = async () => {
    startCapturing("element"); // Overlay managed automatically

    try {
      const dataUrl = await captureElement();
      const dimensions = await getImageDimensions(dataUrl);
      addElement(null, dataUrl, dimensions);

      completeCapturing();
    } catch (error) {
      cancelCapturing();
    }
  };

  return <button onClick={handleCapture}>Capture</button>;
}
```

---

### Example 2: Draggable Element

#### Before

```typescript
import { useUIStore } from "@/store";

function DraggableElement({ element }) {
  const startDrag = useUIStore((state) => state.startDrag);
  const endDrag = useUIStore((state) => state.endDrag);

  const handleDragStart = (e) => {
    startDrag("element-gallery", element.id, element.dataUrl);
  };

  const handleDragEnd = () => {
    endDrag();
  };

  return (
    <div draggable onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <img src={element.dataUrl} />
    </div>
  );
}
```

#### After

```typescript
import { useAppStore } from "@/store";

function DraggableElement({ element }) {
  const startDragging = useAppStore((state) => state.startDragging);
  const completeDragging = useAppStore((state) => state.completeDragging);

  const handleDragStart = (e) => {
    startDragging("element-gallery", element.id, element.dataUrl);
  };

  const handleDragEnd = () => {
    completeDragging();
  };

  return (
    <div draggable onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <img src={element.dataUrl} />
    </div>
  );
}
```

---

### Example 3: Generation Progress Overlay

#### Before

```typescript
import { useWorkflowStore } from "@/store";

function GeneratingOverlay() {
  const generation = useWorkflowStore((state) => state.generation);
  const isGenerating = useWorkflowStore((state) => state.mode === "generating");

  if (!isGenerating) return null;

  return (
    <div className="overlay">
      <div
        className="progress-bar"
        style={{ width: `${generation.progress}%` }}
      />
      <p>{generation.message}</p>
    </div>
  );
}
```

#### After

```typescript
import {
  useAppStore,
  selectIsGenerating,
  selectGenerationProgress,
} from "@/store";

function GeneratingOverlay() {
  const isGenerating = useAppStore(selectIsGenerating);
  const progress = useAppStore(selectGenerationProgress);

  if (!isGenerating) return null;

  return (
    <div className="overlay">
      <div
        className="progress-bar"
        style={{ width: `${progress.progress}%` }}
      />
      <p>{progress.message}</p>
    </div>
  );
}
```

---

## Import Cheat Sheet

### Old Imports

```typescript
import { useImageStore, useUIStore, useWorkflowStore } from "@/store";
```

### New Imports

```typescript
import {
  useImageStore, // Same as before
  useAppStore, // NEW: Replaces useUIStore + useWorkflowStore

  // Helpful selectors:
  selectIsDragging,
  selectIsCapturing,
  selectIsGenerating,
  selectIsBusy,
  selectIsIdle,
  selectCanGenerate,
  selectGenerationProgress,
  // ... see STORE_ARCHITECTURE.md for full list
} from "@/store";
```

---

## Selector Reference

### Interaction State Selectors

| Old                                              | New                                |
| ------------------------------------------------ | ---------------------------------- |
| `useWorkflowStore(s => s.mode === 'idle')`       | `useAppStore(selectIsIdle)`        |
| `useWorkflowStore(s => s.mode !== 'idle')`       | `useAppStore(selectIsBusy)`        |
| `useUIStore(s => s.drag.isDragging)`             | `useAppStore(selectIsDragging)`    |
| `useWorkflowStore(s => s.isCaptureActive)`       | `useAppStore(selectIsCapturing)`   |
| `useWorkflowStore(s => s.isPositioningActive)`   | `useAppStore(selectIsPositioning)` |
| `useWorkflowStore(s => s.mode === 'generating')` | `useAppStore(selectIsGenerating)`  |
| `useWorkflowStore(s => s.mode === 'error')`      | `useAppStore(selectIsError)`       |

### Interaction Data Selectors

| Old                                        | New                                       |
| ------------------------------------------ | ----------------------------------------- |
| `useUIStore(s => s.drag)`                  | `useAppStore(selectDragData)`             |
| `useUIStore(s => s.drag.dragSource)`       | `useAppStore(selectDragSource)`           |
| `useUIStore(s => s.drag.dragTarget)`       | `useAppStore(selectDragTarget)`           |
| `useWorkflowStore(s => s.captureTarget)`   | `useAppStore(selectCaptureTarget)`        |
| `useWorkflowStore(s => s.activeElementId)` | `useAppStore(selectPositioningElementId)` |
| `useWorkflowStore(s => s.generation)`      | `useAppStore(selectGenerationProgress)`   |
| `useWorkflowStore(s => s.lastError)`       | `useAppStore(selectErrorMessage)`         |

### UI State Selectors

| Old                                         | New                                          |
| ------------------------------------------- | -------------------------------------------- |
| `useUIStore(s => s.currentView)`            | `useAppStore(selectCurrentView)`             |
| `useUIStore(s => s.activeModal)`            | `useAppStore(selectActiveModal)`             |
| `useUIStore(selectIsPanelLocked('source'))` | `useAppStore(selectIsPanelLocked('source'))` |
| `useUIStore(s => s.carousel.elementIndex)`  | `useAppStore(selectElementCarouselIndex)`    |

### Composition State Selectors

| Old                                           | New                                      |
| --------------------------------------------- | ---------------------------------------- |
| `useWorkflowStore(s => s.canGenerate)`        | `useAppStore(selectCanGenerate)`         |
| `useWorkflowStore(s => s.generationBlockers)` | `useAppStore(selectCompositionBlockers)` |

---

## Action Method Renames

### Interaction Actions

| Old Method                   | New Method                      |
| ---------------------------- | ------------------------------- |
| `startDrag()`                | `startDragging()`               |
| `endDrag()`                  | `completeDragging()`            |
| `cancelDrag()`               | `cancelDragging()`              |
| `startCapture()`             | `startCapturing()`              |
| `completeCapture()`          | `completeCapturing()`           |
| `cancelCapture()`            | `cancelCapturing()`             |
| `startPositioning()`         | `startPositioning()` ✅ Same    |
| `completePositioning()`      | `completePositioning()` ✅ Same |
| `startGeneration()`          | `startGenerating()`             |
| `updateGenerationProgress()` | `updateGenerating()`            |
| `completeGeneration()`       | `completeGenerating()`          |
| `failGeneration()`           | `failGenerating()`              |

### Overlay Management

| Old Approach                       | New Approach                                |
| ---------------------------------- | ------------------------------------------- |
| `showOverlay('capture', true)`     | Automatic (handled by `startCapturing()`)   |
| `showOverlay('positioning', true)` | Automatic (handled by `startPositioning()`) |
| `showOverlay('generating', true)`  | Automatic (handled by `startGenerating()`)  |

---

## Common Pitfalls

### ❌ Pitfall 1: Forgetting to remove overlay management

```typescript
// ❌ Wrong - No longer needed
startCapturing("element");
showOverlay("capture", true); // REMOVE THIS
```

```typescript
// ✅ Right - Overlay managed automatically
startCapturing("element");
```

### ❌ Pitfall 2: Using old method names

```typescript
// ❌ Wrong - Old method name
const endDrag = useAppStore((state) => state.endDrag);
```

```typescript
// ✅ Right - New method name
const completeDragging = useAppStore((state) => state.completeDragging);
```

### ❌ Pitfall 3: Checking interaction state incorrectly

```typescript
// ❌ Wrong - mode no longer exists
const isCapturing = useAppStore((state) => state.mode === "capturing");
```

```typescript
// ✅ Right - Use interaction.type or selector
const isCapturing = useAppStore(selectIsCapturing);
// or
const interaction = useAppStore((state) => state.interaction);
const isCapturing = interaction.type === "capturing";
```

### ❌ Pitfall 4: Accessing data without type checking

```typescript
// ❌ Wrong - TypeScript error if not dragging
const interaction = useAppStore((state) => state.interaction);
const source = interaction.data.source; // Error! data might be null
```

```typescript
// ✅ Right - Use type guard or selector
const dragData = useAppStore(selectDragData);
const source = dragData?.source;
// or
const interaction = useAppStore((state) => state.interaction);
if (interaction.type === "dragging") {
  const source = interaction.data.source; // Safe!
}
```

---

## Testing Your Migration

After migrating a component, verify:

1. ✅ All old store imports are removed
2. ✅ New `useAppStore` import is added
3. ✅ Action methods use new names (e.g., `startDragging` not `startDrag`)
4. ✅ No manual overlay management calls
5. ✅ Uses selectors where appropriate
6. ✅ TypeScript compiles without errors
7. ✅ Component behavior is unchanged

---

## Need Help?

- **Full architecture**: See `STORE_ARCHITECTURE.md`
- **Selector list**: See `src/store/app-store.ts` exports
- **Examples**: See workflow examples in `STORE_ARCHITECTURE.md`

## Summary

**Key Changes**:

1. `useUIStore` + `useWorkflowStore` → `useAppStore`
2. Scattered boolean flags → Unified `interaction` object
3. Manual overlay management → Automatic
4. Method renames for consistency (e.g., `startDrag` → `startDragging`)
5. Use specific selectors to avoid re-renders

**Benefits**:

- Simpler mental model
- Less coordination between stores
- Better type safety
- Automatic overlay management
- Consistent API patterns
