// Market Mood / Fear & Greed indicator. Pure functions only.
//
// Aggregates several breadth/momentum/volatility sub-signals across a set of
// assets (the watchlist) into a single 0–100 score where 0 = Panic Selling and
// 100 = FOMO / Extreme Greed — mirroring forecaster.biz's Market Mood meter.
// Reuses already-cached daily history, so it costs no extra API calls.

import { smaLast, rsiLast } from "./technicals.js";

const clamp01 = (v) => Math.max(0, Math.min(1, v));

// realized 21d vol (annualized) and its 1y percentile, for one series
function volPercentile(closes) {
  const lr = [];
  for (let i = 1; i < closes.length; i++) lr.push(Math.log(closes[i] / closes[i - 1]));
  const win = 21;
  if (lr.length < win + 30) return null;
  const vols = [];
  for (let i = win; i <= lr.length; i++) {
    const w = lr.slice(i - win, i);
    const m = w.reduce((a, b) => a + b, 0) / win;
    vols.push(Math.sqrt(w.reduce((s, v) => s + (v - m) ** 2, 0) / win));
  }
  const recent = vols.slice(-252);
  const cur = recent[recent.length - 1];
  return recent.filter((v) => v <= cur).length / recent.length;
}

// per-asset metrics → contributions to the greed score
function assetSignals(bars) {
  if (!bars || bars.length < 220) return null;
  const closes = bars.map((b) => b.close);
  const price = closes[closes.length - 1];
  const sma50 = smaLast(closes, 50);
  const sma125 = smaLast(closes, 125);
  const rsi = rsiLast(closes, 14);

  const yr = bars.slice(-252);
  const hi = Math.max(...yr.map((b) => b.high));
  const lo = Math.min(...yr.map((b) => b.low));
  const pos52 = hi === lo ? 0.5 : (price - lo) / (hi - lo);

  const mom = sma125 ? clamp01((price / sma125 - 1) / 0.2 + 0.5) : 0.5; // ±20% over 6mo MA spans the range
  const volP = volPercentile(closes);

  return {
    aboveSma50: price > sma50 ? 1 : 0,
    pos52,
    rsiGreed: clamp01((rsi - 30) / 40), // 30→0, 70→1
    momentum: mom,
    safeHaven: volP == null ? 0.5 : 1 - volP, // high vol percentile = fear
  };
}

export function computeMarketMood(seriesList) {
  const sigs = (seriesList || []).map((s) => assetSignals(s.bars)).filter(Boolean);
  if (sigs.length < 2) return null;

  const avg = (key) => sigs.reduce((s, x) => s + x[key], 0) / sigs.length;

  const components = [
    { key: "BREADTH", label: "Breadth (% > SMA50)", value: avg("aboveSma50"), weight: 0.22 },
    { key: "MOMENTUM", label: "Momentum (vs 6mo MA)", value: avg("momentum"), weight: 0.24 },
    { key: "STRENGTH", label: "52w range position", value: avg("pos52"), weight: 0.2 },
    { key: "RSI", label: "RSI greed", value: avg("rsiGreed"), weight: 0.16 },
    { key: "VOLATILITY", label: "Low-volatility (calm)", value: avg("safeHaven"), weight: 0.18 },
  ];
  const totalW = components.reduce((s, c) => s + c.weight, 0);
  const score = (components.reduce((s, c) => s + c.value * c.weight, 0) / totalW) * 100;

  return { score, components, label: moodLabel(score), n: sigs.length };
}

export function moodLabel(score) {
  if (score >= 80) return "FOMO";
  if (score >= 62) return "GREED";
  if (score > 38) return "NEUTRAL";
  if (score > 20) return "FEAR";
  return "PANIC SELLING";
}
