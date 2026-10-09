import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { registerSW } from 'virtual:pwa-register'
import { Capacitor } from '@capacitor/core';

if (Capacitor.isNativePlatform()) {
  import('@awesome-cordova-plugins/background-mode').then(({ BackgroundMode }) => {
    try {
      BackgroundMode.enable();
      BackgroundMode.on('activate').subscribe(() => {
        BackgroundMode.disableWebViewOptimizations();
      });
    } catch(e) {}
  }).catch(e => console.error(e));
}

// Automatically purge legacy poisoned cache so stale Supabase database queries are cleared immediately
if (typeof window !== 'undefined' && 'caches' in window) {
  caches.delete('euphony-audio-cache').catch(() => {});
}

registerSW({ immediate: true })

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
