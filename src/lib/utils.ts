/**
 * Safely parse JSON from localStorage, returning fallback on any error.
 */
export function safeParseJSON<T>(key: string, fallback: T, validate?: (value: unknown) => boolean): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const value: unknown = JSON.parse(raw);
    return !validate || validate(value) ? value as T : fallback;
  } catch {
    return fallback;
  }
}
