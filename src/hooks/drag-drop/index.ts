// Context
export {
  DragDropProvider,
  useDragDropContext,
} from "./context/drag-drop-context";

// Primitives (reusable, framework-agnostic)
export { useDraggable } from "./primitives/use-draggable";
export { useDropZone } from "./primitives/use-drop-zone";
export { useCrossContextDrop } from "./primitives/use-cross-context-drop";

// Integration (Zustand-aware bridges)
export { useDraggableWithStore } from "./integration/use-draggable-with-store";
export { useDropZoneWithStore } from "./integration/use-drop-zone-with-store";
export { useBrowserImageDrop } from "./integration/use-browser-image-drop";

// Validation (drop rules and helpers)
export {
  isValidDropTarget,
  getValidTargets,
  getValidSources,
  getDropMessage,
  getSourceDescription,
  getValidationMatrix,
  DROP_RULES,
  type DragSource,
  type DropTarget,
} from "./integration/drop-validation";

// Features (domain-specific, high-level)
export { useElementGalleryDrag } from "./features/use-element-gallery-drag";
export { useGeneratedGalleryDrag } from "./features/use-generated-gallery-drag";
export { useCanvasDrop } from "./features/use-canvas-drop";
export { useElementGalleryDrop } from "./features/use-element-gallery-drop";
export { useCanvasElementDrag } from "./features/use-canvas-element-drag";
