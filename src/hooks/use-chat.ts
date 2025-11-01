import { useCallback, useMemo } from "react";
import { useChatStore } from "@/store/chat-store";
import {
  prompt_api_streaming,
  prompt_api_with_image_streaming,
  prompt_api_with_images_streaming,
} from "@/provider/gemini-nano";
import {
  useImageStore,
  selectSourceImageForApi,
  selectElementsForApi,
} from "@/store/image-store";

/**
 * Options for including images in chat messages
 */
export interface ChatImageContext {
  /** Include the source image in the prompt */
  includeSource?: boolean;
  /** Include element images in the prompt */
  includeElements?: boolean;
  /** Include positioned elements (on canvas) with their coordinates */
  includePositionedElements?: boolean;
  /**
   * If true, destroys the Gemini session after response (default: false to preserve conversation context)
   *
   * @example
   * // Default behavior - preserves conversation history
   * sendMessage("What do you see?", { includeSource: true });
   *
   * // Include positioned elements with coordinates
   * sendMessage("How do these look?", { includeSource: true, includePositionedElements: true });
   *
   * // Explicitly clear session after response
   * sendMessage("Analyze this", { includeSource: true, clearSession: true });
   */
  clearSession?: boolean;
}

export function useChat() {
  const {
    addMessage,
    updateMessage,
    setIsProcessing,
    setError,
    currentSessionId,
  } = useChatStore();

  // Access image store - these return stable references from the store
  const sourceImage = useImageStore(selectSourceImageForApi);
  const elements = useImageStore(selectElementsForApi);
  const positionedInstances = useImageStore(
    (state) => state.positionedInstances
  );

  // Memoize the API-optimized versions based on IDs to prevent re-renders
  const sourceImageForApi = useMemo(() => {
    if (!sourceImage) return null;
    return {
      id: sourceImage.id,
      dataUrl: sourceImage.apiDataUrl || sourceImage.dataUrl,
    };
  }, [sourceImage?.id, sourceImage?.apiDataUrl, sourceImage?.dataUrl]);

  const elementsForApi = useMemo(() => {
    return elements.map((el) => ({
      id: el.id,
      dataUrl: el.apiDataUrl || el.dataUrl,
    }));
  }, [elements]); // elements array reference is stable from Zustand

  const sendMessage = useCallback(
    async (message: string, imageContext?: ChatImageContext) => {
      if (!currentSessionId) {
        console.error("[useChat] No active session");
        setError("No active chat session");
        return;
      }

      if (!message.trim()) {
        console.warn("[useChat] Empty message, skipping");
        return;
      }

      try {
        setIsProcessing(true);
        setError(null);

        // Add user message immediately
        addMessage(currentSessionId, "user", message);

        console.log("[useChat] Sending message to Gemini Nano (streaming):", {
          message,
          includeSource: imageContext?.includeSource,
          includeElements: imageContext?.includeElements,
          clearSession: imageContext?.clearSession ?? false,
          usingOptimizedImages: !!(sourceImageForApi || elementsForApi?.length),
        });

        // Determine which API to use based on image context
        const shouldIncludeSource =
          imageContext?.includeSource && sourceImageForApi;
        const shouldIncludeElements =
          imageContext?.includeElements &&
          elementsForApi &&
          elementsForApi.length > 0;
        const shouldIncludePositioned =
          imageContext?.includePositionedElements &&
          positionedInstances &&
          positionedInstances.length > 0;

        // Session management: default is to KEEP session alive (preserve conversation context)
        // Only destroy if explicitly requested via clearSession: true
        const keepSessionAlive = !(imageContext?.clearSession ?? false);

        // Build the images array
        let allImages: Array<{
          dataUrl: string;
          id: string;
          name?: string;
        }> = [];
        let enhancedMessage = message;

        // Add source image if requested
        if (shouldIncludeSource) {
          allImages.push({
            dataUrl: sourceImageForApi!.dataUrl,
            id: sourceImageForApi!.id || "source",
            name: "Source Image / Canvas Base",
          });
        }

        // Add positioned elements if requested
        if (shouldIncludePositioned) {
          console.log(
            `[useChat] Including ${positionedInstances.length} positioned elements with coordinates...`
          );

          // Get full element data for positioned instances
          const allElements = useImageStore.getState().elements;

          // Match positioned instances with their element data
          const positionedElements = positionedInstances
            .map((instance) => {
              const element = allElements.find(
                (el) => el.id === instance.elementId
              );
              if (!element) return null;
              return {
                instance,
                element,
              };
            })
            .filter((item): item is NonNullable<typeof item> => item !== null);

          // Add each positioned element as a separate image for clarity
          positionedElements.forEach(({ instance, element }, idx) => {
            const xPercent = Math.round(instance.position.x * 100);
            const yPercent = Math.round(instance.position.y * 100);

            allImages.push({
              dataUrl: element.apiDataUrl || element.dataUrl,
              id: element.id,
              name: `Element ${
                idx + 1
              } (positioned at ${xPercent}%, ${yPercent}%)`,
            });
          });

          // Add detailed position descriptions to the prompt
          const positionDescriptions = positionedElements.map(
            ({ instance }, idx) => {
              const xPercent = Math.round(instance.position.x * 100);
              const yPercent = Math.round(instance.position.y * 100);

              return `Element ${
                idx + 1
              }: positioned at (${xPercent}%, ${yPercent}%) on the canvas`;
            }
          );

          enhancedMessage = `${message}

POSITIONED ELEMENTS ON CANVAS:
${positionDescriptions.join("\n")}

Note: The images show each element individually. The percentages indicate where each element is positioned on the canvas (0%=left/top, 100%=right/bottom).`;

          console.log(
            `[useChat] Added ${positionedElements.length} positioned elements with coordinate information`
          );
        } else if (shouldIncludeElements) {
          // Include regular elements (without position info) if not using positioned
          allImages.push(
            ...elementsForApi.map((el, idx) => ({
              dataUrl: el.dataUrl,
              id: el.id,
              name: `Element ${idx + 1}`,
            }))
          );
        }

        console.log(
          `[useChat] Streaming with ${allImages.length} images (positioned: ${shouldIncludePositioned})`
        );

        // Create an empty assistant message to stream into
        const assistantMessageId = addMessage(
          currentSessionId,
          "assistant",
          ""
        );
        let fullResponse = "";

        let stream: ReadableStream<string>;

        if (allImages.length > 0) {
          // Use multi-image streaming API with all images (source + positioned grid + elements)
          stream = await prompt_api_with_images_streaming(
            enhancedMessage,
            allImages,
            {
              keepSessionAlive,
            }
          );
        } else {
          // Text-only message
          console.log("[useChat] Streaming text-only message");
          stream = await prompt_api_streaming(enhancedMessage);
        }

        // Stream the response and update the message incrementally
        for await (const chunk of stream) {
          fullResponse += chunk;
          updateMessage(currentSessionId, assistantMessageId, fullResponse);
        }

        console.log("[useChat] Stream complete:", fullResponse);
      } catch (error) {
        console.error("[useChat] Error during message processing:", error);
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error occurred";
        setError(errorMessage);

        // Add error message to chat
        addMessage(
          currentSessionId,
          "assistant",
          `Error: ${errorMessage}. Please try again.`
        );
      } finally {
        setIsProcessing(false);
      }
    },
    [
      currentSessionId,
      addMessage,
      updateMessage,
      setIsProcessing,
      setError,
      sourceImageForApi,
      elementsForApi,
      positionedInstances,
    ]
  );

  return {
    sendMessage,
    isProcessing: useChatStore((state) => state.isProcessing),
    error: useChatStore((state) => state.error),
  };
}

/**
 * Helper function to convert File to data URL
 */
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
