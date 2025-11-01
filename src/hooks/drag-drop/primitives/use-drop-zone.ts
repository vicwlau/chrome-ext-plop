import { useCallback, useState } from "react";
import { useDragDropContext } from "../context/drag-drop-context";

interface DropResult {
  type: "image" | "file" | "external-file";
  file?: File;
  imageUrl?: string;
  metadata?: Record<string, string>;
}

interface UseDropZoneOptions {
  onDrop: (result: DropResult, event: React.DragEvent) => void;
  accept?: string[]; // e.g., ['image/*']
  maxSize?: number; // in bytes
  onError?: (error: string) => void;
}

interface UseDropZoneReturn {
  isDragging: boolean;
  dropProps: {
    onDragOver: (e: React.DragEvent) => void;
    onDragLeave: (e: React.DragEvent) => void;
    onDrop: (e: React.DragEvent) => void;
  };
}

/**
 * Hook to make an element accept drops from:
 * 1. Internal draggable elements (via useDraggable)
 * 2. External file system drops
 */
export const useDropZone = ({
  onDrop,
  accept = ["image/*"],
  maxSize,
  onError,
}: UseDropZoneOptions): UseDropZoneReturn => {
  const [isDragging, setIsDragging] = useState(false);
  const { retrieveFile, cleanup } = useDragDropContext();

  const validateFile = useCallback(
    (file: File): boolean => {
      // Check file type
      const acceptsAllImages = accept.includes("image/*");
      const matchesType = accept.some((type) => {
        if (type.endsWith("/*")) {
          const category = type.split("/")[0];
          return file.type.startsWith(category + "/");
        }
        return file.type === type;
      });

      if (!acceptsAllImages && !matchesType) {
        onError?.(`File type ${file.type} not accepted`);
        return false;
      }

      // Check file size
      if (maxSize && file.size > maxSize) {
        onError?.(
          `File size must be less than ${Math.round(maxSize / 1024 / 1024)}MB`
        );
        return false;
      }

      return true;
    },
    [accept, maxSize, onError]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set if not already dragging - prevents re-render spam
    setIsDragging((prev) => prev || true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      try {
        // Check if it's an internal drag (from useDraggable)
        const dragType = e.dataTransfer.getData("dragType");

        if (dragType) {
          // Internal drag-drop
          const result: DropResult = {
            type: dragType as "image" | "file",
            metadata: {},
          };

          // Get imageUrl if available
          const imageUrl = e.dataTransfer.getData("imageUrl");
          if (imageUrl) {
            result.imageUrl = imageUrl;
          }

          // Get file from context if available
          const fileId = e.dataTransfer.getData("fileId");
          if (fileId) {
            result.file = retrieveFile(fileId);
            if (result.file) {
              // Clean up from context after successful retrieval
              cleanup(fileId);
            }
          }

          // Get all metadata
          for (const type of e.dataTransfer.types) {
            if (!["dragType", "imageUrl", "fileId", "Files"].includes(type)) {
              result.metadata![type] = e.dataTransfer.getData(type);
            }
          }

          console.log(
            "[useDropZone] dataTransfer.types:",
            Array.from(e.dataTransfer.types)
          );
          // console.log(
          //   "[useDropZone] extracted metadata:",
          //   JSON.stringify(result.metadata, null, 2)
          // );

          onDrop(result, e);
        } else {
          // External drop - could be file system or browser image drag
          const files = Array.from(e.dataTransfer.files);

          if (files.length > 0) {
            // File drop from file system
            const file = files[0];

            if (!validateFile(file)) {
              return;
            }

            const result: DropResult = {
              type: "external-file",
              file,
            };

            onDrop(result, e);
          } else {
            // No files - check for browser image drag
            // Browser drags have text/html or text/uri-list in dataTransfer
            const hasHtml = e.dataTransfer.types.includes("text/html");
            const hasUriList = e.dataTransfer.types.includes("text/uri-list");

            if (hasHtml || hasUriList) {
              console.log("[useDropZone] Browser image drop detected");

              // This is a browser image drag - but we don't have the actual data here
              // The useBrowserImageDrop hook handles the data via cross-context messaging
              // So we need to signal this as a browser drop with metadata
              const result: DropResult = {
                type: "image",
                metadata: {
                  source: "browser",
                },
              };

              onDrop(result, e);
            } else {
              // Unknown drop type - ignore
              console.log("[useDropZone] Unknown drop type, ignoring", {
                types: Array.from(e.dataTransfer.types),
              });
            }
          }
        }
      } catch (error) {
        console.error("Error handling drop:", error);
        onError?.(error instanceof Error ? error.message : "Drop failed");
      }
    },
    [onDrop, validateFile, onError, retrieveFile, cleanup]
  );

  return {
    isDragging,
    dropProps: {
      onDragOver: handleDragOver,
      onDragLeave: handleDragLeave,
      onDrop: handleDrop,
    },
  };
};
