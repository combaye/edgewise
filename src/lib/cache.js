// localStorage cache helpers. Every entry is stored as { ts, data } so reads
// can enforce a max age. All operations fail soft (private mode, quota, etc.).

const PREFIX = "fct:";

export function cacheGet(key, maxAgeMs = Infinity) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const { ts, data } = JSON.parse(raw);
    if (!ts || Date.now() - ts > maxAgeMs) return null;
    return data;
  } catch {
    return null;
  }
}

export function cacheSet(key, data) {
  const payload = JSON.stringify({ ts: Date.now(), data });
  try {
    localStorage.setItem(PREFIX + key, payload);
  } catch {
    // quota exceeded — evict historical series (the bulky entries) and retry once
    try {
      Object.keys(localStorage)
        .filter((k) => k.startsWith(PREFIX + "hist:"))
        .forEach((k) => localStorage.removeItem(k));
      localStorage.setItem(PREFIX + key, payload);
    } catch {
      /* give up silently — cache is an optimization, not a requirement */
    }
  }
}

export function cacheRemove(key) {
  try {
    localStorage.removeItem(PREFIX + key);
  } catch {
    /* ignore */
  }
}
