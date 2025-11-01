import { MessageSquare } from "lucide-react";
import { CircleButton } from "../ui/circle-button";

interface ChatToggleButtonProps {
  isOpen: boolean;
  sessionCount: number;
  messageCount: number;
  onToggle: () => void;
}

export function ChatToggleButton({
  isOpen,
  sessionCount,
  messageCount,
  onToggle,
}: ChatToggleButtonProps) {
  return (
    <CircleButton
      onClick={onToggle}
      className="shadow-xl relative"
      title="Toggle Chat with Gemini Nano"
    >
      <MessageSquare className="w-8 h-8 text-white" />
      {sessionCount > 0 && messageCount > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
          {messageCount}
        </span>
      )}
    </CircleButton>
  );
}
