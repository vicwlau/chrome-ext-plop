"use client";

import { DragOverlay } from "@/components/ui/drag-overlay";
import { useCarouselContainer, useCarouselItem } from "@/hooks/carousel";
import { useElementGalleryDrag } from "@/hooks/drag-drop/features/use-element-gallery-drag";
import { useElementGalleryDrop } from "@/hooks/drag-drop/features/use-element-gallery-drop";
import { captureArea, dataUrlToFile } from "@/lib/capture-screenshot";
import { injectAreaSelectorOverlay } from "@/lib/inject-area-selector";
import { useAppStore } from "@/store/app-store";
import { useImageStore, type ElementImageData } from "@/store/image-store";
import clsx from "clsx";
import { ChevronLeft, ChevronRight, Scan, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

// ------------------------------------------
// CONSTANTS
// ------------------------------------------
const SELECTED_DIMENSIONS = { width: 130, height: 130 };
const NOT_SELECTED_DIMENSIONS = { width: 80, height: 80 };
const MIN_HEIGHT = SELECTED_DIMENSIONS.height + 80; // extra for action buttons

const EXAMPLE_IMAGES = [
  {
    id: "1",
    src: "/items/blue-chair.jpg",
  },
  {
    id: "2",
    src: "/items/artwork.png",
  },
  {
    id: "3",
    src: "/items/coffee-table.png",
  },
  {
    id: "4",
    src: "/items/couch.png",
  },
];

interface ElementsGalleryProps {
  className?: string;
}
export default function ElementsGallery({ className }: ElementsGalleryProps) {
  // Get elements from store
  const elements = useImageStore((state) => state.elements);
  const addElement = useImageStore((state) => state.addElement);
  const removeElement = useImageStore((state) => state.removeElement);

  // Track if images have been loaded to prevent duplicates
  const hasLoadedRef = useRef(false);

  // Track previous element count to detect additions
  const prevElementCountRef = useRef(elements.length);

  // Load example images into store on mount
  useEffect(() => {
    // Only load once
    if (hasLoadedRef.current) return;
    if (elements.length > 0) return; // Already have elements

    hasLoadedRef.current = true;

    loadExampleImages(addElement);
  }, [elements.length, addElement]);

  // Use carousel container hook
  const {
    selectedIndex,
    scrollContainerRef,
    itemRefs,
    handleSelectItem,
    scrollToCenter,
    setItemRef,
    canScrollPrev,
    canScrollNext,
    scrollPrev,
    scrollNext,
  } = useCarouselContainer({
    itemCount: elements.length,
    initialIndex: 0,
  });

  // Auto-scroll to newly added element
  useEffect(() => {
    const prevCount = prevElementCountRef.current;
    const currentCount = elements.length;

    // Check if a new element was added (count increased)
    if (currentCount > prevCount && currentCount > 0) {
      const newElementIndex = currentCount - 1;
      console.log(
        "[ElementsGallery] New element added, scrolling to index:",
        newElementIndex
      );

      // Small delay to ensure DOM is updated and refs are set
      const timer = setTimeout(() => {
        handleSelectItem(newElementIndex);
      }, 100);

      // Update the ref
      prevElementCountRef.current = currentCount;

      return () => clearTimeout(timer);
    } else {
      // Just update the ref without scrolling
      prevElementCountRef.current = currentCount;
    }
  }, [elements.length, handleSelectItem]);

  // Use element gallery drop hook to enable browser image drops
  const { isDragging, dragSource, dropProps } = useElementGalleryDrop();

  const handleRemoveElement = (element: ElementImageData) => {
    console.log("[ElementsGallery] Removing element:", element.id);
    removeElement(element.id);
    toast.success("object removed");
  };

  // No images state
  if (elements.length === 0) {
    return <EmptyState />;
  }

  return (
    <div
      className={clsx(
        "w-full flex flex-col items-center justify-center relative",
        className
      )}
    >
      <div className="mt-20" />
      <div className="w-full py-0 flex items-center ml-4">
        {/* Left Arrow Button */}
        <button
          onClick={scrollPrev}
          disabled={!canScrollPrev}
          className={clsx(
            "flex items-center justify-center w-8 h-8 rounded-full",
            "bg-white hover:bg-gray-100 transition-all",
            "disabled:opacity-30 disabled:cursor-not-allowed",
            "mr-2"
          )}
          aria-label="Previous element"
        >
          <ChevronLeft className="w-4 h-4 text-gray-700" />
        </button>

        {/* Carousel Container */}
        <div
          ref={scrollContainerRef}
          {...dropProps}
          className={clsx(
            "flex-1 flex items-center justify-start overflow-x-auto scrollbar-hide p-4 transition-colors"
          )}
          style={{
            gap: "8px",
            scrollbarWidth: "none",
            msOverflowStyle: "none",
            minHeight: `${MIN_HEIGHT}px`,
            scrollBehavior: "smooth",
          }}
        >
          {elements.map((element, index) => (
            <CarouselElementImageItem
              key={element.id}
              element={element}
              index={index}
              selectedIndex={selectedIndex}
              onSelect={handleSelectItem}
              onRemove={handleRemoveElement}
              setRef={setItemRef}
            />
          ))}
        </div>

        {/* Right Arrow Button */}
        <button
          onClick={scrollNext}
          disabled={!canScrollNext}
          className={clsx(
            "flex items-center justify-center w-8 h-8 rounded-full",
            "bg-white hover:bg-gray-100 transition-all",
            "disabled:opacity-30 disabled:cursor-not-allowed",
            "ml-2"
          )}
          aria-label="Next element"
        >
          <ChevronRight className="w-4 h-4 text-gray-700" />
        </button>

        {/* Capture Button - Right side with margin */}
        <div className="flex items-center justify-center ml-4 mr-6">
          <CaptureElementButton />
        </div>
      </div>
      <DragOverlay
        show={isDragging}
        dragSource={dragSource}
        message="add object"
      />
    </div>
  );
}

// ------------------------------------------
// CAPTURE ELEMENT BUTTON
// ------------------------------------------
function CaptureElementButton() {
  const [isCapturing, setIsCapturing] = useState(false);
  const addElement = useImageStore((s) => s.addElement);
  const startCapturing = useAppStore((s) => s.startCapturing);
  const completeCapturing = useAppStore((s) => s.completeCapturing);
  const cancelCapturing = useAppStore((s) => s.cancelCapturing);
  const setError = useAppStore((s) => s.setError);

  // Check if running in Chrome extension context
  const isExtensionContext =
    typeof chrome !== "undefined" &&
    chrome.tabs &&
    chrome.scripting &&
    chrome.runtime;

  const handleCapture = async () => {
    // Safety check: Ensure we're in a Chrome extension context
    if (!isExtensionContext) {
      console.warn(
        "[CaptureElementButton] Not running in Chrome extension context"
      );
      toast.error(
        "Screenshot capture is only available in the Chrome extension"
      );
      setError("Screenshot capture requires Chrome extension APIs", "capture");
      return;
    }

    try {
      console.log("[CaptureElementButton] Starting area capture");
      setIsCapturing(true);
      startCapturing("area");

      // Inject area selector overlay
      const selection = await injectAreaSelectorOverlay();

      if (!selection) {
        console.log("[CaptureElementButton] Area capture cancelled");
        cancelCapturing();
        setIsCapturing(false);
        return;
      }

      console.log("[CaptureElementButton] Area selected", selection);

      // Small delay to let overlay disappear
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Capture the selected area
      const areaScreenshot = await captureArea(
        selection.x,
        selection.y,
        selection.width,
        selection.height,
        { format: "png" }
      );

      // Convert to file
      const timestamp = Date.now();
      const file = dataUrlToFile(
        areaScreenshot.dataUrl,
        `element-capture-${timestamp}.png`
      );

      // Load image to get dimensions
      const img = new Image();
      img.onload = () => {
        // Add to store
        addElement(file, areaScreenshot.dataUrl, {
          width: img.width,
          height: img.height,
        });

        console.log("[CaptureElementButton] Element captured successfully");
        toast.success("object captured!");
        completeCapturing();
        setIsCapturing(false);
      };

      img.onerror = () => {
        setError("Failed to load captured image", "capture");
        toast.error("Failed to load captured image");
        cancelCapturing();
        setIsCapturing(false);
      };

      img.src = areaScreenshot.dataUrl;
    } catch (error) {
      console.error("[CaptureElementButton] Capture error:", error);
      setError("Failed to capture area", "capture");
      toast.error("Failed to capture area");
      cancelCapturing();
      setIsCapturing(false);
    }
  };

  return (
    <button
      onClick={handleCapture}
      disabled={isCapturing || !isExtensionContext}
      className={clsx(
        "p-2 rounded-lg border border-gray-200 shadow-xs bg-background transition-colors flex items-center justify-center active:scale-95",
        isCapturing || !isExtensionContext
          ? "opacity-50 cursor-not-allowed"
          : "hover:bg-purple-950/25 cursor-pointer"
      )}
      aria-label={
        !isExtensionContext
          ? "Capture not available (extension only)"
          : "Capture element from browser"
      }
      title={
        !isExtensionContext
          ? "Screenshot capture is only available in Chrome extension"
          : isCapturing
          ? "Capturing..."
          : "Capture element from browser"
      }
    >
      <Scan
        className={clsx(
          "w-6 h-6 text-gray-600",
          isCapturing && "animate-pulse"
        )}
      />
    </button>
  );
}

function EmptyState() {
  return (
    <div className="h-64 flex items-center justify-center font-gravitas italic text-xl  text-blue-950">
      {/* // <div className="flex items-center justify-center h-64 text-muted-foreground"> */}
      loading images...
    </div>
  );
}

// ------------------------------------------
// HELPER FUNCTIONS
// ------------------------------------------
async function loadExampleImages(
  addElement: (
    file: File,
    dataUrl: string,
    dimensions: { width: number; height: number }
  ) => void
) {
  for (const img of EXAMPLE_IMAGES) {
    try {
      // Fetch image as blob
      const response = await fetch(img.src);
      const blob = await response.blob();
      const file = new File([blob], `${img.id}.jpg`, { type: blob.type });

      // Create data URL
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        // Get dimensions
        const image = new Image();
        image.onload = () => {
          addElement(file, dataUrl, {
            width: image.width,
            height: image.height,
          });
        };
        image.src = dataUrl;
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("[ElementsGallery] Failed to load image:", img.src, error);
    }
  }
}

// ------------------------------------------
// CAROUSEL IMAGE ITEM COMPONENT
// ------------------------------------------
interface CarouselElementImageItemProps {
  element: ElementImageData;
  index: number;
  selectedIndex: number;
  onSelect: (index: number) => void;
  onRemove: (element: ElementImageData) => void;
  setRef: (index: number, el: HTMLDivElement | null) => void;
}

function CarouselElementImageItem({
  element,
  index,
  selectedIndex,
  onSelect,
  onRemove,
  setRef,
}: CarouselElementImageItemProps) {
  // Use carousel item hook
  const { isSelected, itemProps } = useCarouselItem({
    index,
    selectedIndex,
    onSelect,
    imageDimensions: {
      selected: SELECTED_DIMENSIONS,
      notSelected: NOT_SELECTED_DIMENSIONS,
    },
    enableWhimsicalRotation: true,
  });

  // Use element gallery drag hook
  const { isDragging, dragProps } = useElementGalleryDrag({
    element,
  });

  // Merge carousel and drag props
  const mergedProps = {
    ...itemProps,
    ...dragProps,
    onClick: itemProps.onClick,
    className: `${itemProps.className} relative group`,
    style: {
      ...itemProps.style,
      cursor: isDragging ? "grabbing" : "grab",
    },
  };

  return (
    <div ref={(el) => setRef(index, el)} {...mergedProps}>
      <img
        src={element.apiDataUrl || element.dataUrl}
        alt={`Element ${index + 1}`}
        className="w-full h-full object-contain pointer-events-none"
      />
      <DeleteButton enabled={isSelected} onClick={() => onRemove(element)} />
    </div>
  );
}

// ------------------------------------------
// DELETE BUTTON
// ------------------------------------------
interface DeleteButtonProps {
  enabled?: boolean;
  onClick: () => void;
}
function DeleteButton({ enabled, onClick }: DeleteButtonProps) {
  if (enabled === false) return null;
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="absolute top-1 right-1 bg-red-500/90 hover:bg-red-500 text-white rounded-full p-2 shadow-lg transition-all duration-200 hover:scale-110 active:scale-95 opacity-0 group-hover:opacity-100"
      title="Remove element"
      aria-label="Remove element from gallery"
    >
      <X className="w-4 h-4" />
    </button>
  );
}
