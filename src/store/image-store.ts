import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { dataUrlToFile } from "@/lib/image-transfer";
import { optimizeImage, OPTIMIZATION_PRESETS } from "@/lib/image-optimizer";
import { IMAGE_OPTIMIZATION } from "@/types/constants";

// Shared Image Metadata
export interface ImageMetadata {
  id: string;

  // Original (display quality)
  dataUrl: string;
  sizeInBytes: number;

  // API-optimized version (for LLM calls)
  apiFile?: File | null; // Optimized File for FormData
  apiDataUrl?: string; // Optimized data URL for preview
  apiSizeInBytes?: number;
  apiDimensions?: {
    width: number;
    height: number;
  };

  // Shared metadata
  aspectRatio: string; // e.g., "16:9", "4:3", "1:1"
  dimensions: {
    width: number;
    height: number;
  };
  createdAt: Date;
}

// Source Image (base image for composition)
export interface SourceImageData extends ImageMetadata {
  file: File | null;
  name?: string; // User-given or original filename
  description?: string;
}

// Element Image (images to be composed onto source)
export interface ElementImageData extends ImageMetadata {
  file: File | null;
}

// Positioned Instance (element placed on canvas)
export interface PositionedInstance {
  id: string; // Unique instance ID
  elementId: string; // Reference to ElementImageData
  position: {
    x: number; // Relative coordinates (0-1)
    y: number; // Relative coordinates (0-1)
  };
  lastMovedAt: Date; // Timestamp for z-order management
}

// Generated Image (AI-generated composition result)
export interface GeneratedImageData extends ImageMetadata {
  sourceImageId: string; // Reference to source image (or generated ID for external images)
  elementIds: string[]; // References to elements used
  prompt?: string; // Optional AI prompt used
  isExternal?: boolean; // True if image was dropped from browser/desktop, not AI-generated
}

// ------------------------------------------
// STORE STATES
// ------------------------------------------

interface ImageStoreState {
  // Source image
  sourceImage: SourceImageData | null;
  isSourceLoaded: boolean;

  // Elements (images to compose)
  elements: ElementImageData[];

  // Positioned instances (elements placed on canvas)
  positionedInstances: PositionedInstance[];

  // Generated images
  generatedImages: GeneratedImageData[];
  currentGeneratedImage: GeneratedImageData | null;

  // UI State
  isProcessing: boolean;
  lastAction: string | null;
  error: string | null;
}

// Store Actions
interface ImageStoreActions {
  // Source image actions
  setSourceImage: (
    file: File,
    dataUrl: string,
    dimensions: { width: number; height: number },
    name?: string,
    description?: string
  ) => void;
  setSourceImageFromGenerated: (generatedImage: GeneratedImageData) => void;
  clearSourceImage: () => void;

  // Element actions
  addElement: (
    file: File,
    dataUrl: string,
    dimensions: { width: number; height: number }
  ) => void;
  removeElement: (elementId: string) => void;
  clearElements: () => void;

  // Positioned instance actions
  addPositionedInstance: (elementId: string, x: number, y: number) => void;
  updateInstancePosition: (instanceId: string, x: number, y: number) => void;
  removePositionedInstance: (instanceId: string) => void;
  removeAllInstancesOfElement: (elementId: string) => void;
  clearPositionedInstances: () => void;

  // Generated image actions
  addGeneratedImage: (
    dataUrl: string,
    dimensions: { width: number; height: number },
    sourceImageId?: string,
    elementIds?: string[],
    prompt?: string,
    isExternal?: boolean
  ) => Promise<void>;
  setCurrentGeneratedImage: (image: GeneratedImageData | null) => void;
  removeGeneratedImage: (imageId: string) => void;
  clearGeneratedImages: () => void;

  // UI state actions
  setIsProcessing: (isProcessing: boolean) => void;
  setError: (error: string | null) => void;
  setLastAction: (action: string) => void;

  // API optimization actions
  setSourceApiOptimization: (
    apiFile: File,
    apiDataUrl: string,
    apiDimensions: { width: number; height: number }
  ) => void;
  setElementApiOptimization: (
    elementId: string,
    apiFile: File,
    apiDataUrl: string,
    apiDimensions: { width: number; height: number }
  ) => void;

  // Reset
  reset: () => void;
}

// Combined store type
type ImageStore = ImageStoreState & ImageStoreActions;

// Initial state
const initialState: ImageStoreState = {
  sourceImage: null,
  isSourceLoaded: false,
  elements: [],
  positionedInstances: [],
  generatedImages: [],
  currentGeneratedImage: null,
  isProcessing: false,
  lastAction: null,
  error: null,
};

// Logger utility
const logger = {
  info: (message: string, data?: any) => {
    console.log(`[ImageStore] ℹ️ ${message}`, data || "");
  },
  action: (message: string, data?: any) => {
    console.log(`[ImageStore] ⚡ ${message}`, data || "");
  },
  error: (message: string, error?: any) => {
    console.error(`[ImageStore] ❌ ${message}`, error || "");
  },
};

// Create the store
export const useImageStore = create<ImageStore>()(
  devtools(
    (set, get) => ({
      // Initial state
      ...initialState,

      // Source image actions
      setSourceImage: async (file, dataUrl, dimensions, name, description) => {
        logger.action("Setting source image", {
          fileName: file.name,
          dimensions,
          size: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
        });

        const metadata = createImageMetadata(dataUrl, dimensions, file.size);
        const sourceImage: SourceImageData = {
          ...metadata,
          file,
          name: name || file.name,
          description,
        };

        // Immediately set the original image (user sees it right away)
        set({
          sourceImage,
          isSourceLoaded: true,
          positionedInstances: [], // Clear positioned instances when setting new source
          currentGeneratedImage: null, // Clear current generated reference to start fresh
          lastAction: "setSourceImage",
        });

        // Handle optimization with smart fallback
        await handleOptimization(
          file,
          dataUrl,
          dimensions,
          IMAGE_OPTIMIZATION.SOURCE_THRESHOLD,
          OPTIMIZATION_PRESETS.source,
          "source",
          (apiFile, apiDataUrl, apiDimensions) => {
            get().setSourceApiOptimization(apiFile, apiDataUrl, apiDimensions);
          }
        );
      },

      setSourceImageFromGenerated: async (generatedImage) => {
        logger.action("Setting source image from generated", {
          imageId: generatedImage.id,
          dimensions: generatedImage.dimensions,
        });

        // Convert dataUrl to File object using the existing image ID for consistency
        const file = dataUrlToFile(
          generatedImage.dataUrl,
          `${generatedImage.id}.png`
        );

        const sourceImage: SourceImageData = {
          ...generatedImage,
          file, // Now we have a File object with ID-based filename!
          name: `Generated ${new Date(
            generatedImage.createdAt
          ).toLocaleTimeString()}`,
          description: generatedImage.prompt || "Generated composition",
        };

        logger.action(
          "Clearing currentGeneratedImage in setSourceImageFromGenerated"
        );

        // Immediately set the source image (user sees it right away)
        set({
          sourceImage,
          isSourceLoaded: true,
          positionedInstances: [], // Clear positioned instances when loading generated as source
          currentGeneratedImage: null, // Clear current generated reference to start fresh
          lastAction: "setSourceImageFromGenerated",
        });

        // If generated image already has API optimization, use it directly
        if (
          generatedImage.apiFile &&
          generatedImage.apiDataUrl &&
          generatedImage.apiDimensions
        ) {
          logger.info("Using existing optimization from generated image");
          get().setSourceApiOptimization(
            generatedImage.apiFile,
            generatedImage.apiDataUrl,
            generatedImage.apiDimensions
          );
          return;
        }

        // Otherwise, handle optimization with smart fallback
        await handleOptimization(
          file,
          generatedImage.dataUrl,
          generatedImage.dimensions,
          IMAGE_OPTIMIZATION.SOURCE_THRESHOLD,
          OPTIMIZATION_PRESETS.source,
          "generated source",
          (apiFile, apiDataUrl, apiDimensions) => {
            get().setSourceApiOptimization(apiFile, apiDataUrl, apiDimensions);
          }
        );
      },

      clearSourceImage: () => {
        logger.action("Clearing source image");
        set({
          sourceImage: null,
          isSourceLoaded: false,
          elements: [], // Clear elements when source is cleared
          positionedInstances: [], // Clear positioned instances when source is cleared
          lastAction: "clearSourceImage",
        });
      },

      // Element actions
      addElement: async (file, dataUrl, dimensions) => {
        logger.action("Adding element", {
          fileName: file?.name,
          dimensions,
          size: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
        });

        const metadata = createImageMetadata(dataUrl, dimensions, file.size);
        const element: ElementImageData = {
          ...metadata,
          file,
        };

        // Immediately add element with original (user sees it right away)
        set((state: ImageStore) => ({
          elements: [...state.elements, element],
          lastAction: "addElement",
        }));

        // Handle optimization with smart fallback
        await handleOptimization(
          file,
          dataUrl,
          dimensions,
          IMAGE_OPTIMIZATION.ELEMENT_THRESHOLD,
          OPTIMIZATION_PRESETS.element,
          "element",
          (apiFile, apiDataUrl, apiDimensions) => {
            get().setElementApiOptimization(
              element.id,
              apiFile,
              apiDataUrl,
              apiDimensions
            );
          },
          element.id
        );
      },

      // Positioned instance actions
      addPositionedInstance: (elementId, x, y) => {
        logger.action("Adding positioned instance", { elementId, x, y });

        const instance: PositionedInstance = {
          id: generateImageId(), // Generate unique instance ID
          elementId,
          position: { x, y },
          lastMovedAt: new Date(),
        };

        set((state) => ({
          positionedInstances: [...state.positionedInstances, instance],
          lastAction: "addPositionedInstance",
        }));
      },

      updateInstancePosition: (instanceId, x, y) => {
        logger.action("Updating instance position", { instanceId, x, y });

        set((state) => ({
          positionedInstances: state.positionedInstances.map((instance) =>
            instance.id === instanceId
              ? { ...instance, position: { x, y }, lastMovedAt: new Date() }
              : instance
          ),
          lastAction: "updateInstancePosition",
        }));
      },

      removePositionedInstance: (instanceId) => {
        logger.action("Removing positioned instance", { instanceId });

        set((state) => ({
          positionedInstances: state.positionedInstances.filter(
            (instance) => instance.id !== instanceId
          ),
          lastAction: "removePositionedInstance",
        }));
      },

      removeAllInstancesOfElement: (elementId) => {
        logger.action("Removing all instances of element", { elementId });

        set((state) => ({
          positionedInstances: state.positionedInstances.filter(
            (instance) => instance.elementId !== elementId
          ),
          lastAction: "removeAllInstancesOfElement",
        }));
      },

      clearPositionedInstances: () => {
        logger.action("Clearing all positioned instances");

        set({
          positionedInstances: [],
          lastAction: "clearPositionedInstances",
        });
      },

      removeElement: (elementId) => {
        logger.action("Removing element", { elementId });

        set((state) => ({
          elements: state.elements.filter(
            (element) => element.id !== elementId
          ),
          lastAction: "removeElement",
        }));
      },

      clearElements: () => {
        logger.action("Clearing all elements");
        set({
          elements: [],
          lastAction: "clearElements",
        });
      },

      /*
        Used by core-generated-gallery to load initial set of images
      */
      addGeneratedImage: async (
        dataUrl,
        dimensions,
        sourceImageId,
        elementIds,
        prompt,
        isExternal
      ) => {
        // For external images, generate a random sourceImageId
        const finalSourceImageId = sourceImageId || generateImageId();
        const finalElementIds = elementIds || [];

        logger.action("Adding generated image", {
          sourceImageId: finalSourceImageId,
          elementCount: finalElementIds.length,
          isExternal: isExternal || false,
        });

        const metadata = createImageMetadata(dataUrl, dimensions);
        const generatedImage: GeneratedImageData = {
          ...metadata,
          sourceImageId: finalSourceImageId,
          elementIds: finalElementIds,
          prompt,
          isExternal,
        };

        // Immediately add the generated image (user sees it right away)
        set((state: ImageStore) => ({
          generatedImages: [...state.generatedImages, generatedImage],
          currentGeneratedImage: generatedImage,
          lastAction: "addGeneratedImage",
        }));

        // Convert dataUrl to File for optimization
        const file = dataUrlToFile(dataUrl, `${metadata.id}.png`);

        // Handle optimization with smart fallback (using source threshold since these can become sources)
        await handleOptimization(
          file,
          dataUrl,
          dimensions,
          IMAGE_OPTIMIZATION.SOURCE_THRESHOLD,
          OPTIMIZATION_PRESETS.source,
          "generated image",
          (apiFile, apiDataUrl, apiDimensions) => {
            // Update the generated image with optimized version
            set((state) => ({
              generatedImages: state.generatedImages.map((img) =>
                img.id === metadata.id
                  ? {
                      ...img,
                      apiFile,
                      apiDataUrl,
                      apiSizeInBytes: apiFile.size,
                      apiDimensions,
                    }
                  : img
              ),
              lastAction: "setGeneratedImageApiOptimization",
            }));
          }
        );
      },

      setCurrentGeneratedImage: (image) => {
        logger.action("Setting current generated image", {
          imageId: image?.id,
        });
        set({
          currentGeneratedImage: image,
          lastAction: "setCurrentGeneratedImage",
        });
      },

      removeGeneratedImage: (imageId) => {
        logger.action("Removing generated image", { imageId });

        set((state) => {
          const updatedImages = state.generatedImages.filter(
            (img) => img.id !== imageId
          );
          const isCurrent = state.currentGeneratedImage?.id === imageId;

          return {
            generatedImages: updatedImages,
            currentGeneratedImage: isCurrent
              ? updatedImages[updatedImages.length - 1] || null
              : state.currentGeneratedImage,
            lastAction: "removeGeneratedImage",
          };
        });
      },

      clearGeneratedImages: () => {
        logger.action("Clearing all generated images");
        set({
          generatedImages: [],
          currentGeneratedImage: null,
          lastAction: "clearGeneratedImages",
        });
      },

      // UI state actions
      setIsProcessing: (isProcessing) => {
        set({ isProcessing });
      },

      setError: (error) => {
        if (error) {
          logger.error("Error set", error);
        }
        set({ error });
      },

      setLastAction: (action) => {
        set({ lastAction: action });
      },

      // API optimization actions
      setSourceApiOptimization: (apiFile, apiDataUrl, apiDimensions) => {
        logger.action("Setting source API optimization", {
          apiSize: `${(apiFile.size / 1024 / 1024).toFixed(2)}MB`,
          apiDimensions,
        });

        set((state) => ({
          sourceImage: state.sourceImage
            ? {
                ...state.sourceImage,
                apiFile,
                apiDataUrl,
                apiSizeInBytes: apiFile.size,
                apiDimensions,
              }
            : null,
          lastAction: "setSourceApiOptimization",
        }));
      },

      setElementApiOptimization: (
        elementId,
        apiFile,
        apiDataUrl,
        apiDimensions
      ) => {
        logger.action("Setting element API optimization", {
          elementId,
          apiSize: `${(apiFile.size / 1024 / 1024).toFixed(2)}MB`,
          apiDimensions,
        });

        set((state) => ({
          elements: state.elements.map((element) =>
            element.id === elementId
              ? {
                  ...element,
                  apiFile,
                  apiDataUrl,
                  apiSizeInBytes: apiFile.size,
                  apiDimensions,
                }
              : element
          ),
          lastAction: "setElementApiOptimization",
        }));
      },

      // Reset
      reset: () => {
        logger.action("Resetting image store");
        set(initialState);
      },
    }),
    { name: "ImageStore" }
  )
);

// Selectors (optional but recommended for performance)
export const selectSourceImage = (state: ImageStore) => state.sourceImage;
export const selectIsSourceLoaded = (state: ImageStore) => state.isSourceLoaded;
export const selectElements = (state: ImageStore) => state.elements;

// API-optimized selectors (for LLM calls)
// NOTE: Components using these should use Zustand's shallow comparison or useMemo
// to prevent re-renders, since we return new objects
export const selectSourceImageForApi = (state: ImageStore) => {
  if (!state.sourceImage) return null;

  // Return the source image itself - let components handle optimization
  return state.sourceImage;
};

export const selectElementsForApi = (state: ImageStore) => {
  // Return elements array directly - it's already stable
  return state.elements;
};

/*
❌ DANGEROUS - creates new array every time
  Careful of usage with these functions that perform filters. 
  It may cause infinite re-renders.
*/
export const selectPositionedInstances = (state: ImageStore) =>
  state.positionedInstances;
export const selectGeneratedImages = (state: ImageStore) =>
  state.generatedImages;
export const selectCurrentGeneratedImage = (state: ImageStore) =>
  state.currentGeneratedImage;
export const selectIsProcessing = (state: ImageStore) => state.isProcessing;
export const selectError = (state: ImageStore) => state.error;

// Additional useful selectors
export const selectElementById = (elementId: string) => (state: ImageStore) =>
  state.elements.find((el) => el.id === elementId);
export const selectInstanceById = (instanceId: string) => (state: ImageStore) =>
  state.positionedInstances.find((inst) => inst.id === instanceId);
export const selectGeneratedImageById =
  (imageId: string) => (state: ImageStore) =>
    state.generatedImages.find((img) => img.id === imageId);
export const selectElementCount = (state: ImageStore) => state.elements.length;
export const selectPositionedInstanceCount = (state: ImageStore) =>
  state.positionedInstances.length;
export const selectHasSourceImage = (state: ImageStore) =>
  state.sourceImage !== null;
export const selectCanCompose = (state: ImageStore) =>
  state.sourceImage !== null &&
  state.positionedInstances.length > 0 &&
  !state.isProcessing;

// ------------------------------------------
// IMAGE OPTIMIZATION
// ------------------------------------------

// Payload size selectors (for budget tracking)
export const selectTotalOriginalSize = (state: ImageStore) => {
  const sourceSize = state.sourceImage?.sizeInBytes || 0;

  // Get unique element IDs from positioned instances
  const positionedElementIds = new Set(
    state.positionedInstances.map((inst) => inst.elementId)
  );

  const elementsSize = state.elements
    .filter((el) => positionedElementIds.has(el.id))
    .reduce((sum, el) => sum + el.sizeInBytes, 0);

  return sourceSize + elementsSize; // returns NUMBER (primitive), thus safe for comparisons
};

export const selectTotalApiSize = (state: ImageStore) => {
  const sourceSize =
    state.sourceImage?.apiSizeInBytes || state.sourceImage?.sizeInBytes || 0;

  // Get unique element IDs from positioned instances
  const positionedElementIds = new Set(
    state.positionedInstances.map((inst) => inst.elementId)
  );

  const elementsSize = state.elements
    .filter((el) => positionedElementIds.has(el.id))
    .reduce((sum, el) => sum + (el.apiSizeInBytes || el.sizeInBytes), 0);

  return sourceSize + elementsSize;
};

export const selectNeedsOptimization = (state: ImageStore) => {
  const totalSize = selectTotalOriginalSize(state);
  return totalSize > 18 * 1024 * 1024; // 18MB threshold
};

export const selectHasApiOptimizations = (state: ImageStore) => {
  const sourceHasApi = !!state.sourceImage?.apiFile;

  // Get unique element IDs from positioned instances
  const positionedElementIds = new Set(
    state.positionedInstances.map((inst) => inst.elementId)
  );

  const elementsWithApi = state.elements.filter(
    (el) => positionedElementIds.has(el.id) && el.apiFile
  );

  return sourceHasApi && elementsWithApi.length > 0;
};

// ------------------------------------------
// UTILITY FUNCTIONS
// ------------------------------------------

// Helper to handle optimization with smart fallback and logging
const handleOptimization = async (
  file: File,
  dataUrl: string,
  dimensions: { width: number; height: number },
  threshold: number,
  preset:
    | typeof OPTIMIZATION_PRESETS.source
    | typeof OPTIMIZATION_PRESETS.element,
  type: "source" | "generated source" | "element" | "generated image",
  onSuccess: (
    apiFile: File,
    apiDataUrl: string,
    apiDimensions: { width: number; height: number }
  ) => void,
  elementId?: string
) => {
  const thresholdMB = threshold / 1024 / 1024;

  // Check if optimization needed
  if (file.size >= threshold) {
    logger.info(`${type} exceeds ${thresholdMB}MB threshold, optimizing...`);

    try {
      const optimized = await optimizeImage(file, preset);

      // Only use optimized version if it's actually smaller
      if (optimized.wasOptimized && optimized.file.size < file.size) {
        logger.info(`${type} optimization successful, using optimized version`);
        onSuccess(optimized.file, optimized.dataUrl, optimized.dimensions);
      } else {
        logger.info(`Optimized ${type} not smaller, using original for API`);
        console.warn(
          `[ImageStore] 🚫 ${type} optimization REJECTED for ${file.name}:`,
          {
            ...(elementId && { elementId }),
            originalSize: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
            optimizedSize: `${(optimized.file.size / 1024 / 1024).toFixed(
              2
            )}MB`,
            originalDimensions: dimensions,
            optimizedDimensions: optimized.dimensions,
            compressionRatio: `${(optimized.compressionRatio * 100).toFixed(
              1
            )}%`,
            wasOptimized: optimized.wasOptimized,
            decision: "Using original file for API calls",
          }
        );
        onSuccess(file, dataUrl, dimensions);
      }
    } catch (error) {
      logger.error(`${type} optimization failed, using original`, error);
      // Fallback to original
      onSuccess(file, dataUrl, dimensions);
    }
  } else {
    // Use original as API version (no optimization needed)
    logger.info(`${type} below threshold, using original for API`);
    onSuccess(file, dataUrl, dimensions);
  }
};

// Helper to get image dimensions from data URL
export const getImageDimensionsFromDataUrl = (
  dataUrl: string
): Promise<{ width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.width, height: img.height });
    };
    img.onerror = () => {
      reject(new Error("Failed to load image"));
    };
    img.src = dataUrl;
  });
};

// Helper to calculate aspect ratio
const calculateAspectRatio = (width: number, height: number): string => {
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  const divisor = gcd(width, height);
  const ratioWidth = width / divisor;
  const ratioHeight = height / divisor;

  // Common aspect ratios
  const ratio = width / height;
  if (Math.abs(ratio - 16 / 9) < 0.01) return "16:9";
  if (Math.abs(ratio - 4 / 3) < 0.01) return "4:3";
  if (Math.abs(ratio - 1) < 0.01) return "1:1";
  if (Math.abs(ratio - 3 / 2) < 0.01) return "3:2";
  if (Math.abs(ratio - 21 / 9) < 0.01) return "21:9";

  return `${ratioWidth}:${ratioHeight}`;
};

// Helper to get file size from data URL
const getDataUrlSize = (dataUrl: string): number => {
  // Remove data URL prefix to get base64 string
  const base64 = dataUrl.split(",")[1] || dataUrl;
  // Calculate size: base64 uses 4 chars for 3 bytes
  return Math.ceil((base64.length * 3) / 4);
};

// Helper to generate unique image ID
export const generateImageId = (): string => {
  return `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// Helper to create image metadata
export const createImageMetadata = (
  dataUrl: string,
  dimensions: { width: number; height: number },
  fileSize?: number
): ImageMetadata => {
  return {
    id: generateImageId(),
    dataUrl,
    sizeInBytes: fileSize || getDataUrlSize(dataUrl),
    aspectRatio: calculateAspectRatio(dimensions.width, dimensions.height),
    dimensions,
    createdAt: new Date(),
  };
};
