import { createContext, useContext, useEffect, useRef, ReactNode } from "react";

interface DragDropContextValue {
  pendingFiles: Map<string, File>;
  registerFile: (id: string, file: File) => void;
  retrieveFile: (id: string) => File | undefined;
  cleanup: (id: string) => void;
  cleanupAll: () => void;
}

const DragDropContext = createContext<DragDropContextValue | null>(null);

export function DragDropProvider({ children }: { children: ReactNode }) {
  const filesRef = useRef(new Map<string, File>());
  const timestampsRef = useRef(new Map<string, number>());

  // Auto-cleanup stale files every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const staleIds: string[] = [];

      timestampsRef.current.forEach((timestamp, id) => {
        const age = now - timestamp;
        if (age > 10000) {
          // 10 second timeout
          staleIds.push(id);
        }
      });

      staleIds.forEach((id) => {
        filesRef.current.delete(id);
        timestampsRef.current.delete(id);
        console.log("[DragDropContext] Cleaned up stale file:", id);
      });
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const registerFile = (id: string, file: File) => {
    filesRef.current.set(id, file);
    timestampsRef.current.set(id, Date.now());
    console.log("[DragDropContext] Registered file:", id, file.name);
  };

  const retrieveFile = (id: string): File | undefined => {
    const file = filesRef.current.get(id);
    console.log("[DragDropContext] Retrieved file:", id, file?.name);
    return file;
  };

  const cleanup = (id: string) => {
    filesRef.current.delete(id);
    timestampsRef.current.delete(id);
    console.log("[DragDropContext] Cleaned up file:", id);
  };

  const cleanupAll = () => {
    filesRef.current.clear();
    timestampsRef.current.clear();
    console.log("[DragDropContext] Cleaned up all files");
  };

  return (
    <DragDropContext.Provider
      value={{
        pendingFiles: filesRef.current,
        registerFile,
        retrieveFile,
        cleanup,
        cleanupAll,
      }}
    >
      {children}
    </DragDropContext.Provider>
  );
}

export function useDragDropContext() {
  const context = useContext(DragDropContext);
  if (!context) {
    throw new Error("useDragDropContext must be used within DragDropProvider");
  }
  return context;
}
