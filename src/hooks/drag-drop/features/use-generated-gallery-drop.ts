import { useDropZoneWithStore } from "../integration/use-drop-zone-with-store";
import { useImageStore } from "@/store/image-store";
import { useBrowserImageDrop } from "../integration/use-browser-image-drop";

interface UseGeneratedGalleryDropOptions {
  onDropSuccess?: (imageId: string) => void;
}

/**
 * Feature hook for generated gallery drop zone.
 * Handles:
 * - Browser → generated gallery (add as external generated image)
 * - Desktop file → generated gallery (add as external generated image)
 */
export function useGeneratedGalleryDrop({
  onDropSuccess,
}: UseGeneratedGalleryDropOptions = {}) {
  const addGeneratedImage = useImageStore((state) => state.addGeneratedImage);

  // Handle browser image drops
  const {
    isDragAvailable: isBrowserDragAvailable,
    dragData,
    requestImageData,
  } = useBrowserImageDrop();

  const { isDragging, canAcceptDrop, dragSource, dropProps } =
    useDropZoneWithStore({
      target: "generated-gallery",
      accept: ["image/*"],
      onDrop: async (result, event) => {
        console.log("[useGeneratedGalleryDrop] Processing drop", result);

        let dataUrl: string;
        let dimensions: { width: number; height: number };

        /*
          FROM BROWSER
        */
        if (result.source === "browser") {
          // Get imageUrl from dragData (set by useBrowserImageDrop)
          const imageUrl = dragData?.imageUrl || result.imageUrl;
          if (!imageUrl) {
            throw new Error("Missing imageUrl from browser drag");
          }

          console.log(
            "[useGeneratedGalleryDrop] Browser drop - fetching image data",
            { imageUrl }
          );

          // Request full image data from background
          const fetchedDataUrl = await requestImageData(imageUrl);
          if (!fetchedDataUrl) {
            throw new Error("Failed to fetch browser image");
          }

          console.log(
            "[useGeneratedGalleryDrop] Browser drop - image data fetched successfully"
          );

          dataUrl = fetchedDataUrl;
          dimensions = await getImageDimensions(dataUrl);

          console.log(
            "[useGeneratedGalleryDrop] Adding browser image to generated gallery",
            { dimensions }
          );
        } else if (result.source === "desktop" && result.file) {

        /*
          FROM DESKTOP
        */
          console.log(
            "[useGeneratedGalleryDrop] Desktop drop - converting file",
            { fileName: result.file.name }
          );

          dataUrl = await fileToDataUrl(result.file);
          dimensions = await getImageDimensions(dataUrl);

          console.log(
            "[useGeneratedGalleryDrop] Adding desktop file to generated gallery",
            { dimensions }
          );
        } else {
          throw new Error(
            `Unsupported drop source for generated gallery: ${result.source}`
          );
        }

        // Add to generated gallery with isExternal flag
        // sourceImageId will be auto-generated, elementIds will be empty array
        addGeneratedImage(
          dataUrl,
          dimensions,
          undefined, // sourceImageId - will be auto-generated
          undefined, // elementIds - will default to []
          undefined, // prompt - none for external images
          true // isExternal - mark as external
        );

        console.log(
          "[useGeneratedGalleryDrop] Successfully added external image to generated gallery"
        );

        // Get the newly added image (it's the last one in the array)
        const generatedImages = useImageStore.getState().generatedImages;
        const newImage = generatedImages[generatedImages.length - 1];
        if (newImage && onDropSuccess) {
          onDropSuccess(newImage.id);
        }
      },
      onError: (error) => {
        console.error("[useGeneratedGalleryDrop] Drop failed:", error);
      },
    });

  return {
    isDragging: isDragging || isBrowserDragAvailable,
    canAcceptDrop,
    dragSource,
    isBrowserDragAvailable,
    acceptedSources: ["browser", "desktop"] as const,
    dropProps,
  };
}

// Helper utilities

function getImageDimensions(
  dataUrl: string
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.width, height: img.height });
    img.onerror = reject;
    img.src = dataUrl;
  });
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
