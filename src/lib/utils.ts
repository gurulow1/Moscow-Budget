import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// In-memory fallback dataset for sandboxed contexts where localStorage access throws SecurityError or is not available
const memStore: Record<string, string> = {};
let isLocalStorageSupported = false;

try {
  const testKey = "__store_test__";
  window.localStorage.setItem(testKey, testKey);
  window.localStorage.removeItem(testKey);
  isLocalStorageSupported = true;
} catch (e) {
  console.warn("localStorage is not supported in this sandboxed environment; switching to secure in-memory fallback", e);
}

export const safeLocalStorage = {
  getItem: (key: string): string | null => {
    if (isLocalStorageSupported) {
      try {
        return window.localStorage.getItem(key);
      } catch (e) {
        console.warn("localStorage.getItem blocked:", e);
      }
    }
    return memStore.hasOwnProperty(key) ? memStore[key] : null;
  },
  setItem: (key: string, value: string): void => {
    if (isLocalStorageSupported) {
      try {
        window.localStorage.setItem(key, value);
        return;
      } catch (e) {
        console.warn("localStorage.setItem blocked:", e);
      }
    }
    memStore[key] = String(value);
  },
  removeItem: (key: string): void => {
    if (isLocalStorageSupported) {
      try {
        window.localStorage.removeItem(key);
        return;
      } catch (e) {
        console.warn("localStorage.removeItem blocked:", e);
      }
    }
    delete memStore[key];
  },
  clear: (): void => {
    if (isLocalStorageSupported) {
      try {
        window.localStorage.clear();
        return;
      } catch (e) {
        console.warn("localStorage.clear blocked:", e);
      }
    }
    for (const key in memStore) {
      delete memStore[key];
    }
  }
};

export function readStoredNumber(key: string, fallback = 0): number {
  const raw = safeLocalStorage.getItem(key);
  if (raw === null) return fallback;

  const value = Number(raw);
  return Number.isFinite(value) ? value : fallback;
}

export function readStoredStringArray(key: string): string[] {
  const raw = safeLocalStorage.getItem(key);
  if (!raw) return [];

  try {
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value) && value.every(item => typeof item === 'string') ? value : [];
  } catch {
    return [];
  }
}
