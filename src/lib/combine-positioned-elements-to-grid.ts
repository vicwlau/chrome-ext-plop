/**
 * Combines positioned element instances into a single annotated grid
 * Shows position coordinates and visual indicators for AI context
 */

import type { PositionedInstance, ElementImageData } from "@/store/image-store";

interface CombinePositionedElementsOptions {
  maxWidth?: number;
  maxHeight?: number;
  backgroundColor?: string;
  padding?: number;
  quality?: number;
  showCoordinates?: boolean; // Show coordinate labels
}

export const POSITIONED_GRID_CONFIG = {
  maxWidth: 4096,
  maxHeight: 4096,
  backgroundColor: "#FFFFFF",
  padding: 20,
  quality: 0.95,
  showCoordinates: true, // Show position info by default
} as const;

/**
 * Combines positioned element instances into an annotated grid image
 * Each cell shows the element with its canvas position coordinates
 *
 * @param positionedInstances - Array of positioned instances with coordinates
 * @param elements - Array of all element images (to match by elementId)
 * @param options - Configuration options for the grid
 * @returns A new File object containing the annotated grid image, or null if no instances
 */
export async function combinePositionedElementsToGrid(
  positionedInstances: PositionedInstance[],
  elements: ElementImageData[],
  options: CombinePositionedElementsOptions = {}
): Promise<File | null> {
  if (positionedInstances.length === 0) {
    console.log("[PositionedGrid] No positioned instances to combine");
    return null;
  }

  const {
    maxWidth = POSITIONED_GRID_CONFIG.maxWidth,
    maxHeight = POSITIONED_GRID_CONFIG.maxHeight,
    backgroundColor = POSITIONED_GRID_CONFIG.backgroundColor,
    padding = POSITIONED_GRID_CONFIG.padding,
    quality = POSITIONED_GRID_CONFIG.quality,
    showCoordinates = POSITIONED_GRID_CONFIG.showCoordinates,
  } = options;

  console.log(
    `[PositionedGrid] Combining ${positionedInstances.length} positioned elements into annotated grid`
  );

  // Match positioned instances with their element data
  const positionedElements = positionedInstances
    .map((instance) => {
      const element = elements.find((el) => el.id === instance.elementId);
      if (!element) {
        console.warn(
          `[PositionedGrid] Element ${instance.elementId} not found for instance ${instance.id}`
        );
        return null;
      }
      return {
        instance,
        element,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  if (positionedElements.length === 0) {
    console.warn("[PositionedGrid] No matching elements found");
    return null;
  }

  // Load all element images
  const loadedImages = await Promise.all(
    positionedElements.map(async ({ element }) => {
      const img = await loadImageFromDataUrl(
        element.apiDataUrl || element.dataUrl
      );
      return img;
    })
  );

  // Calculate grid layout
  const gridLayout = calculateGridLayout(positionedElements.length);
  console.log(
    `[PositionedGrid] Using ${gridLayout.cols}x${gridLayout.rows} grid`
  );

  // Calculate cell dimensions
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

  // Draw each positioned element in its cell with annotations
  loadedImages.forEach((img, index) => {
    const { instance } = positionedElements[index];
    const row = Math.floor(index / gridLayout.cols);
    const col = index % gridLayout.cols;

    const x = col * cellWidth + padding;
    const y = row * cellHeight + padding;
    const availableWidth = cellWidth - padding * 2;
    const availableHeight = cellHeight - padding * 2;

    // Calculate scaled dimensions
    const scale = Math.min(
      1.0,
      availableWidth / img.width,
      availableHeight / img.height
    );

    const scaledWidth = img.width * scale;
    const scaledHeight = img.height * scale;

    // Center the image in its cell (leave space for text at top)
    const textHeight = showCoordinates ? 60 : 0;
    const imageY = y + textHeight;
    const imageAvailableHeight = availableHeight - textHeight;

    const imageScale = Math.min(
      1.0,
      availableWidth / img.width,
      imageAvailableHeight / img.height
    );

    const imageScaledWidth = img.width * imageScale;
    const imageScaledHeight = img.height * imageScale;

    const offsetX = (availableWidth - imageScaledWidth) / 2;
    const offsetY = (imageAvailableHeight - imageScaledHeight) / 2;

    ctx.drawImage(
      img,
      x + offsetX,
      imageY + offsetY,
      imageScaledWidth,
      imageScaledHeight
    );

    // Add position coordinates annotation
    if (showCoordinates) {
      // Format coordinates as percentages for readability
      const xPercent = Math.round(instance.position.x * 100);
      const yPercent = Math.round(instance.position.y * 100);

      // Background for text
      ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
      const textBgHeight = 50;
      ctx.fillRect(x, y, availableWidth, textBgHeight);

      // Position text
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "bold 20px -apple-system, system-ui, sans-serif";
      ctx.textAlign = "left";
      ctx.textBaseline = "top";

      const elementNumber = index + 1;
      const positionText = `Element ${elementNumber}: (${xPercent}%, ${yPercent}%)`;

      ctx.fillText(positionText, x + 10, y + 8);

      // Sub-text with relative coordinates
      ctx.font = "14px -apple-system, system-ui, sans-serif";
      ctx.fillStyle = "#CCCCCC";
      const coordText = `Canvas: x=${instance.position.x.toFixed(
        3
      )}, y=${instance.position.y.toFixed(3)}`;
      ctx.fillText(coordText, x + 10, y + 32);
    }

    // Add a subtle border around each cell
    ctx.strokeStyle = "#E5E7EB";
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, availableWidth, availableHeight);

    console.log(
      `[PositionedGrid] Element ${
        index + 1
      } at cell (${row},${col}): position (${instance.position.x}, ${
        instance.position.y
      })`
    );
  });

  // Convert canvas to blob
  const blob = await new Promise<Blob>((resolve) => {
    canvas.toBlob((blob) => resolve(blob!), "image/jpeg", quality);
  });

  // Create File from blob
  const timestamp = Date.now();
  const combinedFile = new File(
    [blob],
    `positioned-elements-grid-${timestamp}.jpg`,
    {
      type: "image/jpeg",
    }
  );

  console.log(
    `[PositionedGrid] Annotated grid created: ${(
      blob.size /
      1024 /
      1024
    ).toFixed(2)}MB (${canvas.width}x${canvas.height}px) with ${
      positionedElements.length
    } positioned elements`
  );

  return combinedFile;
}

/**
 * Calculates optimal grid layout for N images
 */
function calculateGridLayout(count: number): { rows: number; cols: number } {
  if (count === 1) return { rows: 1, cols: 1 };
  if (count === 2) return { rows: 1, cols: 2 };
  if (count === 3) return { rows: 1, cols: 3 };
  if (count === 4) return { rows: 2, cols: 2 };
  if (count <= 6) return { rows: 2, cols: 3 };
  if (count <= 9) return { rows: 3, cols: 3 };

  const cols = Math.ceil(Math.sqrt(count));
  const rows = Math.ceil(count / cols);
  return { rows, cols };
}

/**
 * Loads an image from a data URL
 */
function loadImageFromDataUrl(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      resolve(img);
    };

    img.onerror = () => {
      reject(new Error(`Failed to load image from data URL`));
    };

    img.src = dataUrl;
  });
}

/**
 * Generates a text description of positioned elements
 * Useful as a prompt addition to help AI understand the layout
 */
export function generatePositionedElementsDescription(
  positionedInstances: PositionedInstance[]
): string {
  if (positionedInstances.length === 0) {
    return "No elements are currently positioned on the canvas.";
  }

  const descriptions = positionedInstances.map((instance, index) => {
    const xPercent = Math.round(instance.position.x * 100);
    const yPercent = Math.round(instance.position.y * 100);

    return `Element ${
      index + 1
    }: positioned at (${xPercent}%, ${yPercent}%) on the canvas`;
  });

  return `Positioned Elements:\n${descriptions.join("\n")}`;
}
