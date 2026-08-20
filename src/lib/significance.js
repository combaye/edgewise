// Forecast rigor: is the pattern-matching edge real, or could random window
// selection look just as directional? Pure functions only.
//
// Permutation test: the engine picks the K most-correlated historical windows
// and reads their forward returns. We compare the mean forward return of those
// K analogs against the null distribution of picking K windows AT RANDOM from
// all of history. If correlation-selected analogs are reliably more directional
// than random picks, the p-value is small. We also bootstrap a confidence
// interval on the projected move so the cone isn't shown as a false point.

function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const mean = (a) => a.reduce((s, v) => s + v, 0) / a.length;
function percentile(sorted, q) {
  const i = Math.min(sorted.length - 1, Math.max(0, Math.floor(q * sorted.length)));
  return sorted[i];
}
function median(arr) {
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export function forecastSignificance(bars, analysis, opts = {}) {
  if (!bars || !analysis || analysis.insufficient || !analysis.matches?.length) return null;
  const { B = 3000, bootstrap = 1500, seed = 12345 } = opts;
  const horizon = analysis.horizon;
  const closes = bars.map((b) => b.close);
  const n = closes.length;

  // unconditional universe of horizon-forward returns across all history
  const allFwd = [];
  for (let i = 0; i + horizon < n; i++) allFwd.push(closes[i + horizon] / closes[i] - 1);
  if (allFwd.length < 100) return null;

  const actual = analysis.matches.map((m) => m.fwd);
  const K = actual.length;
  const actualMean = mean(actual);
  const absActual = Math.abs(actualMean);

  const rnd = mulberry32(seed);
  let geAbs = 0; // two-sided: random as-or-more directional
  let geDir = 0; // one-sided in the forecast's direction
  for (let b = 0; b < B; b++) {
    let s = 0;
    for (let k = 0; k < K; k++) s += allFwd[(rnd() * allFwd.length) | 0];
    const m = s / K;
    if (Math.abs(m) >= absActual) geAbs += 1;
    if (actualMean >= 0 ? m >= actualMean : m <= actualMean) geDir += 1;
  }
  const pValue = (geAbs + 1) / (B + 1);
  const pDirectional = (geDir + 1) / (B + 1);

  // bootstrap CI on the realized analog move (resample the K analog returns)
  const meds = [];
  for (let b = 0; b < bootstrap; b++) {
    const sample = [];
    for (let k = 0; k < K; k++) sample.push(actual[(rnd() * K) | 0]);
    meds.push(median(sample));
  }
  meds.sort((a, b) => a - b);

  return {
    pValue,
    pDirectional,
    grade: gradeOf(pValue),
    nMatches: K,
    actualMeanPct: +(actualMean * 100).toFixed(2),
    ci: {
      loPct: +(percentile(meds, 0.05) * 100).toFixed(2),
      medPct: +(median(actual) * 100).toFixed(2),
      hiPct: +(percentile(meds, 0.95) * 100).toFixed(2),
    },
  };
}

function gradeOf(p) {
  if (p < 0.01) return { label: "A", desc: "strong edge", color: "bull" };
  if (p < 0.05) return { label: "B", desc: "significant", color: "bull" };
  if (p < 0.1) return { label: "C", desc: "weak signal", color: "amber" };
  return { label: "—", desc: "not significant", color: "muted" };
}
