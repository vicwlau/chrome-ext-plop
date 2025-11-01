import { Button } from "@/components/ui/button";
import { useChatStore, selectCurrentSession } from "@/store/chat-store";
import { cn } from "@/lib/utils";
import type { ChatTab } from "./chat-component";

interface ChatHeaderProps {
  onClose: () => void;
  activeTab: ChatTab;
  onTabChange: (tab: ChatTab) => void;
}

export function ChatHeader({
  onClose,
  activeTab,
  onTabChange,
}: ChatHeaderProps) {
  const currentSession = useChatStore(selectCurrentSession);
  const { clearSessions, deleteSession } = useChatStore();
  const sessionCount = useChatStore((state) => state.sessions.length);

  const handleClear = () => {
    if (
      window.confirm(
        "Are you sure you want to clear all chat sessions? This cannot be undone."
      )
    ) {
      clearSessions();
    }
  };

  const handleDeleteCurrent = () => {
    if (currentSession) {
      if (
        window.confirm(
          "Are you sure you want to delete this session? This cannot be undone."
        )
      ) {
        deleteSession(currentSession.id);
      }
    }
  };

  return (
    <div className="space-y-3 font-playfair">
      <div className="flex items-center justify-between space-y-0">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => onTabChange("conversation")}
            className={cn(
              "px-4 py-1.5 text-sm font-medium rounded-md transition-all",
              activeTab === "conversation"
                ? "bg-white text-blue-950 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            )}
          >
            Conversation
          </button>
          <button
            onClick={() => onTabChange("custom")}
            className={cn(
              "px-4 py-1.5 text-sm font-medium rounded-md transition-all",
              activeTab === "custom"
                ? "bg-white text-blue-950 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            )}
          >
            Edit
          </button>
        </div>
        {/* <Button onClick={onClose} variant="ghost" size="sm">
          ✕
        </Button> */}
      </div>
    </div>
  );
}
