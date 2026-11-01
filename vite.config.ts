import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.png", "apple-touch-icon.png", "icon.svg"],
      manifest: {
        name: "Hisabi",
        short_name: "Hisabi",
        description: "Log what you spend in five seconds, and always know what's left.",
        lang: "en",
        start_url: "/",
        display: "standalone",
        orientation: "portrait",
        background_color: "#F8F8FC",
        theme_color: "#F8F8FC",
        icons: [
          { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        // Cache the app shell only. Supabase data always comes from the network.
        globPatterns: ["**/*.{js,css,html,png,svg,woff2}"],
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/auth\/v1/],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.origin === "https://fonts.googleapis.com" || url.origin === "https://fonts.gstatic.com",
            handler: "StaleWhileRevalidate",
            options: { cacheName: "fonts" },
          },
        ],
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
