import { combineImagesToGrid } from "@/lib/combine-images-to-grid";
import { calculateTotalSize } from "@/lib/image-optimizer";
import { useState } from "react";
import type { PromptType } from "@/backend/compose/types";

interface ComposeImagesParams {
  files: File[];
  prompt: string;
  combineElements?: boolean; // Whether to combine multiple elements into a grid (default: true for 3+ elements)
  placementRecommendations?: string; // Optional AI placement recommendations from Gemini Nano
  placementAnalysisTime?: number; // Time taken for placement analysis (ms)
  placementTokensUsed?: number; // Tokens used in placement analysis
  originalSizes?: number[]; // Original file sizes before optimization (in bytes)
  promptType?: PromptType; // Type of prompt to use (default: "pure-composition")
}

// ------------------------------------------
// HOOK
// ------------------------------------------

/*
  main method to invoke llm api to generate composition image
*/
export default function useGenerateCompositionImage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const composeImages = async ({
    files,
    prompt,
    combineElements = true, // Default to true for better performance with 3+ elements
    placementRecommendations, // Optional AI placement recommendations from Gemini Nano
    placementAnalysisTime,
    placementTokensUsed,
    originalSizes, // Original file sizes before optimization
    promptType = "pure-composition", // Default to pure-composition
  }: ComposeImagesParams): Promise<string> => {
    if (files.length < 1) {
      const error = "At least 1 image required";
      setError(error);
      throw new Error(error);
    }

    setIsLoading(true);
    setError(null);

    // Generate unique ID
    const compositionId = generateCompositionId();

    try {
      // Separate source image (first) from element images (rest)
      const [sourceFile, ...elementFiles] = files;

      console.log(
        `[Compose] Source: ${sourceFile.name}, Elements: ${elementFiles.length}`
      );

      console.log(
        `[Compose] Source: ${sourceFile.name}, Elements: ${elementFiles.length}`
      );

      // Decide whether to combine elements into a grid
      // Combine if: enabled AND we have 3+ total images (source + 2+ elements)
      const shouldCombineElements = combineElements && elementFiles.length >= 2;

      let finalFiles: File[];
      let combinedGridFile: File | undefined;

      if (shouldCombineElements) {
        console.log(
          `[Compose] Combining ${elementFiles.length} elements into grid...`
        );

        // Combine all element images into a single grid using default config
        combinedGridFile = await combineImagesToGrid(elementFiles);

        // Final files: [source, combinedGrid]
        finalFiles = [sourceFile, combinedGridFile];

        console.log(
          `[Compose] Grid created, now sending 2 images instead of ${files.length}`
        );
      } else {
        // Use files as-is
        finalFiles = files;
        console.log(`[Compose] Using ${files.length} images directly`);
      }

      // Log composition start with grid metadata
      debugCompositionStart(compositionId, finalFiles, prompt, {
        isGridCombined: shouldCombineElements,
        originalElementCount: elementFiles.length,
        combinedGridFile: combinedGridFile,
        placementRecommendations,
        placementAnalysisTime,
        placementTokensUsed,
        originalSizes, // Pass original sizes for comparison
      });

      // Calculate total size for logging
      // Note: Files are already optimized by image-store before being passed here
      const totalSize = calculateTotalSize(finalFiles);
      const totalSizeMB = totalSize / (1024 * 1024);

      console.log(`[Compose] Total payload size: ${totalSizeMB.toFixed(2)}MB`, {
        fileCount: finalFiles.length,
        fileSizes: finalFiles.map(
          (f) => `${(f.size / 1024 / 1024).toFixed(2)}MB`
        ),
        note: "Files are pre-optimized by image-store",
      });

      // Hard limit check (20MB absolute max for API)
      if (totalSize > 20 * 1024 * 1024) {
        throw new Error(
          `Payload too large: ${(totalSize / 1024 / 1024).toFixed(
            1
          )}MB. Maximum is 20MB.`
        );
      }

      // Send to API
      const formData = new FormData();
      finalFiles.forEach((file) => {
        formData.append("images", file);
      });
      formData.append("prompt", prompt);
      formData.append("promptType", promptType);
      if (shouldCombineElements) {
        formData.append("isGridCombined", "true");
      }
      if (placementRecommendations) {
        formData.append("placementRecommendations", placementRecommendations);
        console.log(
          "[Compose] Including AI placement recommendations in request"
        );
      }

      console.log(`[Compose] Using prompt type: ${promptType}`);

      const response = await fetch("http://localhost:3001/api/compose-images", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to compose images");
      }

      const data = await response.json();

      // Log success to debug panel with token information
      debugCompositionSuccess(compositionId, data.imageUrl, data.usageMetadata);

      return data.imageUrl;
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Composition failed";
      setError(errorMsg);

      // Log error to debug panel
      debugCompositionError(compositionId, errorMsg);

      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return { composeImages, isLoading, error };
}

// ------------------------------------------
// DEBUG UTILITIES
// ------------------------------------------

/**
 * Generates a unique ID for tracking composition requests
 */
function generateCompositionId(): string {
  return `composition-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Logs the start of a composition to the debug panel
 */
function debugCompositionStart(
  id: string,
  files: File[],
  prompt: string,
  metadata?: {
    isGridCombined?: boolean;
    originalElementCount?: number;
    combinedGridFile?: File;
    placementRecommendations?: string;
    placementAnalysisTime?: number;
    placementTokensUsed?: number;
    originalSizes?: number[]; // Original file sizes before optimization
  }
): void {
  if (typeof (window as any).__debugImageComposition === "function") {
    (window as any).__debugImageComposition(files, prompt, id, metadata);
  }
}

/**
 * Logs a successful composition to the debug panel
 */
function debugCompositionSuccess(
  id: string,
  resultUrl: string,
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  }
): void {
  if (typeof (window as any).__debugImageCompositionUpdate === "function") {
    (window as any).__debugImageCompositionUpdate(id, "success", {
      resultUrl,
      usageMetadata,
    });
  }
}

/**
 * Logs a failed composition to the debug panel
 */
function debugCompositionError(id: string, error: string): void {
  if (typeof (window as any).__debugImageCompositionUpdate === "function") {
    (window as any).__debugImageCompositionUpdate(id, "error", {
      error,
    });
  }
}
