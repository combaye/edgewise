// Earnings analytics. Pure functions only — input is the Twelve Data
// /earnings response { earnings: [{date, eps_estimate, eps_actual, surprise_prc}] }.

const num = (v) => {
  if (v === null || v === undefined || v === "") return null; // Number(null) is 0 — guard it
  const x = Number(v);
  return Number.isFinite(x) ? x : null;
};

export function parseEarnings(resp, today = new Date().toISOString().slice(0, 10)) {
  const list = Array.isArray(resp?.earnings) ? resp.earnings : [];
  if (!list.length) return null;

  const rows = list
    .map((e) => ({
      date: String(e.date).slice(0, 10),
      est: num(e.eps_estimate),
      actual: num(e.eps_actual),
      surprise: num(e.surprise_prc),
    }))
    .sort((a, b) => (a.date < b.date ? -1 : 1)); // ascending

  const reported = rows.filter((r) => r.actual != null);
  const upcoming = rows.filter((r) => r.actual == null && r.date >= today);

  // beat rate: reported quarters where actual >= estimate
  const withEst = reported.filter((r) => r.est != null);
  const beats = withEst.filter((r) => r.actual >= r.est).length;
  const beatRate = withEst.length ? beats / withEst.length : null;
  const avgSurprise = reported.length
    ? reported.reduce((s, r) => s + (r.surprise ?? 0), 0) / reported.length
    : null;

  return {
    next: upcoming[0] || null,
    last: reported[reported.length - 1] || null,
    recent: reported.slice(-8).reverse(), // newest first, up to 8
    beatRate,
    beats,
    beatTotal: withEst.length,
    avgSurprise,
    breakeven: detectBreakeven(reported),
  };
}

// "Breakeven" signal: a stock turning profitable after >= 5 consecutive
// loss quarters. Returns the signal plus the run length when the latest
// reported quarter is positive following such a streak.
export function detectBreakeven(reported, minRun = 5) {
  if (reported.length < minRun + 1) return { detected: false, runLength: 0 };
  const last = reported[reported.length - 1];
  if (last.actual == null || last.actual <= 0) {
    return { detected: false, runLength: trailingLossRun(reported, reported.length - 1) };
  }
  const run = trailingLossRun(reported, reported.length - 2);
  return { detected: run >= minRun, runLength: run, turnedAt: last.date };
}

function trailingLossRun(reported, fromIdx) {
  let run = 0;
  for (let i = fromIdx; i >= 0; i--) {
    if (reported[i].actual != null && reported[i].actual <= 0) run++;
    else break;
  }
  return run;
}
