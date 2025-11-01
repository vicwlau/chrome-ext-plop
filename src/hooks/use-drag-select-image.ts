import { useState, useEffect, useCallback } from "react";
import domtoimage from "dom-to-image";

export const useDragSelectScreenshot = () => {
  const [isSelecting, setIsSelecting] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [currentPos, setCurrentPos] = useState({ x: 0, y: 0 });
  const [screenshot, setScreenshot] = useState<string | null>(null);

  const handleMouseDown = useCallback((e: MouseEvent) => {
    console.log("Mouse down at:", e.clientX, e.clientY);
    setStartPos({ x: e.clientX, y: e.clientY });
    setCurrentPos({ x: e.clientX, y: e.clientY });
    setIsSelecting(true);
    setScreenshot(null);
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (isSelecting) {
        setCurrentPos({ x: e.clientX, y: e.clientY });
      }
    },
    [isSelecting]
  );

  const handleMouseUp = useCallback(async () => {
    console.log("Mouse up, isSelecting:", isSelecting);
    if (isSelecting) {
      setIsSelecting(false);
      const x = Math.min(startPos.x, currentPos.x);
      const y = Math.min(startPos.y, currentPos.y);
      const width = Math.abs(currentPos.x - startPos.x);
      const height = Math.abs(currentPos.y - startPos.y);
      console.log("Selection rect:", { x, y, width, height });
      if (width > 0 && height > 0) {
        console.log("Starting domtoimage capture...");
        try {
          // Detect the actual background color of the website
          const bodyBg = getComputedStyle(document.body).backgroundColor;
          const htmlBg = getComputedStyle(
            document.documentElement
          ).backgroundColor;

          // Use the background color, fallback to white if transparent
          let bgcolor = "#ffffff"; // default
          if (
            bodyBg &&
            bodyBg !== "transparent" &&
            bodyBg !== "rgba(0, 0, 0, 0)"
          ) {
            bgcolor = bodyBg;
          } else if (
            htmlBg &&
            htmlBg !== "transparent" &&
            htmlBg !== "rgba(0, 0, 0, 0)"
          ) {
            bgcolor = htmlBg;
          }

          console.log("Using background color:", bgcolor);

          const dataUrl = await domtoimage.toPng(document.body, {
            bgcolor: bgcolor,
          });
          console.log("dom-to-image done");
          const img = new Image();
          img.src = dataUrl;
          await new Promise((resolve) => (img.onload = resolve));
          console.log("Image loaded, size:", img.width, img.height);
          const croppedCanvas = document.createElement("canvas");
          croppedCanvas.width = width;
          croppedCanvas.height = height;
          const ctx = croppedCanvas.getContext("2d")!;
          ctx.drawImage(
            img,
            x + window.scrollX,
            y + window.scrollY,
            width,
            height,
            0,
            0,
            width,
            height
          );
          const croppedDataUrl = croppedCanvas.toDataURL("image/png");
          console.log("Cropped dataUrl length:", croppedDataUrl.length);
          setScreenshot(croppedDataUrl);
          console.log("Screenshot set");
        } catch (error) {
          console.error("Error in screenshot capture:", error);
        }
      } else {
        console.log("Selection too small, skipping capture");
      }
    }
  }, [isSelecting, startPos, currentPos]);

  useEffect(() => {
    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [handleMouseDown, handleMouseMove, handleMouseUp]);

  const rect = isSelecting
    ? {
        left: Math.min(startPos.x, currentPos.x),
        top: Math.min(startPos.y, currentPos.y),
        width: Math.abs(currentPos.x - startPos.x),
        height: Math.abs(currentPos.y - startPos.y),
      }
    : null;

  return { isSelecting, rect, screenshot };
};
