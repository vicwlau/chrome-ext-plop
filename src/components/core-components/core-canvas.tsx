"use client";

import { useCanvasDrop } from "@/hooks/drag-drop/features/use-canvas-drop";
import clsx from "clsx";
import { CanvasEditor } from "../canvas/canvas-editor";
import { selectIsDragging, useAppStore, useImageStore } from "@/store";
import { DragOverlay } from "@/components/ui/drag-overlay";

// ------------------------------------------
// CONSTANTS
// ------------------------------------------

interface CoreCanvasProps {
  className?: string;
}
export default function CoreCanvas({ className }: CoreCanvasProps) {
  const sourceImage = useImageStore((state) => state.sourceImage);

  // Use canvas drop hook
  const { isDragging, canAcceptDrop, dragSource, dropProps } = useCanvasDrop({
    canvasId: "canvas",
  });

  const isDraggingGlobal = useAppStore(selectIsDragging);

  const show_drag_overlay = isDragging && canAcceptDrop;

  return (
    <div
      id="canvas"
      className={clsx(
        "w-full relative bg-white py-8",
        isDragging && canAcceptDrop && "ring-2 ring-blue-950 ring-offset-2",
        className
      )}
      style={{
        backgroundImage: `
          repeating-linear-gradient(to right, #172554 0px, #172554 16px, transparent 16px, transparent 36px),
          repeating-linear-gradient(to right, #172554 0px, #172554 16px, transparent 16px, transparent 36px)
        `,
        backgroundSize: "100% 2px, 100% 2px",
        backgroundPosition: "top, bottom",
        backgroundRepeat: "no-repeat",
      }}
      {...dropProps}
    >
      {!sourceImage && !isDraggingGlobal && <EmptyState />}
      <CanvasEditor />
      <DragOverlay show={show_drag_overlay} dragSource={dragSource} />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="absolute inset-0 flex items-center justify-center font-gravitas italic text-xl  text-blue-950">
      plop space from <span className="ml-2 text-4xl">↓</span>
    </div>
  );
}
