import { useChatGenerate } from "@/hooks/use-chat-generate";
import { useChatStore } from "@/store/chat-store";
import { Button } from "@/components/ui/button";
import { Loader2, Send, AlertCircle } from "lucide-react";

export function ChatPromptView() {
  const draftPrompt = useChatStore((state) => state.draftPrompt);
  const setDraftPrompt = useChatStore((state) => state.setDraftPrompt);
  const clearDraftPrompt = useChatStore((state) => state.clearDraftPrompt);

  const { handleChatGenerate, isLoading, error, canGenerate, validation } =
    useChatGenerate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!draftPrompt.trim()) {
      return;
    }

    if (!canGenerate) {
      return;
    }

    // Save the current prompt before submission
    const submittedPrompt = draftPrompt.trim();

    // Clear prompt immediately when user submits
    clearDraftPrompt();

    await handleChatGenerate(submittedPrompt);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="flex flex-1 flex-col px-6 pb-6">
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-2xl font-playfair italic text-blue-950">
          Design with AI
        </h3>
        <p className="text-sm text-gray-600 font-playfair mt-1">
          Describe changes for space and objects.
        </p>
      </div>

      {/* Validation Warning */}
      {!validation.isValid && (
        <div className="mb-2 p-2 border border-amber-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-xs text-amber-700 mt-1">{validation.error}</p>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Prompt Input Form */}
      <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
        <div className="flex-1 flex flex-col mb-4">
          <textarea
            id="prompt"
            value={draftPrompt}
            onChange={(e) => setDraftPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="e.g., change the wall color to dusty green, or place the furniture naturally in the living room..."
            disabled={isLoading || !canGenerate}
            className="flex flex-1 min-h-[100px] p-4 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-950 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500 transition-colors font-playfair text-lg"
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={!canGenerate || isLoading || !draftPrompt.trim()}
          className="w-full font-playfair bg-blue-950 text-white py-3 rounded-lg flex items-center justify-center hover:bg-blue-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            </>
          ) : (
            <>
              <Send className="w-4 h-4 mr-2" />
              update space
            </>
          )}
        </button>
      </form>
    </div>
  );
}
