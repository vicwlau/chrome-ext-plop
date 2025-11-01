import { GoogleGenAI } from "@google/genai";
import { GEMINI_MODEL, DEFAULT_ASPECT_RATIO } from "./constants";
import type { ImageData } from "./types";

/**
 * Initializes the Google AI client with API key from environment
 */
export function getGoogleAI(): GoogleGenAI {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_GENERATIVE_AI_API_KEY is not set");
  }
  return new GoogleGenAI({ googleAuthOptions: { apiKey } });
}

/**
 * Calls the Gemini API to compose multiple images
 *
 * According to Google's documentation, for image editing/composition:
 * - The first image is typically treated as the base/reference image
 * - The prompt should be placed after the images for better context
 * - Use "Image + Text-to-Image (Editing)" approach for composition
 */
export async function callCompositionAPI(
  imageParts: Array<{ inlineData: { mimeType: string; data: string } }>,
  prompt: string,
  aspectRatio: string = DEFAULT_ASPECT_RATIO
) {
  const ai = getGoogleAI();

  // Log the order being sent to Gemini
  console.log("[API Client] Sending to Gemini in order:");
  imageParts.forEach((part, i) => {
    const label = i === 0 ? "[BASE/SOURCE]" : `[ELEMENT ${i}]`;
    console.log(`  ${label} Image ${i + 1} (${part.inlineData.mimeType})`);
  });
  console.log(`  [TEXT PROMPT] "${prompt.substring(0, 100)}..."`);
  console.log(`  [ASPECT RATIO] ${aspectRatio}`);

  // Structure: Base image first, then source images, then the text prompt
  // This follows the image editing pattern where the first image is the base
  const contents = [...imageParts, { text: prompt }];

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: contents,
    config: {
      imageConfig: {
        // Match the aspect ratio to the first (base) image
        aspectRatio: aspectRatio,
      },
    },
  });

  return response;
}

/**
 * Checks if the API response was blocked by safety filters
 */
export function isResponseBlocked(response: any): boolean {
  return !!response.promptFeedback?.blockReason;
}

/**
 * Gets the block reason message from the response
 */
export function getBlockReason(response: any): string {
  const { blockReason, blockReasonMessage } = response.promptFeedback;
  return `Request was blocked. Reason: ${blockReason}. ${
    blockReasonMessage || ""
  }`;
}

/**
 * Extracts the generated image from the API response
 */
export function extractImageFromResponse(response: any): ImageData | null {
  const imagePartFromResponse = response.candidates?.[0]?.content?.parts?.find(
    (part: any) => part.inlineData
  );

  if (imagePartFromResponse?.inlineData) {
    return {
      mimeType: imagePartFromResponse.inlineData.mimeType,
      data: imagePartFromResponse.inlineData.data,
    };
  }
  return null;
}

/**
 * Gets the finish reason from the response
 * Returns null if finished successfully (STOP), otherwise returns the reason
 */
export function getFinishReason(response: any): string | null {
  const finishReason = response.candidates?.[0]?.finishReason;
  if (finishReason && finishReason !== "STOP") {
    return finishReason;
  }
  return null;
}
