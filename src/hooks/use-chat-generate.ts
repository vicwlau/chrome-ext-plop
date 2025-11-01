import { useState, useMemo } from "react";
import { toast } from "sonner";
import useGenerateCompositionImage from "@/hooks/action-image-generation/use-generate-composition-image";
import {
  selectTotalOriginalSize,
  useImageStore,
  type ElementImageData,
  type SourceImageData,
} from "@/store/image-store";
import { useAppStore } from "@/store/app-store";
import { useChatStore } from "@/store/chat-store";

/**
 * Hook to handle chat-based image generation
 * Users can enter a prompt to generate an image based on current source and positioned elements
 */
export function useChatGenerate() {
  const sourceImage = useImageStore((state) => state.sourceImage);
  const elements = useImageStore((state) => state.elements);
  const positionedInstances = useImageStore(
    (state) => state.positionedInstances
  );
  const totalOriginalSize = useImageStore(selectTotalOriginalSize);
  const addGeneratedImage = useImageStore((state) => state.addGeneratedImage);
  const setSourceImageFromGenerated = useImageStore(
    (state) => state.setSourceImageFromGenerated
  );

  // App store for checking processing state
  const isBusy = useAppStore(
    (state) =>
      state.interaction.type !== "idle" && state.interaction.type !== "error"
  );
  const isGenerating = useAppStore(
    (state) => state.interaction.type === "generating"
  );

  // Chat store for managing messages
  const currentSessionId = useChatStore((state) => state.currentSessionId);
  const addMessage = useChatStore((state) => state.addMessage);
  const setIsProcessing = useChatStore((state) => state.setIsProcessing);
  const setError = useChatStore((state) => state.setError);

  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const { composeImages, isLoading, error } = useGenerateCompositionImage();

  const totalSizeMB = useMemo(
    () => totalOriginalSize / (1024 * 1024),
    [totalOriginalSize]
  );

  /**
   * Validates that the canvas has required images
   * Elements are optional - if no elements, we'll modify just the source image
   */
  const validateCanvas = (): {
    isValid: boolean;
    error?: string;
  } => {
    if (!sourceImage) {
      return {
        isValid: false,
        error: MESSAGES.ERROR_NO_SOURCE,
      };
    }

    return { isValid: true };
  };

  /**
   * Checks if the system is ready to generate
   */
  const canGenerate = useMemo(() => {
    if (isBusy || isGenerating || isLoading || isAnalyzing) {
      return false;
    }

    const validation = validateCanvas();
    return validation.isValid;
  }, [
    isBusy,
    isGenerating,
    isLoading,
    isAnalyzing,
    sourceImage,
    positionedInstances,
  ]);

  /**
   * Generates an image based on user prompt
   */
  const handleChatGenerate = async (userPrompt: string) => {
    // Validate canvas state
    const validation = validateCanvas();
    if (!validation.isValid) {
      toast.error(validation.error);
      setError(validation.error || null);
      return;
    }

    // Check if system is busy
    if (isBusy || isGenerating) {
      const errorMsg = MESSAGES.ERROR_SYSTEM_BUSY;
      toast.error(errorMsg);
      setError(errorMsg);
      return;
    }

    if (!sourceImage) {
      toast.error(MESSAGES.ERROR_NO_SOURCE_SIMPLE);
      return;
    }

    // Get elements that are positioned on canvas
    const positionedElements = positionedInstances
      .map((instance) => elements.find((el) => el.id === instance.elementId))
      .filter((el): el is ElementImageData => el !== undefined);

    // Log canvas state
    logCanvasState(sourceImage, elements, positionedElements, userPrompt);

    // Add user message to chat if we have a session
    let userMessageId: string | undefined;
    if (currentSessionId) {
      userMessageId = addMessage(currentSessionId, "user", userPrompt);
    }

    try {
      // Mark chat as processing
      setIsProcessing(true);
      setError(null);

      // Validate source image has file
      if (!sourceImage.file) {
        toast.error(MESSAGES.ERROR_SOURCE_FILE_MISSING);
        console.error(
          "[useChatGenerate] Source image has no file:",
          sourceImage
        );
        return;
      }

      // Filter positioned elements that have files
      const elementsWithFiles = positionedElements.filter(
        (el) => el.file !== null && el.file !== undefined
      );

      if (elementsWithFiles.length < positionedElements.length) {
        const missingCount =
          positionedElements.length - elementsWithFiles.length;
        console.warn(
          `[useChatGenerate] ${missingCount} positioned element(s) missing files, proceeding with ${elementsWithFiles.length}`
        );
      }

      // Determine the mode: composition (with elements) or modification (source only)
      const hasElements = elementsWithFiles.length > 0;
      const mode = hasElements ? "composition" : "modification";

      console.log(
        `[useChatGenerate] Generation mode: ${mode} (${
          hasElements ? `${elementsWithFiles.length} elements` : "source only"
        })`
      );

      // Show loading toast with appropriate message
      const loadingMessage = hasElements
        ? MESSAGES.LOADING_WITH_ELEMENTS
        : MESSAGES.LOADING_SOURCE_ONLY;
      toast.loading(loadingMessage, { id: "chat-compose" });

      // Prepare files: source image (+ positioned elements if any)
      const files: File[] = [
        sourceImage.apiFile || sourceImage.file,
        ...elementsWithFiles.map((el) => el.apiFile || el.file!),
      ];

      // Prepare original size metadata for debug panel
      const originalSizes = [
        sourceImage.sizeInBytes,
        ...elementsWithFiles.map((el) => el.sizeInBytes),
      ];

      // Generate composition with user's custom prompt
      const resultUrl = await composeImages({
        files,
        prompt: userPrompt, // Use user's prompt directly
        originalSizes, // Pass original sizes for debug panel
        combineElements: hasElements, // Only combine if we have elements
        promptType: "user-generated", // Use user-generated prompt type for chat
      });

      const successMessage = hasElements
        ? MESSAGES.SUCCESS_WITH_ELEMENTS
        : MESSAGES.SUCCESS_SOURCE_MODIFIED;

      toast.success(successMessage, {
        id: "chat-compose",
      });

      // Save generated image to store
      const img = new Image();
      img.onload = async () => {
        // Add generated image to store
        await addGeneratedImage(
          resultUrl,
          { width: img.width, height: img.height },
          sourceImage.id,
          positionedElements.map((el) => el.id),
          userPrompt // Save the user's prompt
        );
        console.log(
          "[useChatGenerate] Generated image added to store:",
          img.width,
          "x",
          img.height
        );

        // Get the newly added generated image and set it as source
        const generatedImages = useImageStore.getState().generatedImages;
        const newlyGenerated = generatedImages[generatedImages.length - 1];

        if (newlyGenerated) {
          setSourceImageFromGenerated(newlyGenerated);
          //   toast.success(MESSAGES.SUCCESS_SET_AS_SOURCE, {
          //     duration: 3000,
          //   });

          // Add assistant message with success response
          if (currentSessionId) {
            // addMessage(currentSessionId, "assistant", MESSAGES.CHAT_SUCCESS);
          }
        }
      };
      img.onerror = () => {
        console.error("[useChatGenerate] Failed to load generated image");
        toast.error(MESSAGES.ERROR_IMAGE_LOAD_FAILED);

        // Add error message to chat
        if (currentSessionId) {
          addMessage(currentSessionId, "assistant", MESSAGES.CHAT_ERROR_LOAD);
        }
      };
      img.src = resultUrl;
    } catch (err) {
      console.error("[useChatGenerate] Error:", err);
      const errorMsg =
        err instanceof Error ? err.message : MESSAGES.ERROR_GENERATION_FAILED;

      toast.error(errorMsg, { id: "chat-compose" });
      setError(errorMsg);

      // Add error message to chat
      if (currentSessionId) {
        addMessage(
          currentSessionId,
          "assistant",
          MESSAGES.CHAT_ERROR_GENERATION(errorMsg)
        );
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    handleChatGenerate,
    isLoading: isLoading || isAnalyzing,
    error,
    canGenerate,
    totalSizeMB,
    validation: validateCanvas(),
  };
}

// ------------------------------------------
// HELPER FUNCTIONS
// ------------------------------------------

/**
 * Logs the current canvas state for debugging
 */
function logCanvasState(
  sourceImage: SourceImageData,
  elements: ElementImageData[],
  positionedElements: ElementImageData[],
  userPrompt: string
) {
  console.log("[useChatGenerate] ===== CHAT GENERATION REQUEST =====");
  console.log("[useChatGenerate] User Prompt:", userPrompt);
  console.log("[useChatGenerate] Source Image:", sourceImage);
  console.log("[useChatGenerate] All Elements:", elements);
  console.log(
    "[useChatGenerate] Positioned Elements on Canvas:",
    positionedElements
  );
  console.log("[useChatGenerate] Total Elements:", elements.length);
  console.log("[useChatGenerate] Positioned Count:", positionedElements.length);
  console.log("[useChatGenerate] =============================");
}

// ------------------------------------------
// USER-FACING MESSAGES
// ------------------------------------------

const MESSAGES = {
  // Error messages
  ERROR_NO_SOURCE: "select a space first",
  ERROR_SYSTEM_BUSY: "system is currently processing. please wait...",
  ERROR_NO_SOURCE_SIMPLE: "missing space file",
  ERROR_SOURCE_FILE_MISSING: "missing space file",
  ERROR_IMAGE_LOAD_FAILED: "failed to load image",
  ERROR_GENERATION_FAILED: "failed to update space",

  // Loading messages
  LOADING_WITH_ELEMENTS: "updating space with your objects...",
  LOADING_SOURCE_ONLY: "updating space...",

  // Success messages
  SUCCESS_WITH_ELEMENTS: "new space is ready!",
  SUCCESS_SOURCE_MODIFIED: "new space is ready!",

  // Chat assistant messages
  // not used currently
  CHAT_SUCCESS:
    "✨ I've generated the image based on your prompt and set it as the new source image!",
  CHAT_ERROR_LOAD: "❌ Failed to load the generated image. Please try again.",
  CHAT_ERROR_GENERATION: (errorMsg: string) =>
    `❌ Failed to generate image: ${errorMsg}`,
} as const;
