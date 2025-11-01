interface ImagePreviewProps {
  fileName?: string;
  dataUrl: string;
  onRemove: () => void;
  disabled?: boolean;
}

export default function ImagePreview({
  fileName,
  dataUrl,
  onRemove,
  disabled = false,
}: ImagePreviewProps) {
  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-3 pb-2 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <svg
            className="h-5 w-5 text-green-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="text-sm font-medium text-gray-700 truncate max-w-[200px]">
            {fileName}
          </p>
        </div>
        <button
          onClick={onRemove}
          disabled={disabled}
          className="text-red-500 hover:text-red-700 disabled:text-gray-400 disabled:cursor-not-allowed text-sm font-medium transition-colors"
        >
          Remove
        </button>
      </div>
      <div className="flex-1 flex items-center justify-center overflow-hidden rounded-lg bg-gray-50">
        <img
          src={dataUrl}
          alt="Uploaded preview"
          className="max-h-full max-w-full object-contain"
        />
      </div>
    </div>
  );
}
