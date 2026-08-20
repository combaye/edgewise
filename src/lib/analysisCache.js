// Module-level memoization for the heavy per-symbol analytics. Pure passthrough
// wrappers — same signatures and results as the underlying functions.
//
// Why: useMemo only lives as long as its component instance, but the terminal
// panels unmount whenever the user switches to the Journal/Congress views, so
// every switch back re-ran analyzePattern (O(n·lookback) sweep), the
// significance permutation test (3000 draws + 1500 bootstraps), seasonality and
// technicals — all on the main thread — and the Watchlist re-ran the same
// analyses for symbols App had already computed. History arrays are stable
// object identities (React Query caches them with staleTime: Infinity), so a
// WeakMap keyed on the bars array gives cross-component, cross-remount reuse
// with automatic invalidation: when a symbol's history refreshes, a new array
// arrives and the old entries are garbage-collected with the old array.

import { analyzePattern } from "./patternMatch";
import { computeSeasonality } from "./seasonality";
import { computeTechnicals } from "./technicals";
import { forecastSignificance } from "./significance";
import { resampleWeekly } from "./resample";

const store = new WeakMap(); // bars array -> Map<key, result>

function memo(bars, key, compute) {
  if (!bars) return null;
  let m = store.get(bars);
  if (!m) {
    m = new Map();
    store.set(bars, m);
  }
  if (!m.has(key)) m.set(key, compute());
  return m.get(key);
}

// opts objects are the shared TIMEFRAMES constants (or absent), so a JSON key
// is stable and cheap at this call rate.
export const cachedAnalyzePattern = (bars, opts) =>
  memo(bars, `pattern:${opts ? JSON.stringify(opts) : ""}`, () => analyzePattern(bars, opts));

export const cachedSeasonality = (bars) => memo(bars, "season", () => computeSeasonality(bars));

export const cachedTechnicals = (bars) => memo(bars, "tech", () => computeTechnicals(bars));

export const cachedResampleWeekly = (bars) => memo(bars, "weekly", () => resampleWeekly(bars));

// analysis is derived deterministically from (bars, opts), so keying the
// significance result by the analysis' own dimensions is unambiguous per bars.
export const cachedSignificance = (bars, analysis) =>
  memo(bars, `sig:${analysis.lookback}:${analysis.horizon}`, () => forecastSignificance(bars, analysis));
