// Server-side response cache, shared across ALL client sessions hitting this
// process. This is the big credit-saver: one upstream fetch serves every tab
// and survives reloads. In-memory Map with per-entry TTL, plus a best-effort
// disk snapshot so a dev-server restart doesn't drop the cache.

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const SNAPSHOT = resolve(process.cwd(), ".proxy-cache.json");
const mem = new Map(); // key -> { exp, data }
let dirty = false;
let snapshotTimer = null;

(function loadSnapshot() {
  try {
    const raw = readFileSync(SNAPSHOT, "utf8");
    const obj = JSON.parse(raw);
    const now = Date.now();
    for (const [k, v] of Object.entries(obj)) {
      if (v && v.exp > now) mem.set(k, v);
    }
  } catch {
    /* no snapshot yet — fine */
  }
})();

function scheduleSnapshot() {
  dirty = true;
  if (snapshotTimer) return;
  snapshotTimer = setTimeout(() => {
    snapshotTimer = null;
    if (!dirty) return;
    dirty = false;
    try {
      writeFileSync(SNAPSHOT, JSON.stringify(Object.fromEntries(mem)));
    } catch {
      /* disk is optional */
    }
  }, 4000);
  if (snapshotTimer.unref) snapshotTimer.unref();
}

export function cacheGet(key) {
  const e = mem.get(key);
  if (!e) return null;
  if (Date.now() > e.exp) {
    mem.delete(key);
    return null;
  }
  return e.data;
}

export function cacheSet(key, data, ttlMs) {
  mem.set(key, { exp: Date.now() + ttlMs, data });
  scheduleSnapshot();
}

export function cacheStats() {
  return { entries: mem.size };
}
