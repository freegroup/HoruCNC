/**
 * Safe, namespaced wrapper around localStorage (like PatternMaster's js/localstorage.js).
 * Every access is guarded: private mode, a full quota or a corrupt entry must never break
 * the app — it just runs without persistence.
 */
const NS = 'horucnc.'

export const storage = {
  get(key, fallback = null) {
    try {
      const raw = localStorage.getItem(NS + key)
      return raw == null ? fallback : JSON.parse(raw)
    } catch { return fallback }
  },
  set(key, value) {
    try { localStorage.setItem(NS + key, JSON.stringify(value)); return true }
    catch { return false }
  },
  remove(key) {
    try { localStorage.removeItem(NS + key) } catch { /* nothing to do */ }
  },
}
