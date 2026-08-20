// Walk-forward backtest of the pattern-projection signal. Pure functions only.
//
// Every `stride` sessions we re-run analyzePattern using ONLY data available
// at that moment (bars[0..i]) — no lookahead. The signal goes long when
// P(bull) >= threshold, short when P(bull) <= 100 - threshold, else flat.
// With stride === horizon the trades are non-overlapping, so the equity curve
// compounds cleanly and is directly comparable to buy & hold over the same
// evaluation dates.

import { analyzePattern, median } from "./patternMatch.js";

export function runBacktest(bars, opts = {}) {
  const {
    lookback = 63,
    horizon = 21,
    stride = horizon,
    threshold = 55,
    excludeRecent = 180,
    minSeparation = 30,
    burnIn = 756, // ~3y of daily history before the first evaluation
    costBps = 5, // round-trip transaction cost per trade, in basis points
    onProgress,
  } = opts;

  if (!bars || bars.length < burnIn + horizon + 1) return { insufficient: true };
  const closes = bars.map((b) => b.close);
  const start = Math.max(burnIn, lookback + excludeRecent + horizon + 10);
  const lastEval = bars.length - 1 - horizon;
  if (lastEval <= start) return { insufficient: true };

  const trades = [];
  let lastReported = 0;
  for (let i = start; i <= lastEval; i += stride) {
    const a = analyzePattern(bars.slice(0, i + 1), { lookback, horizon, excludeRecent, minSeparation });
    const progress = (i - start) / (lastEval - start);
    if (onProgress && progress - lastReported >= 0.05) {
      onProgress(progress);
      lastReported = progress;
    }
    if (a.insufficient) continue;
    const signal = a.pBull >= threshold ? 1 : a.pBull <= 100 - threshold ? -1 : 0;
    trades.push({
      date: bars[i].date,
      pBull: a.pBull,
      robustness: a.robustness,
      signal,
      realized: closes[i + horizon] / closes[i] - 1,
    });
  }
  if (trades.length < 8) return { insufficient: true };

  const active = trades.filter((t) => t.signal !== 0);
  const hits = active.filter((t) => t.realized !== 0 && Math.sign(t.realized) === t.signal);

  // net per-trade edge after round-trip cost (cost applies only when in a position)
  const cost = costBps / 10000;
  const netEdge = (t) => (t.signal === 0 ? 0 : t.signal * t.realized - cost);

  let eq = 1, bh = 1, peak = 1, maxDD = 0;
  const curve = [{ date: trades[0].date, eq: 1, bh: 1 }];
  for (const t of trades) {
    eq *= 1 + netEdge(t);
    bh *= 1 + t.realized;
    peak = Math.max(peak, eq);
    maxDD = Math.min(maxDD, eq / peak - 1);
    curve.push({ date: t.date, eq: +eq.toFixed(4), bh: +bh.toFixed(4) });
  }

  // risk-adjusted metrics on the net per-trade edges (trades are non-overlapping)
  const edges = active.map(netEdge);
  const m = edges.length ? edges.reduce((s, v) => s + v, 0) / edges.length : 0;
  const sd = edges.length ? Math.sqrt(edges.reduce((s, v) => s + (v - m) ** 2, 0) / edges.length) : 0;
  const downside = edges.filter((e) => e < 0);
  const dsd = downside.length ? Math.sqrt(downside.reduce((s, v) => s + v * v, 0) / downside.length) : 0;
  const tradesPerYear = 252 / horizon;
  const ann = Math.sqrt(tradesPerYear);
  const grossPos = edges.filter((e) => e > 0).reduce((s, v) => s + v, 0);
  const grossNeg = -edges.filter((e) => e < 0).reduce((s, v) => s + v, 0);

  // calibration: predicted P(bull) bucket vs realized frequency of up moves
  const buckets = [
    { label: "≤35", lo: 0, hi: 35 },
    { label: "35–45", lo: 35, hi: 45 },
    { label: "45–55", lo: 45, hi: 55 },
    { label: "55–65", lo: 55, hi: 65 },
    { label: ">65", lo: 65, hi: 101 },
  ].map((b) => {
    const inB = trades.filter((t) => t.pBull > b.lo && t.pBull <= b.hi);
    const up = inB.filter((t) => t.realized > 0).length;
    return { label: b.label, n: inB.length, realizedUp: inB.length ? Math.round((up / inB.length) * 100) : null };
  });

  return {
    nEvals: trades.length,
    nActive: active.length,
    hitRate: active.length ? hits.length / active.length : null,
    avgEdge: edges.length ? m : null,
    medEdge: edges.length ? median(edges) : null,
    eqFinal: eq,
    bhFinal: bh,
    sharpe: sd > 0 ? (m / sd) * ann : null,
    sortino: dsd > 0 ? (m / dsd) * ann : null,
    profitFactor: grossNeg > 0 ? grossPos / grossNeg : null,
    maxDD: maxDD * 100,
    costBps,
    curve,
    calibration: buckets,
    horizon,
    threshold,
  };
}
