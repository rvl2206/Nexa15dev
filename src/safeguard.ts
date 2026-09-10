/**
 * Global runtime safeguard
 * Resolves browser / iframe getter-only fetch property exceptions
 * and suppresses unhandled getter-only TypeError notifications.
 */

(function installSafeguard() {
  if (typeof window === 'undefined') return;

  function isFetchGetterError(msg: any): boolean {
    if (!msg) return false;
    const str = String(msg);
    return str.includes('fetch') && (str.includes('getter') || str.includes('Cannot set property') || str.includes('only a getter'));
  }

  // 1. Capture and suppress unhandled "Cannot set property fetch of #<Window> which has only a getter"
  window.addEventListener(
    'error',
    (event) => {
      if (event && (isFetchGetterError(event.message) || isFetchGetterError(event.error?.message))) {
        event.preventDefault();
        if (typeof event.stopImmediatePropagation === 'function') {
          event.stopImmediatePropagation();
        }
        return true;
      }
    },
    true
  );

  const prevOnError = window.onerror;
  window.onerror = function (msg, url, line, col, error) {
    if (isFetchGetterError(msg) || (error && isFetchGetterError(error.message))) {
      return true; // suppresses the error from browser reporting
    }
    if (typeof prevOnError === 'function') {
      return prevOnError.apply(this, [msg, url, line, col, error]);
    }
    return false;
  };

  window.addEventListener(
    'unhandledrejection',
    (event) => {
      if (event && isFetchGetterError(event.reason?.message || event.reason)) {
        event.preventDefault();
        return true;
      }
    },
    true
  );

  // 2. Ensure FormData has prototype.keys so third-party polyfills do not trigger fetch monkey-patching
  try {
    if (typeof window.FormData !== 'undefined' && !window.FormData.prototype.keys) {
      (window.FormData.prototype as any).keys = function* () {};
    }
  } catch (_) {}

  // 3. Ensure window.fetch has both getter and setter if possible
  try {
    const rawFetch = typeof window.fetch === 'function' ? window.fetch.bind(window) : null;
    let activeFetch = rawFetch;

    const patchAccessor = (target: any) => {
      if (!target) return;
      try {
        const desc = Object.getOwnPropertyDescriptor(target, 'fetch');
        if (!desc || (desc.get && !desc.set) || desc.writable === false) {
          if (!desc || desc.configurable) {
            Object.defineProperty(target, 'fetch', {
              get: () => activeFetch || rawFetch,
              set: (fn: any) => {
                activeFetch = typeof fn === 'function' ? fn : rawFetch;
              },
              configurable: true,
              enumerable: true,
            });
          }
        }
      } catch (_) {}
    };

    if (typeof Window !== 'undefined' && Window.prototype) {
      patchAccessor(Window.prototype);
    }
    patchAccessor(window);
    if (typeof globalThis !== 'undefined' && globalThis !== window) {
      patchAccessor(globalThis);
    }
  } catch (_) {}
})();

export {};
