// Runs the walk-forward backtest off the main thread so the terminal stays
// responsive during the ~100+ full pattern scans it performs.
import { runBacktest } from "../lib/backtest.js";

self.onmessage = (e) => {
  const { bars, opts } = e.data;
  try {
    const result = runBacktest(bars, {
      ...opts,
      onProgress: (p) => self.postMessage({ type: "progress", progress: p }),
    });
    self.postMessage({ type: "done", result });
  } catch (err) {
    self.postMessage({ type: "error", message: err?.message || "backtest failed" });
  }
};
