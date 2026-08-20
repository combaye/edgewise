// Signal scorecard — the feedback loop. Joins closed trades that were logged
// with a signal snapshot against their realized R, so the journal can answer the
// only question that matters about the terminal's analytics: "when the tool said
// X, did I actually make money?" Pure functions.
//
// Buckets by composite bias band and by forecast significance grade. Each bucket
// reports sample size, win rate, and average R — guarded by a min sample so a
// couple of trades don't masquerade as evidence.

const avg = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

// Display order for the composite-bias buckets. The bucket itself comes from
// the snapshot's stored `label` (assigned by composite.labelFor at capture
// time) — re-deriving bands here from the raw score risked disagreeing with
// labelFor at exact boundaries.
const BAND_ORDER = ["STRONG BULL", "BULLISH", "NEUTRAL", "BEARISH", "STRONG BEAR"];

function bucket(trades, keyFn) {
  const groups = new Map();
  for (const t of trades) {
    const k = keyFn(t);
    if (k == null) continue;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(t);
  }
  return groups;
}

function summarize(key, ts) {
  const withR = ts.filter((t) => t.R != null);
  const wins = ts.filter((t) => t.win).length;
  return {
    key,
    n: ts.length,
    nR: withR.length,
    winRate: ts.length ? wins / ts.length : 0,
    avgR: avg(withR.map((t) => t.R)),
    net: ts.reduce((s, t) => s + (t.pnl ?? 0), 0),
  };
}

// stats = computeStats(trades). minN: bucket must have ≥ this many to be shown.
export function signalScore(stats, { minN = 3 } = {}) {
  if (!stats || stats.empty) return null;
  const tagged = stats.closed.filter((t) => t.signals && Number.isFinite(t.signals.composite));
  if (tagged.length < minN) return { tagged: tagged.length, insufficient: true };

  const bandGroups = bucket(tagged, (t) => t.signals.label ?? null);
  const bands = BAND_ORDER.filter((k) => bandGroups.has(k))
    .map((k) => summarize(k, bandGroups.get(k)))
    .filter((r) => r.n >= minN);

  const gradeGroups = bucket(
    tagged.filter((t) => t.signals.grade),
    (t) => t.signals.grade
  );
  const grades = ["A", "B", "C", "—"]
    .filter((k) => gradeGroups.has(k))
    .map((k) => summarize(k, gradeGroups.get(k)))
    .filter((r) => r.n >= minN);

  // headline: did signal-logged trades beat the trader's own baseline expectancy?
  const sigR = avg(tagged.filter((t) => t.R != null).map((t) => t.R));
  const edgeVsBaseline = sigR != null && stats.expectancyR != null ? sigR - stats.expectancyR : null;

  return {
    tagged: tagged.length,
    insufficient: false,
    bands,
    grades,
    sigAvgR: sigR,
    baselineR: stats.expectancyR,
    edgeVsBaseline,
  };
}
