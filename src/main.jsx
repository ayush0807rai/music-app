import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { registerSW } from 'virtual:pwa-register'
import { Capacitor } from '@capacitor/core'

// Only register PWA service worker and manage browser caches when running on regular web, NOT native mobile
if (!Capacitor.isNativePlatform()) {
  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      updateSW(true);
    }
  });

  if (typeof window !== 'undefined' && 'caches' in window) {
    caches.delete('euphony-audio-cache').catch(() => {});
    caches.delete('euphony-cloudinary-audio-v1').catch(() => {});
    caches.delete('euphony-cloudinary-audio-v2').catch(() => {});
  }
}

// Prevent context menu (except on text inputs and textareas) and image dragging globally
if (typeof window !== 'undefined') {
  window.addEventListener('contextmenu', (e) => {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable)) {
      return;
    }
    e.preventDefault();
  }, { capture: true });

  window.addEventListener('dragstart', (e) => {
    if (e.target && (e.target.tagName === 'IMG' || e.target.closest('img'))) {
      e.preventDefault();
    }
  }, { capture: true });
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
