/**
 * Interior Design Placement Recommendations
 * Uses Gemini Nano (local AI) to analyze images and recommend object placements
 */

import { prompt_api_with_images } from "@/provider/gemini-nano";
import {
  combineImagesToGrid,
  GRID_COMBINE_CONFIG,
} from "./combine-images-to-grid";

/**
 * Configuration for placement analysis
 */
export const PLACEMENT_ANALYSIS_CONFIG = {
  // Use smaller dimensions for faster analysis with Gemini Nano
  gridMaxWidth: 2048,
  gridMaxHeight: 2048,
  gridQuality: 0.85,
} as const;

export interface PlacementRecommendation {
  recommendation: string; // Concise placement instructions
  analysisTime: number; // Time taken in ms
  tokensUsed?: number; // Tokens consumed by Gemini Nano
  error?: string; // Error message if analysis fails
}

/**
 * Analyzes source image and elements, returns concise placement recommendations
 *
 * @param sourceFile - The base/source image (e.g., room photo)
 * @param elementFiles - Array of element images to place
 * @returns Concise placement recommendations for composition
 */
export async function getPlacementRecommendations(
  sourceFile: File,
  elementFiles: File[]
): Promise<PlacementRecommendation> {
  const startTime = performance.now();

  console.log(
    `[Placement] Analyzing source + ${elementFiles.length} elements using Gemini Nano`
  );

  try {
    // Combine element images into a grid for efficient analysis
    const elementsGrid = await combineImagesToGrid(elementFiles, {
      maxWidth: PLACEMENT_ANALYSIS_CONFIG.gridMaxWidth,
      maxHeight: PLACEMENT_ANALYSIS_CONFIG.gridMaxHeight,
      quality: PLACEMENT_ANALYSIS_CONFIG.gridQuality,
    });

    console.log(`[Placement] Elements combined into grid for analysis`);

    // Convert files to data URLs for Gemini Nano
    const sourceDataUrl = await fileToDataUrl(sourceFile);
    const elementsDataUrl = await fileToDataUrl(elementsGrid);

    // Call Gemini Nano for placement analysis
    const result = await analyzeWithGeminiNano(
      sourceDataUrl,
      elementsDataUrl,
      elementFiles.length
    );

    const analysisTime = performance.now() - startTime;

    console.log(
      `[Placement] Analysis complete in ${analysisTime.toFixed(0)}ms`
    );
    console.log(`[Placement] Recommendation:`, result.recommendation);

    return {
      recommendation: result.recommendation,
      analysisTime,
      tokensUsed: result.tokensUsed,
    };
  } catch (error) {
    const analysisTime = performance.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    console.error("[Placement] Analysis failed:", errorMessage);

    // Return fallback placement
    const fallback = generateFallbackPlacement(elementFiles.length);

    return {
      recommendation: fallback,
      analysisTime,
      error: errorMessage,
    };
  }
}

/**
 * Analyzes images using Gemini Nano multimodal API
 */
async function analyzeWithGeminiNano(
  sourceDataUrl: string,
  elementsDataUrl: string,
  elementCount: number
): Promise<{ recommendation: string; tokensUsed: number }> {
  console.log(
    `[Placement] Calling Gemini Nano for interior design analysis...`
  );

  // Create image objects for Gemini Nano
  const images = [
    {
      dataUrl: sourceDataUrl,
      id: "source-room",
      name: "Room/Space",
    },
    {
      dataUrl: elementsDataUrl,
      id: "elements-grid",
      name: "Furniture/Decor Grid",
    },
  ];

  // return {
  //   recommendation:
  //     "you are a professional interior designer, place the objects thoughtfully within the space.",
  //   tokensUsed: 0,
  // };

  // Create the analysis prompt
  const prompt = createPlacementPrompt(elementCount);

  // Call Gemini Nano with images
  const result = await prompt_api_with_images(prompt, images, true);

  // Extract response and token info
  if (typeof result === "string") {
    // Backward compatibility - shouldn't happen with returnTokenInfo=true
    return {
      recommendation: result,
      tokensUsed: 0,
    };
  }

  return {
    recommendation: result.response,
    tokensUsed: result.tokensUsed,
  };
}

/**
 * Creates the prompt for placement analysis
 */
function createPlacementPrompt(elementCount: number): string {
  // Create numbered list based on actual element count
  const exampleFormat = Array.from(
    { length: elementCount },
    (_, i) => `Object ${i + 1}: [specific location and positioning]`
  ).join("\n");

  return `You are a professional interior designer analyzing placement opportunities.

TASK:
Analyze IMAGE 1 (the room/space) and IMAGE 2 (a grid containing ${elementCount} furniture/decor items).
Provide concise placement recommendations for each item.

IMAGE 1: The base room or interior space
IMAGE 2: Grid with ${elementCount} items 

GUIDELINES:
- Provide clear, one sentence, specific placement instructions for each object
- Be specific about location (e.g., "left of sofa", "near window", "back corner")
- Remove any objects that clash with existing furniture or decor (for example, if there's two overlapping rugs, remove one)
- Explicitly state which objects should replace existing items if needed 
- Explicilty state that artwork or rug needs to fill the full space of the wall/floor

IMPORTANT: Provide recommendations for ALL ${elementCount} objects shown in the grid, no more and no less.`;
}

/**
 * Converts a File to a data URL
 */
async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Generates fallback placement recommendations if API fails
 */
function generateFallbackPlacement(elementCount: number): string {
  const placements = [
    "You are a professional interior designer, place the objects thoughtfully within the space.",
  ];

  return placements.slice(0, elementCount).join("\n");
}
