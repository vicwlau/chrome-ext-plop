import { useState, useEffect, useCallback, useRef } from "react";
import { captureArea, dataUrlToFile } from "@/lib/capture-screenshot";
import { injectAreaSelectorOverlay } from "@/lib/inject-area-selector";
import { generateImageId } from "@/store/image-store";
import type {
  ImageAvailableMessage,
  RequestImageDataMessage,
  ImageDataResponseMessage,
  ImageDragAvailableMessage,
} from "@/types/cross-context-messages-for-images";

interface UseElementCaptureOptions {
  onElementCapture: (file: File, dataUrl: string) => void;
  elementCount: number;
  maxElements?: number;
}

export function useElementCapture({
  onElementCapture,
  elementCount,
  maxElements = 7,
}: UseElementCaptureOptions) {
  const [isCapturing, setIsCapturing] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [isDraggingExternal, setIsDraggingExternal] = useState(false);
  const [isProcessingDrop, setIsProcessingDrop] = useState(false);
  const [processingError, setProcessingError] = useState<string | null>(null);
  const [draggedImageData, setDraggedImageData] = useState<{
    imageUrl: string;
    imageData?: string | null;
  } | null>(null);

  const dropZoneRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMaxReached = elementCount >= maxElements;
  const hasElements = elementCount > 0;

  logger.info("Hook state", {
    elementCount,
    maxElements,
    isMaxReached,
    isDraggingExternal,
    hasDraggedImageData: !!draggedImageData,
  });

  // Handle file input
  const handleFileSelect = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0 || isMaxReached) return;

      const file = files[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        logger.action("File selected", {
          fileName: file.name,
          size: file.size,
        });
        onElementCapture(file, dataUrl);
      };
      reader.readAsDataURL(file);
    },
    [isMaxReached, onElementCapture]
  );

  // Handle area capture
  const handleCaptureArea = useCallback(async () => {
    if (isMaxReached) {
      logger.info("Capture blocked - max elements reached");
      return;
    }

    try {
      logger.capture("Starting area capture");
      setIsCapturing(true);

      const selection = await injectAreaSelectorOverlay();
      if (!selection) {
        logger.capture("Area capture cancelled");
        return;
      }

      logger.capture("Area selected", selection);
      await new Promise((resolve) => setTimeout(resolve, 100));

      const areaScreenshot = await captureArea(
        selection.x,
        selection.y,
        selection.width,
        selection.height,
        { format: "png" }
      );

      const imageId = generateImageId();
      const file = dataUrlToFile(areaScreenshot.dataUrl, `${imageId}.png`);

      logger.capture("Area captured", { name: file.name, size: file.size });
      onElementCapture(file, areaScreenshot.dataUrl);
    } catch (error) {
      logger.action("❌ Area capture error", error);
    } finally {
      setIsCapturing(false);
    }
  }, [isMaxReached, onElementCapture]);

  // Load image from background script
  const loadImageFromBackground = useCallback(
    async (imageId: string) => {
      if (isMaxReached) return;

      try {
        logger.action("Loading image from background", { imageId });

        const request: RequestImageDataMessage = {
          type: "REQUEST_IMAGE_DATA",
          imageId,
        };

        chrome.runtime.sendMessage(
          request,
          (response: ImageDataResponseMessage) => {
            if (response && response.type === "IMAGE_DATA_RESPONSE") {
              const imageId = generateImageId();
              const file = dataUrlToFile(response.dataUrl, `${imageId}.png`);
              onElementCapture(file, response.dataUrl);
            }
          }
        );
      } catch (error) {
        logger.action("❌ Error loading image", error);
      }
    },
    [isMaxReached, onElementCapture]
  );

  // Handle dragged image drop
  const handleDraggedImageDrop = useCallback(async () => {
    if (!draggedImageData || isMaxReached) return;

    // Start loading state
    setIsProcessingDrop(true);
    setProcessingError(null);

    // Set timeout for 5 seconds
    timeoutRef.current = setTimeout(() => {
      logger.action("⏱️ Image loading timeout");
      setProcessingError(
        "Image is taking too long to load. The image may be too large or the server is slow."
      );
      setIsProcessingDrop(false);
      setIsDraggingExternal(false);
      setDraggedImageData(null);
    }, 5000);

    try {
      logger.action("Processing external drop", draggedImageData);

      let dataUrl: string;

      if (draggedImageData.imageData) {
        dataUrl = draggedImageData.imageData;
        logger.action("Using provided image data");
      } else {
        logger.action("Fetching image from URL via background", {
          imageUrl: draggedImageData.imageUrl,
        });

        dataUrl = await new Promise((resolve, reject) => {
          chrome.runtime.sendMessage(
            {
              type: "FETCH_IMAGE",
              imageUrl: draggedImageData.imageUrl,
            },
            (response) => {
              if (response && response.dataUrl) {
                logger.action("Received fetched image data");
                resolve(response.dataUrl);
              } else {
                logger.action("❌ Failed to fetch image", response);
                reject(new Error("Failed to fetch image"));
              }
            }
          );
        });
      }

      // Clear timeout on success
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      const imageId = generateImageId();
      const file = dataUrlToFile(dataUrl, `${imageId}.png`);
      logger.action("Created file from dragged image", {
        name: file.name,
        size: file.size,
      });

      onElementCapture(file, dataUrl);

      // Clear loading state
      setIsProcessingDrop(false);
      setIsDraggingExternal(false);
      setDraggedImageData(null);
    } catch (error) {
      logger.action("❌ Error processing external drop", error);

      // Clear timeout on error
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      setProcessingError(
        error instanceof Error
          ? error.message
          : "Failed to load image. Please try again."
      );
      setIsProcessingDrop(false);
      setIsDraggingExternal(false);
      setDraggedImageData(null);
    }
  }, [draggedImageData, isMaxReached, onElementCapture]);

  // Handle drag and drop using native events
  const handleDragOver = useCallback(
    (e: DragEvent) => {
      logger.info("Native drag over event", {
        isMaxReached,
        isDraggingExternal,
      });
      if (isMaxReached) return;
      e.preventDefault();
      e.stopPropagation();
      setIsDraggingOver(true);
    },
    [isMaxReached, isDraggingExternal]
  );

  const handleDragLeave = useCallback((e: DragEvent) => {
    logger.info("Native drag leave event");
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  }, []);

  const handleDrop = useCallback(
    async (e: DragEvent) => {
      logger.action("🎯 NATIVE DROP EVENT FIRED!", {
        isMaxReached,
        isDraggingExternal,
        hasDraggedImageData: !!draggedImageData,
        filesCount: e.dataTransfer?.files.length || 0,
      });

      e.preventDefault();
      e.stopPropagation();
      setIsDraggingOver(false);

      if (isMaxReached) return;

      // Handle external image drops
      if (isDraggingExternal && draggedImageData) {
        logger.action("🎯 Handling external image drop", draggedImageData);
        await handleDraggedImageDrop();
        return;
      }

      // Handle file drops
      const files = e.dataTransfer?.files;
      if (files && files.length > 0) {
        logger.action("Handling file drop", { fileCount: files.length });
        handleFileSelect(files);
      } else {
        logger.action("⚠️ No files in drop, checking for external drag state");
      }
    },
    [
      isMaxReached,
      isDraggingExternal,
      draggedImageData,
      handleDraggedImageDrop,
      handleFileSelect,
    ]
  );

  // Handle click on overlay when external drag is available
  const handleOverlayClick = useCallback(async () => {
    if (isDraggingExternal && draggedImageData) {
      logger.action("🖱️ User clicked overlay with dragged image");
      await handleDraggedImageDrop();
    }
  }, [isDraggingExternal, draggedImageData, handleDraggedImageDrop]);

  // Attach native DOM event listeners for drag and drop
  useEffect(() => {
    const dropZone = dropZoneRef.current;
    if (!dropZone) return;

    logger.info("Attaching native drag event listeners");

    dropZone.addEventListener("dragover", handleDragOver as any);
    dropZone.addEventListener("dragleave", handleDragLeave as any);
    dropZone.addEventListener("drop", handleDrop as any);

    return () => {
      logger.info("Removing native drag event listeners");
      dropZone.removeEventListener("dragover", handleDragOver as any);
      dropZone.removeEventListener("dragleave", handleDragLeave as any);
      dropZone.removeEventListener("drop", handleDrop as any);
    };
  }, [handleDragOver, handleDragLeave, handleDrop]);

  // Listen for external image drag messages
  useEffect(() => {
    logger.info("Setting up message listener");

    const messageListener = (message: any) => {
      logger.info("Received message", { type: message.type });

      if (message.type === "IMAGE_AVAILABLE") {
        const msg = message as ImageAvailableMessage;
        logger.action("Image available from context menu", {
          imageId: msg.imageId,
        });
        if (!isMaxReached) {
          loadImageFromBackground(msg.imageId);
        }
      } else if (message.type === "IMAGE_DRAG_AVAILABLE") {
        const msg = message as ImageDragAvailableMessage;
        logger.action("🎯 External drag detected!", {
          imageUrl: msg.imageUrl,
          hasImageData: !!msg.imageData,
          isMaxReached,
        });
        if (!isMaxReached) {
          setIsDraggingExternal(true);
          setDraggedImageData({
            imageUrl: msg.imageUrl,
            imageData: msg.imageData,
          });
        }
      } else if (message.type === "IMAGE_DRAG_END") {
        logger.action("🏁 External drag ended");
        setIsDraggingExternal(false);
        setDraggedImageData(null);
      }
    };

    chrome.runtime.onMessage.addListener(messageListener);
    logger.info("Message listener registered");

    return () => {
      chrome.runtime.onMessage.removeListener(messageListener);
      logger.info("Message listener removed");
    };
  }, [isMaxReached, loadImageFromBackground]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        logger.info("Cleared timeout on unmount");
      }
    };
  }, []);

  return {
    // State
    isCapturing,
    isDraggingOver,
    isDraggingExternal,
    isProcessingDrop,
    processingError,
    isMaxReached,
    hasElements,
    elementCount,
    maxElements,

    // Refs
    dropZoneRef,

    // Handlers
    handleFileSelect,
    handleCaptureArea,
    handleOverlayClick,
  };
}

const logger = {
  info: (message: string, data?: any) => {
    console.log(`[ElementCapture] ℹ️ ${message}`, data || "");
  },
  action: (message: string, data?: any) => {
    console.log(`[ElementCapture] ⚡ ${message}`, data || "");
  },
  capture: (message: string, data?: any) => {
    console.log(`[ElementCapture] 📸 ${message}`, data || "");
  },
};
