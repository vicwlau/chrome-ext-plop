"use client";

import { useCanvasGenerate } from "@/hooks/use-canvas-generate";
import { selectCurrentSession, useChatStore } from "@/store/chat-store";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, MessageSquare, WandSparkles } from "lucide-react";
import { useState } from "react";

// ============================================================================
// ANIMATION CONSTANTS - Adjust these for spacing and animation tuning
// ============================================================================

// Container dimensions
const CONTAINER_WIDTH = 64; // Width in pixels (always stays the same)
const CONTAINER_HEIGHT_COLLAPSED = 64; // Height when showing only generate button
const CONTAINER_HEIGHT_EXPANDED = 128; // Height when showing both buttons

// Button positioning offsets
const CHAT_BUTTON_OFFSET_Y = -28; // How far up the chat button moves from center
const GENERATE_BUTTON_OFFSET_Y = 28; // How far down the generate button moves from center

// Animation spring physics
const CONTAINER_SPRING_STIFFNESS = 300;
const CONTAINER_SPRING_DAMPING = 25;
const BUTTON_SPRING_STIFFNESS = 400;
const BUTTON_SPRING_DAMPING = 25;

interface FloatingActionContainerProps {
  onChatToggle: () => void;
}

/**
 * A presentational container that displays action buttons at the bottom-right.
 * On hover, the container expands vertically into an oval to show both buttons.
 *
 * Pattern inspired by toolbar expansion - primary button always visible,
 * secondary buttons slide in on hover within the same container.
 */
export default function FloatingActionContainer({
  onChatToggle,
}: FloatingActionContainerProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Generate logic
  const { handleGenerate, isLoading } = useCanvasGenerate();

  return (
    <div className="relative">
      {/* Expandable oval container */}
      <motion.div
        className="bg-blue-950 bg-[#6D4243]. hover:bg-blue-950 rounded-full shadow-lg flex items-center justify-center transition-colors duration-200 overflow-hidden relative"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{
          opacity: 1,
          scale: 1,
          height: isExpanded
            ? `${CONTAINER_HEIGHT_EXPANDED}px`
            : `${CONTAINER_HEIGHT_COLLAPSED}px`,
          width: `${CONTAINER_WIDTH}px`,
        }}
        transition={{
          type: "spring",
          stiffness: CONTAINER_SPRING_STIFFNESS,
          damping: CONTAINER_SPRING_DAMPING,
        }}
        onMouseEnter={() => setIsExpanded(true)}
        onMouseLeave={() => setIsExpanded(false)}
      >
        {/* Secondary button - Chat (slides in on hover) - absolutely positioned */}
        <AnimatePresence>
          {isExpanded && (
            <motion.button
              initial={{ opacity: 0, scale: 0.5, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: CHAT_BUTTON_OFFSET_Y }}
              exit={{ opacity: 0, scale: 0.5, y: 20 }}
              transition={{
                type: "spring",
                stiffness: BUTTON_SPRING_STIFFNESS,
                damping: BUTTON_SPRING_DAMPING,
              }}
              onClick={onChatToggle}
              className="absolute flex items-center justify-center w-12 h-12 focus:outline-none"
              title="Toggle Chat with Gemini Nano"
            >
              <MessageSquare className="w-8 h-8 text-white" />
            </motion.button>
          )}
        </AnimatePresence>

        {/* Primary button - Generate (always visible and centered) */}
        <motion.button
          onClick={handleGenerate}
          disabled={isLoading}
          animate={{
            y: isExpanded ? GENERATE_BUTTON_OFFSET_Y : 0,
          }}
          transition={{
            type: "spring",
            stiffness: CONTAINER_SPRING_STIFFNESS,
            damping: CONTAINER_SPRING_DAMPING,
          }}
          className="flex items-center justify-center w-12 h-12 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
          title="Generate Composition"
          whileTap={{ scale: 0.9 }}
        >
          {isLoading ? (
            <Loader2 className="w-8 h-8 text-white animate-spin" />
          ) : (
            <WandSparkles className="w-8 h-8 text-[#DAE5E2]" />
          )}
        </motion.button>
      </motion.div>
    </div>
  );
}
