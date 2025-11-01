import { useRef } from "react";

interface UploadButtonProps {
  onFileSelect: (files: FileList | null) => void;
  isDisabled?: boolean;
  variant?: "full" | "compact";
}

export default function UploadButton({
  onFileSelect,
  isDisabled = false,
  variant = "full",
}: UploadButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const isCompact = variant === "compact";

  return (
    <label className={isDisabled ? "cursor-not-allowed" : "cursor-pointer"}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={(e) => onFileSelect(e.target.files)}
        className="hidden"
        disabled={isDisabled}
      />
      <div
        className={`
          ${isCompact ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm"}
          bg-blue-500 hover:bg-blue-600 
          disabled:bg-gray-400 disabled:cursor-not-allowed
          text-white font-medium rounded-lg transition-colors
          flex items-center gap-1
          ${isDisabled ? "opacity-50 cursor-not-allowed" : ""}
        `}
      >
        <span>📤</span>
        <span>Upload</span>
      </div>
    </label>
  );
}
