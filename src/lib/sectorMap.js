// Sector-rotation map (Relative Rotation Graph style). Pure functions only.
//
// For each sector ETF we build a relative-strength line RS = sector / benchmark
// (SPY), then place it on two axes:
//   x  RS-Ratio   = % deviation of RS from its 50-session average  (strong vs weak)
//   y  RS-Momentum = change in that RS-Ratio over the last 10 sessions (improving vs fading)
// The four quadrants are the classic RRG phases, which also map to where each
// sector tends to lead through the economic cycle.

import { assetMeta } from "./assets.js";

const RATIO_WIN = 50;
const MOM_LAG = 10;

// economic-cycle groupings for the phase read
const CYCLICAL = new Set(["XLK", "XLY", "XLI", "XLF", "XLC"]);
const DEFENSIVE = new Set(["XLP", "XLU", "XLV"]);
const LATE = new Set(["XLE", "XLB"]);

function smaAt(arr, end, n) {
  if (end + 1 < n) return null;
  let s = 0;
  for (let i = end - n + 1; i <= end; i++) s += arr[i];
  return s / n;
}

function rsRatioSeries(sectorBars, benchBars) {
  const bench = new Map(benchBars.map((b) => [b.date, b.close]));
  const vals = [];
  for (const b of sectorBars) {
    const bp = bench.get(b.date);
    if (bp) vals.push(b.close / bp); // relative-strength line, date-aligned
  }
  if (vals.length < RATIO_WIN + MOM_LAG + 2) return null;
  const ratio = [];
  for (let t = RATIO_WIN - 1; t < vals.length; t++) {
    const sma = smaAt(vals, t, RATIO_WIN);
    ratio.push((vals[t] / sma - 1) * 100);
  }
  return ratio;
}

function quadrantOf(x, y) {
  if (x >= 0 && y >= 0) return "leading";
  if (x >= 0 && y < 0) return "weakening";
  if (x < 0 && y < 0) return "lagging";
  return "improving";
}

export function computeSectorMap(sectorSeries, benchBars) {
  if (!benchBars?.length || !sectorSeries?.length) return null;

  const points = [];
  for (const { sym, bars } of sectorSeries) {
    const ratio = rsRatioSeries(bars, benchBars);
    if (!ratio || ratio.length < MOM_LAG + 1) continue;
    const x = ratio[ratio.length - 1];
    const y = x - ratio[ratio.length - 1 - MOM_LAG];
    points.push({ sym, name: assetMeta(sym).name, x: +x.toFixed(2), y: +y.toFixed(2), quadrant: quadrantOf(x, y) });
  }
  if (points.length < 4) return null;

  const avg = (set, key) => {
    const g = points.filter((p) => set.has(p.sym));
    return g.length ? g.reduce((s, p) => s + p[key], 0) / g.length : 0;
  };
  const cycX = avg(CYCLICAL, "x");
  const cycY = avg(CYCLICAL, "y");
  const defX = avg(DEFENSIVE, "x");
  const lateX = avg(LATE, "x");
  const riskOn = cycX - defX;

  let phase, detail;
  if (lateX > 0.4 && lateX >= cycX) {
    phase = "LATE CYCLE";
    detail = "Energy & materials leading — inflationary / late expansion.";
  } else if (riskOn > 0.2) {
    phase = cycY >= 0 ? "EARLY–MID CYCLE" : "MID–LATE CYCLE";
    detail =
      cycY >= 0
        ? "Cyclicals (tech, discretionary, industrials) leading and improving — risk-on expansion."
        : "Cyclicals still ahead but momentum fading — expansion maturing.";
  } else if (riskOn < -0.2) {
    phase = cycY >= 0 ? "EARLY RECOVERY" : "CONTRACTION";
    detail =
      cycY >= 0
        ? "Defensives lead but cyclicals turning up — early recovery rotation."
        : "Defensives (staples, utilities, health) leading — risk-off / contraction.";
  } else {
    phase = "TRANSITIONAL";
    detail = "No decisive leadership — mixed / rotational tape.";
  }

  const leaders = [...points].sort((a, b) => b.x + b.y - (a.x + a.y)).slice(0, 3).map((p) => p.sym);
  const laggards = [...points].sort((a, b) => a.x + a.y - (b.x + b.y)).slice(0, 3).map((p) => p.sym);

  return { points, phase, detail, riskOn, leaders, laggards };
}
