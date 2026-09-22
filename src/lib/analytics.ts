type GtagParams = Record<string, string | number | boolean | undefined>;

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export function trackEvent(name: string, params?: GtagParams) {
  if (typeof window === "undefined" || typeof window.gtag !== "function") {
    return;
  }
  try {
    if (/(?:^|;\s*)ds_internal=1(?:;|$)/.test(document.cookie)) return;
    if (window.location.pathname.indexOf("/hub") === 0) return;
  } catch {
    // ignore
  }
  window.gtag("event", name, params);
}
