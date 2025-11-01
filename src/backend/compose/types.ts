/**
 * Type definitions for image composition API
 */

/**
 * Types of prompts that can be used for composition
 * - "pure-composition": Uses the default compose-objects prompt (default)
 * - "user-generated": Uses a custom user prompt with image descriptions
 */
export type PromptType = "pure-composition" | "user-generated";

export interface ComposeRequest {
  prompt: string;
  files: Express.Multer.File[];
  promptType?: PromptType;
}

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export interface ImageData {
  mimeType: string;
  data: string;
}

export interface CompositionResponse {
  imageUrl: string;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  };
}
