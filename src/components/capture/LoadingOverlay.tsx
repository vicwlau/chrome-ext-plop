interface LoadingOverlayProps {
  message?: string;
  error?: string | null;
}

export default function LoadingOverlay({
  message = "Processing...",
  error = null,
}: LoadingOverlayProps) {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl p-8 max-w-sm mx-4">
        {!error ? (
          <div className="text-center space-y-4">
            {/* Spinner */}
            <div className="flex justify-center">
              <div className="relative w-16 h-16">
                <div className="absolute inset-0 border-4 border-purple-200 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-purple-600 rounded-full border-t-transparent animate-spin"></div>
              </div>
            </div>

            {/* Message */}
            <div className="space-y-2">
              <p className="text-lg font-semibold text-gray-800">{message}</p>
              <p className="text-sm text-gray-500">Please wait...</p>
            </div>
          </div>
        ) : (
          <div className="text-center space-y-4">
            {/* Error Icon */}
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
                <span className="text-4xl">⚠️</span>
              </div>
            </div>

            {/* Error Message */}
            <div className="space-y-2">
              <p className="text-lg font-semibold text-red-600">
                Failed to Load Image
              </p>
              <p className="text-sm text-gray-600">{error}</p>
              <p className="text-xs text-gray-500 pt-2">
                Try uploading the image directly or using area capture instead.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
