// Timeframe resampling. Pure functions only.

function isoWeekKey(dateStr) {
  const d = new Date(dateStr + "T00:00:00Z");
  const day = (d.getUTCDay() + 6) % 7; // Mon = 0
  const thu = new Date(d);
  thu.setUTCDate(d.getUTCDate() - day + 3);
  const y = thu.getUTCFullYear();
  const week = Math.ceil(((thu - Date.UTC(y, 0, 1)) / 86400000 + 1) / 7);
  return `${y}-W${String(week).padStart(2, "0")}`;
}

// Daily bars (ascending) -> weekly OHLC bars labeled by each week's last session.
export function resampleWeekly(bars) {
  if (!bars || !bars.length) return [];
  const out = [];
  let key = null, cur = null;
  for (const b of bars) {
    const k = isoWeekKey(b.date);
    if (k !== key) {
      if (cur) out.push(cur);
      key = k;
      cur = { date: b.date, open: b.open, high: b.high, low: b.low, close: b.close };
    } else {
      cur.high = Math.max(cur.high, b.high);
      cur.low = Math.min(cur.low, b.low);
      cur.close = b.close;
      cur.date = b.date;
    }
  }
  if (cur) out.push(cur);
  return out;
}

// Pattern-matcher options tuned per timeframe (weekly ≈ same calendar spans
// as the daily 63d/21d/180d defaults).
export const TIMEFRAMES = {
  D: { label: "DAILY", unit: "sessions", opts: { lookback: 63, horizon: 21, excludeRecent: 180, minSeparation: 30 } },
  W: { label: "WEEKLY", unit: "weeks", opts: { lookback: 26, horizon: 8, excludeRecent: 36, minSeparation: 12 } },
};
