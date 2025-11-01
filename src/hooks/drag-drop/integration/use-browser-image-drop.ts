import { useCrossContextDrop } from "../primitives/use-cross-context-drop";
import { useAppStore } from "@/store/app-store";

interface UseBrowserImageDropOptions {
  onDragAvailable?: () => void;
  onDragEnd?: () => void;
}

/**
 * Integration hook that orchestrates cross-context browser image drops.
 * Bridges between useCrossContextDrop (primitive) and AppStore.
 */
export function useBrowserImageDrop({
  onDragAvailable,
  onDragEnd,
}: UseBrowserImageDropOptions = {}) {
  const startDragging = useAppStore((state) => state.startDragging);
  const cancelDragging = useAppStore((state) => state.cancelDragging);

  const { isDragAvailable, dragData, requestImageData } = useCrossContextDrop({
    onDragAvailable: (data) => {
      console.log("[useBrowserImageDrop] Browser drag available", data);

      // Start dragging in store
      startDragging("browser", `browser-${Date.now()}`, data.imageUrl);

      onDragAvailable?.();
    },
    onDragEnd: () => {
      console.log("[useBrowserImageDrop] Browser drag ended");
      cancelDragging();
      onDragEnd?.();
    },
  });

  return {
    isDragAvailable,
    dragData,
    requestImageData,
  };
}
