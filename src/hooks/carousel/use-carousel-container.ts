import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Container-level carousel hook
 * Manages selection state, refs, scrolling, and keyboard navigation
 */

export interface UseCarouselContainerOptions {
  itemCount: number;
  enabledKeyboardNavigation?: boolean;
  initialIndex?: number;
  onItemSelect?: (index: number) => void;
}

export interface UseCarouselContainerReturn {
  selectedIndex: number;
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
  itemRefs: React.MutableRefObject<(HTMLDivElement | null)[]>;
  handleSelectItem: (index: number) => void;
  scrollToCenter: (index: number) => void;
  setItemRef: (index: number, el: HTMLDivElement | null) => void;
  canScrollPrev: boolean;
  canScrollNext: boolean;
  scrollPrev: () => void;
  scrollNext: () => void;
}

export function useCarouselContainer({
  itemCount,
  enabledKeyboardNavigation = false,
  initialIndex = 0,
  onItemSelect,
}: UseCarouselContainerOptions): UseCarouselContainerReturn {
  const [selectedIndex, setSelectedIndex] = useState(initialIndex);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  /**
   * Scrolls the carousel to center the item at the given index
   */
  const scrollToCenter = useCallback((index: number) => {
    const container = scrollContainerRef.current;
    const item = itemRefs.current[index];

    if (!container || !item) {
      console.warn("[Carousel] Missing container or item for scroll");
      return;
    }

    // Use getBoundingClientRect for accurate positioning with flexbox
    const containerRect = container.getBoundingClientRect();
    const itemRect = item.getBoundingClientRect();

    // Calculate the item's position relative to the container
    const itemRelativeLeft =
      itemRect.left - containerRect.left + container.scrollLeft;
    const itemWidth = itemRect.width;
    const containerWidth = containerRect.width;
    const scrollPosition =
      itemRelativeLeft + itemWidth / 2 - containerWidth / 2;

    console.log("[Carousel] Scroll calculation:", {
      containerWidth,
      itemRelativeLeft,
      itemWidth,
      scrollPosition,
      currentScroll: container.scrollLeft,
    });

    container.scrollTo({
      left: scrollPosition,
      behavior: "smooth",
    });
  }, []);

  /**
   * Handles item selection - updates state, scrolls to center, and calls callback
   */
  const handleSelectItem = useCallback(
    (index: number) => {
      setSelectedIndex(index);
      scrollToCenter(index);
      onItemSelect?.(index);
    },
    [scrollToCenter, onItemSelect]
  );

  /**
   * Sets a ref for a specific item index
   */
  const setItemRef = useCallback((index: number, el: HTMLDivElement | null) => {
    itemRefs.current[index] = el;
  }, []);

  /**
   * Navigate to previous item
   */
  const scrollPrev = useCallback(() => {
    if (selectedIndex > 0) {
      handleSelectItem(selectedIndex - 1);
    }
  }, [selectedIndex, handleSelectItem]);

  /**
   * Navigate to next item
   */
  const scrollNext = useCallback(() => {
    if (selectedIndex < itemCount - 1) {
      handleSelectItem(selectedIndex + 1);
    }
  }, [selectedIndex, itemCount, handleSelectItem]);

  /**
   * Check if can scroll to previous
   */
  const canScrollPrev = selectedIndex > 0;

  /**
   * Check if can scroll to next
   */
  const canScrollNext = selectedIndex < itemCount - 1;

  // Center the initial item on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      const container = scrollContainerRef.current;
      const item = itemRefs.current[selectedIndex];
      if (!container || !item) return;

      const containerWidth = container.offsetWidth;
      const itemLeft = item.offsetLeft;
      const itemWidth = item.offsetWidth;
      const scrollPosition = itemLeft + itemWidth / 2 - containerWidth / 2;

      container.scrollTo({
        left: scrollPosition,
        behavior: "auto", // No animation on mount
      });
    }, 50);

    return () => clearTimeout(timer);
  }, []); // Only run on mount

  // Keyboard navigation (arrow keys)
  useEffect(() => {
    if (!enabledKeyboardNavigation) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" && selectedIndex > 0) {
        handleSelectItem(selectedIndex - 1);
      } else if (e.key === "ArrowRight" && selectedIndex < itemCount - 1) {
        handleSelectItem(selectedIndex + 1);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedIndex, itemCount, handleSelectItem]);

  return {
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
  };
}
