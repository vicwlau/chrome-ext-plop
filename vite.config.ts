import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

/*
    This config is for standalone development and not needed for extension.
*/

export default defineConfig({
  plugins: [react()],
  root: ".",
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, "dev-standalone.html"),
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "~": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    open: "/dev-standalone.html",
  },
});
