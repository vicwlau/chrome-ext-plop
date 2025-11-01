import { useState, KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { useChat } from "@/hooks/use-chat";
import { ChevronDownIcon, SendHorizonal } from "lucide-react";
import { cn } from "@/lib/utils";
import { Loader } from "../loader";

export function ChatInput() {
  const [input, setInput] = useState("");
  const { sendMessage, isProcessing } = useChat();

  const handleSend = () => {
    if (input.trim() && !isProcessing) {
      sendMessage(input, {
        includeSource: true,
        includePositionedElements: true, // Include positioned elements with coordinates
      });
      setInput("");
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="p-4 bg-white/80 font-playfair">
      {isProcessing && (
        <div className="text-xs text-stone-600 mb-2 flex items-center justify-center gap-2">
          <Loader size={32} />
          {/* <span>thinking...</span> */}
        </div>
      )}
      <div className="flex gap-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask a question... "
          className="flex-1 resize-none border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-950 focus:border-transparent"
          rows={1}
          disabled={isProcessing}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || isProcessing}
          className=""
        >
          <SendHorizonal className="text-blue-950" />
        </button>
      </div>
    </div>
  );
}
