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
            // Audio files (songs + stems on Cloudinary are served under /video/upload/)
            urlPattern: /^https:\/\/res\.cloudinary\.com\/.*\/video\/upload\/.*$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'euphony-cloudinary-audio-v1',
              expiration: {
                maxEntries: 250,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year permanent cache
                purgeOnQuotaError: true
              },
              cacheableResponse: {
                statuses: [0, 200]
              },
              rangeRequests: true
            }
          },
          {
            // Images (cover art, album covers, artist photos)
            urlPattern: /^https:\/\/res\.cloudinary\.com\/.*\/image\/upload\/.*$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'euphony-cloudinary-images',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 60 // 60 days
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
