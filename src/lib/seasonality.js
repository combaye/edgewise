// Seasonality statistics. Pure functions only.
//
// Monthly returns are computed per calendar month per year (close of month M
// vs close of month M-1), then aggregated across years into a mean return and
// a win rate (% of years that month closed positive).

import { MONTHS } from "./assets.js";

export function computeSeasonality(bars) {
  if (!bars || bars.length < 300) return null;

  // last close of each year-month, in chronological order (bars are ascending)
  const monthEnd = new Map();
  const order = [];
  for (const b of bars) {
    const key = b.date.slice(0, 7);
    if (!monthEnd.has(key)) order.push(key);
    monthEnd.set(key, b.close);
  }
  if (order.length < 14) return null;

  // skip the final entry — the in-progress month would bias the stats
  const byMonth = Array.from({ length: 12 }, () => []);
  for (let i = 1; i < order.length - 1; i++) {
    const prev = monthEnd.get(order[i - 1]);
    const cur = monthEnd.get(order[i]);
    if (!prev || !cur) continue;
    byMonth[Number(order[i].slice(5, 7)) - 1].push(cur / prev - 1);
  }

  return MONTHS.map((label, m) => {
    const rets = byMonth[m];
    if (!rets.length) return { m: label, ret: 0, win: 0, n: 0 };
    const mean = rets.reduce((a, b) => a + b, 0) / rets.length;
    const winRate = rets.filter((r) => r > 0).length / rets.length;
    return { m: label, ret: +(mean * 100).toFixed(2), win: Math.round(winRate * 100), n: rets.length };
  });
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];

// Mean daily return + win rate per weekday (a close-to-close return is
// attributed to the weekday of the later session).
export function computeDayOfWeek(bars) {
  if (!bars || bars.length < 300) return null;
  const byDay = Array.from({ length: 5 }, () => []);
  for (let i = 1; i < bars.length; i++) {
    const dow = (new Date(bars[i].date + "T00:00:00Z").getUTCDay() + 6) % 7; // Mon = 0
    if (dow > 4) continue; // weekend bars (crypto) fold into Mon..Fri view only
    byDay[dow].push(bars[i].close / bars[i - 1].close - 1);
  }
  return WEEKDAYS.map((label, d) => {
    const rets = byDay[d];
    if (!rets.length) return { m: label, ret: 0, win: 0, n: 0 };
    const mean = rets.reduce((a, b) => a + b, 0) / rets.length;
    const winRate = rets.filter((r) => r > 0).length / rets.length;
    return { m: label, ret: +(mean * 100).toFixed(3), win: Math.round(winRate * 100), n: rets.length };
  });
}
