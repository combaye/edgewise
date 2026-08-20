// Scores a whole universe off the main thread — each scoreInstrument runs a full
// pattern scan, so 30 names would jank the UI on the main thread.
import { scoreInstrument } from "../lib/screener.js";

self.onmessage = (e) => {
  const { items } = e.data; // [{ sym, bars }]
  const rows = [];
  for (let i = 0; i < items.length; i++) {
    try {
      const row = scoreInstrument(items[i].sym, items[i].bars);
      if (row) rows.push(row);
    } catch {
      /* skip a name that fails to score */
    }
    self.postMessage({ type: "progress", done: i + 1, total: items.length });
  }
  self.postMessage({ type: "done", rows });
};
