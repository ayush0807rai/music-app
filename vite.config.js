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
            src: '/logo.png',
            sizes: '192x192 512x512 1024x1024',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/logo.png',
            sizes: '192x192 512x512 1024x1024',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
      workbox: {
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
        runtimeCaching: [
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
