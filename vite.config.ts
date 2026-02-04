import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./client/src"),
      "@shared": path.resolve(__dirname, "./shared"),
    },
  },
  root: path.resolve(__dirname, "./client"), // Vite looks here for index.html
  build: {
    // This creates the 'dist' folder in your project root
    outDir: path.resolve(__dirname, "./dist"), 
    emptyOutDir: true,
    // Optional: Increases the limit to hide the chunk size warning
    chunkSizeWarningLimit: 1000, 
    rollupOptions: {
      output: {
        // Improves performance by splitting large libraries into separate files
        manualChunks: {
          vendor: ['react', 'react-dom', 'framer-motion'],
        },
      },
    },
  },
});