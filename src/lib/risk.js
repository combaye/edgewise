// Volatility, regime, and drawdown statistics. Pure functions only.

import { atrLast } from "./technicals.js";

const ANNUALIZE = Math.sqrt(252);

export function computeRisk(bars) {
  if (!bars || bars.length < 300) return null;
  const closes = bars.map((b) => b.close);
  const n = closes.length;

  const logret = [];
  for (let i = 1; i < n; i++) logret.push(Math.log(closes[i] / closes[i - 1]));

  // rolling 21d realized vol, annualized %
  const win = 21;
  const vols = [];
  for (let i = win; i <= logret.length; i++) {
    const w = logret.slice(i - win, i);
    const m = w.reduce((a, b) => a + b, 0) / win;
    const sd = Math.sqrt(w.reduce((s, v) => s + (v - m) ** 2, 0) / win);
    vols.push(sd * ANNUALIZE * 100);
  }
  const curVol = vols[vols.length - 1];
  const volPctile = Math.round((vols.filter((v) => v <= curVol).length / vols.length) * 100);

  // Kaufman efficiency ratio over 20 sessions: 1 = perfect trend, 0 = pure chop
  const span = 20;
  let noise = 0;
  for (let i = n - span; i < n; i++) noise += Math.abs(closes[i] - closes[i - 1]);
  const er = noise === 0 ? 0 : Math.abs(closes[n - 1] - closes[n - 1 - span]) / noise;

  const volLabel = volPctile >= 70 ? "HIGH-VOL" : volPctile <= 30 ? "LOW-VOL" : "MID-VOL";
  const trendLabel = er >= 0.35 ? "TREND" : er <= 0.18 ? "RANGE" : "MIXED";
  const regime = `${volLabel} ${trendLabel}`;

  // drawdowns over the full series
  let peak = closes[0], peakIdx = 0, maxDD = 0;
  for (let i = 1; i < n; i++) {
    if (closes[i] > peak) {
      peak = closes[i];
      peakIdx = i;
    }
    maxDD = Math.min(maxDD, closes[i] / peak - 1);
  }
  const curDD = closes[n - 1] / peak - 1;
  const underwaterDays = n - 1 - peakIdx;

  const atr = atrLast(bars, 14);

  // sparkline: last year of rolling vol
  const volsOffset = n - vols.length; // bar index of first vol point
  const spark = vols.slice(-252).map((v, i) => ({
    date: bars[volsOffset + vols.length - Math.min(252, vols.length) + i].date,
    vol: +v.toFixed(1),
  }));

  return {
    curVol,
    volPctile,
    er,
    regime,
    trending: trendLabel === "TREND",
    maxDD: maxDD * 100,
    curDD: curDD * 100,
    underwaterDays,
    atr,
    atrPct: (atr / closes[n - 1]) * 100,
    spark,
  };
}
