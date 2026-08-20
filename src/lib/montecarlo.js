// Monte Carlo price simulation via stationary block bootstrap of historical
// daily log-returns. Blocks (geometric length, mean ~5 sessions) preserve
// short-term volatility clustering that i.i.d. resampling destroys.
// Deterministic per seed so re-renders are stable. Pure functions only.

function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const hashStr = (s) => [...String(s)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);

export function monteCarlo(bars, opts = {}) {
  const { horizon = 21, sims = 2000, meanBlock = 5, seed = 1 } = opts;
  if (!bars || bars.length < 260) return null;

  const closes = bars.map((b) => b.close);
  const last = closes[closes.length - 1];
  const rets = [];
  for (let i = 1; i < closes.length; i++) rets.push(Math.log(closes[i] / closes[i - 1]));

  const rnd = mulberry32(hashStr(seed));
  const contP = 1 - 1 / meanBlock;
  const terminal = new Float64Array(sims);
  // perDay[j] holds all sim prices at day j+1
  const perDay = Array.from({ length: horizon }, () => new Float64Array(sims));

  for (let s = 0; s < sims; s++) {
    let logp = Math.log(last);
    let idx = Math.floor(rnd() * rets.length);
    for (let j = 0; j < horizon; j++) {
      logp += rets[idx];
      perDay[j][s] = Math.exp(logp);
      // continue the block or jump to a new random start
      idx = rnd() < contP ? (idx + 1) % rets.length : Math.floor(rnd() * rets.length);
    }
    terminal[s] = Math.exp(logp);
  }

  const pct = (sorted, q) => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
  const rows = [{ t: 0, p50: last }];
  for (let j = 0; j < horizon; j++) {
    const day = Array.from(perDay[j]).sort((a, b) => a - b);
    const p5 = pct(day, 0.05), p25 = pct(day, 0.25), p50 = pct(day, 0.5), p75 = pct(day, 0.75), p95 = pct(day, 0.95);
    rows.push({ t: j + 1, p5, p25, p50, p75, p95, band95: [p5, p95], band50: [p25, p75] });
  }

  const term = Array.from(terminal).sort((a, b) => a - b);
  const termRet = term.map((p) => p / last - 1);
  const pUp = termRet.filter((r) => r > 0).length / sims;
  const var95 = pct(termRet, 0.05);
  const tail = termRet.slice(0, Math.max(1, Math.floor(sims * 0.05)));
  const cvar95 = tail.reduce((a, b) => a + b, 0) / tail.length;

  return {
    rows,
    stats: {
      pUp,
      median: pct(term, 0.5),
      var95,
      cvar95,
      probUp5: termRet.filter((r) => r > 0.05).length / sims,
      probDn5: termRet.filter((r) => r < -0.05).length / sims,
      sims,
      horizon,
    },
  };
}
