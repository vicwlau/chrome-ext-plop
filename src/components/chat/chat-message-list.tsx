import { useEffect, useRef } from "react";
import { useChatStore, selectCurrentSession } from "@/store/chat-store";
import { ChatMessageBubble } from "./chat-message";

export function ChatMessageList() {
  const currentSession = useChatStore(selectCurrentSession);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentSession?.messages.length]);

  if (!currentSession) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500 text-sm font-playfair">
        Start a new conversation!
      </div>
    );
  }

  if (currentSession.messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-blue-950 text-2xl px-4 text-center font-playfair italic">
        plop your questions here
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4">
      {currentSession.messages.map((message) => (
        <ChatMessageBubble key={message.id} message={message} />
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
}
