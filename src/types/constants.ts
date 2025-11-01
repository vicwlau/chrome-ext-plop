export const APP_NAME = "plop";

export const TITLES = {
  ELEMENT_GALLERY: "",
  CANVAS: "",
  GENERATED_GALLERY: "",
};

// Image Optimization Thresholds
export const IMAGE_OPTIMIZATION = {
  SOURCE_THRESHOLD: 8 * 1024 * 1024, // 8MB - optimize source images at or above this size
  ELEMENT_THRESHOLD: 2 * 1024 * 1024, // 2MB - optimize element images at or above this size
} as const;
