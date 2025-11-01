import { useDropZoneWithStore } from "../integration/use-drop-zone-with-store";
import { useImageStore, generateImageId } from "@/store/image-store";
import { useBrowserImageDrop } from "../integration/use-browser-image-drop";

/**
 * Feature hook for element gallery drop zone.
 * Handles:
 * - Browser → element gallery (add as element)
 * - Desktop file → element gallery (add as element)
 */
export function useElementGalleryDrop() {
  const addElement = useImageStore((state) => state.addElement);

  // Handle browser image drops
  const {
    isDragAvailable: isBrowserDragAvailable,
    dragData,
    requestImageData,
  } = useBrowserImageDrop();

  const { isDragging, canAcceptDrop, dragSource, dropProps } =
    useDropZoneWithStore({
      target: "element-gallery",
      accept: ["image/*"],
      maxSize: 10 * 1024 * 1024, // 10MB
      onDrop: async (result, event) => {
        console.log("[useElementGalleryDrop] Processing drop", result);

        let file: File;
        let dataUrl: string;
        let dimensions: { width: number; height: number };

        if (result.source === "browser") {
          // Add browser image as element
          // Get imageUrl from dragData (set by useBrowserImageDrop)
          const imageUrl = dragData?.imageUrl || result.imageUrl;
          if (!imageUrl) {
            throw new Error("Missing imageUrl from browser drag");
          }

          console.log(
            "[useElementGalleryDrop] Browser drop - fetching image data",
            { imageUrl }
          );

          dataUrl = (await requestImageData(imageUrl)) || imageUrl;
          dimensions = await getImageDimensions(dataUrl);

          // Check if this image already exists in the element store
          const existingElement = useImageStore
            .getState()
            .elements.find((el) => el.dataUrl === dataUrl);

          if (existingElement) {
            console.log(
              "[useElementGalleryDrop] Browser image already exists in elements, skipping",
              { elementId: existingElement.id }
            );
            return; // Skip adding duplicate
          }

          const imageId = generateImageId();
          file = await dataUrlToFile(dataUrl, `${imageId}.png`);

          console.log(
            "[useElementGalleryDrop] Adding browser image as element"
          );
        } else if (result.source === "desktop" && result.file) {
          // Add desktop file as element
          file = result.file;
          dataUrl = await fileToDataUrl(file);
          dimensions = await getImageDimensions(dataUrl);

          console.log("[useElementGalleryDrop] Adding desktop file as element");
        } else {
          throw new Error(`Unsupported drop source: ${result.source}`);
        }

        addElement(file, dataUrl, dimensions);
      },
      onError: (error) => {
        console.error("[useElementGalleryDrop] Drop failed:", error);
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

async function dataUrlToFile(dataUrl: string, filename: string): Promise<File> {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  return new File([blob], filename, { type: blob.type });
}
