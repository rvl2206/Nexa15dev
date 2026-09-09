/**
 * Service Worker Unregister & Cache Cleanup Helper
 * Ensures the applet always runs fresh code without stale cache trapping
 */
export function registerServiceWorker() {
  if (typeof window === 'undefined') return;

  // Unregister existing Service Workers
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        registration.unregister().catch(() => {});
      }
    }).catch(() => {});
  }

  // Clear CacheStorage to purge any stale cached index.html or scripts
  if ('caches' in window) {
    caches.keys().then((cacheNames) => {
      for (const name of cacheNames) {
        caches.delete(name).catch(() => {});
      }
    }).catch(() => {});
  }
}
