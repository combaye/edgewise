// Trade-plan synthesis. Pure function — turns the composite bias, the pattern
// projection's expected move, and ATR into a concrete entry / stop / target
// with a risk:reward ratio. Not advice; a mechanical synthesis of the panels.

const ATR_STOP_MULT = 1.5;

export function computeTradePlan({ score, analysis, atr, price, horizon = 21 }) {
  if (price == null || !Number.isFinite(price) || atr == null || !Number.isFinite(atr) || atr <= 0) return null;
  if (!analysis || analysis.insufficient) return null;

  const dir = score >= 20 ? "LONG" : score <= -20 ? "SHORT" : "NEUTRAL";
  if (dir === "NEUTRAL") {
    return { dir, note: "No high-conviction setup — composite bias is within ±20 (neutral)." };
  }

  const stopDist = ATR_STOP_MULT * atr;

  if (dir === "LONG") {
    const entry = price;
    const stop = price - stopDist;
    // expected upside from the projection's median bullish path, floored to a
    // sensible minimum so the target is never inside the stop distance
    const expPct = analysis.upMed != null && analysis.upMed > 0 ? analysis.upMed : (2 * stopDist) / price;
    const target = price * (1 + expPct);
    const reward = target - entry;
    const riskAmt = entry - stop;
    return plan(dir, entry, stop, target, reward, riskAmt, horizon);
  }

  // SHORT
  const entry = price;
  const stop = price + stopDist;
  const expPct = analysis.dnMed != null && analysis.dnMed < 0 ? analysis.dnMed : (-2 * stopDist) / price;
  const target = price * (1 + expPct);
  const reward = entry - target;
  const riskAmt = stop - entry;
  return plan(dir, entry, stop, target, reward, riskAmt, horizon);
}

function plan(dir, entry, stop, target, reward, riskAmt, horizon) {
  const rr = riskAmt > 0 ? reward / riskAmt : null;
  return {
    dir,
    entry,
    stop,
    target,
    stopPct: ((stop - entry) / entry) * 100,
    targetPct: ((target - entry) / entry) * 100,
    rr,
    horizon,
    quality: rr == null ? "n/a" : rr >= 2 ? "favorable" : rr >= 1 ? "fair" : "poor",
  };
}
