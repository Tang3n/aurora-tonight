import type { KeyValueStore } from '@aurora/core/hooks';

/** localStorage, best effort: it throws in some private modes and when site data is blocked. */
export const webStore: KeyValueStore = {
  get(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* preferences just won't stick */
    }
  },
};
