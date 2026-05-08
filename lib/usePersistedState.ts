"use client";
import { useState } from "react";

// Drop-in useState replacement that mirrors the value into localStorage under `key`,
// so user choices (selected tab, etc.) survive a refresh. Falls back to defaultValue
// during SSR and when JSON parsing fails (e.g. user manually edited storage).
export function usePersistedState<T>(
  key: string,
  defaultValue: T,
): [T, (v: T | ((prev: T) => T)) => void] {
  const [state, _setState] = useState<T>(() => {
    if (typeof window === "undefined") return defaultValue;
    try {
      const saved = localStorage.getItem(key);
      return saved ? (JSON.parse(saved) as T) : defaultValue;
    } catch {
      return defaultValue;
    }
  });
  const setState = (v: T | ((prev: T) => T)) => {
    _setState(prev => {
      const next = typeof v === "function" ? (v as (p: T) => T)(prev) : v;
      try { localStorage.setItem(key, JSON.stringify(next)); } catch {}
      return next;
    });
  };
  return [state, setState];
}
