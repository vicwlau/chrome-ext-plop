# Store Architecture Guide

## Overview

This application uses a **Two-Store Architecture** with clear separation of concerns:

```
┌─────────────────────────────────────────────────────┐
│                  IMAGE STORE                        │
│         (Pure Data - Domain Layer)                  │
│  • Source image with metadata                       │
│  • Element images with positions                    │
│  • Generated images with references                 │
│  • CRUD operations only                             │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│                   APP STORE                         │
│        (UI + Workflow - Application Layer)          │
│  • View state & navigation                          │
│  • Modals, panels, carousels                        │
│  • Unified interaction state                        │
│  • Composition readiness                            │
│  • Help & debug                                     │
└─────────────────────────────────────────────────────┘
```

### Why Two Stores?

1. **Image Store** = Domain data (what images exist)
2. **App Store** = Application state (what the user is doing)

This keeps data pure and UI/workflow concerns together where they naturally coordinate.

---

---

## 1. Image Store (Data Layer)

**Purpose**: Source of truth for all image data (domain layer)

**Manages**:

- Source image with metadata
- Element images with positions
- Generated images with references

**Key Types**:

- `ImageMetadata` - Base metadata (id, dataUrl, size, aspect ratio, dimensions, createdAt)
- `SourceImageData` - Source image with optional name/description
- `ElementImageData` - Elements with position (x, y relative 0-1)
- `GeneratedImageData` - Generated images with source/element references

**Common Actions**:

```typescript
setSourceImage(file, dataUrl, dimensions, name?, description?)
addElement(file, dataUrl, dimensions)
updateElementPosition(elementId, x, y)
addGeneratedImage(dataUrl, dimensions, sourceImageId, elementIds, prompt?)
```

addGeneratedImage(dataUrl, dimensions, sourceImageId, elementIds, prompt?)

````

---

## 2. App Store (Application Layer)

**Purpose**: Manages all UI, workflow, and user interaction state

**Manages**:

- **View & Navigation**: Current view (`source` | `generated`), navigation history
- **Modals**: Upload, capture, preview, help modals with data
- **Panels**: Lock/collapse state for UI panels
- **Carousels**: Element and generated image indices
- **Unified Interactions**: Single `interaction` object tracks all user actions
- **Composition Status**: Whether generation is ready and what's blocking it
- **Help & Debug**: Contextual help and debug panel visibility
- **Operation History**: Last operation tracking for undo/analytics

### Unified Interaction Model

The key innovation is the **unified `interaction` state** that replaces fragmented boolean flags:

```typescript
interaction: {
  type: 'idle' | 'uploading' | 'dragging' | 'capturing' |
        'positioning' | 'generating' | 'error'

  data: // Type-specific data
    | null                    // for idle, uploading
    | DraggingData           // for dragging
    | CapturingData          // for capturing
    | PositioningData        // for positioning
    | GeneratingData         // for generating
    | ErrorData              // for error
}
````

**Benefits**:

- ✅ Single source of truth for "what is user doing"
- ✅ Impossible states are impossible (can't be dragging AND capturing)
- ✅ All interaction-specific state lives together
- ✅ Consistent API pattern for all interactions

### Interaction Types

#### Idle

```typescript
{ type: 'idle', data: null }
```

No active user interaction.

#### Uploading

```typescript
{ type: 'uploading', data: null }
```

User is uploading a file.

#### Dragging

```typescript
{
  type: 'dragging',
  data: {
    source: 'browser' | 'element-gallery' | 'generated-gallery'
    target: 'source-panel' | 'element-gallery' | 'canvas' | null
    itemId: string
    imageUrl: string
  }
}
```

User is dragging an image from source to target.

#### Capturing

```typescript
{
  type: 'capturing',
  data: {
    target: 'element' | 'area'
    showOverlay: boolean
  }
}
```

User is capturing an element or area from browser.

#### Positioning

```typescript
{
  type: 'positioning',
  data: {
    elementId: string
    showOverlay: boolean
  }
}
```

User is positioning an element on the canvas.

#### Generating

```typescript
{
  type: 'generating',
  data: {
    status: 'preparing' | 'processing' | 'complete' | 'failed'
    progress: number  // 0-100
    message: string
    showOverlay: boolean
  }
}
```

AI is generating the composition.

#### Error

```typescript
{
  type: 'error',
  data: {
    message: string
    context: string | null  // Which operation failed
  }
}
```

An error occurred.

### Key Actions

**View Actions**:

```typescript
setView(view);
goBack();
```

**Modal Actions**:

```typescript
openModal(modal, data?)
closeModal()
```

**Panel Actions**:

```typescript
lockPanel(panelId);
unlockPanel(panelId);
togglePanelCollapse(panelId);
unlockAllPanels();
```

**Carousel Actions**:

```typescript
setElementCarouselIndex(index);
nextElementImage() / prevElementImage();
setGeneratedCarouselIndex(index);
nextGeneratedImage() / prevGeneratedImage();
```

**Interaction Actions** (consistent pattern!):

```typescript
// Uploading
startUploading()
completeUploading()

// Dragging
startDragging(source, itemId, imageUrl)
updateDragTarget(target)
completeDragging()
cancelDragging()

// Capturing
startCapturing(target)
completeCapturing()
cancelCapturing()

// Positioning
startPositioning(elementId)
completePositioning()
cancelPositioning()

// Generating
startGenerating()
updateGenerating(progress, message)
completeGenerating()
failGenerating(error)

// Error
setError(message, context?)
clearError()
```

**Composition Actions**:

```typescript
updateCompositionStatus(canGenerate, blockers);
addCompositionBlocker(blocker);
removeCompositionBlocker(blocker);
clearCompositionBlockers();
```

---

## Store Interaction Patterns

### Pattern 1: Component uses single store

Most components only need one store:

```typescript
// ImageGallery.tsx - Only needs data
function ImageGallery() {
  const elements = useImageStore((state) => state.elements);

  return (
    <div>
      {elements.map((el) => (
        <img key={el.id} src={el.dataUrl} />
      ))}
    </div>
  );
}

// CapturingOverlay.tsx - Only needs app state
function CapturingOverlay() {
  const interaction = useAppStore((state) => state.interaction);

  if (interaction.type !== "capturing") return null;

  return <div className="overlay">Capturing {interaction.data.target}...</div>;
}
```

### Pattern 2: Coordinating data + app state

When a component needs both:

```typescript
function CanvasEditor() {
  // Data layer
  const sourceImage = useImageStore((state) => state.sourceImage);
  const elements = useImageStore((state) => state.elements);
  const updateElementPosition = useImageStore(
    (state) => state.updateElementPosition
  );

  // App layer
  const startPositioning = useAppStore((state) => state.startPositioning);
  const completePositioning = useAppStore((state) => state.completePositioning);
  const isPositioning = useAppStore(selectIsPositioning);

  const handleElementDrop = (elementId: string, x: number, y: number) => {
    if (!isPositioning) {
      startPositioning(elementId);
    }

    updateElementPosition(elementId, x, y);
    completePositioning();
  };

  return (
    <div>
      {sourceImage && <img src={sourceImage.dataUrl} />}
      {elements.map((el) => (
        <DraggableElement key={el.id} element={el} onDrop={handleElementDrop} />
      ))}
    </div>
  );
}
```

### Pattern 3: Using derived selectors

Avoid re-renders by using specific selectors:

```typescript
// ✅ Good - Only re-renders when interaction type changes
const isCapturing = useAppStore(selectIsCapturing);

// ❌ Bad - Re-renders on ANY interaction state change
const interaction = useAppStore((state) => state.interaction);
const isCapturing = interaction.type === "capturing";
```

---

## Common Workflows

### 1. Upload Source Image

```typescript
function UploadSource() {
  const setSourceImage = useImageStore((state) => state.setSourceImage);
  const startUploading = useAppStore((state) => state.startUploading);
  const completeUploading = useAppStore((state) => state.completeUploading);
  const closeModal = useAppStore((state) => state.closeModal);

  const handleUpload = async (file: File) => {
    startUploading();

    try {
      const dataUrl = URL.createObjectURL(file);
      const dimensions = await getImageDimensionsFromDataUrl(dataUrl);
      setSourceImage(file, dataUrl, dimensions, file.name);

      completeUploading();
      closeModal();
    } catch (error) {
      setError("Failed to upload image");
    }
  };

  return (
    <input type="file" onChange={(e) => handleUpload(e.target.files[0])} />
  );
}
```

### 2. Drag & Drop Image

```typescript
function DraggableImage({ imageUrl, source, itemId }) {
  const startDragging = useAppStore((state) => state.startDragging);
  const completeDragging = useAppStore((state) => state.completeDragging);

  const handleDragStart = (e: DragEvent) => {
    e.dataTransfer.effectAllowed = "copy";
    startDragging(source, itemId, imageUrl);
  };

  const handleDragEnd = () => {
    completeDragging();
  };

  return (
    <img
      src={imageUrl}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    />
  );
}

function DropTarget() {
  const updateDragTarget = useAppStore((state) => state.updateDragTarget);
  const interaction = useAppStore((state) => state.interaction);
  const addElement = useImageStore((state) => state.addElement);

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    updateDragTarget("element-gallery");
  };

  const handleDrop = async (e: DragEvent) => {
    e.preventDefault();

    if (
      interaction.type === "dragging" &&
      interaction.data.source === "browser"
    ) {
      const file = e.dataTransfer.files[0];
      const dataUrl = URL.createObjectURL(file);
      const dimensions = await getImageDimensionsFromDataUrl(dataUrl);
      addElement(file, dataUrl, dimensions);
    }
  };

  return (
    <div onDragOver={handleDragOver} onDrop={handleDrop}>
      Drop here
    </div>
  );
}
```

### 3. Capture Element

```typescript
function CaptureButton() {
  const addElement = useImageStore((state) => state.addElement);
  const startCapturing = useAppStore((state) => state.startCapturing);
  const completeCapturing = useAppStore((state) => state.completeCapturing);
  const cancelCapturing = useAppStore((state) => state.cancelCapturing);

  const handleCapture = async () => {
    startCapturing("element");

    try {
      // Inject capture UI into active tab
      const capturedDataUrl = await captureElementFromPage();
      const dimensions = await getImageDimensionsFromDataUrl(capturedDataUrl);

      addElement(null, capturedDataUrl, dimensions);
      completeCapturing();
    } catch (error) {
      cancelCapturing();
      setError("Failed to capture element");
    }
  };

  return <button onClick={handleCapture}>Capture Element</button>;
}
```

### 4. Generate Composition

```typescript
function GenerateButton() {
  const sourceImage = useImageStore((state) => state.sourceImage);
  const elements = useImageStore(selectPositionedElements);
  const addGeneratedImage = useImageStore((state) => state.addGeneratedImage);

  const canGenerate = useAppStore(selectCanGenerate);
  const startGenerating = useAppStore((state) => state.startGenerating);
  const updateGenerating = useAppStore((state) => state.updateGenerating);
  const completeGenerating = useAppStore((state) => state.completeGenerating);
  const failGenerating = useAppStore((state) => state.failGenerating);
  const setView = useAppStore((state) => state.setView);

  const handleGenerate = async () => {
    if (!canGenerate || !sourceImage) return;

    startGenerating();

    try {
      updateGenerating(25, "Uploading images...");
      await uploadImages(sourceImage, elements);

      updateGenerating(50, "Processing composition...");
      const result = await generateComposition();

      updateGenerating(75, "Finalizing...");
      const dimensions = await getImageDimensionsFromDataUrl(result.dataUrl);

      addGeneratedImage(
        result.dataUrl,
        dimensions,
        sourceImage.id,
        elements.map((el) => el.id)
      );

      completeGenerating();
      setView("generated");
    } catch (error) {
      failGenerating(error.message);
    }
  };

  return (
    <button onClick={handleGenerate} disabled={!canGenerate}>
      Generate
    </button>
  );
}
```

---

## Selectors Reference

### Image Store Selectors

```typescript
// Basic selectors
selectSourceImage(state);
selectIsSourceLoaded(state);
selectElements(state);
selectGeneratedImages(state);
selectCurrentGeneratedImage(state);
selectIsProcessing(state);
selectError(state);

// Computed selectors (use carefully - may cause re-renders)
selectPositionedElements(state);
selectUnpositionedElements(state);
selectElementById(elementId)(state);
selectGeneratedImageById(imageId)(state);
selectElementCount(state);
selectPositionedElementCount(state);
selectHasSourceImage(state);
selectCanCompose(state);
```

### App Store Selectors

```typescript
// View selectors
selectCurrentView(state);
selectPreviousView(state);

// Modal selectors
selectActiveModal(state);
selectModalData(state);

// Panel selectors
selectIsPanelLocked(panelId)(state);
selectIsPanelCollapsed(panelId)(state);
selectLockedPanels(state);
selectCollapsedPanels(state);

// Carousel selectors
selectElementCarouselIndex(state);
selectGeneratedCarouselIndex(state);
selectCarousel(state);

// Interaction selectors
selectInteraction(state);
selectInteractionType(state);
selectIsIdle(state);
selectIsBusy(state);

// Specific interaction state
selectIsUploading(state);
selectIsDragging(state);
selectIsCapturing(state);
selectIsPositioning(state);
selectIsGenerating(state);
selectIsError(state);

// Interaction data
selectDragData(state);
selectDragSource(state);
selectDragTarget(state);
selectCaptureData(state);
selectCaptureTarget(state);
selectPositioningData(state);
selectPositioningElementId(state);
selectGeneratingData(state);
selectGenerationProgress(state);
selectErrorData(state);
selectErrorMessage(state);
selectErrorContext(state);

// Composition selectors
selectComposition(state);
selectCanGenerate(state);
selectCompositionBlockers(state);

// Help & debug
selectShowHelp(state);
selectHelpContext(state);
selectShowDebugPanel(state);

// Operation history
selectLastOperation(state);
selectOperationTimestamp(state);
```

---

## Helper Functions

### `isValidDropTarget(source, target): boolean`

Validates drag-drop combinations:

```typescript
const isValid = isValidDropTarget("browser", "source-panel"); // true
const isValid = isValidDropTarget("element-gallery", "canvas"); // true
const isValid = isValidDropTarget("generated-gallery", "canvas"); // false
```

### `getInteractionLabel(interaction): string`

Gets human-readable label for current interaction:

```typescript
const label = getInteractionLabel({
  type: "capturing",
  data: { target: "element" },
});
// Returns: "Capturing element"
```

---

## Best Practices

### 1. Store Selection

- **Image data?** → Image Store
- **Everything else?** → App Store

### 2. Avoid Computed Selectors in Image Store

These selectors perform filtering and may cause infinite loops:

```typescript
// ⚠️ Use sparingly
selectPositionedElements(state);
selectUnpositionedElements(state);
```

Better: Use them once at the top level, memoize if needed.

### 3. Use Specific Selectors

```typescript
// ✅ Good - Subscribe to specific value
const isCapturing = useAppStore(selectIsCapturing);

// ❌ Bad - Re-renders on any interaction change
const { interaction } = useAppStore();
```

### 4. Consistent Interaction Patterns

All interactions follow same lifecycle:

```
startXXX() → [do work] → completeXXX() | cancelXXX()
```

### 5. Type Safety

TypeScript discriminated unions ensure type safety:

```typescript
if (interaction.type === "dragging") {
  // TypeScript knows interaction.data is DraggingData
  console.log(interaction.data.source);
}
```

### 6. Error Handling

Always handle errors by setting error interaction:

```typescript
try {
  // operation
} catch (error) {
  setError(error.message, "capture");
}
```

### 7. DevTools

Both stores have DevTools enabled. Use Redux DevTools extension to:

- Monitor state changes
- Time-travel debug
- Inspect interaction history

---

## Migration from Old Architecture

### Old (3 stores)

```typescript
// Scattered state
const mode = useWorkflowStore((state) => state.mode);
const isCaptureActive = useWorkflowStore((state) => state.isCaptureActive);
const showCaptureOverlay = useUIStore((state) => state.showCaptureOverlay);
const drag = useUIStore((state) => state.drag);
```

### New (2 stores)

```typescript
// Unified state
const interaction = useAppStore((state) => state.interaction);

// Or use specific selectors
const isCapturing = useAppStore(selectIsCapturing);
const isDragging = useAppStore(selectIsDragging);
```

### Key Changes

| Old                                     | New                                |
| --------------------------------------- | ---------------------------------- |
| `useWorkflowStore` + `useUIStore`       | `useAppStore`                      |
| `mode: 'capturing'` + `isCaptureActive` | `interaction.type === 'capturing'` |
| `drag.isDragging`                       | `interaction.type === 'dragging'`  |
| `showCaptureOverlay`                    | `interaction.data.showOverlay`     |
| `activeAction` + `mode`                 | `interaction.type`                 |

---

## Quick Reference

| Need                    | Store       | Method                                                  |
| ----------------------- | ----------- | ------------------------------------------------------- |
| Get source image        | Image       | `useImageStore(selectSourceImage)`                      |
| Add element             | Image       | `useImageStore(state => state.addElement())`            |
| Change view             | App         | `useAppStore(state => state.setView('generated'))`      |
| Start capture           | App         | `useAppStore(state => state.startCapturing('element'))` |
| Check if capturing      | App         | `useAppStore(selectIsCapturing)`                        |
| Start dragging          | App         | `useAppStore(state => state.startDragging(...))`        |
| Generate image          | Image + App | Both stores                                             |
| Lock panel              | App         | `useAppStore(state => state.lockPanel('source'))`       |
| Check if busy           | App         | `useAppStore(selectIsBusy)`                             |
| Get generation progress | App         | `useAppStore(selectGenerationProgress)`                 |

---

## Architecture Benefits

### ✅ Unified Interaction Model

- Single source of truth for user actions
- No more scattered boolean flags
- Impossible states are impossible

### ✅ Consistent API

- All interactions follow same pattern
- Predictable lifecycle
- Easy to extend

### ✅ Clear Boundaries

- Data vs. Application concerns
- No confusion about where state lives

### ✅ Type Safety

- Discriminated unions
- TypeScript knows exact data shape

### ✅ Reduced Coordination

- No need to update multiple stores
- State changes are atomic

### ✅ Better Developer Experience

- Single import for most components
- Intuitive selector names
- Excellent DevTools support

---

## Conclusion

The Two-Store Architecture provides:

1. **Image Store**: Pure, simple, focused on domain data
- TypeScript knows exact data shape

### ✅ Reduced Coordination
- No need to update multiple stores
- State changes are atomic

### ✅ Better Developer Experience
- Single import for most components
- Intuitive selector names
- Excellent DevTools support

---

## Conclusion

The Two-Store Architecture provides:
1. **Image Store**: Pure, simple, focused on domain data
2. **App Store**: Unified UI + workflow with consistent interaction model

This eliminates the confusion and redundancy of the previous three-store setup while maintaining clear separation between data and application concerns.
