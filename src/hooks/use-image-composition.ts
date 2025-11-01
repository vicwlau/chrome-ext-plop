import { useState, useCallback } from "react";

// Types
export interface ImageData {
  file: File | null;
  dataUrl: string;
  dimensions: {
    width: number;
    height: number;
  };
}

export interface ElementData {
  id: string;
  file: File | null;
  dataUrl: string;
  dimensions: {
    width: number;
    height: number;
  };
  position: {
    x: number; // Relative coordinates (0-1)
    y: number; // Relative coordinates (0-1)
  } | null; // null until positioned
  timestamp: number;
}

export interface CompositionState {
  sourceImage: ImageData | null;
  elements: ElementData[];
  isSourceLoaded: boolean;
  isProcessing: boolean;
  lastAction: string | null;
}

interface UseImageCompositionReturn extends CompositionState {
  setSourceImage: (file: File, dataUrl: string) => Promise<void>;
  addElement: (file: File, dataUrl: string) => Promise<void>;
  updateElementPosition: (elementId: string, x: number, y: number) => void;
  removeElement: (elementId: string) => void;
  clearSource: () => void;
  reset: () => void;
}

const logger = {
  info: (message: string, data?: any) => {
    console.log(`[Composition] ℹ️ ${message}`, data || "");
  },
  state: (message: string, state: any) => {
    console.log(`[Composition] 📊 ${message}`, state);
  },
  action: (message: string, data?: any) => {
    console.log(`[Composition] ⚡ ${message}`, data || "");
  },
  error: (message: string, error?: any) => {
    console.error(`[Composition] ❌ ${message}`, error || "");
  },
};

/**
 * Central state manager for image composition workflow
 * Manages source image, elements, and their positions
 */
export const useImageComposition = (): UseImageCompositionReturn => {
  const [state, setState] = useState<CompositionState>({
    sourceImage: null,
    elements: [],
    isSourceLoaded: false,
    isProcessing: false,
    lastAction: null,
  });

  // Helper to get image dimensions
  const getImageDimensions = useCallback(
    (dataUrl: string): Promise<{ width: number; height: number }> => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          logger.info("Image dimensions calculated", {
            width: img.width,
            height: img.height,
          });
          resolve({ width: img.width, height: img.height });
        };
        img.onerror = () => {
          logger.error("Failed to load image for dimensions");
          reject(new Error("Failed to load image"));
        };
        img.src = dataUrl;
      });
    },
    []
  );

  // Set source image
  const setSourceImage = useCallback(
    async (file: File, dataUrl: string) => {
      logger.action("Setting source image", {
        fileName: file.name,
        fileSize: file.size,
        dataUrlLength: dataUrl.length,
      });

      setState((prev) => ({
        ...prev,
        isProcessing: true,
        lastAction: "Loading source image...",
      }));

      try {
        const dimensions = await getImageDimensions(dataUrl);

        const newState: CompositionState = {
          sourceImage: {
            file,
            dataUrl,
            dimensions,
          },
          elements: [],
          isSourceLoaded: true,
          isProcessing: false,
          lastAction: "Source image loaded",
        };

        setState(newState);
        logger.state("Source image set", newState.sourceImage);
      } catch (error) {
        logger.error("Failed to set source image", error);
        setState((prev) => ({
          ...prev,
          isProcessing: false,
          lastAction: "Failed to load source image",
        }));
      }
    },
    [getImageDimensions]
  );

  // Add element
  const addElement = useCallback(
    async (file: File, dataUrl: string) => {
      logger.action("Adding element", {
        fileName: file.name,
        fileSize: file.size,
        dataUrlLength: dataUrl.length,
      });

      setState((prev) => ({
        ...prev,
        isProcessing: true,
        lastAction: "Loading element...",
      }));

      try {
        const dimensions = await getImageDimensions(dataUrl);

        const newElement: ElementData = {
          id: `element-${Date.now()}-${Math.random()
            .toString(36)
            .substr(2, 9)}`,
          file,
          dataUrl,
          dimensions,
          position: null, // Not positioned yet
          timestamp: Date.now(),
        };

        setState((prev) => {
          const newState = {
            ...prev,
            elements: [...prev.elements, newElement],
            isProcessing: false,
            lastAction: `Element added (${prev.elements.length + 1} total)`,
          };
          logger.state("Element added", {
            element: newElement,
            totalElements: newState.elements.length,
          });
          return newState;
        });
      } catch (error) {
        logger.error("Failed to add element", error);
        setState((prev) => ({
          ...prev,
          isProcessing: false,
          lastAction: "Failed to add element",
        }));
      }
    },
    [getImageDimensions]
  );

  // Update element position (relative coordinates 0-1)
  const updateElementPosition = useCallback(
    (elementId: string, x: number, y: number) => {
      logger.action("Updating element position", {
        elementId,
        x: x.toFixed(3),
        y: y.toFixed(3),
      });

      setState((prev) => {
        const elementIndex = prev.elements.findIndex(
          (el) => el.id === elementId
        );
        if (elementIndex === -1) {
          logger.error("Element not found", elementId);
          return prev;
        }

        const updatedElements = [...prev.elements];
        updatedElements[elementIndex] = {
          ...updatedElements[elementIndex],
          position: { x, y },
        };

        const newState = {
          ...prev,
          elements: updatedElements,
          lastAction: `Element positioned at (${x.toFixed(2)}, ${y.toFixed(
            2
          )})`,
        };

        logger.state("Element position updated", {
          elementId,
          position: { x, y },
        });

        return newState;
      });
    },
    []
  );

  // Remove element
  const removeElement = useCallback((elementId: string) => {
    logger.action("Removing element", elementId);

    setState((prev) => {
      const newState = {
        ...prev,
        elements: prev.elements.filter((el) => el.id !== elementId),
        lastAction: `Element removed (${prev.elements.length - 1} remaining)`,
      };
      logger.state("Element removed", {
        elementId,
        remainingElements: newState.elements.length,
      });
      return newState;
    });
  }, []);

  // Clear source (also clears all elements)
  const clearSource = useCallback(() => {
    logger.action("Clearing source image");

    setState({
      sourceImage: null,
      elements: [],
      isSourceLoaded: false,
      isProcessing: false,
      lastAction: "Source cleared",
    });

    logger.state("Source cleared", {});
  }, []);

  // Reset everything
  const reset = useCallback(() => {
    logger.action("Resetting composition");

    setState({
      sourceImage: null,
      elements: [],
      isSourceLoaded: false,
      isProcessing: false,
      lastAction: null,
    });

    logger.state("Composition reset", {});
  }, []);

  return {
    ...state,
    setSourceImage,
    addElement,
    updateElementPosition,
    removeElement,
    clearSource,
    reset,
  };
};
