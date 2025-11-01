import { useDraggableWithStore } from "../integration/use-draggable-with-store";
import type { ElementImageData } from "@/store/image-store";

interface UseElementGalleryDragOptions {
  element: ElementImageData;
}

/**
 * Feature hook for dragging element images from the gallery.
 * Specialized for element gallery → canvas positioning workflow.
 * Drag Type: Data transfer,
 * Coordinates: Source metadata only
 */
export function useElementGalleryDrag({
  element,
}: UseElementGalleryDragOptions) {
  const { isDragging, dragProps } = useDraggableWithStore({
    source: "element-gallery",
    itemId: element.id,
    // Use optimized version for drag if available (better performance for large images)
    imageUrl: element.apiDataUrl || element.dataUrl,
    metadata: {
      elementId: element.id,
      aspectRatio: element.aspectRatio,
    },
  });

  return {
    isDragging,
    dragProps,
  };
}
