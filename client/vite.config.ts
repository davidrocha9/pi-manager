import { fileURLToPath, URL } from "node:url"

import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { VitePWA } from "vite-plugin-pwa"
import { defineConfig } from "vite"

// The embed directory and the dev proxy port are part of the server contract.
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // Manifest, icons, and Apple meta tags are hand-authored (see
      // index.html and public/); the plugin owns only the service worker.
      // registerType autoUpdate keeps installed standalone copies in sync
      // with server deployments without user intervention.
      registerType: "autoUpdate",
      injectRegister: "inline",
      manifest: false,
      workbox: {
        // Icons stay on-demand: precache is the offline app shell only.
        globPatterns: ["**/*.{js,css,html,woff2}", "manifest.webmanifest"],
        navigateFallback: "index.html",
        navigateFallbackDenylist: [/^\/api/],
        cleanupOutdatedCaches: true,
      },
      devOptions: { enabled: false },
    }),
  ],
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
