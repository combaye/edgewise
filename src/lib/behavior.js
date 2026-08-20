// Behavioral pattern recognition over a trader's own journal. Pure heuristics —
// no AI required — that surface where edge is created or destroyed by behavior,
// each guarded by a minimum sample so small journals don't produce noise.
//
// detectPatterns() returns ranked insight cards; buildImprovementPlan() distills
// the worst ones into concrete rules (the local fallback when no AI key is set).

import { signed, pct, money } from "./journal";

const avg = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const sum = (xs) => xs.reduce((a, b) => a + b, 0);
const SEV = { warn: 3, info: 2, good: 1 };

// Severity ranks insights for display and for feeding the coach.
function rank(insights) {
  return insights
    .filter(Boolean)
    .sort((a, b) => SEV[b.severity] - SEV[a.severity] || (b.weight ?? 0) - (a.weight ?? 0));
}

export function detectPatterns(stats) {
  if (!stats || stats.empty) return [];
  const closed = stats.closed;
  const out = [];
  const meanR = stats.expectancyR; // baseline expectancy in R (may be null)
  const withR = closed.filter((t) => t.R != null);

  // 1 — Rule-break cost: compare expectancy when rules were broken vs clean.
  const broken = withR.filter((t) => t.rulesBroken.length > 0);
  const clean = withR.filter((t) => t.rulesBroken.length === 0);
  if (broken.length >= 3 && clean.length >= 3) {
    const rb = avg(broken.map((t) => t.R));
    const rc = avg(clean.map((t) => t.R));
    const gap = rc - rb;
    out.push({
      id: "rulebreak",
      severity: gap > 0.3 ? "warn" : "info",
      weight: Math.abs(gap),
      title: "Discipline pays — broken rules cost you",
      detail: `When you broke a rule (${broken.length} trades) you averaged ${signed(rb)}R; when you followed your plan (${clean.length} trades) ${signed(rc)}R — a ${signed(gap)}R swing per trade.`,
      metric: `${signed(gap)}R`,
    });
  }

  // 2 — Tilt: performance on the trade immediately after a loss vs baseline.
  const afterLoss = [];
  for (let i = 1; i < closed.length; i++) {
    if (closed[i - 1].loss && closed[i].R != null) afterLoss.push(closed[i].R);
  }
  if (afterLoss.length >= 4 && meanR != null) {
    const rAfter = avg(afterLoss);
    const delta = rAfter - meanR;
    if (delta < -0.15) {
      out.push({
        id: "tilt",
        severity: "warn",
        weight: Math.abs(delta) + 0.5,
        title: "Tilt risk after a loss",
        detail: `Your trade right after a loss averages ${signed(rAfter)}R vs your ${signed(meanR)}R baseline (${afterLoss.length} samples). Losses are leaking into the next entry.`,
        metric: `${signed(delta)}R`,
      });
    }
  }

  // 3 — Overtrading: aggregate P&L on high-frequency days vs the rest.
  const byDay = new Map();
  for (const t of closed) {
    if (!t.dayKey) continue;
    if (!byDay.has(t.dayKey)) byDay.set(t.dayKey, []);
    byDay.get(t.dayKey).push(t);
  }
  const busyDays = [...byDay.values()].filter((ts) => ts.length >= 4);
  if (busyDays.length >= 2) {
    const busyNet = sum(busyDays.flat().map((t) => t.pnl));
    const busyN = busyDays.flat().length;
    if (busyNet < 0) {
      out.push({
        id: "overtrading",
        severity: "warn",
        weight: 1.2,
        title: "Overtrading days bleed money",
        detail: `On days you took ≥4 trades (${busyDays.length} days, ${busyN} trades) your net is ${money(busyNet)}. High activity is hurting, not helping.`,
        metric: money(busyNet),
      });
    }
  }

  // 4 — Weakest weekday (needs a few trades in the bucket).
  const wd = stats.breakdowns.weekday.rows.filter((r) => r.n >= 3);
  if (wd.length >= 2) {
    const worst = wd.reduce((a, b) => (b.net < a.net ? b : a));
    if (worst.net < 0) {
      out.push({
        id: "weekday",
        severity: "info",
        weight: 0.8,
        title: `${worst.key} is your weakest day`,
        detail: `${worst.key}: ${money(worst.net)} over ${worst.n} trades (${pct(worst.winRate)} win rate). Consider sizing down or sitting out.`,
        metric: money(worst.net),
      });
    }
  }

  // 5 — Setup edge: best and worst strategies by expectancy.
  const setups = stats.breakdowns.setup.rows.filter((r) => r.n >= 3 && r.expectancyR != null);
  if (setups.length >= 2) {
    const best = setups.reduce((a, b) => (b.expectancyR > a.expectancyR ? b : a));
    const worst = setups.reduce((a, b) => (b.expectancyR < a.expectancyR ? b : a));
    if (best.key !== worst.key) {
      out.push({
        id: "setup-best",
        severity: "good",
        weight: best.expectancyR,
        title: `"${best.key}" is your edge`,
        detail: `${best.key} averages ${signed(best.expectancyR)}R over ${best.n} trades (${pct(best.winRate)} win rate). Do more of this.`,
        metric: `${signed(best.expectancyR)}R`,
      });
      if (worst.expectancyR < 0)
        out.push({
          id: "setup-worst",
          severity: "warn",
          weight: Math.abs(worst.expectancyR),
          title: `"${worst.key}" is bleeding`,
          detail: `${worst.key} averages ${signed(worst.expectancyR)}R over ${worst.n} trades. Drop it or rebuild the criteria before trading it again.`,
          metric: `${signed(worst.expectancyR)}R`,
        });
    }
  }

  // 6 — Letting losers run / cutting winners: hold time of losers vs winners.
  const winHold = stats.closed.filter((t) => t.win && t.holdMs != null).map((t) => t.holdMs);
  const lossHold = stats.closed.filter((t) => t.loss && t.holdMs != null).map((t) => t.holdMs);
  if (winHold.length >= 4 && lossHold.length >= 4) {
    const wh = avg(winHold);
    const lh = avg(lossHold);
    if (lh > wh * 1.3) {
      out.push({
        id: "hold",
        severity: "warn",
        weight: 1,
        title: "You hold losers longer than winners",
        detail: `Average losing trade is held ${(lh / wh).toFixed(1)}× longer than a winner. Classic "hope" behavior — cut losers at your stop, let winners breathe.`,
        metric: `${(lh / wh).toFixed(1)}×`,
      });
    }
  }

  // 7 — Direction bias: long vs short performance gap.
  const dirRows = stats.breakdowns.direction.rows.filter((r) => r.n >= 4 && r.expectancyR != null);
  if (dirRows.length === 2) {
    const [a, b] = dirRows;
    const gap = Math.abs(a.expectancyR - b.expectancyR);
    if (gap > 0.4) {
      const weak = a.expectancyR < b.expectancyR ? a : b;
      out.push({
        id: "direction",
        severity: "info",
        weight: gap,
        title: `Your ${weak.key.toLowerCase()} trades underperform`,
        detail: `${weak.key}: ${signed(weak.expectancyR)}R/trade over ${weak.n} trades, well below the other side. You may be fighting the trend on ${weak.key.toLowerCase()}s.`,
        metric: `${signed(weak.expectancyR)}R`,
      });
    }
  }

  // 8 — Win-rate vs expectancy framing (always shown if we have R data).
  if (stats.hasR && meanR != null) {
    out.push({
      id: "expectancy",
      severity: meanR > 0 ? "good" : "warn",
      weight: 0.3,
      title: meanR > 0 ? "Positive expectancy" : "Negative expectancy",
      detail: `${pct(stats.winRate)} win rate with a ${stats.payoff ? stats.payoff.toFixed(2) : "—"}:1 payoff gives ${signed(meanR)}R per trade. ${meanR > 0 ? "The system is profitable — protect it." : "You need a higher win rate or a bigger payoff to turn this around."}`,
      metric: `${signed(meanR)}R`,
    });
  }

  return rank(out);
}

// Distil the most actionable insights into concrete, plain-language rules. This
// always works (no API key needed); the AI coach builds on top of it.
export function buildImprovementPlan(insights, stats) {
  const rules = [];
  const has = (id) => insights.find((i) => i.id === id);
  const setups = stats.breakdowns.setup.rows.filter((r) => r.expectancyR != null);
  const worstSetup = setups.length ? setups.reduce((a, b) => (b.expectancyR < a.expectancyR ? b : a)).key : "your weakest setup";
  const bestSetup = setups.length ? setups.reduce((a, b) => (b.expectancyR > a.expectancyR ? b : a)).key : "your best setup";

  if (has("tilt")) rules.push("After any losing trade, step away for at least 15 minutes before taking the next entry — no immediate re-entries.");
  if (has("rulebreak")) rules.push("Pre-commit your stop and size before entry, and journal a reason every time you override them. Aim for zero rule-breaks this week.");
  if (has("overtrading")) rules.push("Cap yourself at 3 trades per day. If you hit the cap, the screen goes off.");
  if (has("hold")) rules.push("Honor your stop mechanically — set it on entry and don't widen it. Losers are closed at the stop, no exceptions.");
  if (has("setup-worst")) rules.push(`Stop trading "${worstSetup}" until you've defined and back-tested clearer entry criteria.`);
  if (has("weekday")) rules.push(`${has("weekday").title.replace(" is your weakest day", "")}: size down 50% or sit out until the data improves.`);
  if (has("setup-best")) rules.push(`Concentrate size on "${bestSetup}" — it's where your edge is.`);

  if (rules.length === 0)
    rules.push("Keep logging every trade with its setup, emotion, and whether you followed your plan — a few more trades and the pattern engine will surface your specific leaks.");

  return rules.slice(0, 4);
}
