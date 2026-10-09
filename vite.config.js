import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'Euphony Music',
        short_name: 'Euphony',
        description: 'Your personal AI-powered music player',
        theme_color: '#121A2F',
        background_color: '#121A2F',
        display: 'standalone',
        categories: ['music', 'entertainment'],
        icons: [
          {
            src: 'https://cdn-icons-png.flaticon.com/512/174/174872.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/res\.cloudinary\.com\/.*$/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'euphony-cloudinary-media',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 14 // 14 days
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      }
    })
  ]
})
