/**
 * Image Composition API - Refactored for better readability and maintainability
 *
 * This module breaks down the image composition handler into smaller, focused pieces:
 *
 * - types.ts: TypeScript type definitions
 * - constants.ts: API constraints and configuration
 * - validation.ts: Request validation logic
 * - logging.ts: Consistent logging utilities
 * - image-processing.ts: Image conversion and processing
 * - api-client.ts: Gemini API interaction
 * - handler.ts: Main request handler that orchestrates everything
 *
 * Usage:
 * ```typescript
 * import { composeMultipleImagesHandler } from './compose';
 * app.post('/compose', upload.array('images'), composeMultipleImagesHandler);
 * ```
 */

export { compose_multiple_images_handler as composeMultipleImagesHandler } from "./handler";
export type {
  ComposeRequest,
  ValidationResult,
  ImageData,
  CompositionResponse,
  PromptType,
} from "./types";
export {
  MAX_INDIVIDUAL_SIZE,
  MAX_TOTAL_SIZE,
  GEMINI_MODEL,
  DEFAULT_ASPECT_RATIO,
} from "./constants";
