import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import basicSsl from "@vitejs/plugin-basic-ssl";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    basicSsl(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: [
        "favicon.svg",
        "icons.svg",
        "favicon.ico",
        "apple-touch-icon-180x180.png",
      ],
      manifest: {
        name: "Timeliner",
        short_name: "Timeliner",
        description:
          "Project management tool for PMs managing multiple projects in a local folder-backed workspace.",
        theme_color: "#08111f",
        background_color: "#08111f",
        display: "standalone",
        start_url: "/Timeliner/",
        scope: "/Timeliner/",
        icons: [
          {
            src: "/Timeliner/pwa-64x64.png",
            sizes: "64x64",
            type: "image/png",
          },
          {
            src: "/Timeliner/pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/Timeliner/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "/Timeliner/maskable-icon-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },

      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,ico,webmanifest}"],
        navigateFallback: "/Timeliner/index.html",
        navigateFallbackDenylist: [/^\/Timeliner\/projects\//],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        runtimeCaching: [
          {
            urlPattern: /\.(?:png|jpg|jpeg|gif|svg|webp|ico)$/i,
            handler: "CacheFirst",
            options: {
              cacheName: "timeliner-images",
              expiration: {
                maxEntries: 60,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
            },
          },
          {
            urlPattern: /\.(?:js|css)$/i,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "timeliner-static",
            },
          },
        ],
      },
    }),
  ],
  base: "/Timeliner/",
});
