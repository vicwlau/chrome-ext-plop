import { useState } from "react";
import {
  prompt_api_with_image,
  type ImagePromptResult,
} from "@/provider/gemini-nano";
import type {
  SourceImageData,
  ElementImageData,
  GeneratedImageData,
} from "@/store/image-store";

/**
 * Token usage information
 */
export interface TokenInfo {
  used: number;
  quota: number;
  remaining: number;
  percentage: number;
}

/**
 * Hook for analyzing images using Chrome's built-in AI with multimodal support
 */
export function useImageAnalysis() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResponse, setLastResponse] = useState<string | null>(null);
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);

  /**
   * Analyze an image with a custom prompt
   */
  const analyzeImage = async (
    query: string,
    image: SourceImageData | ElementImageData | GeneratedImageData,
    trackTokens = true
  ): Promise<string | null> => {
    setIsAnalyzing(true);
    setError(null);

    try {
      console.log("[Image Analysis] Starting analysis...", {
        imageId: image.id,
        queryLength: query.length,
      });

      const result = await prompt_api_with_image(
        query,
        {
          // Use optimized version if available (better performance for large images)
          dataUrl: (image as any).apiDataUrl || image.dataUrl,
          id: image.id,
          name: "name" in image ? image.name : undefined,
        },
        trackTokens
      );

      let response: string;
      if (typeof result === "string") {
        response = result;
      } else {
        response = result.response;
        // Update token info
        setTokenInfo({
          used: result.tokensUsed,
          quota: result.tokensQuota,
          remaining: result.tokensRemaining,
          percentage: (result.tokensUsed / result.tokensQuota) * 100,
        });

        console.log("[Image Analysis] Token usage:", {
          used: result.tokensUsed,
          quota: result.tokensQuota,
          remaining: result.tokensRemaining,
        });
      }

      setLastResponse(response);
      console.log("[Image Analysis] ✅ Analysis complete");

      return response;
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Unknown error during image analysis";

      console.error("[Image Analysis] ❌ Failed:", errorMessage);
      setError(errorMessage);

      return null;
    } finally {
      setIsAnalyzing(false);
    }
  };

  /**
   * Describe an image (generic description)
   */
  const describeImage = async (
    image: SourceImageData | ElementImageData | GeneratedImageData
  ): Promise<string | null> => {
    return analyzeImage(
      "Describe this image in detail. What do you see?",
      image
    );
  };

  /**
   * Generate alt text for accessibility
   */
  const generateAltText = async (
    image: SourceImageData | ElementImageData | GeneratedImageData
  ): Promise<string | null> => {
    return analyzeImage(
      "Generate a concise alt text for this image, suitable for screen readers. Focus on the main subject and important visual details.",
      image
    );
  };

  /**
   * Identify main colors in the image
   */
  const identifyColors = async (
    image: SourceImageData | ElementImageData | GeneratedImageData
  ): Promise<string | null> => {
    return analyzeImage(
      "What are the dominant colors in this image? List the top 3-5 colors.",
      image
    );
  };

  /**
   * Suggest composition improvements
   */
  const suggestImprovements = async (
    image: SourceImageData | ElementImageData | GeneratedImageData
  ): Promise<string | null> => {
    return analyzeImage(
      "Analyze this image composition and suggest improvements. Consider balance, focal points, and visual hierarchy.",
      image
    );
  };

  /**
   * Extract text from image (OCR-like capability)
   */
  const extractText = async (
    image: SourceImageData | ElementImageData | GeneratedImageData
  ): Promise<string | null> => {
    return analyzeImage(
      "What text can you see in this image? Transcribe all visible text.",
      image
    );
  };

  /**
   * Clear the last response and error
   */
  const reset = () => {
    setLastResponse(null);
    setError(null);
    setTokenInfo(null);
  };

  return {
    // State
    isAnalyzing,
    error,
    lastResponse,
    tokenInfo,

    // Actions
    analyzeImage,
    describeImage,
    generateAltText,
    identifyColors,
    suggestImprovements,
    extractText,
    reset,
  };
}
