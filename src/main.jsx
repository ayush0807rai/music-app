import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { registerSW } from 'virtual:pwa-register'
import { Capacitor } from '@capacitor/core';
import { BackgroundMode } from '@awesome-cordova-plugins/background-mode';

if (Capacitor.isNativePlatform()) {
  BackgroundMode.enable();
  BackgroundMode.on('activate').subscribe(() => {
    BackgroundMode.disableWebViewOptimizations();
  });
}

registerSW({ immediate: true })

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
