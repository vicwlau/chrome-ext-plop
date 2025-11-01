import UploadButton from "./UploadButton";
import CaptureButton from "./CaptureButton";
import ElementCounter from "./ElementCounter";

interface CaptureInstructionsProps {
  isDragging: boolean;
  isDraggingExternal: boolean;
  isMaxReached: boolean;
  elementCount: number;
  maxElements: number;
  isCapturing: boolean;
  onFileSelect: (files: FileList | null) => void;
  onCaptureArea: () => void;
}

export default function CaptureInstructions({
  isDragging,
  isDraggingExternal,
  isMaxReached,
  elementCount,
  maxElements,
  isCapturing,
  onFileSelect,
  onCaptureArea,
}: CaptureInstructionsProps) {
  return (
    <div className="text-center space-y-4">
      {/* Title */}
      <h3 className="text-xl font-bold text-gray-800">
        {isMaxReached
          ? "Maximum Elements Reached"
          : isDraggingExternal
          ? "Click to Add Dragged Image!"
          : isDragging
          ? "Drop Element Here!"
          : "Add Elements to Source"}
      </h3>

      {/* Special message for external drag */}
      {isDraggingExternal && !isMaxReached && (
        <div className="text-sm text-blue-600 font-semibold animate-pulse">
          👆 Click anywhere on this overlay to capture the image you're dragging
        </div>
      )}

      {/* Instructions */}
      {!isMaxReached && !isDragging && !isDraggingExternal && (
        <div className="text-sm text-gray-600 space-y-2">
          <ul className="text-left space-y-2">
            <li className="flex items-center gap-2">
              <span className="text-lg">📤</span>
              <span>Upload an image file</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-lg">📸</span>
              <span>Capture area from page</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-lg">🖱️</span>
              <span>Drag & drop from browser</span>
            </li>
          </ul>
        </div>
      )}

      {/* Buttons */}
      {!isMaxReached && !isDragging && !isDraggingExternal && (
        <div className="flex gap-3 justify-center pt-2">
          <UploadButton
            onFileSelect={onFileSelect}
            isDisabled={isMaxReached}
            variant="full"
          />
          <CaptureButton
            onClick={onCaptureArea}
            isCapturing={isCapturing}
            isDisabled={isMaxReached}
            variant="full"
          />
        </div>
      )}

      {/* Counter */}
      <ElementCounter
        count={elementCount}
        maxCount={maxElements}
        variant="full"
        showMessage={isMaxReached}
      />
    </div>
  );
}
