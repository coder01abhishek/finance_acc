import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [
    react(),
    // We removed runtimeErrorOverlay and Replit plugins as they 
    // often use top-level await which crashes the Vercel build.
  ],
  resolve: {
    alias: {
      // Use __dirname for CommonJS compatibility
      "@": path.resolve(__dirname, "client", "src"),
      "@shared": path.resolve(__dirname, "shared"),
      "@assets": path.resolve(__dirname, "attached_assets"),
    },
  },
  root: path.resolve(__dirname, "client"),
  build: {
    // Vercel expects the build in 'dist', and your server expects it there too
    outDir: path.resolve(__dirname, "../dist"), 
    emptyOutDir: true,
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});