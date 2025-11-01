/**
 * Image Optimization Utility
 *
 * Optimizes images for API calls while preserving originals for display.
 * Works with File objects and creates optimized versions for FormData submission.
 */

export interface ImageOptimizationOptions {
  maxWidth: number;
  maxHeight: number;
  quality: number; // 0-1
  format?: "image/jpeg" | "image/webp" | "image/png";
}

export interface OptimizedImageResult {
  file: File;
  dataUrl: string;
  sizeInBytes: number;
  dimensions: { width: number; height: number };
  wasOptimized: boolean; // True if size was reduced
  originalSize: number;
  compressionRatio: number; // e.g., 0.5 = 50% of original
}

// Default optimization presets
export const OPTIMIZATION_PRESETS = {
  source: {
    maxWidth: 1920,
    maxHeight: 1080,
    quality: 0.85,
    format: "image/jpeg" as const,
  },
  element: {
    maxWidth: 1024,
    maxHeight: 1024,
    quality: 0.85,
    format: "image/jpeg" as const,
  },
  // More aggressive for very large images
  aggressive: {
    maxWidth: 1280,
    maxHeight: 720,
    quality: 0.75,
    format: "image/jpeg" as const,
  },
};

// Target sizes
export const SIZE_LIMITS = {
  targetTotalSize: 18 * 1024 * 1024, // 18MB (buffer from 20MB)
  warningSize: 15 * 1024 * 1024, // 15MB - show warning
  maxIndividualSize: 10 * 1024 * 1024, // 10MB per image
};

/**
 * Load image from File/Blob and get dimensions
 */
async function loadImage(file: File | Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };

    img.src = url;
  });
}

/**
 * Calculate new dimensions while preserving aspect ratio
 */
function calculateDimensions(
  originalWidth: number,
  originalHeight: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number; needsResize: boolean } {
  // No resize needed if already within limits
  if (originalWidth <= maxWidth && originalHeight <= maxHeight) {
    return {
      width: originalWidth,
      height: originalHeight,
      needsResize: false,
    };
  }

  // Calculate scaling factor to fit within max dimensions
  const widthRatio = maxWidth / originalWidth;
  const heightRatio = maxHeight / originalHeight;
  const ratio = Math.min(widthRatio, heightRatio);

  return {
    width: Math.round(originalWidth * ratio),
    height: Math.round(originalHeight * ratio),
    needsResize: true,
  };
}

/**
 * Convert canvas to File
 */
async function canvasToFile(
  canvas: HTMLCanvasElement,
  filename: string,
  format: string,
  quality: number
): Promise<File> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Failed to create blob from canvas"));
          return;
        }

        const file = new File([blob], filename, {
          type: format,
          lastModified: Date.now(),
        });
        resolve(file);
      },
      format,
      quality
    );
  });
}

/**
 * Convert canvas to data URL
 */
function canvasToDataUrl(
  canvas: HTMLCanvasElement,
  format: string,
  quality: number
): string {
  return canvas.toDataURL(format, quality);
}

/**
 * Main optimization function - optimizes an image file
 * File => Load as Image => Calculate Dimensions => Draw to Canvas => Export File => Optimized File
 */
export async function optimizeImage(
  file: File,
  options: ImageOptimizationOptions
): Promise<OptimizedImageResult> {
  console.log(`[ImageOptimizer] Optimizing ${file.name}`, {
    originalSize: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
    options,
  });

  const originalSize = file.size;

  // Load image
  const img = await loadImage(file);

  // Calculate new dimensions
  const { width, height, needsResize } = calculateDimensions(
    img.width,
    img.height,
    options.maxWidth,
    options.maxHeight
  );

  console.log(`[ImageOptimizer] Dimensions:`, {
    original: `${img.width}x${img.height}`,
    optimized: `${width}x${height}`,
    needsResize,
  });

  // Create canvas and draw resized image
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d", {
    alpha: options.format === "image/png",
  });

  if (!ctx) {
    throw new Error("Failed to get canvas context");
  }

  // Use high-quality image rendering
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  // Draw image
  ctx.drawImage(img, 0, 0, width, height);

  // Convert to File and DataURL
  const format = options.format || "image/jpeg";
  const optimizedFile = await canvasToFile(
    canvas,
    file.name.replace(/\.[^.]+$/, `.${format.split("/")[1]}`),
    format,
    options.quality
  );

  const dataUrl = canvasToDataUrl(canvas, format, options.quality);

  const compressionRatio = optimizedFile.size / originalSize;
  const wasOptimized = optimizedFile.size < originalSize;

  console.log(`[ImageOptimizer] Result:`, {
    originalSize: `${(originalSize / 1024 / 1024).toFixed(2)}MB`,
    optimizedSize: `${(optimizedFile.size / 1024 / 1024).toFixed(2)}MB`,
    compressionRatio: `${(compressionRatio * 100).toFixed(1)}%`,
    savedSize: `${((originalSize - optimizedFile.size) / 1024 / 1024).toFixed(
      2
    )}MB`,
    wasOptimized,
    needsResize,
  });

  // Log warning if optimization made file larger or didn't help
  if (!wasOptimized) {
    console.warn(
      `[ImageOptimizer] ⚠️ Optimization did NOT reduce file size for ${file.name}:`,
      {
        originalDimensions: `${img.width}x${img.height}`,
        optimizedDimensions: `${width}x${height}`,
        dimensionReduction: needsResize
          ? `${(
              ((img.width * img.height - width * height) /
                (img.width * img.height)) *
              100
            ).toFixed(1)}% pixels reduced`
          : "No resize",
        originalSize: `${(originalSize / 1024 / 1024).toFixed(2)}MB`,
        optimizedSize: `${(optimizedFile.size / 1024 / 1024).toFixed(2)}MB`,
        sizeDifference: `${(
          (optimizedFile.size - originalSize) /
          1024 /
          1024
        ).toFixed(2)}MB ${
          optimizedFile.size > originalSize ? "LARGER" : "same"
        }`,
        quality: options.quality,
        format: options.format,
        reason:
          !needsResize && compressionRatio >= 0.95
            ? "Already well-compressed, no resize needed"
            : needsResize && compressionRatio >= 0.95
            ? "Re-encoding at this quality didn't help despite resize"
            : compressionRatio > 1
            ? "Re-encoding made file LARGER (original was more compressed)"
            : "Unknown - check quality settings",
      }
    );
  }

  return {
    file: optimizedFile,
    dataUrl,
    sizeInBytes: optimizedFile.size,
    dimensions: { width, height },
    wasOptimized,
    originalSize,
    compressionRatio,
  };
}

/**
 * Calculate total size of files
 */
export function calculateTotalSize(files: (File | null)[]): number {
  return files.reduce((sum, file) => sum + (file?.size || 0), 0);
}

/**
 * Estimate if optimization is needed based on total size
 */
export function shouldOptimize(totalSize: number): boolean {
  return totalSize > SIZE_LIMITS.targetTotalSize;
}

/**
 * Get optimization level based on size
 */
export function getOptimizationLevel(
  totalSize: number
): "none" | "standard" | "aggressive" {
  if (totalSize <= SIZE_LIMITS.targetTotalSize) {
    return "none";
  }
  if (totalSize <= SIZE_LIMITS.targetTotalSize * 1.5) {
    return "standard";
  }
  return "aggressive";
}

/**
 * Batch optimize multiple images
 */
export async function optimizeImages(
  files: File[],
  getOptions: (index: number, file: File) => ImageOptimizationOptions
): Promise<OptimizedImageResult[]> {
  console.log(`[ImageOptimizer] Batch optimizing ${files.length} images`);

  const results = await Promise.all(
    files.map((file, index) => optimizeImage(file, getOptions(index, file)))
  );

  const totalOriginal = results.reduce((sum, r) => sum + r.originalSize, 0);
  const totalOptimized = results.reduce((sum, r) => sum + r.sizeInBytes, 0);

  console.log(`[ImageOptimizer] Batch complete:`, {
    totalOriginal: `${(totalOriginal / 1024 / 1024).toFixed(2)}MB`,
    totalOptimized: `${(totalOptimized / 1024 / 1024).toFixed(2)}MB`,
    totalSaved: `${((totalOriginal - totalOptimized) / 1024 / 1024).toFixed(
      2
    )}MB`,
    compressionRatio: `${((totalOptimized / totalOriginal) * 100).toFixed(1)}%`,
  });

  return results;
}
