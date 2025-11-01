"use client";

import clsx from "clsx";
import { Toaster } from "sonner";
import { useState } from "react";
import DebugImageCompositionToServer from "../debug/debug-image-composition-with-server";
import DebugSourceElements from "../debug/debug-source-elements";
import { ImageAnalysisExample } from "../image-analysis-example";
import CoreCanvas from "./core-canvas";
import ElementsGallery from "./core-elements-gallery";
import GeneratedImagesGallery from "./core-generated-images-gallery";
import CoreTitle from "./core-title";
import ChatComponent from "../chat/chat-component";
import FloatingActionContainer from "../floating-action-container";
import { useChatStore, selectCurrentSession } from "@/store/chat-store";
import { useImageStore, selectSourceImage } from "@/store/image-store";

const border_on = false;

export default function CoreMain() {
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Hover scale for logo letters (as percentage, e.g., 130 = 130%)

  // Chat state
  const currentSession = useChatStore(selectCurrentSession);
  const { createSession } = useChatStore();
  const sourceImage = useImageStore(selectSourceImage);

  const handleChatToggle = () => {
    const willOpen = !isChatOpen;
    setIsChatOpen(willOpen);

    // Create a new session when opening if none exists
    if (willOpen && !currentSession) {
      const sessionId = createSession(sourceImage?.id);
      console.log("[CoreMain] Created new session:", sessionId);
    }
  };

  const handleChatClose = () => setIsChatOpen(false);

  return (
    <div className="relative w-full min-h-screen max-h-dvh font-sans overflow-hidden">
      <div
        className={clsx(
          "absolute w-full h-full -z-[10]",
          "blur-2xl bg-[#F2F2F2]."
          // "bg-gradient-to-b from-slate-300/10 via-transparent to-slate-400/10"
        )}
      ></div>

      <div className="w-full h-dvh flex flex-col">
        <CoreTitle />
        <ElementsGallery
          className={clsx("h-[21%]", border_on && "border-2 border-pink-600")}
        />

        <CoreCanvas
          className={clsx("h-[50%]", border_on && "border-2 border-amber-500")}
        />
        <GeneratedImagesGallery
          className={clsx("h-[29%]", border_on && " border-2 border-blue-700")}
        />
      </div>

      {/* Floating action buttons - responsive positioning above GeneratedImagesGallery */}
      <div className="absolute bottom-[calc(26.5%)] right-4 z-50">
        <FloatingActionContainer onChatToggle={handleChatToggle} />
      </div>

      {/* Chat panel */}
      <ChatComponent isOpen={isChatOpen} onClose={handleChatClose} />

      {/* debug region */}
      {/* <DebugSourceElements /> */}
      {/* <DebugImageCompositionToServer /> */}
      {/* <ImageAnalysisExample /> */}

      <Toaster />
    </div>
  );
}
