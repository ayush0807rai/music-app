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
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/euphony\.ayush080705\.workers\.dev\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'euphony-audio-cache',
              rangeRequests: true,
              expiration: {
                maxEntries: 80,
                maxAgeSeconds: 60 * 60 * 24 * 7
              },
              cacheableResponse: {
                statuses: [0, 200, 206]
              }
            }
          },
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/storage\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'euphony-audio-cache',
              rangeRequests: true,
              expiration: {
                maxEntries: 80,
                maxAgeSeconds: 60 * 60 * 24 * 7
              },
              cacheableResponse: {
                statuses: [0, 200, 206]
              }
            }
          }
        ]
      }
    })
  ]
})
