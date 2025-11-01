import { useDraggableWithStore } from "../integration/use-draggable-with-store";
import type { GeneratedImageData } from "@/store/image-store";

interface UseGeneratedGalleryDragOptions {
  generatedImage: GeneratedImageData;
}

/**
 * Feature hook for dragging generated images from the gallery.
 * Specialized for generated gallery → source panel workflow.
 */
export function useGeneratedGalleryDrag({
  generatedImage,
}: UseGeneratedGalleryDragOptions) {
  const { isDragging, dragProps } = useDraggableWithStore({
    source: "generated-gallery",
    itemId: generatedImage.id,
    // Use optimized version for drag if available (better performance for large images)
    imageUrl: generatedImage.apiDataUrl || generatedImage.dataUrl,
    metadata: {
      generatedImageId: generatedImage.id,
      sourceImageId: generatedImage.sourceImageId,
      elementCount: generatedImage.elementIds.length.toString(),
    },
  });

  return {
    isDragging,
    dragProps,
  };
}
