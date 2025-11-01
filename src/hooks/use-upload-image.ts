"use client";

import { useState, useCallback, useRef, useEffect } from "react";

interface UseImageUploadOptions {
  accept?: string;
  maxSize?: number; // in bytes

  /*
    @onUpload callback when a valid image file is uploaded
  */
  onUpload?: (file: File) => void;
  onError?: (error: string) => void;

  /*
    @onExternalDrop callback when a drop event occurs (for external handling)
    Return true if handled externally, false to use default file handling
  */
  onExternalDrop?: (e: DragEvent) => boolean;
}

interface UseImageUploadReturn {
  /*
    @file reference to the file on disk (min memory footprint); enables checking file size/type
    passing to other components via drag and drop   
  */
  file: File | null;

  /*
    @dataUrl base64-encoded string for previewing the image in the UI; attribute to the img tag
  */
  dataUrl: string | null;

  isDragging: boolean;

  /*
    @inputRef hidden ref used to programmatically trigger the file selection dialog. 
    Example: Component calls inputRef.current.click() on button click to open file dialog
  */
  inputRef: React.RefObject<HTMLInputElement | null>;

  /*
    @dropZoneRef ref to the div that acts as the drag-and-drop zone
  */
  dropZoneRef: React.RefObject<HTMLDivElement | null>;

  /*
    @handleFileSelect function to be called when user selects a file via dialog or drop
  */
  handleFileSelect: (files: FileList | null) => void;
  reset: () => void;
}

export const useImageUpload = (
  options: UseImageUploadOptions = {}
): UseImageUploadReturn => {
  const {
    accept = "image/*",
    maxSize = 5 * 1024 * 1024, //todo Default 5MB
    onUpload,
    onError, // todo handle error
    onExternalDrop,
  } = options;

  // Data states
  const [file, setFile] = useState<File | null>(null);
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  // Drag state
  const [isDragging, setIsDragging] = useState(false);

  // Refs
  const inputRef = useRef<HTMLInputElement | null>(null);
  const dropZoneRef = useRef<HTMLDivElement | null>(null);

  const validateFile = useCallback(
    (file: File): boolean => {
      // todo use `accept` to validate file type?
      if (!file.type.startsWith("image/")) {
        onError?.("Please select an image file");
        return false;
      }

      if (maxSize && file.size > maxSize) {
        onError?.(
          `File size must be less than ${Math.round(maxSize / 1024 / 1024)}MB`
        );
        return false;
      }

      return true;
    },
    [maxSize, onError]
  );

  const processFile = useCallback(
    (file: File) => {
      console.log("processFile called with:", file.name, file.size, file.type);

      if (!validateFile(file)) {
        console.log("File validation failed");
        return;
      }

      console.log("File validation passed, processing...");
      setFile(file);
      onUpload?.(file);

      // Create data URL for preview
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        console.log("FileReader loaded, dataUrl length:", dataUrl?.length);
        setDataUrl(dataUrl);
      };
      reader.onerror = (e) => {
        console.error("FileReader error:", e);
      };
      reader.readAsDataURL(file);
    },
    [validateFile, onUpload]
  );

  const handleFileSelect = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;

      // todo why only take the first file?
      const selectedFile = files[0];
      processFile(selectedFile);
    },
    [processFile]
  );

  /*
    DRAG EVENTS
  */

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Only set isDragging to false if we're leaving the drop zone entirely
    if (
      dropZoneRef.current &&
      !dropZoneRef.current.contains(e.relatedTarget as Node)
    ) {
      setIsDragging(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent) => {
      console.log("🎯 [useImageUpload] handleDrop called", {
        hasDataTransfer: !!e.dataTransfer,
        types: e.dataTransfer?.types ? Array.from(e.dataTransfer.types) : [],
        filesCount: e.dataTransfer?.files?.length || 0,
      });

      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      // Check if external handler wants to handle this drop
      if (onExternalDrop) {
        console.log("🔄 [useImageUpload] Calling onExternalDrop...");
        const handled = onExternalDrop(e);
        console.log("✅ [useImageUpload] onExternalDrop returned:", handled);
        if (handled) {
          console.log(
            "✅ [useImageUpload] Drop handled by external handler, returning"
          );
          return;
        }
      }

      // Default file drop handling
      console.log("📁 [useImageUpload] Attempting default file handling...");
      const files = e.dataTransfer?.files;
      if (files) {
        console.log("✅ [useImageUpload] Files found:", files.length);
        handleFileSelect(files);
      } else {
        console.log("⚠️ [useImageUpload] No files in drop event");
      }
    },
    [handleFileSelect, onExternalDrop]
  );

  const reset = useCallback(() => {
    setFile(null);
    setDataUrl(null);
    setIsDragging(false);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }, []);

  useEffect(() => {
    const dropZone = dropZoneRef.current;
    if (!dropZone) return;

    dropZone.addEventListener("dragover", handleDragOver as any);
    dropZone.addEventListener("dragleave", handleDragLeave as any);
    dropZone.addEventListener("drop", handleDrop as any);

    return () => {
      dropZone.removeEventListener("dragover", handleDragOver as any);
      dropZone.removeEventListener("dragleave", handleDragLeave as any);
      dropZone.removeEventListener("drop", handleDrop as any);
    };
  }, [handleDragOver, handleDragLeave, handleDrop]);

  return {
    file,
    dataUrl,
    isDragging,
    inputRef,
    dropZoneRef,
    handleFileSelect,
    reset,
  };
};
