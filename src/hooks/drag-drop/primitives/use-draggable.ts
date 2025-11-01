import { useCallback, useState } from "react";
import { useDragDropContext } from "../context/drag-drop-context";

interface DraggableData {
  type: "image" | "file";
  imageUrl?: string;
  file?: File;
  metadata?: Record<string, string>;
}

interface UseDraggableOptions {
  data: DraggableData;
  onDragStart?: (data: DraggableData) => void;
  onDragEnd?: () => void;
}

interface UseDraggableReturn {
  isDragging: boolean;
  dragProps: {
    draggable: boolean;
    onDragStart: (e: React.DragEvent) => void;
    onDragEnd: (e: React.DragEvent) => void;
  };
}

/**
 * Hook to make elements from SIDEBAR draggable with image/file data
 * Supports dragging generated images or uploaded files
 * This diffs from browser-to-sidebar drag and drop since that uses messages and `dataTransfer`.
 */
export const useDraggable = ({
  data,
  onDragStart,
  onDragEnd,
}: UseDraggableOptions): UseDraggableReturn => {
  const [isDragging, setIsDragging] = useState(false);
  const { registerFile, cleanup } = useDragDropContext();

  // Get debug event handlers (defined at bottom of file)
  const { mouseMoveHandler, dragHandler } = getDebugEventHandlers();

  const handleDragStart = useCallback(
    (e: React.DragEvent) => {
      debugLog.dragStart({
        dataType: data.type,
        hasImageUrl: !!data.imageUrl,
        imageUrlLength: data.imageUrl?.length,
        imageUrlPreview: data.imageUrl?.substring(0, 50),
        hasFile: !!data.file,
      });

      setIsDragging(true);
      e.dataTransfer.effectAllowed = "copy";

      // CRITICAL: Set a drag image to ensure visual feedback
      const img = e.target as HTMLImageElement;
      if (img.tagName === "IMG") {
        try {
          // Try to use the image itself, scaled down
          e.dataTransfer.setDragImage(img, 50, 50);
          debugLog.setDragImage();
        } catch (err) {
          debugLog.setDragImageError(err);
        }
      }

      // Set the data type
      e.dataTransfer.setData("dragType", data.type);
      debugLog.setDragType(data.type);

      // Set imageUrl if available
      if (data.imageUrl) {
        e.dataTransfer.setData("imageUrl", data.imageUrl);
        debugLog.setImageUrl(data.imageUrl);
      } else {
        debugLog.noImageUrl();
      }

      // Set file reference (for internal drag-drop)
      if (data.file) {
        // Store file reference via a unique ID
        const fileId = `file-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2)}`;
        e.dataTransfer.setData("fileId", fileId);
        // Store in context (auto-cleanup after 10 seconds)
        registerFile(fileId, data.file);
        debugLog.setFileId(fileId);
      }

      // Set any additional metadata
      if (data.metadata) {
        Object.entries(data.metadata).forEach(([key, value]) => {
          e.dataTransfer.setData(key, value);
        });
        debugLog.setMetadata(Object.keys(data.metadata));
      }

      debugLog.dataTransferTypes(Array.from(e.dataTransfer.types));

      // Add mouse move listener to track dragging
      window.addEventListener("mousemove", mouseMoveHandler);
      window.addEventListener("drag", dragHandler);
      debugLog.listenersAdded();

      onDragStart?.(data);
      debugLog.dragActive();
    },
    [data, onDragStart, mouseMoveHandler, dragHandler]
  );

  const handleDragEnd = useCallback(
    (e: React.DragEvent) => {
      debugLog.dragEnd({
        dropEffect: e.dataTransfer.dropEffect,
        effectAllowed: e.dataTransfer.effectAllowed,
      });

      // Remove mouse move listener
      window.removeEventListener("mousemove", mouseMoveHandler);
      window.removeEventListener("drag", dragHandler);
      debugLog.listenersRemoved();

      setIsDragging(false);

      // Clean up file reference from context if drag was cancelled
      // (successful drops will clean up in the drop handler)
      if (e.dataTransfer.dropEffect === "none") {
        const fileId = e.dataTransfer.getData("fileId");
        if (fileId) {
          cleanup(fileId);
          debugLog.cleanupFileId(fileId);
        }
      }

      onDragEnd?.();
    },
    [onDragEnd, mouseMoveHandler, dragHandler, cleanup]
  );

  return {
    isDragging,
    dragProps: {
      draggable: true,
      onDragStart: handleDragStart,
      onDragEnd: handleDragEnd,
    },
  };
};

// ============================================================================
// DEBUG UTILITIES
// ============================================================================
// All console.log statements are consolidated here for easy management
// Set ENABLE_DEBUG to false to disable all debug logging

const ENABLE_DEBUG = false;

const debugLog = {
  mouseMove: (x: number, y: number) => {
    if (!ENABLE_DEBUG) return;
    console.log("🖱️ [useDraggable] Mouse moving during drag:", { x, y });
  },

  dragEvent: (x: number, y: number, target?: string) => {
    if (!ENABLE_DEBUG) return;
    console.log("🔄 [useDraggable] DRAG event fired:", { x, y, target });
  },

  dragStart: (details: {
    dataType: string;
    hasImageUrl: boolean;
    imageUrlLength?: number;
    imageUrlPreview?: string;
    hasFile: boolean;
  }) => {
    if (!ENABLE_DEBUG) return;
    console.log("🚀 [useDraggable] handleDragStart called", details);
  },

  setDragImage: () => {
    if (!ENABLE_DEBUG) return;
    console.log("✅ [useDraggable] Set drag image using actual img element");
  },

  setDragImageError: (err: unknown) => {
    if (!ENABLE_DEBUG) return;
    console.warn("⚠️ [useDraggable] Failed to set drag image:", err);
  },

  setDragType: (type: string) => {
    if (!ENABLE_DEBUG) return;
    console.log("✅ [useDraggable] Set dragType:", type);
  },

  setImageUrl: (url: string) => {
    if (!ENABLE_DEBUG) return;
    console.log(
      "✅ [useDraggable] Set imageUrl:",
      url.substring(0, 50) + "..."
    );
  },

  noImageUrl: () => {
    if (!ENABLE_DEBUG) return;
    console.warn("⚠️ [useDraggable] No imageUrl to set!");
  },

  setFileId: (fileId: string) => {
    if (!ENABLE_DEBUG) return;
    console.log("✅ [useDraggable] Set fileId:", fileId);
  },

  setMetadata: (keys: string[]) => {
    if (!ENABLE_DEBUG) return;
    console.log("✅ [useDraggable] Set metadata:", keys);
  },

  dataTransferTypes: (types: string[]) => {
    if (!ENABLE_DEBUG) return;
    console.log("📦 [useDraggable] DataTransfer types:", types);
  },

  listenersAdded: () => {
    if (!ENABLE_DEBUG) return;
    console.log("👂 [useDraggable] Added mousemove and drag listeners");
  },

  dragActive: () => {
    if (!ENABLE_DEBUG) return;
    console.log(
      "🎬 [useDraggable] Drag should now be active - move your mouse!"
    );
  },

  dragEnd: (details: { dropEffect: string; effectAllowed: string }) => {
    if (!ENABLE_DEBUG) return;
    console.log("🏁 [useDraggable] handleDragEnd called", details);
  },

  listenersRemoved: () => {
    if (!ENABLE_DEBUG) return;
    console.log("👋 [useDraggable] Removed mousemove and drag listeners");
  },

  cleanupFileId: (fileId: string) => {
    if (!ENABLE_DEBUG) return;
    console.log("🗑️ [useDraggable] Cleaned up fileId:", fileId);
  },
};

/**
 * Debug event handlers for tracking drag operations
 * These handlers are only used for debugging purposes
 */
function getDebugEventHandlers() {
  // Track mouse movement during drag for debugging
  const mouseMoveHandler = (e: MouseEvent) => {
    debugLog.mouseMove(e.clientX, e.clientY);
  };

  // Track drag event to see if it fires
  const dragHandler = (e: DragEvent) => {
    debugLog.dragEvent(
      e.clientX,
      e.clientY,
      (e.target as HTMLElement)?.tagName
    );
  };

  return { mouseMoveHandler, dragHandler };
}
