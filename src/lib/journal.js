// Trading-journal analytics — pure functions, no fetching or state (mirrors the
// patternMatch / seasonality convention). Everything the JOURNAL view renders is
// derived here from a flat array of trade records.

export const EMOTIONS = ["calm", "fomo", "fear", "greed", "revenge", "bored"];
export const RULES = ["moved-stop", "oversized", "no-stop", "chased", "revenge", "overtrading"];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const num = (x) => (x == null || x === "" || Number.isNaN(Number(x)) ? null : Number(x));
const sum = (xs) => xs.reduce((a, b) => a + b, 0);
const avg = (xs) => (xs.length ? sum(xs) / xs.length : null);

// ── per-trade enrichment ────────────────────────────────────────────────────
// Adds direction-aware P&L, R-multiple (when a stop is set), hold time, and the
// win/loss/open classification. Open trades (no exit) carry null P&L.
export function enrichTrade(t) {
  const dir = t.direction === "short" ? -1 : 1;
  const entry = num(t.entryPrice);
  const exit = num(t.exitPrice);
  const size = num(t.size) ?? 0;
  const fees = num(t.fees) ?? 0;
  const stop = num(t.plannedStop);
  const target = num(t.plannedTarget);

  const open = exit == null;
  const pnl = open || entry == null ? null : dir * (exit - entry) * size - fees;

  // initial risk = distance to the planned stop, on the correct side of entry
  const riskPerShare = stop != null && entry != null ? Math.abs(entry - stop) : null;
  const risk$ = riskPerShare != null && riskPerShare > 0 ? riskPerShare * size : null;
  const R = pnl != null && risk$ ? pnl / risk$ : null;
  const plannedRR =
    stop != null && target != null && entry != null && Math.abs(entry - stop) > 0
      ? Math.abs(target - entry) / Math.abs(entry - stop)
      : null;

  const entryDate = t.entryDate ? new Date(t.entryDate) : null;
  const exitDate = t.exitDate ? new Date(t.exitDate) : null;
  const holdMs = entryDate && exitDate ? exitDate - entryDate : null;

  const rulesBroken = Array.isArray(t.rulesBroken) ? t.rulesBroken : [];
  const disciplined = t.followedPlan !== false && rulesBroken.length === 0;

  return {
    ...t,
    dir,
    entry,
    exit,
    size,
    open,
    pnl,
    R,
    risk$,
    plannedRR,
    holdMs,
    rulesBroken,
    disciplined,
    win: pnl != null && pnl > 0,
    loss: pnl != null && pnl < 0,
    weekday: entryDate ? entryDate.getDay() : null,
    hour: entryDate ? entryDate.getHours() : null,
    dayKey: (exitDate || entryDate)?.toISOString().slice(0, 10) ?? null,
    sortTs: (exitDate || entryDate)?.getTime() ?? 0,
  };
}

function breakdown(closed, keyFn, label) {
  const groups = new Map();
  for (const t of closed) {
    const k = keyFn(t);
    if (k == null || k === "") continue;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(t);
  }
  const rows = [...groups.entries()].map(([key, ts]) => {
    const wins = ts.filter((t) => t.win).length;
    const Rs = ts.filter((t) => t.R != null).map((t) => t.R);
    return {
      key,
      n: ts.length,
      wins,
      winRate: ts.length ? wins / ts.length : 0,
      net: sum(ts.map((t) => t.pnl)),
      expectancyR: avg(Rs),
    };
  });
  rows.sort((a, b) => b.net - a.net);
  return { label, rows };
}

// ── aggregate statistics ────────────────────────────────────────────────────
export function computeStats(rawTrades) {
  const all = (rawTrades || []).map(enrichTrade);
  const closed = all.filter((t) => !t.open && t.pnl != null).sort((a, b) => a.sortTs - b.sortTs);
  const openTrades = all.filter((t) => t.open);

  if (closed.length === 0) {
    return { empty: true, nClosed: 0, nOpen: openTrades.length, all, closed, openTrades };
  }

  const pnls = closed.map((t) => t.pnl);
  const wins = closed.filter((t) => t.win);
  const losses = closed.filter((t) => t.loss);
  const grossProfit = sum(wins.map((t) => t.pnl));
  const grossLoss = Math.abs(sum(losses.map((t) => t.pnl)));
  const net = sum(pnls);
  const avgWin = avg(wins.map((t) => t.pnl));
  const avgLoss = avg(losses.map((t) => t.pnl)); // negative
  const Rs = closed.filter((t) => t.R != null).map((t) => t.R);

  // equity curve + max drawdown (on $)
  let cum = 0;
  let cumR = 0;
  let peak = 0;
  let maxDD = 0;
  const equity = closed.map((t) => {
    cum += t.pnl;
    cumR += t.R ?? 0;
    peak = Math.max(peak, cum);
    maxDD = Math.max(maxDD, peak - cum);
    return { ts: t.sortTs, day: t.dayKey, cum, cumR, pnl: t.pnl, R: t.R, sym: t.symbol };
  });

  // consecutive streaks
  let maxWinStreak = 0;
  let maxLossStreak = 0;
  let w = 0;
  let l = 0;
  for (const t of closed) {
    if (t.win) {
      w++;
      l = 0;
    } else if (t.loss) {
      l++;
      w = 0;
    } else {
      w = 0;
      l = 0;
    }
    maxWinStreak = Math.max(maxWinStreak, w);
    maxLossStreak = Math.max(maxLossStreak, l);
  }

  // discipline: % of closed trades that followed the plan, and the current
  // consecutive disciplined streak counting back from the latest trade
  const disciplinedCount = closed.filter((t) => t.disciplined).length;
  let disciplineStreak = 0;
  for (let i = closed.length - 1; i >= 0; i--) {
    if (closed[i].disciplined) disciplineStreak++;
    else break;
  }

  // daily P&L map for the calendar heatmap
  const daily = {};
  for (const t of closed) {
    if (!t.dayKey) continue;
    daily[t.dayKey] = (daily[t.dayKey] || 0) + t.pnl;
  }

  const holds = closed.filter((t) => t.holdMs != null).map((t) => t.holdMs);

  return {
    empty: false,
    all,
    closed,
    openTrades,
    nClosed: closed.length,
    nOpen: openTrades.length,
    nWins: wins.length,
    nLosses: losses.length,
    winRate: wins.length / closed.length,
    net,
    grossProfit,
    grossLoss,
    profitFactor: grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0,
    avgWin,
    avgLoss,
    payoff: avgWin != null && avgLoss ? avgWin / Math.abs(avgLoss) : null,
    expectancy$: avg(pnls),
    expectancyR: avg(Rs),
    hasR: Rs.length > 0,
    maxDD,
    maxWinStreak,
    maxLossStreak,
    bestTrade: closed.reduce((a, b) => (b.pnl > a.pnl ? b : a)),
    worstTrade: closed.reduce((a, b) => (b.pnl < a.pnl ? b : a)),
    avgHoldMs: avg(holds),
    disciplinePct: disciplinedCount / closed.length,
    disciplineStreak,
    equity,
    daily,
    breakdowns: {
      setup: breakdown(closed, (t) => t.setup, "By setup"),
      symbol: breakdown(closed, (t) => t.symbol, "By symbol"),
      direction: breakdown(closed, (t) => (t.dir === 1 ? "Long" : "Short"), "By direction"),
      weekday: breakdown(closed, (t) => (t.weekday != null ? WEEKDAYS[t.weekday] : null), "By weekday"),
      emotion: breakdown(closed, (t) => t.emotion, "By emotion"),
    },
  };
}

// ── formatting helpers shared by journal components ─────────────────────────
export const money = (x, dp = 0) =>
  x == null
    ? "—"
    : `${x < 0 ? "-" : ""}$${Math.abs(x).toLocaleString(undefined, { minimumFractionDigits: dp, maximumFractionDigits: dp })}`;

export const signed = (x, dp = 2) => (x == null ? "—" : `${x >= 0 ? "+" : ""}${x.toFixed(dp)}`);

export const pct = (x, dp = 0) => (x == null ? "—" : `${(x * 100).toFixed(dp)}%`);

export function holdLabel(ms) {
  if (ms == null) return "—";
  const m = ms / 60000;
  if (m < 60) return `${Math.round(m)}m`;
  const h = m / 60;
  if (h < 24) return `${h.toFixed(1)}h`;
  return `${(h / 24).toFixed(1)}d`;
}
