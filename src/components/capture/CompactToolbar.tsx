import UploadButton from "./UploadButton";
import CaptureButton from "./CaptureButton";
import ElementCounter from "./ElementCounter";

interface CompactToolbarProps {
  elementCount: number;
  maxElements: number;
  isCapturing: boolean;
  isMaxReached: boolean;
  onFileSelect: (files: FileList | null) => void;
  onCaptureArea: () => void;
}

export default function CompactToolbar({
  elementCount,
  maxElements,
  isCapturing,
  isMaxReached,
  onFileSelect,
  onCaptureArea,
}: CompactToolbarProps) {
  return (
    <div
      className="absolute z-20 top-0 left-0 
    left-1/2. transform. -translate-x-1/2.
    "
    >
      <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-lg border-2 border-purple-400 p-3">
        <div className="flex items-center gap-3">
          {/* Counter */}
          <ElementCounter
            count={elementCount}
            maxCount={maxElements}
            variant="compact"
            showMessage={false}
          />

          {!isMaxReached && (
            <>
              {/* Upload button */}
              <UploadButton
                onFileSelect={onFileSelect}
                isDisabled={isMaxReached}
                variant="compact"
              />

              {/* Capture button */}
              <CaptureButton
                onClick={onCaptureArea}
                isCapturing={isCapturing}
                isDisabled={isMaxReached}
                variant="compact"
              />

              {/* Drag hint */}
              <div className="text-xs text-gray-500 border-l pl-3 whitespace-nowrap">
                🖱️ Drag images here
              </div>
            </>
          )}

          {isMaxReached && (
            <div className="text-xs text-red-600">
              Max reached • Remove elements to add more
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
