import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useImageAnalysis } from "@/hooks/use-image-analysis";
import { useCompositionAnalysis } from "@/hooks/use-composition-analysis";
import {
  useImageStore,
  selectSourceImage,
  selectElements,
  selectPositionedInstances,
  type SourceImageData,
  type ElementImageData,
} from "@/store/image-store";
import { Loader2, Image as ImageIcon, Sparkles, X, Layers } from "lucide-react";
import { useState, useEffect } from "react";

/**
 * Toggleable component for image analysis with Chrome's built-in AI
 */
export function ImageAnalysisExample() {
  const [isOpen, setIsOpen] = useState(false);
  const sourceImage = useImageStore(selectSourceImage);

  const toggleOpen = () => {
    setIsOpen(!isOpen);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  // Handle Escape key to close
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        handleClose();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen]);

  return (
    <>
      <ImageAnalysisToggleButton
        isOpen={isOpen}
        hasSourceImage={!!sourceImage}
        onToggle={toggleOpen}
      />

      {isOpen && (
        <div className="fixed bottom-20 right-4 w-[550px] h-[1200px] z-[9999997] flex flex-col">
          <Card className="bg-white shadow-2xl flex flex-col h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                AI Image Analysis
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClose}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col p-4 overflow-hidden">
              <ImageAnalysisContent onClose={handleClose} />
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

interface ImageAnalysisToggleButtonProps {
  isOpen: boolean;
  hasSourceImage: boolean;
  onToggle: () => void;
}

function ImageAnalysisToggleButton({
  isOpen,
  hasSourceImage,
  onToggle,
}: ImageAnalysisToggleButtonProps) {
  return (
    <button
      onClick={onToggle}
      className="fixed bottom-4 right-4 z-[9999996] bg-indigo-600 hover:bg-indigo-700 text-white rounded-full p-3 shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      title="AI Image Analysis"
      disabled={!hasSourceImage}
    >
      <div className="flex items-center gap-2">
        <Sparkles className="w-5 h-5" />
        {hasSourceImage && <span className="text-xs font-medium">AI</span>}
      </div>
    </button>
  );
}

interface ImageAnalysisContentProps {
  onClose: () => void;
}

function ImageAnalysisContent({ onClose }: ImageAnalysisContentProps) {
  const sourceImage = useImageStore(selectSourceImage);
  const elements = useImageStore(selectElements);
  const positionedInstances = useImageStore(selectPositionedInstances);
  const [customQuery, setCustomQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"single" | "composition">(
    "single"
  );

  // Get positioned element count
  const positionedElementIds = new Set(
    positionedInstances.map((inst) => inst.elementId)
  );
  const positionedElementCount = elements.filter((el) =>
    positionedElementIds.has(el.id)
  ).length;

  const {
    isAnalyzing,
    error,
    lastResponse,
    tokenInfo,
    analyzeImage,
    describeImage,
    generateAltText,
    identifyColors,
    suggestImprovements,
    reset,
  } = useImageAnalysis();

  const compositionAnalysis = useCompositionAnalysis();

  const handleCustomQuery = async () => {
    if (!sourceImage || !customQuery.trim()) return;

    if (activeTab === "composition") {
      await compositionAnalysis.analyzeComposition(customQuery);
    } else {
      await analyzeImage(customQuery, sourceImage);
    }
  };

  // Determine which hook's state to display
  const displayState =
    activeTab === "composition"
      ? {
          isAnalyzing: compositionAnalysis.isAnalyzing,
          error: compositionAnalysis.error,
          lastResponse: compositionAnalysis.result, // Map result to lastResponse
          tokenInfo: compositionAnalysis.tokenInfo,
          reset: compositionAnalysis.reset,
        }
      : {
          isAnalyzing,
          error,
          lastResponse,
          tokenInfo,
          reset,
        };

  // Auto-switch to composition tab if elements are positioned
  useEffect(() => {
    if (positionedElementCount > 0 && activeTab === "single") {
      setActiveTab("composition");
    }
  }, [positionedElementCount]);

  if (!sourceImage) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
        <ImageIcon className="w-12 h-12 mb-4 opacity-50" />
        <p className="text-center">Upload a source image to start analyzing</p>
      </div>
    );
  }

  if (!sourceImage) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
        <ImageIcon className="w-12 h-12 mb-4 opacity-50" />
        <p className="text-center">Upload a source image to start analyzing</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col space-y-4 overflow-hidden">
      {/* Image Display */}
      <div className="relative aspect-video. w-full overflow-hidden rounded-lg border bg-muted">
        <img
          src={sourceImage.dataUrl}
          alt={sourceImage.name || "Source image"}
          className="h-[100px] w-full object-contain"
        />
      </div>

      {/* Tab Selector */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setActiveTab("single")}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
            activeTab === "single"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            Single Image
          </div>
        </button>
        <button
          onClick={() => setActiveTab("composition")}
          disabled={positionedElementCount === 0}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px disabled:opacity-50 disabled:cursor-not-allowed ${
            activeTab === "composition"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4" />
            Composition{" "}
            {positionedElementCount > 0 && `(${positionedElementCount})`}
          </div>
        </button>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-2">
        {activeTab === "single" ? (
          <SingleImageAnalysisPanel
            sourceImage={sourceImage}
            isAnalyzing={isAnalyzing}
            describeImage={describeImage}
            generateAltText={generateAltText}
            identifyColors={identifyColors}
            suggestImprovements={suggestImprovements}
          />
        ) : (
          <CompositionAnalysisPanel
            isAnalyzing={compositionAnalysis.isAnalyzing}
            positionedElementCount={positionedElementCount}
            analyzeComposition={compositionAnalysis.analyzeComposition}
            compareWithElement={compositionAnalysis.compareWithElement}
            suggestPositioning={compositionAnalysis.suggestPositioning}
            elements={elements}
            positionedElementIds={positionedElementIds}
          />
        )}

        {/* Custom Query - Shared between both tabs */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Custom Query</label>
          <textarea
            placeholder={
              activeTab === "composition"
                ? "Ask about the composition, positioning, or element relationships..."
                : "Ask anything about this image..."
            }
            value={customQuery}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
              setCustomQuery(e.target.value)
            }
            disabled={displayState.isAnalyzing}
            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
          />
          <Button
            onClick={handleCustomQuery}
            disabled={displayState.isAnalyzing || !customQuery.trim()}
            className="w-full"
          >
            {displayState.isAnalyzing ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : null}
            Analyze
          </Button>
        </div>

        {/* Token Usage Display */}
        {displayState.tokenInfo && (
          <div className="rounded-lg border bg-blue-50 dark:bg-blue-950/20 p-3">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-blue-900 dark:text-blue-100">
                Token Usage
              </label>
              <span className="text-xs text-blue-700 dark:text-blue-300">
                {(
                  (displayState.tokenInfo.used / displayState.tokenInfo.quota) *
                  100
                ).toFixed(1)}
                %
              </span>
            </div>
            <div className="w-full bg-blue-200 dark:bg-blue-900 rounded-full h-2 mb-2">
              <div
                className="bg-blue-600 dark:bg-blue-400 h-2 rounded-full transition-all"
                style={{
                  width: `${Math.min(
                    (displayState.tokenInfo.used /
                      displayState.tokenInfo.quota) *
                      100,
                    100
                  )}%`,
                }}
              />
            </div>
            <div className="flex justify-between text-xs text-blue-700 dark:text-blue-300">
              <span>
                {displayState.tokenInfo.used.toLocaleString()} /{" "}
                {displayState.tokenInfo.quota.toLocaleString()} tokens
              </span>
              <span>
                {displayState.tokenInfo.remaining.toLocaleString()} remaining
              </span>
            </div>
          </div>
        )}

        {/* Response Display */}
        {displayState.lastResponse && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">AI Response</label>
              <Button onClick={displayState.reset} variant="ghost" size="sm">
                Clear
              </Button>
            </div>
            <div className="rounded-lg border bg-muted/50 p-4">
              <p className="text-sm whitespace-pre-wrap">
                {displayState.lastResponse}
              </p>
            </div>
          </div>
        )}

        {/* Error Display */}
        {displayState.error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
            <p className="text-sm text-destructive">{displayState.error}</p>
          </div>
        )}

        {/* Info Card */}
        {/* <div className="rounded-lg border bg-muted/30 p-4">
          <div className="text-xs text-muted-foreground space-y-2">
            <p>
              <strong>Note:</strong> Uses Chrome's built-in Gemini Nano for
              on-device image analysis.
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Requires Chrome Dev/Canary with Gemini Nano enabled</li>
              <li>Processing happens entirely on your device</li>
              <li>No data is sent to external servers</li>
            </ul>
          </div>
        </div> */}
      </div>
    </div>
  );
}

// ============================================================================
// Analysis Panel Sub-components
// ============================================================================

interface SingleImageAnalysisPanelProps {
  sourceImage: SourceImageData | null;
  isAnalyzing: boolean;
  describeImage: (image: SourceImageData) => Promise<string | null>;
  generateAltText: (image: SourceImageData) => Promise<string | null>;
  identifyColors: (image: SourceImageData) => Promise<string | null>;
  suggestImprovements: (image: SourceImageData) => Promise<string | null>;
}

function SingleImageAnalysisPanel({
  sourceImage,
  isAnalyzing,
  describeImage,
  generateAltText,
  identifyColors,
  suggestImprovements,
}: SingleImageAnalysisPanelProps) {
  if (!sourceImage) return null;

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Quick Actions</label>
      <div className="flex flex-wrap gap-2">
        <Button
          onClick={() => describeImage(sourceImage)}
          disabled={isAnalyzing}
          variant="outline"
          size="sm"
        >
          {isAnalyzing ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : null}
          Describe Image
        </Button>

        <Button
          onClick={() => generateAltText(sourceImage)}
          disabled={isAnalyzing}
          variant="outline"
          size="sm"
        >
          Generate Alt Text
        </Button>

        <Button
          onClick={() => identifyColors(sourceImage)}
          disabled={isAnalyzing}
          variant="outline"
          size="sm"
        >
          Identify Colors
        </Button>

        <Button
          onClick={() => suggestImprovements(sourceImage)}
          disabled={isAnalyzing}
          variant="outline"
          size="sm"
        >
          Suggest Improvements
        </Button>
      </div>
    </div>
  );
}

interface CompositionAnalysisPanelProps {
  isAnalyzing: boolean;
  positionedElementCount: number;
  analyzeComposition: (customPrompt?: string) => Promise<string | null>;
  compareWithElement: (elementId: string) => Promise<string | null>;
  suggestPositioning: () => Promise<string | null>;
  elements: ElementImageData[];
  positionedElementIds: Set<string>;
}

function CompositionAnalysisPanel({
  isAnalyzing,
  positionedElementCount,
  analyzeComposition,
  compareWithElement,
  suggestPositioning,
  elements,
  positionedElementIds,
}: CompositionAnalysisPanelProps) {
  const [selectedElementId, setSelectedElementId] = useState<string>("");

  // Get positioned elements for dropdown
  const positionedElements = elements.filter((el) =>
    positionedElementIds.has(el.id)
  );

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Composition Analysis</label>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => analyzeComposition()}
            disabled={isAnalyzing}
            variant="outline"
            size="sm"
          >
            {isAnalyzing ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : null}
            Analyze Full Composition
          </Button>

          <Button
            onClick={() => suggestPositioning()}
            disabled={isAnalyzing}
            variant="outline"
            size="sm"
          >
            Suggest Positioning
          </Button>
        </div>
      </div>

      {/* Compare with specific element */}
      {positionedElements.length > 0 && (
        <div className="space-y-2">
          <label className="text-sm font-medium">Compare with Element</label>
          <div className="flex gap-2">
            <select
              value={selectedElementId}
              onChange={(e) => setSelectedElementId(e.target.value)}
              disabled={isAnalyzing}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">Select element...</option>
              {positionedElements.map((el, idx) => (
                <option key={el.id} value={el.id}>
                  Element {idx + 1}
                </option>
              ))}
            </select>
            <Button
              onClick={() =>
                selectedElementId && compareWithElement(selectedElementId)
              }
              disabled={isAnalyzing || !selectedElementId}
              size="sm"
            >
              Compare
            </Button>
          </div>
        </div>
      )}

      {/* Info card */}
      <div className="rounded-lg border bg-muted/30 p-3">
        <p className="text-xs text-muted-foreground">
          <strong>Composition Analysis</strong> analyzes the source image with{" "}
          {positionedElementCount} positioned element
          {positionedElementCount !== 1 ? "s" : ""}. It provides feedback on
          visual harmony, color compatibility, and positioning suggestions.
        </p>
      </div>
    </div>
  );
}
