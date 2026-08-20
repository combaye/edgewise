// Bridge from the terminal to the journal. "Log this setup" snapshots the
// current analysis (sized bet + the signals that justified it) into a journal
// entry as an OPEN position, so after the trade closes the Signal Scorecard can
// measure whether the tool's own signals actually made money for this trader.
//
// Writes straight to the journal's localStorage store (fct:journal:trades) via
// the shared cache helpers — the journal's useJournal re-reads on mount (views
// unmount each other), so no shared state or prop-drilling is needed.

import { cacheGet, cacheSet } from "./cache";

const KEY = "journal:trades";
const uid = () => `t-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

// Build a journal-shaped record from a sized plan + signal snapshot. Open (no
// exit) and pre-marked disciplined; the trader fills in emotion/exit later via
// the normal edit form. `signals` and `planned` survive edits because
// enrichTrade and the form both spread the whole record.
export function buildPlannedTrade({ sym, plan, units, signals }) {
  const direction = plan.dir === "SHORT" ? "short" : "long";
  return {
    id: uid(),
    createdAt: Date.now(),
    symbol: sym,
    direction,
    entryPrice: plan.entry,
    exitPrice: "",
    size: units,
    fees: "",
    plannedStop: plan.stop,
    plannedTarget: plan.target,
    entryDate: new Date().toISOString(),
    exitDate: "",
    setup: "forecaster-signal",
    followedPlan: true,
    emotion: "calm",
    rulesBroken: [],
    rating: 3,
    notes: signals
      ? `Logged from terminal · composite ${signals.composite >= 0 ? "+" : ""}${signals.composite} (${signals.label})` +
        (signals.grade ? ` · forecast grade ${signals.grade}` : "")
      : "Logged from terminal.",
    signals: signals || null,
    planned: true,
  };
}

export function logPlannedSetup(trade) {
  const cur = cacheGet(KEY);
  const list = Array.isArray(cur) ? cur : [];
  cacheSet(KEY, [...list, trade]);
  return trade.id;
}
