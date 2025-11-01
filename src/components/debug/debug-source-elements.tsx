"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { useImageStore } from "@/store/image-store";

export default function DebugSourceElements() {
  const [isOpen, setIsOpen] = useState(false);

  const sourceImage = useImageStore((state) => state.sourceImage);
  const elements = useImageStore((state) => state.elements);

  const toggleOpen = () => setIsOpen((prev) => !prev);

  return (
    <>
      <DebugToggleButton
        isOpen={isOpen}
        hasSource={!!sourceImage}
        elementCount={elements.length}
        onToggle={toggleOpen}
      />

      <div
        className={`fixed bottom-20 right-6 w-[600px] max-h-[80vh] z-[9999999] overflow-y-auto flex flex-col transition-opacity ${
          isOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
      >
        <Card className="bg-white shadow-2xl flex flex-col max-h-full">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-lg">Source & Elements Debug</CardTitle>
            <Button onClick={toggleOpen} variant="ghost" size="sm">
              ✕
            </Button>
          </CardHeader>
          <CardContent className="overflow-y-auto flex-1">
            {!sourceImage ? (
              <EmptyState message="No source image loaded" />
            ) : (
              <div className="space-y-4">
                {/* Source Image Section */}
                <SourceImageSection sourceImage={sourceImage} />

                {/* Elements Section */}
                <ElementsSection elements={elements} />
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
  hasSource: boolean;
  elementCount: number;
  onToggle: () => void;
}

function DebugToggleButton({
  isOpen,
  hasSource,
  elementCount,
  onToggle,
}: DebugToggleButtonProps) {
  return (
    <button
      onClick={onToggle}
      className="fixed top-4 right-[100px] z-[9999998] bg-blue-600 hover:bg-blue-700 text-white rounded-full p-3 shadow-lg"
      title="Toggle Source & Elements Debug"
    >
      📊 {hasSource && `(${elementCount})`}
    </button>
  );
}

function EmptyState({ message }: { message: string }) {
  return <div className="text-center text-gray-500 py-8">{message}</div>;
}

interface SourceImageSectionProps {
  sourceImage: any;
}

function SourceImageSection({ sourceImage }: SourceImageSectionProps) {
  return (
    <div className="border rounded-lg p-4 bg-green-50 border-green-200">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-sm font-semibold text-green-800">
          🖼️ Source Image
        </span>
      </div>

      {/* Preview */}
      <div className="mb-3 bg-white rounded overflow-hidden border border-green-200">
        <img
          src={sourceImage.dataUrl}
          alt="Source"
          className="w-full object-contain max-h-48"
        />
      </div>

      {/* Metadata */}
      <div className="space-y-2 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-gray-600">ID:</span>
          <span className="font-mono text-gray-800">{sourceImage.id}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-600">Dimensions:</span>
          <span className="font-semibold text-green-700">
            {sourceImage.dimensions.width} × {sourceImage.dimensions.height}
          </span>
        </div>
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Original Size:</span>
            <span className="font-semibold text-green-700">
              {(sourceImage.sizeInBytes / 1024 / 1024).toFixed(2)} MB
            </span>
          </div>
          {sourceImage.apiSizeInBytes && (
            <div className="flex items-center justify-between bg-blue-50 -mx-2 px-2 py-1 rounded">
              <span className="text-blue-700 font-medium">
                Optimized (API):
              </span>
              <span className="font-semibold text-blue-700">
                {(sourceImage.apiSizeInBytes / 1024 / 1024).toFixed(2)} MB
                <span className="ml-1 text-[10px]">
                  (
                  {(
                    (sourceImage.apiSizeInBytes / sourceImage.sizeInBytes) *
                    100
                  ).toFixed(0)}
                  %)
                </span>
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-600">Aspect Ratio:</span>
          <span className="text-gray-800">{sourceImage.aspectRatio}</span>
        </div>
        {sourceImage.file && (
          <>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">File Name:</span>
              <span className="text-gray-800 truncate max-w-[200px]">
                {sourceImage.file.name}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">File Type:</span>
              <span className="text-gray-800">{sourceImage.file.type}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

interface ElementsSectionProps {
  elements: any[];
}

function ElementsSection({ elements }: ElementsSectionProps) {
  if (elements.length === 0) {
    return (
      <div className="border rounded-lg p-4 bg-gray-50 border-gray-200">
        <div className="text-sm font-semibold text-gray-600 mb-2">
          📦 Elements ({elements.length})
        </div>
        <div className="text-xs text-gray-500 text-center py-4">
          No elements added yet
        </div>
      </div>
    );
  }

  return (
    <div className="border rounded-lg p-4 bg-blue-50 border-blue-200">
      <div className="text-sm font-semibold text-blue-800 mb-3">
        📦 Elements ({elements.length})
      </div>

      <div className="space-y-3">
        {elements.map((element, idx) => (
          <ElementCard key={element.id} element={element} index={idx} />
        ))}
      </div>
    </div>
  );
}

interface ElementCardProps {
  element: any;
  index: number;
}

function ElementCard({ element, index }: ElementCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div
      className={`border rounded p-3 cursor-pointer transition-all ${
        isExpanded
          ? "bg-white border-blue-400"
          : "bg-white border-blue-200 hover:border-blue-300"
      }`}
      onClick={() => setIsExpanded((prev) => !prev)}
    >
      {/* Compact View */}
      <div className="flex items-center gap-3">
        {/* Thumbnail */}
        <div className="w-16 h-16 bg-gray-100 rounded overflow-hidden border border-gray-200 flex-shrink-0">
          <img
            src={element.dataUrl}
            alt={`Element ${index + 1}`}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold text-gray-800 truncate">
            Element {index + 1}
          </div>
          <div className="text-[10px] text-gray-600">
            {element.dimensions.width} × {element.dimensions.height}
          </div>
          <div className="text-[10px] text-gray-600">
            {(element.sizeInBytes / 1024 / 1024).toFixed(2)} MB
            {element.apiSizeInBytes && (
              <span className="ml-1 text-blue-600 font-medium">
                → {(element.apiSizeInBytes / 1024 / 1024).toFixed(2)} MB
              </span>
            )}
          </div>
        </div>

        {/* Expand indicator */}
        <div className="text-blue-600 text-xs">{isExpanded ? "▼" : "▶"}</div>
      </div>

      {/* Expanded View */}
      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-blue-200">
          {/* Full Image */}
          <div className="mb-3 bg-gray-50 rounded overflow-hidden border border-gray-200">
            <img
              src={element.dataUrl}
              alt={`Element ${index + 1} full`}
              className="w-full object-contain"
            />
          </div>

          {/* Detailed Metadata */}
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">ID:</span>
              <span className="font-mono text-gray-800">{element.id}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Dimensions:</span>
              <span className="font-semibold text-blue-700">
                {element.dimensions.width} × {element.dimensions.height}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Original Size:</span>
                <span className="font-semibold text-blue-700">
                  {(element.sizeInBytes / 1024 / 1024).toFixed(2)} MB
                </span>
              </div>
              {element.apiSizeInBytes && (
                <div className="flex items-center justify-between bg-green-50 -mx-2 px-2 py-1 rounded">
                  <span className="text-green-700 font-medium">
                    Optimized (API):
                  </span>
                  <span className="font-semibold text-green-700">
                    {(element.apiSizeInBytes / 1024 / 1024).toFixed(2)} MB
                    <span className="ml-1 text-[10px]">
                      (
                      {(
                        (element.apiSizeInBytes / element.sizeInBytes) *
                        100
                      ).toFixed(0)}
                      %)
                    </span>
                  </span>
                </div>
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Aspect Ratio:</span>
              <span className="text-gray-800">{element.aspectRatio}</span>
            </div>
            {element.file && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">File Name:</span>
                  <span className="text-gray-800 truncate max-w-[300px]">
                    {element.file.name}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">File Type:</span>
                  <span className="text-gray-800">{element.file.type}</span>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
