import { useElementCapture } from "@/hooks/use-element-capture";
import CaptureInstructions from "./capture/CaptureInstructions";
import CompactToolbar from "./capture/CompactToolbar";
import LoadingOverlay from "./capture/LoadingOverlay";

interface ElementCaptureOverlayProps {
  onElementCapture: (file: File, dataUrl: string) => void;
  elementCount: number;
  maxElements?: number;
}

export default function ElementCaptureOverlay({
  onElementCapture,
  elementCount,
  maxElements = 7,
}: ElementCaptureOverlayProps) {
  const {
    isCapturing,
    isDraggingOver,
    isDraggingExternal,
    isProcessingDrop,
    processingError,
    isMaxReached,
    hasElements,
    dropZoneRef,
    handleFileSelect,
    handleCaptureArea,
    handleOverlayClick,
  } = useElementCapture({
    onElementCapture,
    elementCount,
    maxElements,
  });

  return (
    <div className="absolute inset-0" ref={dropZoneRef}>
      {/* Full overlay for initial instructions or when dragging */}
      {(!hasElements || isDraggingOver || isDraggingExternal) && (
        <div
          className={`
            absolute inset-0 z-20 flex items-center justify-center
            transition-all duration-300
            ${
              isDraggingOver || isDraggingExternal
                ? "bg-blue-500/20"
                : "bg-black/20"
            }
            backdrop-blur-none
            ${isDraggingExternal ? "cursor-pointer" : ""}
          `}
          onClick={isDraggingExternal ? handleOverlayClick : undefined}
        >
          <div
            className={`
              bg-white/95 p-4 rounded-xl shadow-2xl max-w-md border-2 
              ${
                isDraggingOver || isDraggingExternal
                  ? "border-blue-500 scale-105"
                  : "border-purple-400"
              }
              transition-all duration-200
            `}
            onClick={(e) => {
              // Prevent overlay click when clicking buttons inside
              if (!isDraggingExternal) {
                e.stopPropagation();
              }
            }}
          >
            <CaptureInstructions
              isDragging={isDraggingOver}
              isDraggingExternal={isDraggingExternal}
              isMaxReached={isMaxReached}
              elementCount={elementCount}
              maxElements={maxElements}
              isCapturing={isCapturing}
              onFileSelect={handleFileSelect}
              onCaptureArea={handleCaptureArea}
            />
          </div>
        </div>
      )}

      {/* Compact toolbar after first element - positioned at top */}
      {hasElements && !isDraggingOver && !isDraggingExternal && (
        <CompactToolbar
          elementCount={elementCount}
          maxElements={maxElements}
          isCapturing={isCapturing}
          isMaxReached={isMaxReached}
          onFileSelect={handleFileSelect}
          onCaptureArea={handleCaptureArea}
        />
      )}

      {/* Invisible drop zone overlay when has elements (to catch drops anywhere) */}
      {hasElements && !isDraggingOver && !isDraggingExternal && (
        <div className="absolute inset-0 z-10" />
      )}

      {/* Loading overlay when processing dropped image */}
      {isProcessingDrop && (
        <LoadingOverlay
          message="Loading image..."
          error={processingError || undefined}
        />
      )}
    </div>
  );
}
