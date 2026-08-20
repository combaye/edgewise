// Position sizing & risk-of-ruin — the arithmetic that turns a trade plan into a
// survivable bet. Pure functions only (mirrors patternMatch / journal).
//
// The terminal already gives direction (composite), levels (entry/stop/target),
// and R:R. What it never answered: *how much do I bet*? That single number
// dominates long-run survival more than signal quality. Kelly + risk-of-ruin are
// fed by the trader's OWN measured edge (journal win rate & payoff), so the
// suggestion is grounded, not a guess.

function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Whole shares for sizeable positions, fractional for low-unit-count instruments
// (crypto/FX) so we don't round a 0.4 BTC position down to zero.
function roundUnits(raw) {
  if (!Number.isFinite(raw) || raw <= 0) return 0;
  if (raw >= 10) return Math.floor(raw);
  if (raw >= 1) return Math.floor(raw * 10) / 10;
  return Math.floor(raw * 1000) / 1000;
}

// Core sizing: risk a fixed % of the account to the stop distance.
export function positionSize({ account, riskPct, entry, stop, multiplier = 1 }) {
  if (![account, riskPct, entry, stop].every((v) => Number.isFinite(v)) || account <= 0 || riskPct <= 0) return null;
  const perUnitRisk = Math.abs(entry - stop) * multiplier;
  if (perUnitRisk <= 0) return null;
  const riskAmount = account * (riskPct / 100);
  const rawUnits = riskAmount / perUnitRisk;
  const units = roundUnits(rawUnits);
  const notional = units * entry * multiplier;
  const actualRisk = units * perUnitRisk; // after rounding
  return {
    riskAmount,
    actualRisk,
    perUnitRisk,
    rawUnits,
    units,
    notional,
    notionalPct: account > 0 ? (notional / account) * 100 : null,
  };
}

// Full Kelly fraction f* = W − (1−W)/b, where b = payoff (avg win / avg loss in R).
// Returns the fraction of capital to risk per trade for max growth; we surface a
// fractional Kelly (½, ¼) because full Kelly is famously too volatile to trade.
export function kelly({ winRate, payoff }) {
  if (!Number.isFinite(winRate) || !Number.isFinite(payoff) || payoff <= 0) return null;
  const f = winRate - (1 - winRate) / payoff;
  const full = Math.max(0, f); // negative edge → don't bet
  return {
    fullPct: full * 100,
    halfPct: (full / 2) * 100,
    quarterPct: (full / 4) * 100,
    hasEdge: f > 0,
  };
}

// Monte-Carlo risk of ruin: probability that fixed-fractional betting at
// `riskFraction` of equity draws the account down past `drawdownRuin` (default
// 50%) within `horizon` trades, given the trader's win rate & payoff. Compounds
// on current equity. Seeded for a stable read.
export function riskOfRuin({ winRate, payoff, riskFraction, drawdownRuin = 0.5, horizon = 200, sims = 4000, seed = 7 }) {
  if (!Number.isFinite(winRate) || !Number.isFinite(payoff) || payoff <= 0) return null;
  if (!Number.isFinite(riskFraction) || riskFraction <= 0) return null;
  const rnd = mulberry32(seed);
  const ruinLevel = 1 - drawdownRuin;
  let ruined = 0;
  for (let s = 0; s < sims; s++) {
    let equity = 1;
    for (let i = 0; i < horizon; i++) {
      const r = rnd() < winRate ? payoff : -1; // outcome in R
      equity *= 1 + riskFraction * r;
      if (equity <= ruinLevel) {
        ruined += 1;
        break;
      }
    }
  }
  return ruined / sims;
}

// "Heat" verdict for a chosen risk% vs the trader's Kelly-optimal fraction.
export function heatVerdict(riskPct, kellyHalfPct) {
  if (!Number.isFinite(kellyHalfPct) || kellyHalfPct <= 0) return null;
  const ratio = riskPct / kellyHalfPct;
  if (ratio <= 1.05) return { label: "within edge", color: "bull" };
  if (ratio <= 2) return { label: "aggressive", color: "amber" };
  return { label: "over-betting", color: "bear" };
}
