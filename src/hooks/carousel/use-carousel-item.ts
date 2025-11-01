import { useMemo } from "react";

/**
 * Item-level carousel hook
 * Calculates visual properties (opacity, dimensions) for a single carousel item
 */

export interface ImageDimensions {
  selected: {
    width: number;
    height: number;
  };
  notSelected: {
    width: number;
    height: number;
  };
}

export interface UseCarouselItemOptions {
  index: number;
  selectedIndex: number;
  onSelect: (index: number) => void;
  imageDimensions: ImageDimensions;
  enableWhimsicalRotation?: boolean;
}

export interface UseCarouselItemReturn {
  isSelected: boolean;
  opacity: number;
  distance: number;
  width: number;
  height: number;
  handleClick: () => void;
  itemProps: {
    onClick: () => void;
    style: React.CSSProperties;
    className: string;
  };
}

export function useCarouselItem({
  index,
  selectedIndex,
  onSelect,
  imageDimensions,
  enableWhimsicalRotation = false,
}: UseCarouselItemOptions): UseCarouselItemReturn {
  const isSelected = index === selectedIndex;

  // Calculate distance from selected item (for opacity fade effect)
  const distance = Math.abs(index - selectedIndex);

  // Calculate opacity based on distance from selected item
  // Selected: 1.0, Adjacent: 0.8, Further: 0.6, etc.
  const opacity = isSelected ? 1 : Math.max(0.4, 1 - distance * 0.2);

  // Determine dimensions based on selection state
  const width = isSelected
    ? imageDimensions.selected.width
    : imageDimensions.notSelected.width;

  const height = isSelected
    ? imageDimensions.selected.height
    : imageDimensions.notSelected.height;

  // Generate a stable random rotation for whimsical effect (if enabled)
  // Uses index as seed to ensure consistent rotation for each item
  const rotation = useMemo(() => {
    if (!enableWhimsicalRotation) return 0;

    // Better seeded random that produces both positive and negative values evenly
    // Using sine function for better distribution across positive/negative range
    const seed = index * 2654435761; // Large prime for good distribution
    const random = Math.sin(seed) * 10000;
    const normalized = random - Math.floor(random); // Get fractional part (0-1)
    return (normalized - 0.5) * 16; // -8 to +8 degrees
  }, [index, enableWhimsicalRotation]);

  // Click handler
  const handleClick = () => onSelect(index);

  // Combined props for easy spreading onto item element
  const itemProps = useMemo(
    () => ({
      onClick: handleClick,
      style: {
        width: `${width}px`,
        height: `${height}px`,
        opacity,
        ...(enableWhimsicalRotation && { transform: `rotate(${rotation}deg)` }),
      } as React.CSSProperties,
      className:
        "flex-shrink-0 cursor-pointer overflow-hidden rounded-sm transition-all duration-300 ease-out",
    }),
    [width, height, opacity, rotation, enableWhimsicalRotation, handleClick]
  );

  return {
    isSelected,
    opacity,
    distance,
    width,
    height,
    handleClick,
    itemProps,
  };
}
