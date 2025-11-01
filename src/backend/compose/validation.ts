import type { ValidationResult } from "./types";
import { MAX_INDIVIDUAL_SIZE, MAX_TOTAL_SIZE } from "./constants";

/**
 * Validates that the request has the minimum required files
 */
export function validateMinimumOneFile(
  files?: Express.Multer.File[]
): ValidationResult {
  if (!files || files.length < 1) {
    return {
      isValid: false,
      error: "At least 1 image is required",
    };
  }
  return { isValid: true };
}

/**
 * Validates that the prompt is provided
 */
export function validatePrompt(prompt?: string): ValidationResult {
  if (!prompt) {
    return {
      isValid: false,
      error: "Prompt is required",
    };
  }
  return { isValid: true };
}

/**
 * Validates individual file sizes
 * Based on Gemini API documentation:
 * - For inline data, keep files under 10MB each
 * - For larger files, use Files API instead
 */
export function validateIndividualFileSizesAtMax10mb(
  files: Express.Multer.File[]
): ValidationResult {
  for (let i = 0; i < files.length; i++) {
    if (files[i].size > MAX_INDIVIDUAL_SIZE) {
      const sizeMB = (files[i].size / (1024 * 1024)).toFixed(2);
      return {
        isValid: false,
        error: `Image ${
          i + 1
        } is too large (${sizeMB} MB). Maximum size per image is 10 MB.`,
      };
    }
  }
  return { isValid: true };
}

/**
 * Validates total payload size
 * The Gemini API limits total request size (text + images) to 20MB
 */
export function validateTotalSize(
  files: Express.Multer.File[]
): ValidationResult {
  const totalSize = files.reduce((sum, file) => sum + file.size, 0);
  const totalSizeMB = (totalSize / (1024 * 1024)).toFixed(2);

  if (totalSize > MAX_TOTAL_SIZE) {
    return {
      isValid: false,
      error: `Total image size is too large (${totalSizeMB} MB). Maximum total size is 20 MB. Please use smaller images.`,
    };
  }

  return { isValid: true };
}

/**
 * Runs all validations for the composition request
 */
export function validateCompositionRequest(
  files: Express.Multer.File[] | undefined,
  prompt: string | undefined
): ValidationResult {
  // Validate minimum files
  const filesCheck = validateMinimumOneFile(files);
  if (!filesCheck.isValid) return filesCheck;

  // Validate prompt
  const promptCheck = validatePrompt(prompt);
  if (!promptCheck.isValid) return promptCheck;

  // From here on, files is guaranteed to be defined
  const validFiles = files!;

  // Validate individual file sizes
  const individualSizeCheck = validateIndividualFileSizesAtMax10mb(validFiles);
  if (!individualSizeCheck.isValid) return individualSizeCheck;

  // Validate total size
  const totalSizeCheck = validateTotalSize(validFiles);
  if (!totalSizeCheck.isValid) return totalSizeCheck;

  return { isValid: true };
}
