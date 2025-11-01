import { useState, useRef, useCallback, useEffect } from "react";
import { useImageStore } from "@/store/image-store";

interface UseCanvasElementDragOptions {
  instanceId: string;
  canvasId?: string;
  initialPosition: { x: number; y: number }; // Relative coordinates (0-1)
}

/**
 * Hook for dragging positioned instances within the canvas.
 * Handles local drag state and updates store on drag end.
 *    Drag Type: Position adjustment,
 *    Coordinates: Full relative coorindate system
 *
 * Usage:
 * ```tsx
 * const { isDragging, localPosition, dragHandlers } = useCanvasElementDrag({
 *   instanceId: instance.id,
 *   initialPosition: instance.position,
 * });
 *
 * return (
 *   <div {...dragHandlers} style={{ left: localPosition.x * 100 + '%' }}>
 *     <img src={element.dataUrl} />
 *   </div>
 * );
 * ```
 */
export function useCanvasElementDrag({
  instanceId,
  canvasId = "canvas",
  initialPosition,
}: UseCanvasElementDragOptions) {
  const updateInstancePosition = useImageStore(
    (state) => state.updateInstancePosition
  );

  const [isDragging, setIsDragging] = useState(false);
  const [localPosition, setLocalPosition] = useState(initialPosition);
  const [cursorPosition, setCursorPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const dragStartRef = useRef<{
    mouseX: number;
    mouseY: number;
    elementX: number;
    elementY: number;
    canvasRect: DOMRect;
  } | null>(null);

  // Update local position when prop changes (from external updates)
  useEffect(() => {
    if (!isDragging) {
      setLocalPosition(initialPosition);
    }
  }, [initialPosition, isDragging]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Prevent if clicking on the remove button
      if ((e.target as HTMLElement).closest("[data-remove-button]")) {
        return;
      }

      e.preventDefault();
      e.stopPropagation();

      const canvas = document.getElementById(canvasId);
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      // Store initial mouse and element positions, and cache canvas rect
      dragStartRef.current = {
        mouseX: e.clientX,
        mouseY: e.clientY,
        elementX: localPosition.x * rect.width,
        elementY: localPosition.y * rect.height,
        canvasRect: rect,
      };

      setIsDragging(true);
      console.log("[useCanvasElementDrag] Drag started", {
        instanceId,
        localPosition,
        elementPixels: {
          x: localPosition.x * rect.width,
          y: localPosition.y * rect.height,
        },
        mouseClient: { x: e.clientX, y: e.clientY },
        canvasRect: {
          left: rect.left,
          top: rect.top,
          width: rect.width,
          height: rect.height,
        },
      });
    },
    [instanceId, canvasId, localPosition]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !dragStartRef.current) return;

      // Simply track cursor position - no expensive calculations during drag
      const { canvasRect } = dragStartRef.current;

      // Convert cursor position to canvas-relative coordinates for visual feedback
      const cursorX = e.clientX - canvasRect.left;
      const cursorY = e.clientY - canvasRect.top;

      setCursorPosition({ x: cursorX, y: cursorY });

      // console.log("[useCanvasElementDrag] Mouse move", {
      //   clientPos: { x: e.clientX, y: e.clientY },
      //   canvasRelative: { x: cursorX, y: cursorY },
      // });
    },
    [isDragging]
  );

  const handleMouseUp = useCallback(() => {
    if (!isDragging || !dragStartRef.current) return;

    const { mouseX, mouseY, elementX, elementY, canvasRect } =
      dragStartRef.current;
    const rect = canvasRect;

    // If no mouse movement detected (cursorPosition is null), keep original position
    if (!cursorPosition) {
      console.log(
        "[useCanvasElementDrag] No movement detected, keeping original position"
      );
      setIsDragging(false);
      setCursorPosition(null);
      dragStartRef.current = null;
      return;
    }

    // Calculate delta from drag start
    const mouseStartCanvasRelative = {
      x: mouseX - rect.left,
      y: mouseY - rect.top,
    };

    const deltaX = cursorPosition.x - mouseStartCanvasRelative.x;
    const deltaY = cursorPosition.y - mouseStartCanvasRelative.y;

    // Calculate new pixel position
    const newPixelX = elementX + deltaX;
    const newPixelY = elementY + deltaY;

    // Convert to relative coordinates and clamp to [0, 1]
    const newRelativeX = Math.max(0, Math.min(1, newPixelX / rect.width));
    const newRelativeY = Math.max(0, Math.min(1, newPixelY / rect.height));

    console.log("[useCanvasElementDrag] Drag ended", {
      instanceId,
      dragStart: { mouseX, mouseY, elementX, elementY },
      cursorPosition,
      mouseStartCanvasRelative,
      delta: { deltaX, deltaY },
      newPixel: { x: newPixelX, y: newPixelY },
      newRelative: { x: newRelativeX, y: newRelativeY },
      canvasRect: { width: rect.width, height: rect.height },
    });

    // Update both local state and store with final position
    setLocalPosition({ x: newRelativeX, y: newRelativeY });
    updateInstancePosition(instanceId, newRelativeX, newRelativeY);

    setIsDragging(false);
    setCursorPosition(null);
    dragStartRef.current = null;
  }, [isDragging, instanceId, cursorPosition, updateInstancePosition]);

  // Add global listeners for mouse move and up
  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);

      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return {
    isDragging,
    localPosition:
      isDragging && cursorPosition
        ? {
            // During drag: use cursor position for smooth visual feedback
            x: cursorPosition.x / (dragStartRef.current?.canvasRect.width ?? 1),
            y:
              cursorPosition.y / (dragStartRef.current?.canvasRect.height ?? 1),
          }
        : localPosition, // After drag: use calculated position
    dragHandlers: {
      onMouseDown: handleMouseDown,
    },
  };
}
