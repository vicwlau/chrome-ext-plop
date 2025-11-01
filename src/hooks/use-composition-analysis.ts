import { prompt_api_with_images } from "@/provider/gemini-nano";
import { useImageStore } from "@/store/image-store";
import { useState } from "react";

/**
 * Example hook for analyzing compositions with multiple images
 */
export function useCompositionAnalysis() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [tokenInfo, setTokenInfo] = useState<{
    used: number;
    quota: number;
    remaining: number;
  } | null>(null);

  /**
   * Analyze the composition with source image and all positioned elements
   */
  const analyzeComposition = async (customPrompt?: string) => {
    const sourceImage = useImageStore.getState().sourceImage;
    const elements = useImageStore.getState().elements;
    const positionedInstances = useImageStore.getState().positionedInstances;

    if (!sourceImage) {
      setError("No source image available");
      return null;
    }

    // Get unique positioned element IDs
    const positionedElementIds = new Set(
      positionedInstances.map((inst) => inst.elementId)
    );

    // Filter elements that are actually positioned
    const positionedElements = elements.filter((el) =>
      positionedElementIds.has(el.id)
    );

    if (positionedElements.length === 0) {
      setError("No elements positioned on canvas");
      return null;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      console.log("[Composition Analysis] Starting analysis...", {
        sourceImageId: sourceImage.id,
        elementCount: positionedElements.length,
        usingOptimized: !!sourceImage.apiDataUrl,
      });

      // Build images array: source + positioned elements (use optimized versions for API)
      const images = [
        {
          dataUrl: sourceImage.apiDataUrl || sourceImage.dataUrl,
          id: sourceImage.id,
          name: sourceImage.name,
        },
        ...positionedElements.map((el) => ({
          dataUrl: el.apiDataUrl || el.dataUrl,
          id: el.id,
        })),
      ];

      const prompt =
        customPrompt ||
        `Analyze this image composition. The first image is the base/source image, and 
        the following ${positionedElements.length} image(s) are elements that will be 
        composed onto it. Provide feedback on:
1. Visual harmony and balance
2. Color compatibility
3. Scale and proportion
4. Suggested placement improvements
5. Overall composition quality`;

      const response = await prompt_api_with_images(prompt, images, true);

      if (typeof response === "string") {
        setResult(response);
      } else {
        setResult(response.response);
        setTokenInfo({
          used: response.tokensUsed,
          quota: response.tokensQuota,
          remaining: response.tokensRemaining,
        });

        console.log("[Composition Analysis] Token usage:", {
          used: response.tokensUsed,
          quota: response.tokensQuota,
          remaining: response.tokensRemaining,
        });
      }

      console.log("[Composition Analysis] ✅ Analysis complete");
      return typeof response === "string" ? response : response.response;
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Unknown error during composition analysis";

      console.error("[Composition Analysis] ❌ Failed:", errorMessage);
      setError(errorMessage);
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  };

  /**
   * Compare source image with a specific element
   */
  const compareWithElement = async (elementId: string) => {
    const sourceImage = useImageStore.getState().sourceImage;
    const element = useImageStore
      .getState()
      .elements.find((el) => el.id === elementId);

    if (!sourceImage || !element) {
      setError("Missing source image or element");
      return null;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      // Use optimized versions for API call
      const images = [
        {
          dataUrl: sourceImage.apiDataUrl || sourceImage.dataUrl,
          id: sourceImage.id,
        },
        {
          dataUrl: element.apiDataUrl || element.dataUrl,
          id: element.id,
        },
      ];

      const prompt = `Compare these two images:
1. First image: Base/source image
2. Second image: Element to be composed

Analyze:
- Style compatibility
- Color scheme match
- Scale relationship
- Visual cohesion
- Recommended adjustments`;

      const response = await prompt_api_with_images(prompt, images, true);

      if (typeof response !== "string") {
        setResult(response.response);
        setTokenInfo({
          used: response.tokensUsed,
          quota: response.tokensQuota,
          remaining: response.tokensRemaining,
        });
        return response.response;
      }

      setResult(response);
      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(errorMessage);
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  };

  /**
   * Get suggestions for element positioning
   */
  const suggestPositioning = async () => {
    const sourceImage = useImageStore.getState().sourceImage;
    const elements = useImageStore.getState().elements;

    if (!sourceImage || elements.length === 0) {
      setError("Missing source image or elements");
      return null;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      // Use optimized versions for API call
      const images = [
        {
          dataUrl: sourceImage.apiDataUrl || sourceImage.dataUrl,
          id: sourceImage.id,
        },
        ...elements.map((el) => ({
          dataUrl: el.apiDataUrl || el.dataUrl,
          id: el.id,
        })),
      ];

      const prompt = `Given this base image (first) and these elements (rest), 
      suggest optimal positioning:
- Where should each element be placed?
- What size should each element be?
- What z-order/layering would work best?
- Any elements that shouldn't be used together?

Provide specific positioning recommendations.`;

      const response = await prompt_api_with_images(prompt, images, true);

      if (typeof response !== "string") {
        setResult(response.response);
        setTokenInfo({
          used: response.tokensUsed,
          quota: response.tokensQuota,
          remaining: response.tokensRemaining,
        });
        return response.response;
      }

      setResult(response);
      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(errorMessage);
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  };

  /**
   * Clear results
   */
  const reset = () => {
    setResult(null);
    setError(null);
    setTokenInfo(null);
  };

  return {
    // State
    isAnalyzing,
    error,
    result,
    tokenInfo,

    // Actions
    analyzeComposition,
    compareWithElement,
    suggestPositioning,
    reset,
  };
}
