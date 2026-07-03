import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: "async-fonts-css",
      enforce: "post",
      apply: "build",
      transformIndexHtml(html) {
        return html.replace(
          /<link rel="stylesheet" crossorigin href="(\/assets\/fonts-[^"]+\.css)">/g,
          '<link rel="preload" as="style" crossorigin href="$1">\n    <link rel="stylesheet" crossorigin href="$1" media="print" onload="this.media=\'all\'">'
        );
      },
    },
  ],
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
            if (id.includes("@fontsource") || id.includes("pretendard")) return "fonts";
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
