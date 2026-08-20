// A realistic demo journal so the JOURNAL view is alive on first open and the
// behavioral engine has something to chew on. The set is engineered to contain
// a real edge ("breakout"), a leaking setup ("reversal"), post-loss tilt, an
// overtrading day, and rule-breaks that correlate with losses.

// compact rows → full trade objects.
// [day, hour, sym, dir, entry, exit, size, stop, target, setup, emotion, rules, rating, note]
const ROWS = [
  [4, 9, "SPY", "long", 521, 529, 100, 516, 533, "breakout", "calm", [], 5, "Clean ORB, held to target."],
  [4, 13, "NVDA", "long", 118, 122.4, 200, 116, 124, "breakout", "calm", [], 5, "Trend day, trailed stop."],
  [5, 10, "TSLA", "short", 248, 254, 80, 252, 240, "reversal", "fomo", ["moved-stop"], 2, "Caught a falling knife, widened stop."],
  [5, 11, "TSLA", "long", 254, 250, 120, 250, 262, "reversal", "revenge", ["revenge", "oversized"], 1, "Revenge-flipped long, sized up. Dumb."],
  [8, 9, "QQQ", "long", 462, 470, 60, 458, 472, "breakout", "calm", [], 5, "A+ setup off the open."],
  [8, 14, "AMD", "long", 162, 158, 150, 159, 170, "reversal", "greed", ["oversized"], 2, "Too big into resistance."],
  [9, 10, "AAPL", "long", 214, 217.5, 90, 211, 220, "breakout", "calm", [], 4, "Solid follow-through."],
  [9, 11, "META", "short", 498, 505, 40, 503, 486, "news-fade", "fear", ["chased"], 2, "Faded the gap, chased entry."],
  [9, 13, "META", "short", 506, 500, 40, 511, 494, "news-fade", "revenge", ["revenge"], 2, "Re-shorted after the first loss."],
  // overtrading day — 4 trades, net red
  [11, 9, "SPY", "long", 524, 522, 80, 521, 530, "breakout", "fomo", [], 3, "Chopped, small loss."],
  [11, 10, "SPY", "short", 522, 524, 80, 524, 517, "reversal", "fomo", ["chased"], 2, "Overtrading, forced it."],
  [11, 11, "QQQ", "long", 466, 464, 60, 463, 472, "reversal", "bored", ["overtrading"], 2, "Bored, no real setup."],
  [11, 14, "NVDA", "long", 121, 119.5, 100, 120, 126, "breakout", "fomo", ["overtrading"], 1, "Fourth trade, should've stopped."],
  [12, 10, "MSFT", "long", 448, 456, 50, 444, 458, "breakout", "calm", [], 5, "Patient, A setup."],
  [12, 13, "GOOGL", "long", 178, 175, 120, 176, 184, "reversal", "greed", ["moved-stop"], 1, "Moved stop down, paid for it."],
  [15, 9, "NVDA", "long", 123, 128, 150, 121, 129, "breakout", "calm", [], 5, "Best trade of the month."],
  [15, 11, "TSLA", "short", 242, 246, 60, 245, 234, "reversal", "fomo", [], 2, "Wrong, but honored the stop."],
  [16, 10, "AAPL", "long", 218, 222, 100, 215, 224, "breakout", "calm", [], 4, "Textbook continuation."],
  [16, 14, "AMD", "long", 165, 161, 120, 162, 173, "reversal", "fear", ["moved-stop", "oversized"], 1, "Averaged down, widened stop. Worst habit."],
  [18, 9, "QQQ", "long", 471, 478, 70, 467, 480, "breakout", "calm", [], 5, "Gap-and-go, trailed it."],
  [18, 13, "META", "short", 492, 497, 40, 496, 480, "news-fade", "greed", ["chased"], 2, "Faded strength again — it doesn't work."],
  [19, 10, "SPY", "long", 530, 535, 100, 526, 537, "breakout", "calm", [], 5, "Clean trend continuation."],
  [22, 11, "GOOGL", "long", 181, 184.5, 100, 178, 187, "breakout", "calm", [], 4, "Good follow-through."],
  [22, 14, "TSLA", "long", 238, 234, 100, 235, 246, "reversal", "revenge", ["revenge", "oversized"], 1, "Tilt after a red morning."],
  // an open position (no exit) to exercise the open-trade path
  [23, 10, "NVDA", "long", 130, null, 120, 127, 138, "breakout", "calm", [], null, "Still holding into earnings."],
];

export function makeSampleTrades() {
  return ROWS.map((r, i) => {
    const [day, hour, symbol, direction, entry, exit, size, stop, target, setup, emotion, rules, rating, notes] = r;
    const d2 = String(day).padStart(2, "0");
    const h2 = String(hour).padStart(2, "0");
    const entryDate = `2026-06-${d2}T${h2}:30:00`;
    // exit a few hours after entry (same session) for closed trades
    const exitHour = String(Math.min(hour + 3, 16)).padStart(2, "0");
    const exitDate = exit == null ? null : `2026-06-${d2}T${exitHour}:00:00`;
    return {
      id: `sample-${i}`,
      createdAt: Date.now() - (ROWS.length - i) * 3600_000,
      symbol,
      direction,
      entryPrice: entry,
      exitPrice: exit,
      size,
      fees: 1,
      entryDate,
      exitDate,
      setup,
      plannedStop: stop,
      plannedTarget: target,
      followedPlan: rules.length === 0,
      emotion,
      rulesBroken: rules,
      rating,
      notes,
      tags: [],
      sample: true,
    };
  });
}
