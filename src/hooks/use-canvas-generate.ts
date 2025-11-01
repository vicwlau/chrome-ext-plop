import { useState, useMemo } from "react";
import { toast } from "sonner";
import useGenerateCompositionImage from "@/hooks/action-image-generation/use-generate-composition-image";
import {
  selectTotalOriginalSize,
  useImageStore,
  type ElementImageData,
  type SourceImageData,
} from "@/store/image-store";
import { getPlacementRecommendations } from "@/lib/interior-design-placement";

/**
 * Hook to handle canvas image generation logic
 */
export function useCanvasGenerate() {
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

  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const { composeImages, isLoading, error } = useGenerateCompositionImage();

  const totalSizeMB = useMemo(
    () => totalOriginalSize / (1024 * 1024),
    [totalOriginalSize]
  );

  const handleGenerate = async () => {
    if (!sourceImage) {
      toast.error(MESSAGES.ERROR_NO_SOURCE);
      return;
    }

    // Get elements that are positioned on canvas (from positionedInstances)
    const positionedElements = positionedInstances
      .map((instance) => elements.find((el) => el.id === instance.elementId))
      .filter((el): el is ElementImageData => el !== undefined);

    if (positionedInstances.length === 0) {
      toast.error(MESSAGES.ERROR_NO_POSITIONED_ELEMENTS);
      return;
    }

    // Log canvas state
    logCanvasState(sourceImage, elements, positionedElements);

    try {
      // Validate source image has file
      if (!sourceImage.file) {
        toast.error(MESSAGES.ERROR_SOURCE_FILE_MISSING);
        console.error(
          "[useCanvasGenerate] Source image has no file:",
          sourceImage
        );
        return;
      }

      // Filter positioned elements that have files
      const elementsWithFiles = positionedElements.filter(
        (el) => el.file !== null && el.file !== undefined
      );

      if (elementsWithFiles.length === 0) {
        toast.error(MESSAGES.ERROR_NO_VALID_FILES);
        console.error(
          "[useCanvasGenerate] Elements without files:",
          positionedElements
        );
        return;
      }

      if (elementsWithFiles.length < positionedElements.length) {
        const missingCount =
          positionedElements.length - elementsWithFiles.length;
        console.warn(
          `[useCanvasGenerate] ${missingCount} positioned element(s) missing files, proceeding with ${elementsWithFiles.length}`
        );
      }

      // Show loading toast
      toast.loading(MESSAGES.LOADING_ANALYZING, { id: "compose" });

      // Step 1: Get AI placement recommendations using Gemini Nano
      let placementRecommendations: string | undefined;
      let placementAnalysisTime: number | undefined;
      let placementTokensUsed: number | undefined;

      // try {
      //   setIsAnalyzing(true);
      //   toast.loading("Analyzing placement with Gemini Nano...", {
      //     id: "compose",
      //   });

      //   const analysisResult = await getPlacementRecommendations(
      //     sourceImage.file,
      //     elementsWithFiles.map((el) => el.file!)
      //   );

      //   placementRecommendations = analysisResult.recommendation;
      //   placementAnalysisTime = analysisResult.analysisTime;
      //   placementTokensUsed = analysisResult.tokensUsed;

      //   console.log(
      //     "[useCanvasGenerate] Placement analysis complete:",
      //     analysisResult
      //   );
      //   console.log(
      //     "[useCanvasGenerate] Recommendations:",
      //     placementRecommendations
      //   );

      //   toast.success(
      //     `AI recommendations ready (${analysisResult.analysisTime.toFixed(
      //       0
      //     )}ms, ${analysisResult.tokensUsed} tokens)`,
      //     { id: "compose", duration: 2000 }
      //   );
      // } catch (analysisError) {
      //   console.warn(
      //     "[useCanvasGenerate] Placement analysis failed, continuing without recommendations:",
      //     analysisError
      //   );
      //   toast.warning(
      //     "Placement analysis failed, generating without AI guidance",
      //     {
      //       id: "compose",
      //       duration: 2000,
      //     }
      //   );
      // } finally {
      //   setIsAnalyzing(false);
      // }

      // Step 2: Generate composition with AI recommendations
      toast.loading(MESSAGES.LOADING_ORGANIZING, { id: "compose" });

      // Prepare files: source image + positioned elements (already optimized by store)
      const files: File[] = [
        sourceImage.apiFile || sourceImage.file,
        ...elementsWithFiles.map((el) => el.apiFile || el.file!),
      ];

      // Prepare original size metadata for debug panel
      const originalSizes = [
        sourceImage.sizeInBytes,
        ...elementsWithFiles.map((el) => el.sizeInBytes),
      ];

      // Generate composition (images already optimized by store)
      const resultUrl = await composeImages({
        files,
        prompt:
          "Compose these images together with the elements positioned as specified",
        placementRecommendations, // Pass AI recommendations to backend
        placementAnalysisTime, // Pass analysis time for debug panel
        placementTokensUsed, // Pass token usage for debug panel
        originalSizes, // Pass original sizes for debug panel
      });

      toast.success(MESSAGES.SUCCESS_READY, { id: "compose" });

      // Save generated image to store
      const img = new Image();
      img.onload = async () => {
        // Add generated image to store
        await addGeneratedImage(
          resultUrl,
          { width: img.width, height: img.height },
          sourceImage.id,
          positionedElements.map((el) => el.id),
          "Compose these images together with the elements positioned as specified"
        );
        console.log(
          "[useCanvasGenerate] Generated image added to store:",
          img.width,
          "x",
          img.height
        );

        // Get the newly added generated image and set it as source
        const generatedImages = useImageStore.getState().generatedImages;
        const newlyGenerated = generatedImages[generatedImages.length - 1];

        if (newlyGenerated) {
          setSourceImageFromGenerated(newlyGenerated);
          // toast.success("generated!", {
          //   duration: 3000,
          // });
        }
      };
      img.onerror = () => {
        console.error("[useCanvasGenerate] Failed to load generated image");
      };
      img.src = resultUrl;
    } catch (err) {
      console.error("[useCanvasGenerate] Error:", err);
      toast.error(
        err instanceof Error ? err.message : MESSAGES.ERROR_GENERATION_FAILED,
        { id: "compose" }
      );
    }
  };

  return {
    handleGenerate,
    isLoading,
    isAnalyzing,
    error,
    totalSizeMB,
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
  positionedElements: ElementImageData[]
) {
  console.log("[useCanvasGenerate] ===== CANVAS STATE =====");
  console.log("[useCanvasGenerate] Source Image:", sourceImage);
  console.log("[useCanvasGenerate] All Elements:", elements);
  console.log(
    "[useCanvasGenerate] Positioned Elements on Canvas:",
    positionedElements
  );
  console.log("[useCanvasGenerate] Total Elements:", elements.length);
  console.log(
    "[useCanvasGenerate] Positioned Count:",
    positionedElements.length
  );
  console.log("[useCanvasGenerate] =============================");
}

// ------------------------------------------
// USER-FACING MESSAGES
// ------------------------------------------

const MESSAGES = {
  // Error messages
  ERROR_NO_SOURCE: "select a space first",
  ERROR_NO_POSITIONED_ELEMENTS: "plop some objects first",
  ERROR_SOURCE_FILE_MISSING: "space file is missing",
  ERROR_NO_VALID_FILES: "missing object files",
  ERROR_GENERATION_FAILED: "failed to create new space",

  // Loading messages
  LOADING_ANALYZING: "reviewing...",
  LOADING_ORGANIZING: "organizing plops...",

  // Success messages
  SUCCESS_READY: "ready!",

  // Commented out - AI analysis messages (currently disabled)
  // LOADING_ANALYZING_GEMINI: "Analyzing placement with Gemini Nano...",
  // SUCCESS_AI_READY: (time: number, tokens: number) => `AI recommendations ready (${time.toFixed(0)}ms, ${tokens} tokens)`,
  // WARNING_ANALYSIS_FAILED: "Placement analysis failed, generating without AI guidance",
  // SUCCESS_GENERATED: "generated!",
} as const;
