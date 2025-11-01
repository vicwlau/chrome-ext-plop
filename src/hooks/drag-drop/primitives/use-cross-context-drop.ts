import { useEffect, useState } from "react";
import type {
  ImageDragAvailableMessage,
  ImageMetadata,
} from "@/types/cross-context-messages-for-images";
import { isExtensionContext } from "@/lib/runtime-utils";

interface CrossContextDropData {
  imageUrl: string;
  imageData: string | null;
  metadata: ImageMetadata | null;
}

interface UseCrossContextDropOptions {
  onDragAvailable?: (data: CrossContextDropData) => void;
  onDragEnd?: () => void;
}

interface UseCrossContextDropReturn {
  isDragAvailable: boolean;
  dragData: CrossContextDropData | null;
  requestImageData: (imageUrl: string) => Promise<string | null>;
}

/**
 * Primitive hook for handling cross-context image drops from browser pages.
 * Listens for IMAGE_DRAG_AVAILABLE messages from background script.
 *
 * This hook does NOT interact with stores - it's a pure primitive.
 */
export function useCrossContextDrop({
  onDragAvailable,
  onDragEnd,
}: UseCrossContextDropOptions = {}): UseCrossContextDropReturn {
  const [isDragAvailable, setIsDragAvailable] = useState(false);
  const [dragData, setDragData] = useState<CrossContextDropData | null>(null);

  useEffect(() => {
    // Early return if not in extension context (e.g., standalone dev mode)
    if (!isExtensionContext()) {
      // Silently return - no need to log on every render in dev mode
      return;
    }

    const handleMessage = (message: any) => {
      if (message.type === "IMAGE_DRAG_AVAILABLE") {
        const msg = message as ImageDragAvailableMessage;
        const data: CrossContextDropData = {
          imageUrl: msg.imageUrl,
          imageData: msg.imageData || null,
          metadata: msg.metadata || null,
        };

        console.log("[useCrossContextDrop] Image drag available:", data);
        setIsDragAvailable(true);
        setDragData(data);
        onDragAvailable?.(data);
      } else if (message.type === "IMAGE_DRAG_END") {
        console.log("[useCrossContextDrop] Image drag ended");
        setIsDragAvailable(false);
        setDragData(null);
        onDragEnd?.();
      }
    };

    browser.runtime.onMessage.addListener(handleMessage);
    return () => browser.runtime.onMessage.removeListener(handleMessage);
  }, [onDragAvailable, onDragEnd]);

  /**
   * Request full image data from background (bypasses CORS)
   */
  const requestImageData = async (imageUrl: string): Promise<string | null> => {
    // Check if in extension context
    if (!isExtensionContext()) {
      console.warn(
        "[useCrossContextDrop] Cannot request image data - not in extension context"
      );
      return null;
    }

    try {
      console.log("[useCrossContextDrop] Requesting image data:", imageUrl);

      const response = await browser.runtime.sendMessage({
        type: "FETCH_IMAGE",
        imageUrl,
      });

      if (response?.dataUrl) {
        console.log("[useCrossContextDrop] Received image data");
        return response.dataUrl;
      }

      return null;
    } catch (error) {
      console.error("[useCrossContextDrop] Failed to fetch image:", error);
      return null;
    }
  };

  return {
    isDragAvailable,
    dragData,
    requestImageData,
  };
}
