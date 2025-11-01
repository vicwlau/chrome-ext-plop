/**
 * Image processing utilities for composition API
 */

import sharp from "sharp";

/**
 * Gets image dimensions from a file buffer
 */
export async function getImageDimensions(
  file: Express.Multer.File
): Promise<{ width: number; height: number }> {
  const metadata = await sharp(file.buffer).metadata();
  return {
    width: metadata.width || 1024,
    height: metadata.height || 1024,
  };
}

/**
 * Calculates the closest supported aspect ratio for given dimensions
 * Supported ratios: 1:1, 2:3, 3:2, 3:4, 4:3, 4:5, 5:4, 9:16, 16:9, 21:9
 */
export function calculateAspectRatio(width: number, height: number): string {
  const ratio = width / height;

  // Define supported aspect ratios with their decimal values
  const supportedRatios: Array<{ ratio: number; label: string }> = [
    { ratio: 1 / 1, label: "1:1" },
    { ratio: 2 / 3, label: "2:3" },
    { ratio: 3 / 2, label: "3:2" },
    { ratio: 3 / 4, label: "3:4" },
    { ratio: 4 / 3, label: "4:3" },
    { ratio: 4 / 5, label: "4:5" },
    { ratio: 5 / 4, label: "5:4" },
    { ratio: 9 / 16, label: "9:16" },
    { ratio: 16 / 9, label: "16:9" },
    { ratio: 21 / 9, label: "21:9" },
  ];

  // Find the closest matching ratio
  let closest = supportedRatios[0];
  let minDiff = Math.abs(ratio - closest.ratio);

  for (const supported of supportedRatios) {
    const diff = Math.abs(ratio - supported.ratio);
    if (diff < minDiff) {
      minDiff = diff;
      closest = supported;
    }
  }

  return closest.label;
}

/**
 * Converts image files to inline data format for Gemini API
 * Base64 encoding increases size by approximately 33%
 */
export function convertFilesToInlineData(files: Express.Multer.File[]) {
  return files.map((file) => ({
    inlineData: {
      mimeType: file.mimetype,
      data: file.buffer.toString("base64"),
    },
  }));
}

/**
 * Generates simple descriptions for each image
 */
export function generateImageDescriptions(
  files: Express.Multer.File[]
): string[] {
  return files.map((file) => `An image (${file.originalname})`);
}
