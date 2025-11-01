/**
 * API Constraints from Gemini API documentation:
 * https://ai.google.dev/gemini-api/docs/image-understanding
 * https://ai.google.dev/gemini-api/docs/image-generation
 */

// Size limits (in bytes)
// Base64 encoding increases size by ~33%, so original images should be smaller
export const MAX_INDIVIDUAL_SIZE = 10 * 1024 * 1024; // 10MB per image
export const MAX_TOTAL_SIZE = 20 * 1024 * 1024; // 20MB total (official Gemini API limit)

// Model configuration
export const GEMINI_MODEL = "gemini-2.5-flash-image";

// Supported aspect ratios: 1:1, 2:3, 3:2, 3:4, 4:3, 4:5, 5:4, 9:16, 16:9, 21:9
// See: https://ai.google.dev/gemini-api/docs/image-generation#aspect-ratios
export const DEFAULT_ASPECT_RATIO = "3:4";
