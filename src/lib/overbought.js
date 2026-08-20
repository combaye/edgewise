// Overbought / Oversold composite. Pure functions only — input is ascending
// daily bars. Each oscillator is normalized to a 0–100 "heat" scale where
// 0 = maximally oversold and 100 = maximally overbought, then averaged.

import { rsiLast, bollingerPctB } from "./technicals.js";

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

export function stochasticK(bars, p = 14) {
  if (bars.length < p) return null;
  const win = bars.slice(-p);
  const hi = Math.max(...win.map((b) => b.high));
  const lo = Math.min(...win.map((b) => b.low));
  if (hi === lo) return 50;
  return ((bars[bars.length - 1].close - lo) / (hi - lo)) * 100;
}

// Williams %R returned on a 0–100 overbought scale (0 oversold, 100 overbought)
export function williamsHeat(bars, p = 14) {
  if (bars.length < p) return null;
  const win = bars.slice(-p);
  const hi = Math.max(...win.map((b) => b.high));
  const lo = Math.min(...win.map((b) => b.low));
  if (hi === lo) return 50;
  const wr = ((hi - bars[bars.length - 1].close) / (hi - lo)) * -100; // [-100, 0]
  return 100 + wr;
}

export function cci(bars, p = 20) {
  if (bars.length < p) return null;
  const tp = bars.slice(-p).map((b) => (b.high + b.low + b.close) / 3);
  const mean = tp.reduce((a, b) => a + b, 0) / p;
  const md = tp.reduce((s, v) => s + Math.abs(v - mean), 0) / p;
  if (md === 0) return 0;
  return (tp[tp.length - 1] - mean) / (0.015 * md);
}

export function computeOverbought(bars) {
  if (!bars || bars.length < 60) return null;

  const rsi = rsiLast(bars.map((b) => b.close), 14);
  const stoch = stochasticK(bars, 14);
  const will = williamsHeat(bars, 14);
  const pctB = bollingerPctB(bars.map((b) => b.close), 20, 2);
  const cciVal = cci(bars, 20);

  const components = [
    { name: "RSI (14)", raw: rsi, heat: rsi },
    { name: "Stochastic %K", raw: stoch, heat: stoch },
    { name: "Williams %R", raw: will != null ? will - 100 : null, heat: will },
    { name: "Bollinger %B", raw: pctB, heat: pctB != null ? clamp(pctB * 100, 0, 100) : null },
    { name: "CCI (20)", raw: cciVal, heat: cciVal != null ? ((clamp(cciVal, -200, 200) + 200) / 400) * 100 : null },
  ].filter((c) => c.heat != null && Number.isFinite(c.heat));

  if (!components.length) return null;
  const score = components.reduce((s, c) => s + c.heat, 0) / components.length;

  return { score, components, zone: zoneFor(score) };
}

export function zoneFor(score) {
  if (score >= 80) return { label: "EXTREME OVERBOUGHT", dir: "ob" };
  if (score >= 65) return { label: "OVERBOUGHT", dir: "ob" };
  if (score <= 20) return { label: "EXTREME OVERSOLD", dir: "os" };
  if (score <= 35) return { label: "OVERSOLD", dir: "os" };
  return { label: "NEUTRAL", dir: "mid" };
}
