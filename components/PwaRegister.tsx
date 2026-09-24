'use client';

import { useEffect } from 'react';

export function PwaRegister() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((reg) => {
            console.log('[PWA] Service worker registered with scope:', reg.scope);
          })
          .catch((err) => {
            console.warn('[PWA] Service worker registration failed:', err);
          });
      });
    }
  }, []);

  return null;
}
