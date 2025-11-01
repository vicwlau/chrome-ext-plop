import { useAppStore } from "@/store/app-store";
import type { DraggingData } from "@/store/app-store";
import { useDropZone } from "../primitives/use-drop-zone";
import {
  isValidDropTarget,
  getDropMessage,
  type DragSource,
  type DropTarget,
} from "./drop-validation";

interface DropResult {
  type: "image" | "file" | "external-file" | "browser-drag";
  source: DragSource;
  file?: File;
  imageUrl?: string;
  metadata?: Record<string, string>;
}

interface UseDropZoneWithStoreOptions {
  target: DropTarget;
  accept?: string[];
  maxSize?: number;
  onDrop: (result: DropResult, event: React.DragEvent) => void | Promise<void>;
  onError?: (error: string) => void;
}

/**
 * Integration hook that wraps useDropZone with AppStore integration.
 * - Tracks drag target in store
 * - Validates drops based on source/target combination
 * - Calls completeDragging on successful drop
 */
export function useDropZoneWithStore({
  target,
  accept,
  maxSize,
  onDrop,
  onError,
}: UseDropZoneWithStoreOptions) {
  const updateDragTarget = useAppStore((state) => state.updateDragTarget);
  const completeDragging = useAppStore((state) => state.completeDragging);
  const setError = useAppStore((state) => state.setError);
  const interaction = useAppStore((state) => state.interaction);

  const { isDragging, dropProps } = useDropZone({
    accept,
    maxSize,
    onDrop: async (primitiveResult, event) => {
      console.log("[useDropZoneWithStore] Drop received", primitiveResult);

      // Determine source based on drop type
      let source: DropResult["source"];
      let enhancedResult: DropResult;

      // Desktop file drop
      if (primitiveResult.type === "external-file") {
        source = "desktop";
        enhancedResult = {
          ...primitiveResult,
          source,
        };
      }
      // Internal drag with source metadata
      else if (primitiveResult.metadata?.source) {
        source = primitiveResult.metadata.source as DragSource;

        // Validate drop target; business logic validation
        if (!isValidDropTarget(source, target)) {
          const errorMsg = `Cannot drop ${source} on ${target}`;
          console.warn("[useDropZoneWithStore]", errorMsg);
          setError(errorMsg, "drop-validation");
          onError?.(errorMsg);
          completeDragging();
          return;
        }

        enhancedResult = {
          ...primitiveResult,
          source,
        };
      }
      // Unknown source - treat as external
      else {
        source = "desktop";
        enhancedResult = {
          ...primitiveResult,
          source,
        };
      }

      try {
        // Call the user's drop handler
        await onDrop(enhancedResult, event);

        // Always complete dragging after successful drop
        completeDragging();
      } catch (error) {
        console.error("[useDropZoneWithStore] Drop handler failed:", error);
        const errorMsg = error instanceof Error ? error.message : "Drop failed";
        setError(errorMsg, "drop-handler");
        onError?.(errorMsg);
        completeDragging();
      }
    },
    onError: (error) => {
      console.error("[useDropZoneWithStore] Drop error:", error);
      setError(error, "drop-zone");
      onError?.(error);
    },
  });

  // Get current drag source for validation
  const dragSource =
    interaction.type === "dragging" ? interaction.data.source : null;

  // Check if this drop zone can accept the current drag
  const canAcceptDrop =
    dragSource === null || isValidDropTarget(dragSource, target);

  return {
    isDragging,
    canAcceptDrop,
    dragSource,
    dropProps: {
      ...dropProps,
      onDragOver: (e: React.DragEvent) => {
        dropProps.onDragOver(e);
        // Update drag target in store
        updateDragTarget(target);
      },
    },
  };
}
