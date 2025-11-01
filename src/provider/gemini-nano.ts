import type { LanguageModelSession } from "./definitions";
import { create_session, destroy_session } from "./session-manager";

// Session state management
let defaultSessionId: string | null = null;
let defaultSession: LanguageModelSession | null = null;

/**
 * Initialize or get the default session for the chat component.
 * This will auto-create a session on first call with sensible defaults.
 */
export async function ensure_session(): Promise<LanguageModelSession> {
  // Return existing session if available
  if (defaultSession && defaultSessionId) {
    console.log("[Gemini Nano] Using existing session:", defaultSessionId);
    return defaultSession;
  }

  try {
    console.log("[Gemini Nano] Creating new default session...");

    // Create a new session with chat-optimized settings
    const { id, session } = await create_session({
      initialPrompts: [
        {
          role: "system",
          content:
            "You are a helpful AI assistant. Be concise and friendly in your responses.",
        },
      ],
      temperature: 0.8, // Slightly creative for conversation
      topK: 3,
      outputLanguage: "en",
    });

    defaultSessionId = id;
    defaultSession = session;

    console.log(
      "[Gemini Nano] ✅ Default session created successfully:",
      defaultSessionId
    );
    return session;
  } catch (error) {
    console.error("[Gemini Nano] ❌ Failed to create session:", error);
    throw new Error(
      `Failed to initialize Gemini Nano session: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Send a prompt to the default session.
 * Auto-initializes session if not already created.
 */
export async function prompt_api(query: string): Promise<string> {
  try {
    // Ensure session exists (will create if needed)
    const session = await ensure_session();

    console.log("[Gemini Nano] Sending prompt:", query);
    const response = await session.prompt(query || " ");
    console.log("[Gemini Nano] Response received:", response);

    return response;
  } catch (error) {
    console.error("[Gemini Nano] Error during prompt execution:", error);

    if (!(error instanceof Error)) {
      return "Unknown error during prompt execution.";
    }

    return `Error: ${error.message}`;
  }
}

/**
 * Reset the default session (useful for clearing conversation history)
 */
export async function reset_session(): Promise<void> {
  console.log("[Gemini Nano] Resetting default session...");

  if (defaultSessionId) {
    destroy_session(defaultSessionId);
  }

  defaultSessionId = null;
  defaultSession = null;

  // Create fresh session
  await ensure_session();
}

/**
 * Get the current session (for advanced usage)
 */
export function get_current_session(): LanguageModelSession | null {
  return defaultSession;
}

/**
 * Check if a session is currently active
 */
export function has_active_session(): boolean {
  return defaultSession !== null && defaultSessionId !== null;
}

/**
 * Result from image prompt with token usage information
 */
export interface ImagePromptResult {
  response: string;
  tokensUsed: number;
  tokensQuota: number;
  tokensRemaining: number;
}

/**
 * Options for image prompts
 */
export interface ImagePromptOptions {
  /** If true, returns detailed token info */
  returnTokenInfo?: boolean;
  /** If true, keeps the session alive after the prompt (caller must destroy it) */
  keepSessionAlive?: boolean;
  /** Optional AbortSignal to cancel the prompt */
  signal?: AbortSignal;
}

/**
 * Send a prompt with an image to the model.
 * This is a convenience wrapper around prompt_api_with_images for single images.
 *
 * @param query - The text prompt to send
 * @param image - The source image from the image store (uses dataUrl)
 * @param options - Optional configuration for the prompt
 * @returns The model's response as a string, or detailed result with token info
 */
export async function prompt_api_with_image(
  query: string,
  image: { dataUrl: string; id: string; name?: string },
  options?: boolean | ImagePromptOptions // Support old boolean API for backward compatibility
): Promise<string | ImagePromptResult> {
  // Just delegate to the plural version with an array of one image
  return prompt_api_with_images(query, [image], options);
}

/**
 * Helper function to convert data URL to Blob
 */
async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const response = await fetch(dataUrl);
  return await response.blob();
}

// ------------------------------------------
// STREAMING VARIANTS
// ------------------------------------------

/**
 * Send a prompt to the default session with streaming response.
 * Auto-initializes session if not already created.
 *
 * @param query - The text prompt to send
 * @param options - Optional AbortSignal to cancel the stream
 * @returns A ReadableStream yielding string chunks
 */
export async function prompt_api_streaming(
  query: string,
  options?: { signal?: AbortSignal }
): Promise<ReadableStream<string>> {
  try {
    // Ensure session exists (will create if needed)
    const session = await ensure_session();

    console.log("[Gemini Nano] Sending streaming prompt:", query);

    return session.promptStreaming(query || " ", options);
  } catch (error) {
    console.error(
      "[Gemini Nano] Error during streaming prompt execution:",
      error
    );

    // Return an error stream
    return new ReadableStream({
      start(controller) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error occurred";
        controller.enqueue(`Error: ${errorMessage}`);
        controller.close();
      },
    });
  }
}

/**
 * Send a prompt with an image to the model with streaming response.
 * This is a convenience wrapper around prompt_api_with_images_streaming for single images.
 *
 * @param query - The text prompt to send
 * @param image - The source image from the image store (uses dataUrl)
 * @param options - Optional configuration for the prompt
 * @returns A ReadableStream yielding string chunks
 */
export async function prompt_api_with_image_streaming(
  query: string,
  image: { dataUrl: string; id: string; name?: string },
  options?: Pick<ImagePromptOptions, "keepSessionAlive" | "signal">
): Promise<ReadableStream<string>> {
  // Just delegate to the plural version with an array of one image
  return prompt_api_with_images_streaming(query, [image], options);
}

/**
 * Send a prompt with multiple images to the model with streaming response.
 * Creates a multimodal session that supports multiple image inputs.
 *
 * @param query - The text prompt to send
 * @param images - Array of images from the image store
 * @param options - Optional configuration for the prompt
 * @returns A ReadableStream yielding string chunks
 */
export async function prompt_api_with_images_streaming(
  query: string,
  images: { dataUrl: string; id: string; name?: string }[],
  options?: Pick<ImagePromptOptions, "keepSessionAlive" | "signal">
): Promise<ReadableStream<string>> {
  const opts: Pick<ImagePromptOptions, "keepSessionAlive" | "signal"> =
    options || {};

  try {
    console.log(
      `[Gemini Nano] Creating multimodal session for streaming ${images.length} images...`
    );

    // Convert all data URLs to Blobs
    const blobs = await Promise.all(
      images.map((img) => dataUrlToBlob(img.dataUrl))
    );

    const prompt_v1 =
      "You are a helpful AI assistant that can analyze and discuss images. Be descriptive and accurate in your observations.";

    const prompt_v2 =
      "You are a world-class professional interior designer. Be concise and respond to user questions related to interior design. Use the images provided to inform your answers.";

    // Create a new session with image support
    const { session } = await create_session({
      initialPrompts: [
        {
          role: "system",
          content: prompt_v2,
        },
      ],
      temperature: 0.7,
      topK: 3,
      outputLanguage: "en",
      // Enable image input support
      expectedInputs: [{ type: "image" as const, languages: [] }],
    });

    // Build content array with text + all images
    const content: any[] = [{ type: "text" as const, value: query }];
    blobs.forEach((blob) => {
      content.push({ type: "image" as const, value: blob });
    });

    const promptContent = [
      {
        role: "user" as const,
        content,
      },
    ];

    console.log(
      "[Gemini Nano] Sending streaming multimodal prompt with images:",
      {
        imageCount: images.length,
        imageIds: images.map((img) => img.id),
        queryLength: query.length,
      }
    );

    const stream = session.promptStreaming(promptContent, {
      signal: opts.signal,
    });

    // Wrap the stream to handle cleanup if keepSessionAlive is false
    if (!opts.keepSessionAlive) {
      return new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of stream) {
              controller.enqueue(chunk);
            }
            controller.close();
            console.log("[Gemini Nano] Stream complete, destroying session");
            session.destroy();
          } catch (error) {
            console.error("[Gemini Nano] Stream error:", error);
            controller.error(error);
            session.destroy();
          }
        },
      });
    } else {
      console.log(
        "[Gemini Nano] Streaming session kept alive (caller must destroy it)"
      );
      return stream;
    }
  } catch (error) {
    console.error(
      "[Gemini Nano] Error during streaming multimodal prompt execution:",
      error
    );

    // Return an error stream
    return new ReadableStream({
      start(controller) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error occurred";

        let errorMsg: string;
        if (errorMessage.includes("NotSupported")) {
          errorMsg =
            "Error: Image input is not supported on this device or browser version.";
        } else if (errorMessage.includes("QuotaExceeded")) {
          errorMsg = `Error: Token quota exceeded. Try with fewer or smaller images.`;
        } else {
          errorMsg = `Error: ${errorMessage}`;
        }

        controller.enqueue(errorMsg);
        controller.close();
      },
    });
  }
}

/**
 * Send a prompt with multiple images to the model.
 * Creates a multimodal session that supports multiple image inputs.
 *
 * @param query - The text prompt to send
 * @param images - Array of images from the image store
 * @param options - Optional configuration for the prompt
 * @returns The model's response with optional token info
 */
export async function prompt_api_with_images(
  query: string,
  images: { dataUrl: string; id: string; name?: string }[],
  options?: boolean | ImagePromptOptions // Support old boolean API for backward compatibility
): Promise<string | ImagePromptResult> {
  // Handle backward compatibility with old boolean parameter
  const opts: ImagePromptOptions =
    typeof options === "boolean" ? { returnTokenInfo: options } : options || {};

  try {
    console.log(
      `[Gemini Nano] Creating multimodal session for ${images.length} images...`
    );

    // Convert all data URLs to Blobs
    const blobs = await Promise.all(
      images.map((img) => dataUrlToBlob(img.dataUrl))
    );

    // Create a new session with image support
    const { session } = await create_session({
      initialPrompts: [
        {
          role: "system",
          content:
            "You are a helpful AI assistant that can analyze and discuss images. Be descriptive and accurate in your observations.",
        },
      ],
      temperature: 0.7,
      topK: 3,
      outputLanguage: "en",
      // Enable image input support
      expectedInputs: [{ type: "image" as const, languages: [] }],
    });

    // Build content array with text + all images
    const content: any[] = [{ type: "text" as const, value: query }];
    blobs.forEach((blob, index) => {
      content.push({ type: "image" as const, value: blob });
    });

    const promptContent = [
      {
        role: "user" as const,
        content,
      },
    ];

    // Measure token usage before sending
    let tokensUsed = 0;
    try {
      tokensUsed = await session.measureInputUsage(promptContent);
      console.log(
        `[Gemini Nano] Estimated token usage for ${images.length} images: ${tokensUsed}/${session.inputQuota}`
      );
    } catch (measureError) {
      console.warn("[Gemini Nano] Could not measure tokens:", measureError);
    }

    console.log("[Gemini Nano] Sending multimodal prompt with images:", {
      imageCount: images.length,
      imageIds: images.map((img) => img.id),
      queryLength: query.length,
      estimatedTokens: tokensUsed,
    });

    // Send the prompt with images
    const response = await session.prompt(promptContent, {
      signal: opts.signal,
    });

    console.log("[Gemini Nano] Multimodal response received");

    // Capture token info after prompt
    const finalTokensUsed = session.inputUsage;
    const tokensQuota = session.inputQuota;
    const tokensRemaining = tokensQuota - finalTokensUsed;

    console.log(
      `[Gemini Nano] Final token usage: ${finalTokensUsed}/${tokensQuota} (${tokensRemaining} remaining)`
    );

    // Clean up the session after use (unless keepSessionAlive is true)
    if (!opts.keepSessionAlive) {
      session.destroy();
    } else {
      console.log("[Gemini Nano] Session kept alive (caller must destroy it)");
    }

    if (opts.returnTokenInfo) {
      return {
        response,
        tokensUsed: finalTokensUsed,
        tokensQuota,
        tokensRemaining,
      };
    }

    return response;
  } catch (error) {
    console.error(
      "[Gemini Nano] Error during multimodal prompt execution:",
      error
    );

    if (!(error instanceof Error)) {
      const errorMsg = "Unknown error during multimodal prompt execution.";
      return opts.returnTokenInfo
        ? {
            response: errorMsg,
            tokensUsed: 0,
            tokensQuota: 0,
            tokensRemaining: 0,
          }
        : errorMsg;
    }

    // Provide helpful error messages
    let errorMsg: string;
    if (error.message.includes("NotSupported")) {
      errorMsg =
        "Error: Image input is not supported on this device or browser version.";
    } else if (error.message.includes("QuotaExceeded")) {
      errorMsg = `Error: Token quota exceeded. Try with fewer or smaller images.`;
    } else {
      errorMsg = `Error: ${error.message}`;
    }

    return opts.returnTokenInfo
      ? {
          response: errorMsg,
          tokensUsed: 0,
          tokensQuota: 0,
          tokensRemaining: 0,
        }
      : errorMsg;
  }
}

// ------------------------------------------
// TOKEN UTILITIES
// ------------------------------------------

/**
 * Token usage information for a session
 */
export interface TokenUsage {
  used: number;
  quota: number;
  remaining: number;
  percentage: number;
}

/**
 * Get token usage information for the current default session
 */
export function get_token_usage(): TokenUsage | null {
  if (!defaultSession) {
    console.warn("[Gemini Nano] No active session to check token usage");
    return null;
  }

  const used = defaultSession.inputUsage;
  const quota = defaultSession.inputQuota;
  const remaining = quota - used;
  const percentage = (used / quota) * 100;

  return {
    used,
    quota,
    remaining,
    percentage,
  };
}

/**
 * Measure how many tokens a prompt will consume without actually sending it.
 * Useful for checking if you're about to exceed the quota.
 */
export async function measure_prompt_tokens(
  prompt: string | any[]
): Promise<number | null> {
  if (!defaultSession) {
    console.warn(
      "[Gemini Nano] No active session to measure prompt tokens. Creating session..."
    );
    await ensure_session();
  }

  if (!defaultSession) {
    return null;
  }

  try {
    const usage = await defaultSession.measureInputUsage(prompt);
    console.log(`[Gemini Nano] Prompt will use ${usage} tokens`);
    return usage;
  } catch (error) {
    console.error("[Gemini Nano] Error measuring token usage:", error);
    return null;
  }
}

/**
 * Measure token usage for a multimodal prompt with image(s)
 */
export async function measure_multimodal_tokens(
  query: string,
  images: { dataUrl: string; id: string }[]
): Promise<number | null> {
  try {
    // Create a temporary session to measure
    const { session } = await create_session({
      expectedInputs: [{ type: "image" as const, languages: [] }],
    });

    // Convert images to blobs
    const imageBlobs = await Promise.all(
      images.map((img) => dataUrlToBlob(img.dataUrl))
    );

    // Build content array
    const content: any[] = [{ type: "text", value: query }];
    imageBlobs.forEach((blob) => {
      content.push({ type: "image", value: blob });
    });

    const usage = await session.measureInputUsage([
      {
        role: "user",
        content,
      },
    ]);

    console.log(
      `[Gemini Nano] Multimodal prompt with ${images.length} image(s) will use ${usage} tokens`
    );

    // Clean up temporary session
    session.destroy();

    return usage;
  } catch (error) {
    console.error("[Gemini Nano] Error measuring multimodal tokens:", error);
    return null;
  }
}

/**
 * Check if there's enough token quota remaining for a prompt
 */
export async function can_fit_prompt(prompt: string | any[]): Promise<boolean> {
  const usage = get_token_usage();
  if (!usage) return false;

  const requiredTokens = await measure_prompt_tokens(prompt);
  if (requiredTokens === null) return false;

  return usage.remaining >= requiredTokens;
}

/**
 * Log current token usage to console (for debugging)
 */
export function log_token_usage(): void {
  const usage = get_token_usage();
  if (!usage) {
    console.log("[Gemini Nano] No active session");
    return;
  }

  console.log(
    `[Gemini Nano] Token Usage: ${usage.used}/${
      usage.quota
    } (${usage.percentage.toFixed(1)}%) - ${usage.remaining} remaining`
  );
}
