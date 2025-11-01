import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { DragSource, DropTarget } from "@/hooks/drag-drop";

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

// View & Modal Types
export type ModalType = "upload" | "capture" | "preview" | "help" | null;
export type PanelId = "source" | "elements" | "generated";

// Unified Interaction Types
export type InteractionType =
  | "idle"
  | "uploading"
  | "dragging"
  | "capturing"
  | "positioning"
  | "generating"
  | "error";

// Interaction-specific data
export interface DraggingData {
  source: Exclude<DragSource, "desktop">; // Internal sources only (desktop is external)
  target: DropTarget | null;
  itemId: string;
  imageUrl: string;
}

export interface CapturingData {
  target: "element" | "area";
  showOverlay: boolean;
}

export interface PositioningData {
  elementId: string;
  showOverlay: boolean;
}

export interface GeneratingData {
  status: "preparing" | "processing" | "complete" | "failed";
  progress: number; // 0-100
  message: string;
  showOverlay: boolean;
}

export interface ErrorData {
  message: string;
  context: string | null;
}

// Union type for interaction data
export type InteractionData =
  | { type: "idle"; data: null }
  | { type: "uploading"; data: null }
  | { type: "dragging"; data: DraggingData }
  | { type: "capturing"; data: CapturingData }
  | { type: "positioning"; data: PositioningData }
  | { type: "generating"; data: GeneratingData }
  | { type: "error"; data: ErrorData };

// Composition Readiness
export interface CompositionStatus {
  canGenerate: boolean;
  blockers: string[];
}

// Carousel State
export interface CarouselState {
  elementIndex: number;
  generatedIndex: number;
}

// ═══════════════════════════════════════════════════════════════
// STORE STATE
// ═══════════════════════════════════════════════════════════════

interface AppStoreState {
  // ─────────────────────────────────────────
  // Modal State
  // ─────────────────────────────────────────
  activeModal: ModalType;
  modalData: any;

  // ─────────────────────────────────────────
  // Panel State
  // ─────────────────────────────────────────
  lockedPanels: PanelId[];
  collapsedPanels: PanelId[];

  // ─────────────────────────────────────────
  // Carousel State
  // ─────────────────────────────────────────
  carousel: CarouselState;

  // ─────────────────────────────────────────
  // Interaction State (Unified!)
  // ─────────────────────────────────────────
  interaction: InteractionData;

  // ─────────────────────────────────────────
  // Composition Readiness
  // ─────────────────────────────────────────
  composition: CompositionStatus;

  // ─────────────────────────────────────────
  // Help & Debug
  // ─────────────────────────────────────────
  showHelp: boolean;
  showDebugPanel: boolean;
  helpContext: string | null;

  // ─────────────────────────────────────────
  // Operation History
  // ─────────────────────────────────────────
  lastOperation: string | null;
  operationTimestamp: number | null;
}

// ═══════════════════════════════════════════════════════════════
// STORE ACTIONS
// ═══════════════════════════════════════════════════════════════

interface AppStoreActions {
  // ─────────────────────────────────────────
  // Modal Actions
  // ─────────────────────────────────────────
  openModal: (modal: ModalType, data?: any) => void;
  closeModal: () => void;

  // ─────────────────────────────────────────
  // Panel Actions
  // ─────────────────────────────────────────
  lockPanel: (panelId: PanelId) => void;
  unlockPanel: (panelId: PanelId) => void;
  togglePanelCollapse: (panelId: PanelId) => void;
  unlockAllPanels: () => void;

  // ─────────────────────────────────────────
  // Carousel Actions
  // ─────────────────────────────────────────
  setElementCarouselIndex: (index: number) => void;
  nextElementImage: () => void;
  prevElementImage: () => void;
  setGeneratedCarouselIndex: (index: number) => void;
  nextGeneratedImage: () => void;
  prevGeneratedImage: () => void;

  // ─────────────────────────────────────────
  // Interaction Actions: Uploading
  // ─────────────────────────────────────────
  startUploading: () => void;
  completeUploading: () => void;

  // ─────────────────────────────────────────
  // Interaction Actions: Dragging
  // ─────────────────────────────────────────
  startDragging: (
    source: DraggingData["source"],
    itemId: string,
    imageUrl: string
  ) => void;
  updateDragTarget: (target: DraggingData["target"]) => void;
  completeDragging: () => void;
  cancelDragging: () => void;

  // ─────────────────────────────────────────
  // Interaction Actions: Capturing
  // ─────────────────────────────────────────
  startCapturing: (target: "element" | "area") => void;
  completeCapturing: () => void;
  cancelCapturing: () => void;

  // ─────────────────────────────────────────
  // Interaction Actions: Positioning
  // ─────────────────────────────────────────
  startPositioning: (elementId: string) => void;
  completePositioning: () => void;
  cancelPositioning: () => void;

  // ─────────────────────────────────────────
  // Interaction Actions: Generating
  // ─────────────────────────────────────────
  startGenerating: () => void;
  updateGenerating: (progress: number, message: string) => void;
  completeGenerating: () => void;
  failGenerating: (error: string) => void;

  // ─────────────────────────────────────────
  // Interaction Actions: Error
  // ─────────────────────────────────────────
  setError: (message: string, context?: string) => void;
  clearError: () => void;

  // ─────────────────────────────────────────
  // Composition Readiness
  // ─────────────────────────────────────────
  updateCompositionStatus: (canGenerate: boolean, blockers: string[]) => void;
  addCompositionBlocker: (blocker: string) => void;
  removeCompositionBlocker: (blocker: string) => void;
  clearCompositionBlockers: () => void;

  // ─────────────────────────────────────────
  // Help & Debug
  // ─────────────────────────────────────────
  toggleHelp: () => void;
  showHelpFor: (context: string) => void;
  hideHelp: () => void;
  toggleDebugPanel: () => void;

  // ─────────────────────────────────────────
  // Operation Tracking
  // ─────────────────────────────────────────
  recordOperation: (operation: string) => void;

  // ─────────────────────────────────────────
  // Reset
  // ─────────────────────────────────────────
  reset: () => void;
}

// Combined store type
type AppStore = AppStoreState & AppStoreActions;

// ═══════════════════════════════════════════════════════════════
// INITIAL STATE
// ═══════════════════════════════════════════════════════════════

const initialState: AppStoreState = {
  activeModal: null,
  modalData: null,
  lockedPanels: [],
  collapsedPanels: [],
  carousel: {
    elementIndex: 0,
    generatedIndex: 0,
  },
  interaction: {
    type: "idle",
    data: null,
  },
  composition: {
    canGenerate: false,
    blockers: ["No source image", "No elements added"],
  },
  showHelp: false,
  showDebugPanel: false,
  helpContext: null,
  lastOperation: null,
  operationTimestamp: null,
};

// ═══════════════════════════════════════════════════════════════
// LOGGER UTILITY
// ═══════════════════════════════════════════════════════════════

const logger = {
  info: (message: string, data?: any) => {
    console.log(`[AppStore] ℹ️ ${message}`, data || "");
  },
  action: (message: string, data?: any) => {
    console.log(`[AppStore] ⚡ ${message}`, data || "");
  },
  error: (message: string, error?: any) => {
    console.error(`[AppStore] ❌ ${message}`, error || "");
  },
};

// ═══════════════════════════════════════════════════════════════
// CREATE STORE
// ═══════════════════════════════════════════════════════════════

export const useAppStore = create<AppStore>()(
  devtools(
    (set, get) => ({
      // Initial state
      ...initialState,

      // ═══════════════════════════════════════════════════════════
      // Modal Actions
      // ═══════════════════════════════════════════════════════════
      openModal: (modal, data) => {
        logger.action("Opening modal", { modal, data });
        set({ activeModal: modal, modalData: data });
      },

      closeModal: () => {
        logger.action("Closing modal");
        set({ activeModal: null, modalData: null });
      },

      // ═══════════════════════════════════════════════════════════
      // Panel Actions
      // ═══════════════════════════════════════════════════════════
      lockPanel: (panelId) => {
        logger.action("Locking panel", { panelId });
        set((state) => ({
          lockedPanels: state.lockedPanels.includes(panelId)
            ? state.lockedPanels
            : [...state.lockedPanels, panelId],
        }));
      },

      unlockPanel: (panelId) => {
        logger.action("Unlocking panel", { panelId });
        set((state) => ({
          lockedPanels: state.lockedPanels.filter((id) => id !== panelId),
        }));
      },

      togglePanelCollapse: (panelId) => {
        logger.action("Toggling panel collapse", { panelId });
        set((state) => ({
          collapsedPanels: state.collapsedPanels.includes(panelId)
            ? state.collapsedPanels.filter((id) => id !== panelId)
            : [...state.collapsedPanels, panelId],
        }));
      },

      unlockAllPanels: () => {
        logger.action("Unlocking all panels");
        set({ lockedPanels: [] });
      },

      // ═══════════════════════════════════════════════════════════
      // Carousel Actions
      // ═══════════════════════════════════════════════════════════
      setElementCarouselIndex: (index) => {
        logger.action("Setting element carousel index", { index });
        set((state) => ({
          carousel: { ...state.carousel, elementIndex: index },
        }));
      },

      nextElementImage: () => {
        set((state) => ({
          carousel: {
            ...state.carousel,
            elementIndex: state.carousel.elementIndex + 1,
          },
        }));
      },

      prevElementImage: () => {
        set((state) => ({
          carousel: {
            ...state.carousel,
            elementIndex: Math.max(0, state.carousel.elementIndex - 1),
          },
        }));
      },

      setGeneratedCarouselIndex: (index) => {
        logger.action("Setting generated carousel index", { index });
        set((state) => ({
          carousel: { ...state.carousel, generatedIndex: index },
        }));
      },

      nextGeneratedImage: () => {
        set((state) => ({
          carousel: {
            ...state.carousel,
            generatedIndex: state.carousel.generatedIndex + 1,
          },
        }));
      },

      prevGeneratedImage: () => {
        set((state) => ({
          carousel: {
            ...state.carousel,
            generatedIndex: Math.max(0, state.carousel.generatedIndex - 1),
          },
        }));
      },

      // ═══════════════════════════════════════════════════════════
      // Interaction Actions: Uploading
      // ═══════════════════════════════════════════════════════════
      startUploading: () => {
        logger.action("Starting upload");
        set({
          interaction: { type: "uploading", data: null },
        });
      },

      completeUploading: () => {
        logger.action("Upload complete");
        set({
          interaction: { type: "idle", data: null },
          lastOperation: "upload",
          operationTimestamp: Date.now(),
        });
      },

      // ═══════════════════════════════════════════════════════════
      // Interaction Actions: Dragging
      // ═══════════════════════════════════════════════════════════
      startDragging: (source, itemId, imageUrl) => {
        logger.action("Starting drag", { source, itemId });
        set({
          interaction: {
            type: "dragging",
            data: {
              source,
              target: null,
              itemId,
              imageUrl,
            },
          },
        });
      },

      updateDragTarget: (target) => {
        set((state) => {
          if (state.interaction.type !== "dragging") return state;
          return {
            interaction: {
              ...state.interaction,
              data: {
                ...state.interaction.data,
                target,
              },
            },
          };
        });
      },

      completeDragging: () => {
        const { interaction } = get();
        if (interaction.type === "dragging") {
          logger.action("Drag complete", {
            source: interaction.data.source,
            target: interaction.data.target,
          });
        }
        set({
          interaction: { type: "idle", data: null },
          lastOperation: "drag-drop",
          operationTimestamp: Date.now(),
        });
      },

      cancelDragging: () => {
        logger.action("Drag canceled");
        set({
          interaction: { type: "idle", data: null },
        });
      },

      // ═══════════════════════════════════════════════════════════
      // Interaction Actions: Capturing
      // ═══════════════════════════════════════════════════════════
      startCapturing: (target) => {
        logger.action("Starting capture", { target });
        set({
          interaction: {
            type: "capturing",
            data: {
              target,
              showOverlay: true,
            },
          },
        });
      },

      completeCapturing: () => {
        logger.action("Capture complete");
        set({
          interaction: { type: "idle", data: null },
          lastOperation: "capture",
          operationTimestamp: Date.now(),
        });
      },

      cancelCapturing: () => {
        logger.action("Capture canceled");
        set({
          interaction: { type: "idle", data: null },
        });
      },

      // ═══════════════════════════════════════════════════════════
      // Interaction Actions: Positioning
      // ═══════════════════════════════════════════════════════════
      startPositioning: (elementId) => {
        logger.action("Starting positioning", { elementId });
        set({
          interaction: {
            type: "positioning",
            data: {
              elementId,
              showOverlay: true,
            },
          },
        });
      },

      completePositioning: () => {
        logger.action("Positioning complete");
        set({
          interaction: { type: "idle", data: null },
          lastOperation: "position",
          operationTimestamp: Date.now(),
        });
      },

      cancelPositioning: () => {
        logger.action("Positioning canceled");
        set({
          interaction: { type: "idle", data: null },
        });
      },

      // ═══════════════════════════════════════════════════════════
      // Interaction Actions: Generating
      // ═══════════════════════════════════════════════════════════
      startGenerating: () => {
        logger.action("Starting generation");
        set({
          interaction: {
            type: "generating",
            data: {
              status: "preparing",
              progress: 0,
              message: "Preparing composition...",
              showOverlay: true,
            },
          },
        });
      },

      updateGenerating: (progress, message) => {
        set((state) => {
          if (state.interaction.type !== "generating") return state;
          return {
            interaction: {
              ...state.interaction,
              data: {
                ...state.interaction.data,
                status: "processing" as const,
                progress,
                message,
              },
            },
          };
        });
      },

      completeGenerating: () => {
        logger.action("Generation complete");
        set({
          interaction: {
            type: "generating",
            data: {
              status: "complete",
              progress: 100,
              message: "Generation complete!",
              showOverlay: true,
            },
          },
          lastOperation: "generate",
          operationTimestamp: Date.now(),
        });

        // Reset to idle after delay
        setTimeout(() => {
          set({ interaction: { type: "idle", data: null } });
        }, 2000);
      },

      failGenerating: (error) => {
        logger.error("Generation failed", error);
        set({
          interaction: {
            type: "error",
            data: {
              message: error,
              context: "generation",
            },
          },
        });
      },

      // ═══════════════════════════════════════════════════════════
      // Interaction Actions: Error
      // ═══════════════════════════════════════════════════════════
      setError: (message, context) => {
        logger.error("Error set", { message, context });
        set({
          interaction: {
            type: "error",
            data: {
              message,
              context: context || null,
            },
          },
        });
      },

      clearError: () => {
        logger.action("Clearing error");
        set({
          interaction: { type: "idle", data: null },
        });
      },

      // ═══════════════════════════════════════════════════════════
      // Composition Readiness
      // ═══════════════════════════════════════════════════════════
      updateCompositionStatus: (canGenerate, blockers) => {
        logger.info("Updating composition status", { canGenerate, blockers });
        set({
          composition: { canGenerate, blockers },
        });
      },

      addCompositionBlocker: (blocker) => {
        set((state) => {
          const blockers = state.composition.blockers.includes(blocker)
            ? state.composition.blockers
            : [...state.composition.blockers, blocker];
          return {
            composition: {
              canGenerate: blockers.length === 0,
              blockers,
            },
          };
        });
      },

      removeCompositionBlocker: (blocker) => {
        set((state) => {
          const blockers = state.composition.blockers.filter(
            (b) => b !== blocker
          );
          return {
            composition: {
              canGenerate: blockers.length === 0,
              blockers,
            },
          };
        });
      },

      clearCompositionBlockers: () => {
        logger.action("Clearing all composition blockers");
        set({
          composition: {
            canGenerate: true,
            blockers: [],
          },
        });
      },

      // ═══════════════════════════════════════════════════════════
      // Help & Debug
      // ═══════════════════════════════════════════════════════════
      toggleHelp: () => {
        set((state) => ({ showHelp: !state.showHelp }));
      },

      showHelpFor: (context) => {
        logger.action("Showing help for context", { context });
        set({ showHelp: true, helpContext: context });
      },

      hideHelp: () => {
        set({ showHelp: false, helpContext: null });
      },

      toggleDebugPanel: () => {
        set((state) => ({ showDebugPanel: !state.showDebugPanel }));
      },

      // ═══════════════════════════════════════════════════════════
      // Operation Tracking
      // ═══════════════════════════════════════════════════════════
      recordOperation: (operation) => {
        logger.info("Recording operation", { operation });
        set({
          lastOperation: operation,
          operationTimestamp: Date.now(),
        });
      },

      // ═══════════════════════════════════════════════════════════
      // Reset
      // ═══════════════════════════════════════════════════════════
      reset: () => {
        logger.action("Resetting app store");
        set(initialState);
      },
    }),
    { name: "AppStore" }
  )
);

// ═══════════════════════════════════════════════════════════════
// SELECTORS
// ═══════════════════════════════════════════════════════════════

// Modal Selectors
export const selectActiveModal = (state: AppStore) => state.activeModal;
export const selectModalData = (state: AppStore) => state.modalData;

// Panel Selectors
export const selectIsPanelLocked = (panelId: PanelId) => (state: AppStore) =>
  state.lockedPanels.includes(panelId);
export const selectIsPanelCollapsed = (panelId: PanelId) => (state: AppStore) =>
  state.collapsedPanels.includes(panelId);
export const selectLockedPanels = (state: AppStore) => state.lockedPanels;
export const selectCollapsedPanels = (state: AppStore) => state.collapsedPanels;

// Carousel Selectors
export const selectElementCarouselIndex = (state: AppStore) =>
  state.carousel.elementIndex;
export const selectGeneratedCarouselIndex = (state: AppStore) =>
  state.carousel.generatedIndex;
export const selectCarousel = (state: AppStore) => state.carousel;

// Interaction Selectors
export const selectInteraction = (state: AppStore) => state.interaction;
export const selectInteractionType = (state: AppStore) =>
  state.interaction.type;
export const selectIsIdle = (state: AppStore) =>
  state.interaction.type === "idle";
export const selectIsBusy = (state: AppStore) =>
  state.interaction.type !== "idle" && state.interaction.type !== "error";

// Specific interaction state selectors
export const selectIsUploading = (state: AppStore) =>
  state.interaction.type === "uploading";
export const selectIsDragging = (state: AppStore) =>
  state.interaction.type === "dragging";
export const selectIsCapturing = (state: AppStore) =>
  state.interaction.type === "capturing";
export const selectIsPositioning = (state: AppStore) =>
  state.interaction.type === "positioning";
export const selectIsGenerating = (state: AppStore) =>
  state.interaction.type === "generating";
export const selectIsError = (state: AppStore) =>
  state.interaction.type === "error";

// Drag state selectors
export const selectDragData = (state: AppStore) =>
  state.interaction.type === "dragging" ? state.interaction.data : null;
export const selectDragSource = (state: AppStore) =>
  state.interaction.type === "dragging" ? state.interaction.data.source : null;
export const selectDragTarget = (state: AppStore) =>
  state.interaction.type === "dragging" ? state.interaction.data.target : null;

// Capture state selectors
export const selectCaptureData = (state: AppStore) =>
  state.interaction.type === "capturing" ? state.interaction.data : null;
export const selectCaptureTarget = (state: AppStore) =>
  state.interaction.type === "capturing" ? state.interaction.data.target : null;

// Positioning state selectors
export const selectPositioningData = (state: AppStore) =>
  state.interaction.type === "positioning" ? state.interaction.data : null;
export const selectPositioningElementId = (state: AppStore) =>
  state.interaction.type === "positioning"
    ? state.interaction.data.elementId
    : null;

// Generation state selectors
export const selectGeneratingData = (state: AppStore) =>
  state.interaction.type === "generating" ? state.interaction.data : null;
export const selectGenerationProgress = (state: AppStore) =>
  state.interaction.type === "generating"
    ? {
        status: state.interaction.data.status,
        progress: state.interaction.data.progress,
        message: state.interaction.data.message,
      }
    : { status: "idle" as const, progress: 0, message: "" };

// Error state selectors
export const selectErrorData = (state: AppStore) =>
  state.interaction.type === "error" ? state.interaction.data : null;
export const selectErrorMessage = (state: AppStore) =>
  state.interaction.type === "error" ? state.interaction.data.message : null;
export const selectErrorContext = (state: AppStore) =>
  state.interaction.type === "error" ? state.interaction.data.context : null;

// Composition Selectors
export const selectComposition = (state: AppStore) => state.composition;
export const selectCanGenerate = (state: AppStore) =>
  state.composition.canGenerate;
export const selectCompositionBlockers = (state: AppStore) =>
  state.composition.blockers;

// Help & Debug Selectors
export const selectShowHelp = (state: AppStore) => state.showHelp;
export const selectHelpContext = (state: AppStore) => state.helpContext;
export const selectShowDebugPanel = (state: AppStore) => state.showDebugPanel;

// Operation Selectors
export const selectLastOperation = (state: AppStore) => state.lastOperation;
export const selectOperationTimestamp = (state: AppStore) =>
  state.operationTimestamp;

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Gets a human-readable label for the current interaction
 */
export const getInteractionLabel = (interaction: InteractionData): string => {
  switch (interaction.type) {
    case "idle":
      return "Ready";
    case "uploading":
      return "Uploading...";
    case "dragging":
      return "Dragging";
    case "capturing":
      return `Capturing ${interaction.data.target}`;
    case "positioning":
      return "Positioning element";
    case "generating":
      return interaction.data.message;
    case "error":
      return `Error: ${interaction.data.message}`;
    default:
      return "Unknown";
  }
};
