import { fileURLToPath, URL } from "node:url"

import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// The embed directory and the dev proxy port are part of the server contract.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    port: 2000,
    proxy: {
      "/api": "http://127.0.0.1:2001",
    },
  },
  build: {
    outDir: fileURLToPath(new URL("../server/internal/api/web", import.meta.url)),
    emptyOutDir: true,
  },
})
