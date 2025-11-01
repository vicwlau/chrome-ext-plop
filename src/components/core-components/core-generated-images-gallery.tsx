"use client";

import { DragOverlay } from "@/components/ui/drag-overlay";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useCarouselContainer } from "@/hooks/carousel/use-carousel-container";
import { useCarouselItem } from "@/hooks/carousel/use-carousel-item";
import { useGeneratedGalleryDrag } from "@/hooks/drag-drop/features/use-generated-gallery-drag";
import { useGeneratedGalleryDrop } from "@/hooks/drag-drop/features/use-generated-gallery-drop";
import { selectGeneratedCarouselIndex, useAppStore } from "@/store/app-store";
import {
  selectGeneratedImages,
  useImageStore,
  type GeneratedImageData,
} from "@/store/image-store";
import { APP_NAME } from "@/types/constants";
import clsx from "clsx";
import {
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  Download,
  StarIcon,
  Trash2,
  Upload,
  UploadIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

// ------------------------------------------
// CONSTANTS
// ------------------------------------------
const SELECTED_DIMENSIONS = { width: 140, height: 180 };
const NOT_SELECTED_DIMENSIONS = { width: 70, height: 120 };
const MIN_HEIGHT = SELECTED_DIMENSIONS.height + 90; // extra for action buttons

// Example images from public folder
const EXAMPLE_IMAGES = [
  {
    id: "1",
    src: "/living-room.png",
    alt: "Living room - original",
  },
];

interface GeneratedImagesGalleryaProp {
  className?: string;
}
export default function GeneratedImagesGallery({
  className,
}: GeneratedImagesGalleryaProp) {
  // Get generated images from store
  const generatedImages = useImageStore(selectGeneratedImages);
  const currentIndex = useAppStore(selectGeneratedCarouselIndex);

  const setGeneratedCarouselIndex = useAppStore(
    (s) => s.setGeneratedCarouselIndex
  );
  const setCurrentGeneratedImage = useImageStore(
    (s) => s.setCurrentGeneratedImage
  );
  const setSourceImageFromGenerated = useImageStore(
    (s) => s.setSourceImageFromGenerated
  );
  const removeGeneratedImage = useImageStore((s) => s.removeGeneratedImage);
  const addGeneratedImage = useImageStore((s) => s.addGeneratedImage);

  const hasLoadedExamples = useRef(false);

  // Track previous image count to detect additions
  const prevImageCountRef = useRef(generatedImages.length);

  // Drop zone functionality
  const { isDragging, canAcceptDrop, dropProps } = useGeneratedGalleryDrop({
    onDropSuccess: (imageId) => {
      console.log("[GeneratedImagesGallery] External image added:", imageId);
      toast.success("space added");

      // Optionally select the newly added image
      const newIndex = generatedImages.length; // Will be the new length after add
      setGeneratedCarouselIndex(newIndex);
    },
  });

  // Load example images into store on mount (for development/testing)
  useEffect(() => {
    const loadExampleImages = async () => {
      // Only load if no generated images exist yet and we haven't loaded before
      if (generatedImages.length > 0 || hasLoadedExamples.current) {
        console.log(
          "[GeneratedImagesGallery] Skipping example load - images already exist or already loaded"
        );
        return;
      }

      // Mark as loading to prevent duplicate loads
      hasLoadedExamples.current = true;

      console.log(
        "[GeneratedImagesGallery] Loading example images into store..."
      );

      for (const example of EXAMPLE_IMAGES) {
        try {
          // Fetch the image from public folder
          const response = await fetch(example.src);
          const blob = await response.blob();

          // Convert to data URL
          const reader = new FileReader();
          reader.onloadend = () => {
            const dataUrl = reader.result as string;

            // Load image to get dimensions
            const img = new Image();
            img.onload = () => {
              // Add to store with example metadata
              addGeneratedImage(
                dataUrl,
                { width: img.width, height: img.height },
                "example-source", // sourceImageId
                [], // elementIds
                `Example: ${example.alt}` // prompt
              );
              console.log(
                `[GeneratedImagesGallery] Loaded example: ${example.alt}`
              );
            };
            img.src = dataUrl;
          };
          reader.readAsDataURL(blob);
        } catch (error) {
          console.error(
            `[GeneratedImagesGallery] Failed to load example ${example.src}:`,
            error
          );
        }
      }
    };

    loadExampleImages();
  }, []); // Run only once on mount

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
    itemCount: generatedImages.length,
    enabledKeyboardNavigation: true,
    initialIndex: currentIndex,
    onItemSelect: (index) => {
      console.log("[GeneratedImagesGallery] Selected image at index:", index);

      // Update carousel index in app store
      setGeneratedCarouselIndex(index);

      // DO NOT set currentGeneratedImage here - it's only for canvas context
      // Gallery selection is separate from canvas-generated context
    },
  });

  // Auto-scroll to newly added generated image
  useEffect(() => {
    const prevCount = prevImageCountRef.current;
    const currentCount = generatedImages.length;

    // Check if a new image was added (count increased)
    if (currentCount > prevCount && currentCount > 0) {
      const newImageIndex = currentCount - 1;
      console.log(
        "[GeneratedImagesGallery] New image added, scrolling to index:",
        newImageIndex
      );

      // Small delay to ensure DOM is updated and refs are set
      const timer = setTimeout(() => {
        handleSelectItem(newImageIndex);
      }, 100);

      // Update the ref
      prevImageCountRef.current = currentCount;

      return () => clearTimeout(timer);
    } else {
      // Just update the ref without scrolling
      prevImageCountRef.current = currentCount;
    }
  }, [generatedImages.length, handleSelectItem]);

  const handleUseAsSource = (image: GeneratedImageData) => {
    console.log("[GeneratedImagesGallery] Loading image to canvas:", image.id);

    // Load the new source (store handles clearing currentGeneratedImage and instances)
    setSourceImageFromGenerated(image);

    // toast.success("space loaded");
  };

  const handleRemoveImage = (image: GeneratedImageData) => {
    console.log("[GeneratedImagesGallery] Removing image:", image.id);

    removeGeneratedImage(image.id);
    toast.success("space removed");
  };

  const handleDownloadImage = (image: GeneratedImageData) => {
    console.log("[GeneratedImagesGallery] Downloading image:", image.id);
    downloadImage(image.dataUrl, image.id);
  };

  /*
    Show empty state if no generated images
  */
  if (generatedImages.length === 0) {
    return (
      <div
        {...dropProps}
        className={clsx(
          "w-full p-4 text-center text-muted-foreground transition-all",
          isDragging &&
            canAcceptDrop &&
            "bg-blue-50 ring-2 ring-blue-400 ring-inset",
          className
        )}
      >
        <div className="flex flex-col items-center justify-center gap-2 min-h-[180px]">
          <Upload
            className={clsx(
              "w-8 h-8 transition-transform",
              isDragging && canAcceptDrop && "scale-110 text-blue-500"
            )}
          />
          <p className="text-sm">No generated images yet</p>
          <p className="text-xs mt-1">
            {isDragging && canAcceptDrop
              ? "Drop image here to add to gallery"
              : "Compose images or drag & drop to add"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      {...dropProps}
      className={clsx("w-full transition-all relative", className)}
    >
      <DragOverlay show={isDragging && canAcceptDrop} message="add space" />

      <div className="w-full py-0 ml-4 flex items-center">
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
          aria-label="Previous image"
        >
          <ChevronLeft className="w-4 h-4 text-gray-700" />
        </button>

        {/* Carousel Container - Takes remaining space */}
        <div
          ref={scrollContainerRef}
          className="flex-1 flex items-center justify-start overflow-x-auto scrollbar-hide p-4"
          style={{
            gap: "8px",
            scrollbarWidth: "none",
            msOverflowStyle: "none",
            minHeight: `${MIN_HEIGHT}px`, // max height + action buttons
            scrollBehavior: "smooth",
          }}
        >
          {generatedImages.map((image, index) => (
            <CarouselGeneratedImageItem
              key={image.id}
              image={image}
              index={index}
              selectedIndex={selectedIndex}
              onSelect={handleSelectItem}
              onUseAsSource={handleUseAsSource}
              onRemove={handleRemoveImage}
              onDownload={handleDownloadImage}
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
          aria-label="Next image"
        >
          <ChevronRight className="w-4 h-4 text-gray-700" />
        </button>

        {/* Add Image Button - Right side with margin */}
        <div className="flex items-center justify-center ml-4 mr-4 pr-4">
          <UploadImageButton />
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------
// STAR BUTTON
// ------------------------------------------
interface StarButtonProps {
  enabled?: boolean;
  isStarred: boolean;
  onClick: () => void;
}
function StarButton({ enabled, isStarred, onClick }: StarButtonProps) {
  if (enabled === false) return null;
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={clsx(
        "absolute top-2 right-2 h-8 transition-all duration-200 active:scale-95 animate-fadeIn flex items-center justify-center"
      )}
      title={isStarred ? "Unstar image" : "Star image"}
      aria-label={isStarred ? "Unstar image" : "Star image"}
    >
      <StarIcon
        strokeWidth={1}
        className={clsx(
          "w-6 h-6 transition-colors",
          isStarred
            ? "fill-yellow-400 stroke-yellow-400"
            : "fill-none stroke-current"
        )}
      />
    </button>
  );
}

// ------------------------------------------
// CAROUSEL IMAGE ITEM COMPONENT
// ------------------------------------------
interface CarouselGeneratedImageItemProps {
  image: GeneratedImageData;
  index: number;
  selectedIndex: number;
  onSelect: (index: number) => void;
  onUseAsSource: (image: GeneratedImageData) => void;
  onRemove: (image: GeneratedImageData) => void;
  onDownload: (image: GeneratedImageData) => void;
  setRef: (index: number, el: HTMLDivElement | null) => void;
}
function CarouselGeneratedImageItem({
  image,
  index,
  selectedIndex,
  onSelect,
  onUseAsSource,
  onRemove,
  onDownload,
  setRef,
}: CarouselGeneratedImageItemProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isStarred, setIsStarred] = useState(false);

  // Add drag functionality
  const { isDragging, dragProps } = useGeneratedGalleryDrag({
    generatedImage: image,
  });

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

  // Merge className to preserve transition classes from itemProps and add drag state
  const mergedProps = {
    ...itemProps,
    ...dragProps,
    className: `${itemProps.className} relative group ${
      isDragging ? "opacity-50 cursor-grabbing" : "cursor-grab"
    }`,
  };

  return (
    <div
      className="relative flex flex-col items-center"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div ref={(el) => setRef(index, el)} {...mergedProps}>
        <img
          src={image.apiDataUrl || image.dataUrl}
          alt={`Generated ${new Date(image.createdAt).toLocaleString()}`}
          className="w-full h-full object-cover"
        />
        {/* {(isStarred || (isSelected && isHovered)) && (
          <StarButton
            enabled={isStarred || isSelected}
            isStarred={isStarred}
            onClick={() => {
              setIsStarred(!isStarred);
              toast.success(isStarred ? "Image unstarred" : "Image starred");
            }}
          />
        )} */}
      </div>

      {/* Invisible hover bridge to maintain hover state when moving to action buttons */}
      {isSelected && (
        // {isSelected && isHovered && (
        <div className="absolute top-full w-full h-3 -mt-1 z-0" />
      )}

      {/* Action buttons - absolutely positioned below the card */}
      {isSelected && (
        // {isSelected && isHovered && (
        <div className="absolute top-full mt-3 flex items-center justify-center animate-slideDown z-10">
          <div className="flex items-center gap-1">
            <ToggleGroup
              type="multiple"
              variant="outline"
              spacing={1}
              size="sm"
            >
              <ToggleGroupItem
                value="use"
                aria-label="Use as source"
                className="data-[state=on]:bg-blue-950 data-[state=on]:text-white hover:bg-blue-50 active:scale-95 transition-transform"
                onClick={(e) => {
                  e.stopPropagation();
                  onUseAsSource(image);
                }}
              >
                <ArrowUp className="w-4 h-4" />
              </ToggleGroupItem>
              <ToggleGroupItem
                value="download"
                aria-label="Download image"
                className="data-[state=on]:bg-blue-950 data-[state=on]:text-white hover:bg-blue-50 active:scale-95 transition-transform"
                onClick={(e) => {
                  e.stopPropagation();
                  onDownload(image);
                }}
              >
                <Download className="w-4 h-4" />
              </ToggleGroupItem>
            </ToggleGroup>
            <HoldToDeleteButton onDelete={() => onRemove(image)} />
          </div>
        </div>
      )}
    </div>
  );
}

// ------------------------------------------
// ADD IMAGE BUTTON
// ------------------------------------------
function UploadImageButton() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const addGeneratedImage = useImageStore((s) => s.addGeneratedImage);
  const startUploading = useAppStore((s) => s.startUploading);
  const completeUploading = useAppStore((s) => s.completeUploading);
  const setError = useAppStore((s) => s.setError);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file", "upload");
      toast.error("Please select a valid image file");
      return;
    }

    try {
      startUploading();

      // Read file as data URL
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        if (!dataUrl) {
          setError("Failed to read image file", "upload");
          toast.error("Failed to read image file");
          completeUploading();
          return;
        }

        // Load image to get dimensions
        const img = new Image();
        img.onload = () => {
          // Add to store
          addGeneratedImage(
            dataUrl,
            { width: img.width, height: img.height },
            "uploaded", // sourceImageId
            [], // elementIds
            `Uploaded: ${file.name}` // prompt
          );

          console.log(`[AddImageButton] Uploaded image: ${file.name}`);
          toast.success("scene added");
          completeUploading();
        };

        img.onerror = () => {
          setError("Failed to load image", "upload");
          toast.error("Failed to load image");
          completeUploading();
        };

        img.src = dataUrl;
      };

      reader.onerror = () => {
        setError("Failed to read file", "upload");
        toast.error("Failed to read file");
        completeUploading();
      };

      reader.readAsDataURL(file);
    } catch (error) {
      console.error("[AddImageButton] Upload error:", error);
      setError("Failed to upload image", "upload");
      toast.error("Failed to upload image");
      completeUploading();
    }

    // Reset input to allow uploading the same file again
    e.target.value = "";
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
      <button
        onClick={handleClick}
        className="p-2 rounded-lg border text-gray-600 border-gray-200 shadow-xs bg-background hover:bg-blue-950/25 transition-colors flex items-center justify-center active:scale-95"
        aria-label="Add image from desktop"
        title="Add image from desktop"
      >
        {/* <Plus className="w-6 h-6" /> */}
        <UploadIcon className="w-6 h-6" />
      </button>
    </>
  );
}

// ------------------------------------------
// HOLD TO DELETE BUTTON
// ------------------------------------------
interface HoldToDeleteButtonProps {
  onDelete: () => void;
  holdDuration?: number;
}
function HoldToDeleteButton({
  onDelete,
  holdDuration = 1000,
}: HoldToDeleteButtonProps) {
  const [progress, setProgress] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const timerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  const startHold = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsHolding(true);
    startTimeRef.current = Date.now();

    const updateProgress = () => {
      const elapsed = Date.now() - startTimeRef.current;
      const newProgress = Math.min((elapsed / holdDuration) * 100, 100);
      setProgress(newProgress);

      if (newProgress < 100) {
        timerRef.current = requestAnimationFrame(updateProgress);
      } else {
        // Completed - trigger delete
        onDelete();
        resetHold();
      }
    };

    timerRef.current = requestAnimationFrame(updateProgress);
  };

  const resetHold = () => {
    setIsHolding(false);
    setProgress(0);
    if (timerRef.current) {
      cancelAnimationFrame(timerRef.current);
      timerRef.current = null;
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        cancelAnimationFrame(timerRef.current);
      }
    };
  }, []);

  return (
    <button
      className="relative overflow-hidden h-8 px-3 rounded-md border border-input bg-background hover:bg-red-50 transition-colors flex items-center justify-center"
      onMouseDown={startHold}
      onMouseUp={resetHold}
      onMouseLeave={resetHold}
      onTouchStart={startHold}
      onTouchEnd={resetHold}
      onTouchCancel={resetHold}
      aria-label="Hold to delete"
    >
      {/* Progress background */}
      <div
        className="absolute bottom-0 left-0 right-0 bg-red-500 transition-opacity"
        style={{
          height: `${progress}%`,
          opacity: isHolding ? 0.8 : 0,
        }}
      />
      {/* Icon */}
      <Trash2
        className={clsx(
          "w-4 h-4 relative z-10 transition-colors",
          isHolding && progress > 50 ? "text-white" : "text-foreground"
        )}
      />
    </button>
  );
}

// ------------------------------------------
// UTILITY FUNCTIONS
// ------------------------------------------

/**
 * Downloads an image from a data URL
 * @param dataUrl - The data URL of the image
 * @param imageId - The ID to use for the filename
 */
function downloadImage(dataUrl: string, imageId: string) {
  try {
    // Create a temporary anchor element
    const link = document.createElement("a");
    link.href = dataUrl;

    // Generate filename with timestamp for uniqueness
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    link.download = `${APP_NAME}-${imageId}-${timestamp}.png`;

    // Trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    console.log(`[GeneratedImagesGallery] Downloaded image: ${link.download}`);
    // toast.success("Image downloaded");
  } catch (error) {
    console.error("[GeneratedImagesGallery] Download failed:", error);
    toast.error("Failed to download image");
  }
}
