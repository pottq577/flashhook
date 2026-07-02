import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
  },
  server: {
    fs: {
      allow: [".", "../docs/legal"],
    },
    proxy: {
      "/api": {
        target: "http://localhost:8080",
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("framer-motion") || id.includes("lucide-react") || id.includes("react-helmet-async")) return "vendor-ui";
            if (id.includes("@tanstack") || id.includes("zustand")) return "vendor-query";
            if (/\/node_modules\/(react|react-dom|react-router-dom)\//.test(id)) return "vendor-react";
            return "vendor";
          }
        },
      },
    },
  },
});
