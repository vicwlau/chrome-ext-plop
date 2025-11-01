import { type Request, type Response } from "express";
import { create_prompt_compose_objects } from "../../prompt-image-gen/compose-objects-prompt";
import { create_user_generated_prompt } from "../../prompt-image-gen/user-generated-prompt";
import {
  callCompositionAPI,
  extractImageFromResponse,
  getBlockReason,
  getFinishReason,
  isResponseBlocked,
} from "./api-client";
import {
  convertFilesToInlineData,
  generateImageDescriptions,
  getImageDimensions,
  calculateAspectRatio,
} from "./image-processing";
import {
  logBase64Sizes,
  logCompositionRequest,
  logCompositionRequest_API,
  logError,
  logSuccess,
  logValidationError,
  logValidationSuccess,
} from "./logging";
import { validateCompositionRequest } from "./validation";

/**
 * Handles composition of multiple images using Gemini 2.5 Flash Image model
 *
 * API Constraints (from https://ai.google.dev/gemini-api/docs/image-generation):
 * - Maximum 20MB total request size (including text prompts and inline image data)
 * - Works best with up to 3 images as input
 * - Base64 encoding increases size by ~33%
 * - Supported formats: PNG, JPEG, WEBP, HEIC, HEIF
 *
 * Common Errors:
 * - "TypeError: fetch failed" - Usually indicates payload exceeds 20MB limit
 * - For files >10MB or frequent reuse, consider using Files API instead
 *
 * @param req - Express request with files array from multer
 * @param res - Express response
 */
export async function compose_multiple_images_handler(
  req: Request & { files?: Express.Multer.File[] },
  res: Response
) {
  const files = req.files;
  const { prompt, isGridCombined, placementRecommendations, promptType } =
    req.body;

  // Validate request
  const validation = validateCompositionRequest(files, prompt);
  if (!validation.isValid) {
    logValidationError(validation.error!);
    return res.status(400).json({ error: validation.error });
  }

  // From here on, files and prompt are guaranteed to be valid
  const validFiles = files!;
  const validPrompt = prompt as string;
  const isGrid = isGridCombined === "true";
  const placements = placementRecommendations as string | undefined;
  const validPromptType = (promptType as string) || "pure-composition"; // Default to pure-composition

  // Log request details
  logCompositionRequest(validFiles, validPrompt);
  console.log(`[Compose] Prompt type: ${validPromptType}`);
  if (isGrid) {
    console.log("🔲 Grid mode: Second image contains combined elements");
  }
  if (placements) {
    console.log("📍 Using placement recommendations from designer");
  }
  logValidationSuccess();

  try {
    // Convert images to inline data format
    const imageParts = convertFilesToInlineData(validFiles);
    logBase64Sizes(imageParts);

    // Get dimensions from the first (source) image and calculate aspect ratio
    const sourceImage = validFiles[0];
    const dimensions = await getImageDimensions(sourceImage);
    const aspectRatio = calculateAspectRatio(
      dimensions.width,
      dimensions.height
    );
    console.log(
      `[Compose] Source image dimensions: ${dimensions.width}x${dimensions.height} → aspect ratio: ${aspectRatio}`
    );

    // Generate image descriptions for the prompt
    const imageDescriptions = generateImageDescriptions(validFiles);

    let prompt_to_llm = "";

    // Choose prompt based on promptType
    if (validPromptType === "user-generated") {
      // Scenario 2: User-generated prompt with image descriptions
      console.log("[Compose] Using user-generated prompt");
      prompt_to_llm = create_user_generated_prompt(
        imageDescriptions,
        validPrompt
      );
    } else {
      // Scenario 1: Pure composition prompt (default)
      console.log("[Compose] Using pure composition prompt");
      prompt_to_llm = create_prompt_compose_objects(
        imageDescriptions,
        isGrid,
        placements
      );
    }

    // Call Gemini API
    logCompositionRequest_API(validFiles, prompt_to_llm);

    const response = await callCompositionAPI(
      imageParts,
      prompt_to_llm,
      aspectRatio
    );

    // Check if request was blocked
    if (isResponseBlocked(response)) {
      const blockReason = getBlockReason(response);
      return res.status(400).json({ error: blockReason });
    }

    // Extract image from response
    const imageData = extractImageFromResponse(response);
    if (imageData) {
      logSuccess();

      // Extract usage metadata if available
      const usageMetadata = response.usageMetadata;
      if (usageMetadata) {
        console.log("[Compose] Token usage:", {
          promptTokens: usageMetadata.promptTokenCount,
          candidatesTokens: usageMetadata.candidatesTokenCount,
          totalTokens: usageMetadata.totalTokenCount,
        });
      }

      return res.json({
        imageUrl: `data:${imageData.mimeType};base64,${imageData.data}`,
        usageMetadata: usageMetadata || undefined,
      });
    }

    // Check finish reason if no image returned
    const finishReason = getFinishReason(response);
    if (finishReason) {
      return res.status(500).json({
        error: `Composition stopped unexpectedly. Reason: ${finishReason}. This often relates to safety settings.`,
      });
    }

    // Generic error if nothing else matched
    return res.status(500).json({
      error: "Failed to generate composed image",
    });
  } catch (err) {
    logError(err);
    return res.status(500).json({
      error: err instanceof Error ? err.message : "Failed to compose images",
    });
  }
}
