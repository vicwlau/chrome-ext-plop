/**
 * Carousel Hooks
 *
 * Two-hook pattern for flexible carousel composition:
 * - useCarouselContainer: Container-level logic (scrolling, selection, keyboard nav)
 * - useCarouselItem: Item-level logic (opacity, dimensions, click handling)
 */

export { useCarouselContainer } from "./use-carousel-container";
export { useCarouselItem } from "./use-carousel-item";

// Re-export types for convenience
export type {
  UseCarouselContainerOptions,
  UseCarouselContainerReturn,
} from "./use-carousel-container";

export type {
  UseCarouselItemOptions,
  UseCarouselItemReturn,
  ImageDimensions,
} from "./use-carousel-item";
