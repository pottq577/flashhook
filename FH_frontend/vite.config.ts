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
          if (id.includes("@fontsource") || id.includes("pretendard")) {
            return "fonts";
          }
        },
      },
    },
  },
});
