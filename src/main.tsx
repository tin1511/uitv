import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Register Service Worker for HĐV Remote PWA offline capability & installability
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Ignore SW registration errors in restricted preview frames
    });

    // Generate 180x180 PNG apple-touch-icon dynamically for iOS Safari compliance
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 180;
      canvas.height = 180;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const grad = ctx.createLinearGradient(0, 0, 180, 180);
        grad.addColorStop(0, '#7ce7f5');
        grad.addColorStop(1, '#6177ff');
        ctx.fillStyle = '#080b14';
        ctx.fillRect(0, 0, 180, 180);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect(14, 14, 152, 152, 32);
        ctx.fill();
        ctx.fillStyle = '#080b14';
        ctx.font = '900 96px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('H', 90, 94);

        const pngDataUrl = canvas.toDataURL('image/png');
        const appleLink = document.querySelector<HTMLLinkElement>('link[rel="apple-touch-icon"]');
        if (appleLink) {
          appleLink.href = pngDataUrl;
        }
      }
    } catch {
      // Ignore canvas fallback error
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
