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

registerSW({ immediate: true })

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
