import { selectGeneratedCarouselIndex, useAppStore } from "@/store";
import { selectGeneratedImages, useImageStore } from "@/store/image-store";
import { TITLES } from "@/types/constants";
import { useEffect, useMemo } from "react";
import CanvasHeader from "../canvas-header";
import { CanvasElementOverlay } from "./canvas-element-overlay";
import CanvasHeroImage from "./canvas-hero-image";

export function CanvasEditor() {
  // ─────────────────────────────────────────
  // Data Layer (Image Store)
  // ─────────────────────────────────────────
  const sourceImage = useImageStore((state) => state.sourceImage);
  const setSourceImageFromGenerated = useImageStore(
    (state) => state.setSourceImageFromGenerated
  );
  const generatedImages = useImageStore(selectGeneratedImages);
  const generatedCarouselIndex = useAppStore(selectGeneratedCarouselIndex);

  // Get positioned instances and elements
  const positionedInstances = useImageStore(
    (state) => state.positionedInstances
  );
  const elements = useImageStore((state) => state.elements);

  // Sort positioned instances by lastMovedAt for z-order (most recent on top)
  const sortedInstances = useMemo(() => {
    return [...positionedInstances].sort((a, b) => {
      const aTime = a.lastMovedAt?.getTime() || 0;
      const bTime = b.lastMovedAt?.getTime() || 0;
      return aTime - bTime; // Earlier moved elements render first (lower z-index)
    });
  }, [positionedInstances]);

  // ─────────────────────────────────────────
  // Effect: Load source image from carousel on mount
  // ─────────────────────────────────────────
  useEffect(() => {
    if (!sourceImage && generatedImages.length > 0) {
      const imageToLoad = generatedImages[generatedCarouselIndex];
      if (imageToLoad) {
        console.log(
          "[CanvasEditor] Loading source from carousel index",
          generatedCarouselIndex,
          imageToLoad.id
        );
        setSourceImageFromGenerated(imageToLoad);
      }
    }
    //todo wait for generatedImages to load first?
  }, []); // Run only once on mount

  if (!sourceImage) return null;

  return (
    <div className="relative w-full h-full overflow-hidden">
      <CanvasHeader title={TITLES.CANVAS} />
      <div className="my-4" />

      {/* Display Image (Source) - z-0 */}
      <CanvasHeroImage
        src={sourceImage.apiDataUrl || sourceImage.dataUrl}
        alt="Source Image"
        objectFit="contain"
      />

      {/* Positioned Element Overlays - z-10+ */}
      {sortedInstances.map((instance, index) => {
        const element = elements.find((el) => el.id === instance.elementId);
        if (!element) return null; // Element was deleted

        return (
          <CanvasElementOverlay
            key={instance.id}
            instance={instance}
            element={element}
            zIndex={10 + index} // Start at z-10, increment for each element
          />
        );
      })}
    </div>
  );
}
