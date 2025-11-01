import { useCanvasElementDrag } from "@/hooks/drag-drop/features/use-canvas-element-drag";
import {
  useImageStore,
  type ElementImageData,
  type PositionedInstance,
} from "@/store/image-store";
import { X } from "lucide-react";
import clsx from "clsx";

// ------------------------------------------
// CONSTANTS
// ------------------------------------------
const width = 100;

interface CanvasElementOverlayProps {
  instance: PositionedInstance;
  element: ElementImageData;
  zIndex: number;
}

/**
 * Draggable overlay component that displays a positioned instance on the canvas.
 * - Fixed size: 100x100px
 * - Object-fit: cover
 * - Shows X button to remove positioning
 * - Draggable within canvas bounds
 */
export function CanvasElementOverlay({
  instance,
  element,
  zIndex,
}: CanvasElementOverlayProps) {
  const removePositionedInstance = useImageStore(
    (state) => state.removePositionedInstance
  );

  const { isDragging, localPosition, dragHandlers } = useCanvasElementDrag({
    instanceId: instance.id,
    initialPosition: instance.position,
  });

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    console.log("[CanvasElementOverlay] Removing instance", instance.id);
    removePositionedInstance(instance.id);
  };

  // Calculate pixel position (center the 100px element at the relative position)
  const style = {
    position: "absolute" as const,
    left: `calc(${localPosition.x * 100}% - 50px)`, // Center horizontally
    top: `calc(${localPosition.y * 100}% - 50px)`, // Center vertically
    width: `${width}px`,
    height: `${width}px`,
    zIndex,
    cursor: isDragging ? "grabbing" : "grab",
  };

  return (
    <div
      {...dragHandlers}
      style={style}
      className={clsx(
        "group relative rounded-lg overflow-hidden",
        "border-2 border-white bg-white/90 shadow-lg",
        "transition-[transform,box-shadow,opacity,border-color] duration-150",
        isDragging
          ? "scale-110 shadow-2xl ring-2 ring-blue-950"
          : "hover:scale-105 hover:shadow-xl"
      )}
    >
      {/* Element Image */}
      <img
        src={element.apiDataUrl || element.dataUrl}
        alt="Positioned element"
        className="w-full h-full object-cover pointer-events-none select-none"
        draggable={false}
      />

      {/* Remove Button - appears on hover */}
      <button
        data-remove-button
        onClick={handleRemove}
        className={clsx(
          "absolute top-1 right-1",
          "w-6 h-6 rounded-full",
          "bg-red-500 text-white",
          "flex items-center justify-center",
          "opacity-0 group-hover:opacity-100",
          "transition-opacity duration-150",
          "hover:bg-red-600 hover:scale-110",
          "shadow-md z-10"
        )}
        title="Remove from canvas"
      >
        <X size={14} />
      </button>

      {/* Drag Indicator - appears during drag */}
      {isDragging && (
        <div className="absolute inset-0 bg-blue-500/20 pointer-events-none" />
      )}
    </div>
  );
}
