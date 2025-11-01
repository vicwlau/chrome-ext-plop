/**
 * Combines multiple images into a single grid layout
 * Useful for reducing the number of images sent to AI models
 */

/**
 * Default configuration for grid combining
 * Adjust these values to control output quality and dimensions
 */
export const GRID_COMBINE_CONFIG = {
  maxWidth: 4096, // Max grid width in pixels (doubled for better quality)
  maxHeight: 4096, // Max grid height in pixels (doubled for better quality)
  backgroundColor: "#FFFFFF", // Grid background color
  padding: 20, // Padding between images in pixels
  quality: 0.95, // JPEG quality (0-1), higher = better quality
} as const;

interface CombineImagesOptions {
  maxWidth?: number;
  maxHeight?: number;
  backgroundColor?: string;
  padding?: number;
  quality?: number;
}

/**
 * Combines multiple image files into a single grid image
 *
 * @param files - Array of image files to combine (element images, not including source)
 * @param options - Configuration options for the grid (overrides defaults)
 * @returns A new File object containing the combined grid image
 */
export async function combineImagesToGrid(
  files: File[],
  options: CombineImagesOptions = {}
): Promise<File> {
  const {
    maxWidth = GRID_COMBINE_CONFIG.maxWidth,
    maxHeight = GRID_COMBINE_CONFIG.maxHeight,
    backgroundColor = GRID_COMBINE_CONFIG.backgroundColor,
    padding = GRID_COMBINE_CONFIG.padding,
    quality = GRID_COMBINE_CONFIG.quality,
  } = options;

  console.log(`[CombineGrid] Combining ${files.length} images into grid`);

  // Load all images
  const images = await Promise.all(
    files.map((file) => loadImageFromFile(file))
  );

  // Calculate grid layout (try to make it as square as possible)
  const gridLayout = calculateGridLayout(images.length);
  console.log(`[CombineGrid] Using ${gridLayout.cols}x${gridLayout.rows} grid`);

  // Calculate cell dimensions (each image gets equal space)
  const cellWidth = Math.floor(maxWidth / gridLayout.cols);
  const cellHeight = Math.floor(maxHeight / gridLayout.rows);

  // Create canvas
  const canvas = document.createElement("canvas");
  canvas.width = cellWidth * gridLayout.cols;
  canvas.height = cellHeight * gridLayout.rows;
  const ctx = canvas.getContext("2d")!;

  // Fill background
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw each image in its cell
  images.forEach((img, index) => {
    const row = Math.floor(index / gridLayout.cols);
    const col = index % gridLayout.cols;

    const x = col * cellWidth + padding;
    const y = row * cellHeight + padding;
    const availableWidth = cellWidth - padding * 2;
    const availableHeight = cellHeight - padding * 2;

    // Calculate scaled dimensions to fit in cell while maintaining aspect ratio
    // Cap at 1.0 to prevent upscaling small images (which would degrade quality)
    const scale = Math.min(
      1.0,
      availableWidth / img.width,
      availableHeight / img.height
    );

    const scaledWidth = img.width * scale;
    const scaledHeight = img.height * scale;

    // Center the image in its cell
    const offsetX = (availableWidth - scaledWidth) / 2;
    const offsetY = (availableHeight - scaledHeight) / 2;

    ctx.drawImage(img, x + offsetX, y + offsetY, scaledWidth, scaledHeight);

    // Add a subtle border around each cell for visual separation
    // ctx.strokeStyle = "#E5E7EB"; // Light gray
    // ctx.lineWidth = 2;
    // ctx.strokeRect(x, y, availableWidth, availableHeight);

    // Add a small number indicator in the top-left corner of each cell
    // const numberSize = Math.min(cellWidth, cellHeight) * 0.08; // 8% of cell size
    // ctx.fillStyle = "rgba(0, 0, 0, 0.7)"; // Semi-transparent black background
    // ctx.fillRect(x + 8, y + 8, numberSize * 1.5, numberSize * 1.5);

    // ctx.fillStyle = "#FFFFFF"; // White text
    // ctx.font = `bold ${numberSize}px Arial`;
    // ctx.textAlign = "center";
    // ctx.textBaseline = "middle";
    // ctx.fillText(
    //   (index + 1).toString(),
    //   x + 8 + (numberSize * 1.5) / 2,
    //   y + 8 + (numberSize * 1.5) / 2
    // );

    console.log(
      `[CombineGrid] Image ${index + 1} at cell (${row},${col}): ${Math.round(
        scaledWidth
      )}x${Math.round(scaledHeight)}px`
    );
  });

  // Convert canvas to blob
  const blob = await new Promise<Blob>((resolve) => {
    canvas.toBlob((blob) => resolve(blob!), "image/jpeg", quality);
  });

  // Create File from blob
  const timestamp = Date.now();
  const combinedFile = new File([blob], `combined-elements-${timestamp}.jpg`, {
    type: "image/jpeg",
  });

  console.log(
    `[CombineGrid] Combined grid created: ${(blob.size / 1024 / 1024).toFixed(
      2
    )}MB (${canvas.width}x${canvas.height}px)`
  );

  return combinedFile;
}

/**
 * Calculates optimal grid layout for N images
 * Tries to create a layout as close to square as possible
 */
function calculateGridLayout(count: number): { rows: number; cols: number } {
  if (count === 1) return { rows: 1, cols: 1 };
  if (count === 2) return { rows: 1, cols: 2 }; // Side by side
  if (count === 3) return { rows: 1, cols: 3 }; // Three in a row
  if (count === 4) return { rows: 2, cols: 2 }; // 2x2 grid
  if (count <= 6) return { rows: 2, cols: 3 }; // 2x3 grid
  if (count <= 9) return { rows: 3, cols: 3 }; // 3x3 grid

  // For larger counts, calculate closest to square
  const cols = Math.ceil(Math.sqrt(count));
  const rows = Math.ceil(count / cols);
  return { rows, cols };
}

/**
 * Loads an image from a File object
 */
function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`Failed to load image: ${file.name}`));
    };

    img.src = url;
  });
}
