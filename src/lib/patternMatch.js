// Pattern-matching engine. Pure functions only — no fetching, no state.
//
// analyzePattern() takes daily bars (ascending), z-scores the last `lookback`
// closes, slides a window of the same length across all prior history, ranks
// windows by Pearson correlation, and derives forward-return statistics and
// day-by-day median projection paths from the best matches.

import { MONTHS } from "./assets.js";

export function median(arr) {
  if (!arr || !arr.length) return null;
  const s = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

export function zscore(arr) {
  const n = arr.length;
  const mean = arr.reduce((s, v) => s + v, 0) / n;
  const sd = Math.sqrt(arr.reduce((s, v) => s + (v - mean) ** 2, 0) / n) || 1;
  return arr.map((v) => (v - mean) / sd);
}

export function pearson(a, b) {
  const n = a.length;
  let sa = 0, sb = 0;
  for (let i = 0; i < n; i++) { sa += a[i]; sb += b[i]; }
  const ma = sa / n, mb = sb / n;
  let cov = 0, va = 0, vb = 0;
  for (let i = 0; i < n; i++) {
    const da = a[i] - ma, db = b[i] - mb;
    cov += da * db;
    va += da * da;
    vb += db * db;
  }
  const denom = Math.sqrt(va * vb);
  return denom === 0 ? 0 : cov / denom;
}

export function analyzePattern(bars, opts = {}) {
  const {
    lookback = 63,      // query window: last 63 trading sessions
    horizon = 21,       // forward-return horizon in sessions
    topK = 12,          // matches to keep
    excludeRecent = 180, // candidate windows may not overlap the last N sessions
    minSeparation = 30, // sessions between picked matches (avoids near-duplicates)
  } = opts;

  if (!bars || bars.length < lookback + excludeRecent + horizon) return { insufficient: true };

  const closes = bars.map((b) => b.close);
  const n = closes.length;
  const query = zscore(closes.slice(n - lookback));
  const lastClose = closes[n - 1];

  // score every candidate window ending at index e (Pearson r is invariant
  // to the candidate's own normalization, so z-scoring the query suffices)
  const candidates = [];
  const maxEnd = n - 1 - excludeRecent;
  for (let e = lookback - 1; e <= maxEnd; e++) {
    if (e + horizon >= n) break;
    candidates.push({ e, r: pearson(query, closes.slice(e - lookback + 1, e + 1)) });
  }
  if (candidates.length < 3) return { insufficient: true };

  // greedy top-K selection, suppressing windows that nearly overlap a better one
  candidates.sort((a, b) => b.r - a.r);
  const picked = [];
  for (const c of candidates) {
    if (picked.length >= topK) break;
    if (picked.some((p) => Math.abs(p.e - c.e) < minSeparation)) continue;
    picked.push(c);
  }
  if (picked.length < 3) return { insufficient: true };

  const matches = picked
    .map(({ e, r }) => {
      const base = closes[e];
      const fwdPath = [];
      for (let j = 1; j <= horizon; j++) fwdPath.push(closes[e + j] / base - 1);
      const d = new Date(bars[e].date);
      return {
        r,
        fwd: fwdPath[horizon - 1],
        fwdPath,
        endIdx: e, // bar index where this analog's window ends (aligns to "today")
        date: bars[e].date,
        label: `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`,
        year: d.getUTCFullYear(),
      };
    })
    .sort((a, b) => b.r - a.r);

  const bullish = matches.filter((m) => m.fwd > 0);
  const bearish = matches.filter((m) => m.fwd <= 0);
  const pBull = Math.round((bullish.length / matches.length) * 100);
  const avgCorr = matches.reduce((s, m) => s + m.r, 0) / matches.length;

  // day-by-day median forward path per scenario (null when a side has no matches)
  const pathOf = (set) =>
    set.length ? Array.from({ length: horizon }, (_, j) => median(set.map((m) => m.fwdPath[j]))) : null;

  const { score, criteria } = scoreRobustness(matches, avgCorr);

  return {
    lookback,
    horizon,
    lastClose,
    matches,
    pBull,
    avgCorr,
    upMed: median(bullish.map((m) => m.fwd)),
    dnMed: median(bearish.map((m) => m.fwd)),
    bullPath: pathOf(bullish),
    bearPath: pathOf(bearish),
    robustness: score,
    robustnessCriteria: criteria,
  };
}

function scoreRobustness(matches, avgCorr) {
  const years = new Set(matches.map((m) => m.year));

  // direction consistency across decades: every decade with matches must lean
  // the same way as the overall sample (requires at least two decades)
  const byDecade = new Map();
  for (const m of matches) {
    const d = Math.floor(m.year / 10);
    byDecade.set(d, (byDecade.get(d) || 0) + (m.fwd > 0 ? 1 : -1));
  }
  const overall = Math.sign(matches.reduce((s, m) => s + (m.fwd > 0 ? 1 : -1), 0)) || 1;
  const decadesConsistent =
    byDecade.size >= 2 && [...byDecade.values()].every((lean) => lean !== 0 && Math.sign(lean) === overall);

  const avgAbsFwd = matches.reduce((s, m) => s + Math.abs(m.fwd), 0) / matches.length;

  const criteria = [
    { label: "≥ 10 matches", pass: matches.length >= 10 },
    { label: "avg correlation ≥ 0.92", pass: avgCorr >= 0.92 },
    { label: "matches span ≥ 5 years", pass: years.size >= 5 },
    { label: "consistent direction across decades", pass: decadesConsistent },
    { label: "avg |forward return| ≥ 2%", pass: avgAbsFwd >= 0.02 },
  ];
  return { score: Math.max(1, criteria.filter((c) => c.pass).length), criteria };
}

// Builds the Recharts series: last `lookback` actual closes (t = -62..0)
// followed by the projected bull/bear paths (t = 1..horizon). The single best
// analog (matches[0]) is overlaid across the whole axis, rescaled so its own
// window-end sits at today's price — so you can see the past episode that most
// resembles now AND what actually happened next.
export function buildProjectionSeries(bars, analysis) {
  const { lookback, horizon, bullPath, bearPath, lastClose, matches } = analysis;
  const n = bars.length;

  const top = matches && matches[0];
  const aEnd = top ? top.endIdx : null;
  const aBase = aEnd != null ? bars[aEnd].close : null;
  const analogAt = (t) => {
    if (aEnd == null) return null;
    const i = aEnd + t;
    if (i < 0 || i >= n) return null;
    return (bars[i].close / aBase) * lastClose;
  };

  const out = [];
  for (let i = n - lookback; i < n; i++) {
    const t = i - (n - 1);
    out.push({ t, price: bars[i].close, date: bars[i].date, analog: analogAt(t) });
  }
  for (let j = 1; j <= horizon; j++) {
    const bull = bullPath ? lastClose * (1 + bullPath[j - 1]) : null;
    const bear = bearPath ? lastClose * (1 + bearPath[j - 1]) : null;
    const pt = { t: j, analog: analogAt(j) };
    if (bull != null) pt.bull = bull;
    if (bear != null) pt.bear = bear;
    if (bull != null && bear != null) pt.band = [Math.min(bull, bear), Math.max(bull, bear)];
    out.push(pt);
  }
  return out;
}
