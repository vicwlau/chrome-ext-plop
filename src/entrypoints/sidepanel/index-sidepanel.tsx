import CoreMain from "@/components/core-components/core-main";
import { DragDropProvider } from "@/hooks/drag-drop/context/drag-drop-context";
import React from "react";
import ReactDOM from "react-dom/client";
import "~/assets/tailwind.css";
import "~/styles/global.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <DragDropProvider>
      {/* <ChatPanel /> */}
      {/* <NanoChatPanel /> */}
      {/* <MainPanel /> */}
      <CoreMain />
    </DragDropProvider>
  </React.StrictMode>
);
