"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";

interface ImageDebugEntry {
  id: string;
  timestamp: Date;
  files: File[]; // Stored file references (preserved in history)
  prompt: string;
  previews: string[]; // Data URLs for input images
  previewDimensions: Array<{ width: number; height: number } | null>; // Dimensions of input images
  status: "pending" | "success" | "error";
  error?: string;
  resultUrl?: string; // Result image URL from server
  resultPreview?: string; // Data URL of result for history preservation
  resultDimensions?: { width: number; height: number } | null; // Dimensions of result image
  resultFileSize?: number; // File size in bytes
  // Grid combining metadata
  isGridCombined?: boolean;
  originalElementCount?: number;
  combinedGridPreview?: string; // Preview of the combined grid image
  combinedGridDimensions?: { width: number; height: number } | null;
  combinedGridFileSize?: number; // File size of combined grid in bytes
  // Placement analysis metadata
  placementRecommendations?: string;
  placementAnalysisTime?: number;
  placementTokensUsed?: number;
  // Image generation token usage
  generationTokensUsed?: number;
  generationPromptTokens?: number;
  generationCandidatesTokens?: number;
  // Optimization metadata
  originalSizes?: number[]; // Original file sizes before optimization (in bytes)
}

export default function DebugImageCompositionToServer() {
  const [isOpen, setIsOpen] = useState(false);
  const [entries, setEntries] = useState<ImageDebugEntry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<ImageDebugEntry | null>(
    null
  );

  // Expose function to window for the hook to call
  useEffect(() => {
    (window as any).__debugImageComposition = (
      files: File[],
      prompt: string,
      id: string,
      metadata?: {
        isGridCombined?: boolean;
        originalElementCount?: number;
        combinedGridFile?: File;
        placementRecommendations?: string;
        placementAnalysisTime?: number;
        placementTokensUsed?: number;
        originalSizes?: number[]; // Original file sizes before optimization
      }
    ) => {
      // Filter out null/undefined files and log warning
      const validFiles = files.filter(
        (file) => file !== null && file !== undefined
      );

      if (validFiles.length < files.length) {
        console.warn(
          `[Debug] Received ${
            files.length - validFiles.length
          } null/undefined file(s), proceeding with ${
            validFiles.length
          } valid files`
        );
      }

      if (validFiles.length === 0) {
        console.error("[Debug] No valid files to debug");
        return;
      }

      // Create copies of files to preserve in history
      const fileCopies = validFiles.map(
        (file) => new File([file], file.name, { type: file.type })
      );

      // Create preview URLs for the files (using FileReader for data URLs)
      const previewPromises = fileCopies.map((file) => {
        return new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
      });

      // Also create preview for combined grid if present
      const gridPreviewPromise = metadata?.combinedGridFile
        ? new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(metadata.combinedGridFile!);
          })
        : null;

      Promise.all([Promise.all(previewPromises), gridPreviewPromise]).then(
        ([previews, combinedGridPreview]) => {
          // Load image dimensions
          const dimensionPromises = previews.map((preview) => {
            return new Promise<{ width: number; height: number } | null>(
              (resolve) => {
                const img = new Image();
                img.onload = () =>
                  resolve({ width: img.width, height: img.height });
                img.onerror = () => resolve(null);
                img.src = preview;
              }
            );
          });

          // Load grid dimensions if present
          const gridDimensionPromise = combinedGridPreview
            ? new Promise<{ width: number; height: number } | null>(
                (resolve) => {
                  const img = new Image();
                  img.onload = () =>
                    resolve({ width: img.width, height: img.height });
                  img.onerror = () => resolve(null);
                  img.src = combinedGridPreview;
                }
              )
            : null;

          Promise.all([
            Promise.all(dimensionPromises),
            gridDimensionPromise,
          ]).then(([previewDimensions, combinedGridDimensions]) => {
            const entry: ImageDebugEntry = {
              id,
              timestamp: new Date(),
              files: fileCopies,
              prompt,
              previews,
              previewDimensions,
              status: "pending",
              isGridCombined: metadata?.isGridCombined,
              originalElementCount: metadata?.originalElementCount,
              combinedGridPreview: combinedGridPreview || undefined,
              combinedGridDimensions: combinedGridDimensions || undefined,
              combinedGridFileSize: metadata?.combinedGridFile?.size,
              placementRecommendations: metadata?.placementRecommendations,
              placementAnalysisTime: metadata?.placementAnalysisTime,
              placementTokensUsed: metadata?.placementTokensUsed,
              originalSizes: metadata?.originalSizes, // Store original sizes
            };

            setEntries((prev) => [entry, ...prev]);
          });
        }
      );
    };

    (window as any).__debugImageCompositionUpdate = (
      id: string,
      status: "success" | "error",
      data?: {
        resultUrl?: string;
        error?: string;
        usageMetadata?: {
          promptTokenCount?: number;
          candidatesTokenCount?: number;
          totalTokenCount?: number;
        };
      }
    ) => {
      setEntries((prev) =>
        prev.map((entry) => {
          if (entry.id === id) {
            // If success and we have a resultUrl, fetch and store as data URL
            if (status === "success" && data?.resultUrl) {
              fetch(data.resultUrl)
                .then((res) => res.blob())
                .then((blob) => {
                  const resultFileSize = blob.size;
                  const reader = new FileReader();
                  reader.onloadend = () => {
                    const resultPreview = reader.result as string;
                    // Load result image dimensions
                    const img = new Image();
                    img.onload = () => {
                      setEntries((current) =>
                        current.map((e) =>
                          e.id === id
                            ? {
                                ...e,
                                resultPreview,
                                resultDimensions: {
                                  width: img.width,
                                  height: img.height,
                                },
                                resultFileSize,
                                generationTokensUsed:
                                  data.usageMetadata?.totalTokenCount,
                                generationPromptTokens:
                                  data.usageMetadata?.promptTokenCount,
                                generationCandidatesTokens:
                                  data.usageMetadata?.candidatesTokenCount,
                              }
                            : e
                        )
                      );
                    };
                    img.onerror = () => {
                      setEntries((current) =>
                        current.map((e) =>
                          e.id === id
                            ? {
                                ...e,
                                resultPreview,
                                resultDimensions: null,
                                resultFileSize,
                                generationTokensUsed:
                                  data.usageMetadata?.totalTokenCount,
                                generationPromptTokens:
                                  data.usageMetadata?.promptTokenCount,
                                generationCandidatesTokens:
                                  data.usageMetadata?.candidatesTokenCount,
                              }
                            : e
                        )
                      );
                    };
                    img.src = resultPreview;
                  };
                  reader.readAsDataURL(blob);
                })
                .catch((err) => console.error("Failed to cache result:", err));
            }
            return { ...entry, status, ...data };
          }
          return entry;
        })
      );
    };

    return () => {
      console.log(
        "[Debug Panel] Component unmounting, cleaning up window functions"
      );
      delete (window as any).__debugImageComposition;
      delete (window as any).__debugImageCompositionUpdate;
    };
  }, []);

  // Cleanup preview URLs on unmount - No longer needed since we use data URLs
  // Data URLs are automatically garbage collected

  const toggleOpen = () => setIsOpen((prev) => !prev);

  const clearEntries = () => {
    setEntries([]);
    setSelectedEntry(null);
  };

  return (
    <>
      <DebugToggleButton
        isOpen={isOpen}
        entryCount={entries.length}
        onToggle={toggleOpen}
      />

      <div
        className={`fixed bottom-20 right-4 w-[600px] max-h-[80vh] z-[9999999] overflow-y-auto flex flex-col transition-opacity ${
          isOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
      >
        <Card className="bg-white shadow-2xl flex flex-col max-h-full">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-lg">Image Composition Debug</CardTitle>
            <div className="flex gap-2">
              <Button
                onClick={clearEntries}
                variant="outline"
                size="sm"
                disabled={entries.length === 0}
              >
                Clear
              </Button>
              <Button onClick={toggleOpen} variant="ghost" size="sm">
                ✕
              </Button>
            </div>
          </CardHeader>
          <CardContent className="overflow-y-auto flex-1">
            {entries.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="space-y-4">
                {entries.map((entry) => (
                  <DebugEntryCard
                    key={entry.id}
                    entry={entry}
                    isSelected={selectedEntry?.id === entry.id}
                    onSelect={() =>
                      setSelectedEntry(
                        selectedEntry?.id === entry.id ? null : entry
                      )
                    }
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

interface DebugToggleButtonProps {
  isOpen: boolean;
  entryCount: number;
  onToggle: () => void;
}

function DebugToggleButton({
  isOpen,
  entryCount,
  onToggle,
}: DebugToggleButtonProps) {
  return (
    <button
      onClick={onToggle}
      className="fixed top-4 right-4 z-[9999998] bg-purple-600 hover:bg-purple-700 text-white rounded-full p-3 shadow-lg"
      title="Toggle Image Composition Debug"
    >
      🖼️ {entryCount > 0 && `(${entryCount})`}
    </button>
  );
}

function EmptyState() {
  return (
    <div className="text-center text-gray-500 py-8">
      No image compositions yet. Start composing images to see debug info here.
    </div>
  );
}

interface DebugEntryCardProps {
  entry: ImageDebugEntry;
  isSelected: boolean;
  onSelect: () => void;
}

function DebugEntryCard({ entry, isSelected, onSelect }: DebugEntryCardProps) {
  return (
    <div
      className={`border rounded-lg p-4 cursor-pointer transition-all ${
        isSelected
          ? "border-purple-500 bg-purple-50"
          : "border-gray-200 hover:border-gray-300"
      }`}
      onClick={onSelect}
    >
      {/* Entry Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <StatusBadge status={entry.status} />
          <span className="text-xs text-gray-500">
            {entry.timestamp.toLocaleTimeString()}
          </span>
        </div>
        <span className="text-xs text-gray-500">
          {entry.files.length} images
        </span>
      </div>

      {/* Prompt */}
      <div className="mb-2">
        <span className="text-sm font-semibold">Prompt: </span>
        <span className="text-sm text-gray-700">
          {entry.prompt || "(no prompt)"}
        </span>
      </div>

      {/* Grid Info Badge */}
      {entry.isGridCombined && (
        <div className="mb-2 inline-flex items-center gap-2 text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
          <span>🔲 Grid Combined:</span>
          <span className="font-semibold">
            {entry.originalElementCount} elements → 1 grid image
          </span>
        </div>
      )}

      {/* Placement Recommendations */}
      {entry.placementRecommendations && (
        <div className="mb-2">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-blue-700">
              🤖 Gemini Nano Placement Analysis:
            </span>
            {entry.placementAnalysisTime && (
              <span className="text-xs text-blue-600">
                {entry.placementAnalysisTime.toFixed(0)}ms
              </span>
            )}
            {entry.placementTokensUsed && (
              <span className="text-xs text-blue-600">
                {entry.placementTokensUsed} tokens
              </span>
            )}
          </div>
          <div className="text-xs text-gray-700 bg-blue-50 p-2 rounded border border-blue-200">
            {entry.placementRecommendations}
          </div>
        </div>
      )}

      {/* Image Generation Token Usage */}
      {entry.generationTokensUsed && (
        <div className="mb-2">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-green-700">
              🎨 Gemini API Generation:
            </span>
            <span className="text-xs text-green-600">
              {entry.generationTokensUsed} tokens
            </span>
            {entry.generationPromptTokens && (
              <span className="text-xs text-green-600">
                ({entry.generationPromptTokens} prompt +{" "}
                {entry.generationCandidatesTokens} output)
              </span>
            )}
          </div>
        </div>
      )}

      <InputImagesPreview
        previews={entry.previews}
        dimensions={entry.previewDimensions}
        files={entry.files}
        originalSizes={entry.originalSizes}
      />

      {/* Combined Grid Preview */}
      {entry.combinedGridPreview && (
        <CombinedGridPreview
          preview={entry.combinedGridPreview}
          dimensions={entry.combinedGridDimensions}
          elementCount={entry.originalElementCount || 0}
          fileSize={entry.combinedGridFileSize}
        />
      )}

      <ResultImagePreview
        resultUrl={entry.resultUrl}
        resultPreview={entry.resultPreview}
        resultDimensions={entry.resultDimensions}
        resultFileSize={entry.resultFileSize}
      />

      {/* Error Message */}
      {entry.error && (
        <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
          Error: {entry.error}
        </div>
      )}

      {isSelected && <ExpandedDetails entry={entry} />}
    </div>
  );
}

interface InputImagesPreviewProps {
  previews: string[];
  dimensions: Array<{ width: number; height: number } | null>;
  files: File[];
  originalSizes?: number[]; // Original file sizes before optimization
}

function InputImagesPreview({
  previews,
  dimensions,
  files,
  originalSizes,
}: InputImagesPreviewProps) {
  return (
    <div className="mb-2">
      <div className="text-xs font-semibold text-gray-600 mb-1">
        Input Images:
      </div>
      <div className="grid grid-cols-4 gap-2">
        {previews.map((preview, idx) => (
          <div key={idx} className="flex flex-col">
            <div className="aspect-square bg-gray-100 rounded overflow-hidden border border-gray-200">
              <img
                src={preview}
                alt={`Input ${idx + 1}`}
                className="w-full h-full object-cover"
              />
            </div>
            {dimensions[idx] && (
              <div className="text-[10px] text-gray-500 text-center mt-0.5">
                {dimensions[idx]!.width} × {dimensions[idx]!.height}
              </div>
            )}
            {files[idx] && (
              <div className="text-[10px] text-gray-500 text-center">
                {originalSizes &&
                originalSizes[idx] &&
                Math.abs(originalSizes[idx] - files[idx].size) > 1024 ? ( // More than 1KB difference
                  // Show comparison only if optimization actually reduced size
                  files[idx].size < originalSizes[idx] ? (
                    <>
                      <div className="text-orange-600 line-through">
                        {(originalSizes[idx] / 1024 / 1024).toFixed(2)} MB
                      </div>
                      <div className="text-green-600 font-medium">
                        → {(files[idx].size / 1024 / 1024).toFixed(2)} MB
                      </div>
                    </>
                  ) : (
                    // Optimization was attempted but rejected (file got larger)
                    <div className="text-gray-700">
                      {(files[idx].size / 1024 / 1024).toFixed(2)} MB
                      <span className="text-[9px] text-gray-500 block">
                        (optimization skipped)
                      </span>
                    </div>
                  )
                ) : (
                  <div>{(files[idx].size / 1024 / 1024).toFixed(2)} MB</div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
      {originalSizes &&
        originalSizes.some(
          (size, idx) => files[idx] && size > files[idx].size
        ) && (
          <div className="text-[10px] text-green-600 mt-1 font-medium">
            ✓ Images were optimized for API
          </div>
        )}
    </div>
  );
}

interface ResultImagePreviewProps {
  resultUrl?: string;
  resultPreview?: string;
  resultDimensions?: { width: number; height: number } | null;
  resultFileSize?: number;
}

function ResultImagePreview({
  resultUrl,
  resultPreview,
  resultDimensions,
  resultFileSize,
}: ResultImagePreviewProps) {
  if (!resultUrl && !resultPreview) {
    return null;
  }

  return (
    <div className="mb-2">
      <div className="text-xs font-semibold text-green-600 mb-1">
        ✓ Result Image:
      </div>
      <div className="bg-gray-100 rounded overflow-hidden border-2 border-green-200">
        <img
          src={resultPreview || resultUrl}
          alt="Result"
          className="w-full object-contain max-h-48"
        />
      </div>
      {resultDimensions && (
        <div className="text-[10px] text-gray-500 text-center mt-1">
          {resultDimensions.width} × {resultDimensions.height}
          {resultFileSize && (
            <span className="ml-2">
              • {(resultFileSize / 1024 / 1024).toFixed(2)} MB
            </span>
          )}
        </div>
      )}
    </div>
  );
}

interface CombinedGridPreviewProps {
  preview: string;
  dimensions?: { width: number; height: number } | null;
  elementCount: number;
  fileSize?: number;
}

function CombinedGridPreview({
  preview,
  dimensions,
  elementCount,
  fileSize,
}: CombinedGridPreviewProps) {
  return (
    <div className="mb-2">
      <div className="text-xs font-semibold text-purple-600 mb-1">
        🔲 Combined Grid ({elementCount} elements):
      </div>
      <div className="bg-purple-50 rounded overflow-hidden border-2 border-purple-300">
        <img
          src={preview}
          alt="Combined Grid"
          className="w-full object-contain max-h-48"
        />
      </div>
      {dimensions && (
        <div className="text-[10px] text-purple-600 text-center mt-1 font-medium">
          {dimensions.width} × {dimensions.height}
          {fileSize && (
            <span className="ml-2">
              • {(fileSize / 1024 / 1024).toFixed(2)} MB
            </span>
          )}
        </div>
      )}
    </div>
  );
}

interface ExpandedDetailsProps {
  entry: ImageDebugEntry;
}
function ExpandedDetails({ entry }: ExpandedDetailsProps) {
  return (
    <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
      {/* File Details */}
      <div>
        <span className="text-xs font-semibold">Input File Details:</span>
        <div className="mt-1 space-y-1">
          {entry.files.map((file, idx) => (
            <div
              key={idx}
              className="text-xs text-gray-600 font-mono bg-gray-50 p-2 rounded"
            >
              <div className="font-semibold">
                {idx + 1}. {file.name}
              </div>
              <div className="text-gray-500">
                Size: {(file.size / 1024 / 1024).toFixed(2)} MB
              </div>
              <div className="text-gray-500">Type: {file.type}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Full Result Image */}
      {(entry.resultUrl || entry.resultPreview) && (
        <div>
          <span className="text-xs font-semibold text-green-600">
            Full Result Image:
          </span>
          <div className="mt-1 bg-gray-100 rounded overflow-hidden border border-gray-200">
            <img
              src={entry.resultPreview || entry.resultUrl}
              alt="Full composition result"
              className="w-full object-contain"
            />
          </div>
          {entry.resultDimensions && (
            <div className="mt-1 text-[10px] text-gray-500 text-center">
              {entry.resultDimensions.width} × {entry.resultDimensions.height}
              {entry.resultFileSize && (
                <span className="ml-2">
                  • {(entry.resultFileSize / 1024 / 1024).toFixed(2)} MB
                </span>
              )}
            </div>
          )}
          {entry.resultUrl && (
            <div className="mt-1 text-xs text-gray-500 font-mono break-all">
              URL: {entry.resultUrl}
            </div>
          )}
        </div>
      )}

      {/* Processing Info */}
      <div className="bg-blue-50 p-2 rounded">
        <div className="text-xs font-semibold text-blue-800">
          Processing Info:
        </div>
        <div className="text-xs text-blue-600 mt-1">ID: {entry.id}</div>
        <div className="text-xs text-blue-600">
          Timestamp: {entry.timestamp.toLocaleString()}
        </div>
        <div className="text-xs text-blue-600">Status: {entry.status}</div>
        {entry.generationTokensUsed && (
          <div className="text-xs text-blue-600">
            Generation Tokens: {entry.generationTokensUsed}
            {entry.generationPromptTokens &&
              entry.generationCandidatesTokens && (
                <span className="ml-1">
                  (prompt: {entry.generationPromptTokens}, output:{" "}
                  {entry.generationCandidatesTokens})
                </span>
              )}
          </div>
        )}
        {entry.placementTokensUsed && (
          <div className="text-xs text-blue-600">
            Placement Analysis Tokens: {entry.placementTokensUsed}
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: ImageDebugEntry["status"] }) {
  const styles = {
    pending: "bg-yellow-100 text-yellow-800",
    success: "bg-green-100 text-green-800",
    error: "bg-red-100 text-red-800",
  };

  const labels = {
    pending: "⏳ Pending",
    success: "✓ Success",
    error: "✗ Error",
  };

  return (
    <span
      className={`text-xs px-2 py-1 rounded-full font-medium ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}
