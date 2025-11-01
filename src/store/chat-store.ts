import { create } from "zustand";
import { devtools } from "zustand/middleware";

// Chat Message
export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

// Chat Session
export interface ChatSession {
  id: string;
  sourceImageId?: string; // Optional link to image context
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}

// Store State
interface ChatStoreState {
  sessions: ChatSession[];
  currentSessionId: string | null;
  isProcessing: boolean;
  error: string | null;
  draftPrompt: string; // Persisted prompt input across component mounts
}

// Store Actions
interface ChatStoreActions {
  createSession: (sourceImageId?: string) => string;
  addMessage: (
    sessionId: string,
    role: "user" | "assistant",
    content: string
  ) => string; // Returns message ID
  updateMessage: (
    sessionId: string,
    messageId: string,
    content: string
  ) => void;
  setCurrentSession: (sessionId: string | null) => void;
  deleteSession: (sessionId: string) => void;
  clearSessions: () => void;
  setIsProcessing: (isProcessing: boolean) => void;
  setError: (error: string | null) => void;
  setDraftPrompt: (prompt: string) => void;
  clearDraftPrompt: () => void;
  reset: () => void;
}

// Combined store type
type ChatStore = ChatStoreState & ChatStoreActions;

// Initial state
const initialState: ChatStoreState = {
  sessions: [],
  currentSessionId: null,
  isProcessing: false,
  error: null,
  draftPrompt: "",
};

// Logger utility
const logger = {
  info: (message: string, data?: any) => {
    console.log(`[ChatStore] ℹ️ ${message}`, data || "");
  },
  action: (message: string, data?: any) => {
    console.log(`[ChatStore] ⚡ ${message}`, data || "");
  },
  error: (message: string, error?: any) => {
    console.error(`[ChatStore] ❌ ${message}`, error || "");
  },
};

// Helper to generate unique IDs
const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// Create the store
export const useChatStore = create<ChatStore>()(
  devtools(
    (set, get) => ({
      // Initial state
      ...initialState,

      // Create a new chat session
      createSession: (sourceImageId) => {
        const sessionId = `session-${generateId()}`;
        logger.action("Creating new session", { sessionId, sourceImageId });

        const newSession: ChatSession = {
          id: sessionId,
          sourceImageId,
          messages: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        set((state) => ({
          sessions: [...state.sessions, newSession],
          currentSessionId: sessionId,
        }));

        return sessionId;
      },

      // Add a message to a session
      addMessage: (sessionId, role, content) => {
        logger.action("Adding message", { sessionId, role });

        const message: ChatMessage = {
          id: `msg-${generateId()}`,
          role,
          content,
          timestamp: new Date(),
        };

        set((state) => ({
          sessions: state.sessions.map((session) =>
            session.id === sessionId
              ? {
                  ...session,
                  messages: [...session.messages, message],
                  updatedAt: new Date(),
                }
              : session
          ),
        }));

        return message.id;
      },

      // Update an existing message (for streaming)
      updateMessage: (sessionId, messageId, content) => {
        set((state) => ({
          sessions: state.sessions.map((session) =>
            session.id === sessionId
              ? {
                  ...session,
                  messages: session.messages.map((msg) =>
                    msg.id === messageId ? { ...msg, content } : msg
                  ),
                  updatedAt: new Date(),
                }
              : session
          ),
        }));
      },

      // Set current active session
      setCurrentSession: (sessionId) => {
        logger.action("Setting current session", { sessionId });
        set({ currentSessionId: sessionId });
      },

      // Delete a session
      deleteSession: (sessionId) => {
        logger.action("Deleting session", { sessionId });

        set((state) => {
          const updatedSessions = state.sessions.filter(
            (s) => s.id !== sessionId
          );
          const newCurrentId =
            state.currentSessionId === sessionId
              ? updatedSessions[updatedSessions.length - 1]?.id || null
              : state.currentSessionId;

          return {
            sessions: updatedSessions,
            currentSessionId: newCurrentId,
          };
        });
      },

      // Clear all sessions
      clearSessions: () => {
        logger.action("Clearing all sessions");
        set({
          sessions: [],
          currentSessionId: null,
        });
      },

      // Set processing state
      setIsProcessing: (isProcessing) => {
        set({ isProcessing });
      },

      // Set error state
      setError: (error) => {
        if (error) {
          logger.error("Error set", error);
        }
        set({ error });
      },

      // Set draft prompt (persists across component mounts)
      setDraftPrompt: (prompt) => {
        set({ draftPrompt: prompt });
      },

      // Clear draft prompt (on successful submission)
      clearDraftPrompt: () => {
        set({ draftPrompt: "" });
      },

      // Reset store
      reset: () => {
        logger.action("Resetting chat store");
        set(initialState);
      },
    }),
    { name: "ChatStore" }
  )
);

// Selectors
export const selectSessions = (state: ChatStore) => state.sessions;
export const selectCurrentSessionId = (state: ChatStore) =>
  state.currentSessionId;
export const selectIsProcessing = (state: ChatStore) => state.isProcessing;
export const selectError = (state: ChatStore) => state.error;

export const selectCurrentSession = (state: ChatStore) =>
  state.sessions.find((s) => s.id === state.currentSessionId) || null;

export const selectSessionById = (sessionId: string) => (state: ChatStore) =>
  state.sessions.find((s) => s.id === sessionId);

export const selectSessionCount = (state: ChatStore) => state.sessions.length;

export const selectDraftPrompt = (state: ChatStore) => state.draftPrompt;
