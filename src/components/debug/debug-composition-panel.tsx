import { useState } from "react";
import type { CompositionState } from "@/hooks/use-image-composition";

interface CompositionDebugPanelProps {
  state: CompositionState;
  generatedImageDimensions?: {
    width: number;
    height: number;
  } | null;
}

export default function DebugCompositionPanel({
  state,
  generatedImageDimensions,
}: CompositionDebugPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md">
      <div className="bg-gray-900 text-white rounded-lg shadow-2xl border border-gray-700">
        <DebugPanelHeader
          isProcessing={state.isProcessing}
          isExpanded={isExpanded}
          toggleExpand={() => setIsExpanded(!isExpanded)}
        />
        {isExpanded && (
          <DebugPanelContent
            state={state}
            generatedImageDimensions={generatedImageDimensions}
          />
        )}
      </div>
    </div>
  );
}

// --- Sub-components ---

const DebugPanelHeader = ({
  isProcessing,
  isExpanded,
  toggleExpand,
}: {
  isProcessing: boolean;
  isExpanded: boolean;
  toggleExpand: () => void;
}) => (
  <div
    className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-800"
    onClick={toggleExpand}
  >
    <div className="flex items-center gap-2">
      <span className="text-lg">🐛</span>
      <span className="font-semibold text-sm">Debug Panel</span>
      {isProcessing && <span className="animate-spin">⏳</span>}
    </div>
    <button className="text-gray-400 hover:text-white">
      {isExpanded ? "▼" : "▲"}
    </button>
  </div>
);

const DebugPanelContent = ({
  state,
  generatedImageDimensions,
}: CompositionDebugPanelProps) => (
  <div className="p-3 border-t border-gray-700 space-y-3 text-xs">
    <StatusIndicators
      isSourceLoaded={state.isSourceLoaded}
      elementCount={state.elements.length}
    />
    {state.lastAction && <LastAction action={state.lastAction} />}
    {state.sourceImage && <SourceImageInfo sourceImage={state.sourceImage} />}
    {generatedImageDimensions && (
      <GeneratedImageInfo
        generatedImageDimensions={generatedImageDimensions}
      />
    )}
    {state.elements.length > 0 && <ElementsList elements={state.elements} />}
    <StateSummary state={state} />
  </div>
);

const StatusIndicators = ({
  isSourceLoaded,
  elementCount,
}: {
  isSourceLoaded: boolean;
  elementCount: number;
}) => (
  <div className="space-y-1">
    <div className="flex items-center gap-2">
      <div
        className={`w-2 h-2 rounded-full ${
          isSourceLoaded ? "bg-green-500" : "bg-red-500"
        }`}
      />
      <span className="text-gray-300">
        Source: {isSourceLoaded ? "Loaded" : "Not loaded"}
      </span>
    </div>
    <div className="flex items-center gap-2">
      <div
        className={`w-2 h-2 rounded-full ${
          elementCount > 0 ? "bg-green-500" : "bg-yellow-500"
        }`}
      />
      <span className="text-gray-300">Elements: {elementCount}</span>
    </div>
  </div>
);

const LastAction = ({ action }: { action: string }) => (
  <div className="bg-gray-800 p-2 rounded">
    <div className="text-gray-400 text-[10px] uppercase mb-1">Last Action</div>
    <div className="text-green-400">{action}</div>
  </div>
);

const SourceImageInfo = ({
  sourceImage,
}: {
  sourceImage: CompositionState["sourceImage"];
}) =>
  sourceImage && (
    <div className="bg-gray-800 p-2 rounded">
      <div className="text-gray-400 text-[10px] uppercase mb-1">
        Source Image
      </div>
      <div className="space-y-1 text-gray-300">
        <div>
          📐 {sourceImage.dimensions.width}x{sourceImage.dimensions.height}px
        </div>
        <div>
          📦{" "}
          {sourceImage.file
            ? Math.round(sourceImage.file.size / 1024)
            : "?"}
          KB
        </div>
      </div>
    </div>
  );

const GeneratedImageInfo = ({
  generatedImageDimensions,
}: {
  generatedImageDimensions: { width: number; height: number };
}) => (
  <div className="bg-gray-800 p-2 rounded">
    <div className="text-gray-400 text-[10px] uppercase mb-1">
      Generated Image
    </div>
    <div className="space-y-1 text-gray-300">
      <div>
        📐 {generatedImageDimensions.width}x{generatedImageDimensions.height}px
      </div>
      <div className="text-green-400">✅ Generated</div>
    </div>
  </div>
);

const ElementsList = ({
  elements,
}: {
  elements: CompositionState["elements"];
}) => (
  <div className="bg-gray-800 p-2 rounded">
    <div className="text-gray-400 text-[10px] uppercase mb-1">
      Elements ({elements.length})
    </div>
    <div className="space-y-2 max-h-40 overflow-y-auto">
      {elements.map((element, index) => (
        <div
          key={element.id}
          className="text-gray-300 border-l-2 border-blue-500 pl-2"
        >
          <div className="font-medium">#{index + 1}</div>
          <div className="text-[10px] space-y-0.5">
            <div>
              📐 {element.dimensions.width}x{element.dimensions.height}px
            </div>
            {element.position ? (
              <div className="text-green-400">
                📍 Position: ({element.position.x.toFixed(3)},{" "}
                {element.position.y.toFixed(3)})
              </div>
            ) : (
              <div className="text-yellow-400">📍 Not positioned yet</div>
            )}
          </div>
        </div>
      ))}
    </div>
  </div>
);

const StateSummary = ({ state }: { state: CompositionState }) => (
  <div className="bg-gray-800 p-2 rounded">
    <div className="text-gray-400 text-[10px] uppercase mb-1">
      State Summary
    </div>
    <div className="text-gray-300 space-y-0.5">
      <div>
        🎨 Source:{" "}
        <span className="text-blue-400">
          {state.isSourceLoaded ? "Ready" : "Empty"}
        </span>
      </div>
      <div>
        🧩 Elements:{" "}
        <span className="text-purple-400">{state.elements.length}</span>
      </div>
      <div>
        ⚙️ Processing:{" "}
        <span className="text-orange-400">
          {state.isProcessing ? "Yes" : "No"}
        </span>
      </div>
      <div>
        📍 Positioned:{" "}
        <span className="text-green-400">
          {state.elements.filter((el) => el.position).length}
        </span>
      </div>
    </div>
  </div>
);