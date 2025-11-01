import clsx from "clsx";

/**
 * DragOverlay Component
 *
 * A reusable overlay component that displays during drag operations over drop zones.
 * Provides visual feedback with a semi-transparent background and centered message.
 *
 * Features:
 * - Auto-detects message based on drag source
 * - Supports custom messages
 * - Two style variants (default, minimal)
 * - Consistent design language across the app
 *
 * Used in:
 * - core-canvas.tsx (for canvas drop zone)
 * - core-generated-images-gallery.tsx (for adding images to gallery)
 * - core-elements-gallery.tsx (for adding elements from browser)
 */

interface DragOverlayProps {
  /**
   * Whether to show the overlay
   */
  show: boolean;
  /**
   * The source of the drag operation (e.g., "browser", "element-gallery", "generated-gallery", "desktop")
   */
  dragSource?: string | null;
  /**
   * Custom message to display. If not provided, a default message based on dragSource will be shown.
   */
  message?: string;
  /**
   * Variant of the overlay styling
   */
  variant?: "default" | "minimal";
  /**
   * Additional CSS classes for the container
   */
  className?: string;
}

/**
 * Reusable drag overlay component for drop zones.
 * Displays a centered message when dragging over a valid drop target.
 *
 * @example
 * ```tsx
 * <DragOverlay
 *   show={isDragging && canAcceptDrop}
 *   dragSource={dragSource}
 * />
 * ```
 *
 * @example Custom message
 * ```tsx
 * <DragOverlay
 *   show={isDragging}
 *   message="Drop your image here"
 * />
 * ```
 */
export function DragOverlay({
  show,
  dragSource,
  message,
  className,
}: DragOverlayProps) {
  if (!show) return null;

  const displayMessage = message || getDefaultMessage(dragSource);

  return (
    <div
      className={clsx(
        "absolute inset-0 pointer-events-none z-10 flex items-center justify-center",
        "bg-blue-950/10",
        className
      )}
    >
      <div
        className={clsx(
          "text-white px-4 py-2 rounded shadow-lg tracking-widest font-gravitas",
          "bg-blue-950/70 text-lg"
        )}
      >
        {displayMessage}
      </div>
    </div>
  );
}

/**
 * Get default message based on drag source
 */
function getDefaultMessage(dragSource?: string | null): string {
  switch (dragSource) {
    case "generated-gallery":
    case "element-gallery":
    case "browser":
    case "desktop":
      return "plop object";
    default:
      return "plop here";
  }
}
