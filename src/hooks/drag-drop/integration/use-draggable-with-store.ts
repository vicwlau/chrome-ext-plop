import { useAppStore } from "@/store/app-store";
import type { DraggingData } from "@/store/app-store";
import { useDraggable } from "../primitives/use-draggable";

interface UseDraggableWithStoreOptions {
  source: DraggingData["source"];
  itemId: string;
  imageUrl?: string;
  file?: File;
  metadata?: Record<string, string>;
}

/**
 * Integration hook that wraps useDraggable with AppStore integration.
 * Automatically calls startDragging/cancelDragging on the store.
 */
export function useDraggableWithStore({
  source,
  itemId,
  imageUrl,
  file,
  metadata,
}: UseDraggableWithStoreOptions) {
  const startDragging = useAppStore((state) => state.startDragging);
  const cancelDragging = useAppStore((state) => state.cancelDragging);

  const combinedMetadata = {
    ...metadata,
    source,
    itemId,
  };

  const { isDragging, dragProps } = useDraggable({
    data: {
      type: imageUrl ? "image" : "file",
      imageUrl,
      file,
      metadata: combinedMetadata,
    },
    onDragStart: (data) => {
      console.log("[useDraggableWithStore] Drag started", {
        source,
        itemId,
        metadata: combinedMetadata,
      });
      startDragging(source, itemId, data.imageUrl || "");
    },
    onDragEnd: () => {
      console.log("[useDraggableWithStore] Drag ended");
      const interaction = useAppStore.getState().interaction;
      if (interaction.type === "dragging") {
        cancelDragging();
      }
    },
  });

  return {
    isDragging,
    dragProps,
  };
}
