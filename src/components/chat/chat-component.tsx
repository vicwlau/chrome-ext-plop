"use client";

import { useState } from "react";
import { Drawer, DrawerContent, DrawerHeader } from "../ui/drawer";
import { useChatStore, selectCurrentSession } from "@/store/chat-store";
import { ChatHeader } from "./chat-header";
import { ChatMessageList } from "./chat-message-list";
import { ChatInput } from "./chat-input";
import { ChatPromptView } from "./chat-prompt-view";

interface ChatComponentProps {
  isOpen: boolean;
  onClose: () => void;
}

export type ChatTab = "conversation" | "custom";

export default function ChatComponent({ isOpen, onClose }: ChatComponentProps) {
  const [activeTab, setActiveTab] = useState<ChatTab>("conversation");
  const currentSession = useChatStore(selectCurrentSession);

  return (
    <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="max-h-[85vh] h-[38%]">
        <DrawerHeader className="">
          <ChatHeader
            onClose={onClose}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
        </DrawerHeader>
        <div className="flex-1 flex flex-col overflow-hidden mt-2">
          {activeTab === "conversation" ? (
            <>
              <ChatMessageList />
              <ChatInput />
            </>
          ) : (
            <ChatPromptView />
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
