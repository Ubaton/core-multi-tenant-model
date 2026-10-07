const preferenceEvent = 'church-preference-change';
const fallbackValues = new Map<string, string>();

export function readPreference(key: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  try {
    return window.localStorage.getItem(key) ?? fallbackValues.get(key) ?? fallback;
  } catch {
    return fallbackValues.get(key) ?? fallback;
  }
}

export function writePreference(key: string, value: string): void {
  fallbackValues.set(key, value);
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Keep controls usable when the browser disallows persistent storage.
  }
  window.dispatchEvent(new Event(preferenceEvent));
}

export function subscribePreferences(onChange: () => void): () => void {
  window.addEventListener('storage', onChange);
  window.addEventListener(preferenceEvent, onChange);
  return () => {
    window.removeEventListener('storage', onChange);
    window.removeEventListener(preferenceEvent, onChange);
  };
}
