interface CaptureButtonProps {
  onClick: () => void;
  isCapturing?: boolean;
  isDisabled?: boolean;
  variant?: "full" | "compact";
}

export default function CaptureButton({
  onClick,
  isCapturing = false,
  isDisabled = false,
  variant = "full",
}: CaptureButtonProps) {
  const isCompact = variant === "compact";

  return (
    <button
      onClick={onClick}
      disabled={isCapturing || isDisabled}
      className={`
        ${isCompact ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm"}
        bg-purple-500 hover:bg-purple-600 
        disabled:bg-gray-400 disabled:cursor-not-allowed
        text-white font-medium rounded-lg transition-colors
        flex items-center gap-1
      `}
    >
      <span>📸</span>
      <span>{isCapturing ? "Capturing..." : "Capture"}</span>
    </button>
  );
}
