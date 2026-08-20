// Market-wide screener: score one instrument's full signal stack into a single
// row for ranking. Pure functions only — reuses the same engines the terminal
// uses for the active symbol. (Valuation is omitted here so the scan stays on
// free price data and doesn't burn Twelve Data fundamentals credits per name.)

import { analyzePattern } from "./patternMatch.js";
import { computeSeasonality } from "./seasonality.js";
import { computeTechnicals } from "./technicals.js";
import { computeOverbought } from "./overbought.js";
import { compositeScore } from "./composite.js";

// ~30 liquid large caps — a real, scannable universe that loads from free data.
export const SCREEN_UNIVERSE = [
  "AAPL", "MSFT", "NVDA", "AMZN", "GOOGL", "META", "TSLA", "AMD", "AVGO", "NFLX",
  "ORCL", "CRM", "ADBE", "QCOM", "INTC", "JPM", "BAC", "GS", "V", "MA",
  "XOM", "CVX", "JNJ", "UNH", "WMT", "HD", "KO", "PG", "DIS", "CAT",
];

export function scoreInstrument(sym, bars) {
  if (!bars || bars.length < 260) return null;

  const analysis = analyzePattern(bars);
  const season = computeSeasonality(bars);
  const tech = computeTechnicals(bars);
  const ob = computeOverbought(bars);
  const comp = compositeScore({ analysis, season, tech, fvUpside: null });

  const month = new Date().getMonth();
  const closes = bars.map((b) => b.close);
  const last = closes[closes.length - 1];
  const prev = closes[closes.length - 2];
  const okPattern = analysis && !analysis.insufficient;

  return {
    sym,
    last,
    chg1dPct: prev ? +((last / prev - 1) * 100).toFixed(2) : null,
    composite: comp ? Math.round(comp.score) : null,
    compositeLabel: comp ? comp.label : null,
    pBull: okPattern ? analysis.pBull : null,
    robustness: okPattern ? analysis.robustness : null,
    seasonRetPct: season ? season[month].ret : null,
    seasonWin: season ? season[month].win : null,
    obScore: ob ? Math.round(ob.score) : null,
    obZone: ob ? ob.zone.label : null,
    techScore: tech ? Math.round(tech.score * 100) : null,
  };
}
