/**
 * Utility functions for transferring and processing images
 */

import type { ImageMetadata } from "@/types/cross-context-messages-for-images";

/**
 * Generates a simple UUID v4 without external libraries
 */
function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Fetches an image from a URL and converts it to a data URL
 * Handles CORS issues by using the extension's permissions
 */
export async function fetchImageAsDataUrl(imageUrl: string): Promise<string> {
  try {
    const response = await fetch(imageUrl);

    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }

    const blob = await response.blob();
    return blobToDataUrl(blob);
  } catch (error) {
    console.error("Error fetching image:", error);
    throw error;
  }
}

/**
 * Converts a Blob to a data URL
 */
export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Converts a data URL to a File object
 * @param dataUrl - The data URL to convert
 * @param filename - Optional filename (will generate UUID-based name if not provided or empty)
 */
export function dataUrlToFile(dataUrl: string, filename?: string): File {
  const arr = dataUrl.split(",");
  const mime = arr[0].match(/:(.*?);/)![1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);

  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }

  // Generate filename with UUID if not provided or empty
  const finalFilename =
    filename && filename.trim()
      ? filename
      : `image-${generateUUID()}.${mime.split("/")[1] || "png"}`;

  return new File([u8arr], finalFilename, { type: mime });
}

/**
 * Extracts image metadata from a URL
 */
export function createImageMetadata(
  imageUrl: string,
  pageUrl?: string
): ImageMetadata {
  return {
    url: imageUrl,
    sourcePageUrl: pageUrl,
    timestamp: Date.now(),
  };
}

/**
 * Generates a unique ID for an image based on URL and timestamp
 */
export function generateImageId(imageUrl: string): string {
  const timestamp = Date.now();
  const urlHash = imageUrl.substring(0, 50); // Use first 50 chars of URL
  return `img_${timestamp}_${btoa(urlHash).substring(0, 10)}`;
}

/**
 * Validates if a URL is an image
 */
export function isImageUrl(url: string): boolean {
  const imageExtensions = [
    ".jpg",
    ".jpeg",
    ".png",
    ".gif",
    ".webp",
    ".svg",
    ".bmp",
  ];
  const urlLower = url.toLowerCase();
  return imageExtensions.some((ext) => urlLower.includes(ext));
}

/**
 * Creates a FileList-like object from a File
 * Useful for passing to existing upload handlers
 */
export function createFileList(file: File): FileList {
  return {
    0: file,
    length: 1,
    item: (index: number) => (index === 0 ? file : null),
    [Symbol.iterator]: function* () {
      yield file;
    },
  } as FileList;
}
