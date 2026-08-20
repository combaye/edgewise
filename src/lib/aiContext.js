// Assembles a compact JSON snapshot of every computed signal for the active
// instrument, to hand to the AI analyst. Pure function — takes the analyses
// App has already computed so nothing is recomputed or refetched.

import { MONTHS } from "./assets.js";

const r2 = (v) => (v == null || !Number.isFinite(v) ? null : +v.toFixed(2));
const pct = (v, d = 1) => (v == null || !Number.isFinite(v) ? null : +(v * 100).toFixed(d));

export function buildSnapshot({ meta, price, composite, analysis, significance, season, tech, risk, overbought, tradePlan, fv, altman }) {
  const snap = { symbol: meta.sym, name: meta.name, assetClass: meta.type, price: r2(price) };

  if (composite) {
    snap.composite = {
      score: Math.round(composite.score),
      label: composite.label,
      parts: composite.parts.map((p) => ({ key: p.key, score: Math.round(p.score), weightPct: Math.round(p.weight * 100) })),
    };
  }

  if (analysis && !analysis.insufficient) {
    snap.patternForecast = {
      horizonSessions: analysis.horizon,
      probBullishPct: analysis.pBull,
      robustness: `${analysis.robustness}/5`,
      avgCorrelation: r2(analysis.avgCorr),
      medianBullishReturnPct: pct(analysis.upMed),
      medianBearishReturnPct: pct(analysis.dnMed),
      closestAnalogs: analysis.matches.slice(0, 4).map((m) => ({ when: m.label, r: r2(m.r), fwd21dPct: pct(m.fwd) })),
    };
    if (significance) {
      snap.patternForecast.significance = {
        pValue: significance.pValue,
        grade: `${significance.grade.label} (${significance.grade.desc})`,
        moveCi90Pct: [significance.ci.loPct, significance.ci.hiPct],
      };
    }
  }

  if (season) {
    const m = new Date().getMonth();
    const s = season[m];
    if (s) snap.seasonalityThisMonth = { month: MONTHS[m], meanReturnPct: s.ret, winRatePct: s.win, years: s.n };
  }

  if (tech) {
    snap.technicals = {
      score: Math.round(tech.score * 100),
      summary: tech.summary,
      indicators: tech.rows.map((row) => ({ name: row.name, value: row.value, read: row.signal > 0 ? "bull" : row.signal < 0 ? "bear" : "neutral" })),
    };
  }

  if (risk) {
    snap.volatilityRegime = {
      regime: risk.regime,
      realizedVolPctAnnualized: r2(risk.curVol),
      volPercentile10y: risk.volPctile,
      atrPctPerDay: r2(risk.atrPct),
      maxDrawdown10yPct: r2(risk.maxDD),
      currentDrawdownPct: r2(risk.curDD),
    };
  }

  if (overbought) snap.oscillators = { compositeScore0to100: Math.round(overbought.score), zone: overbought.zone.label };

  if (tradePlan && tradePlan.dir && tradePlan.dir !== "NEUTRAL") {
    snap.mechanicalTradePlan = {
      direction: tradePlan.dir,
      entry: r2(tradePlan.entry),
      stop: r2(tradePlan.stop),
      target: r2(tradePlan.target),
      riskReward: r2(tradePlan.rr),
    };
  } else if (tradePlan) {
    snap.mechanicalTradePlan = "neutral — no high-conviction setup";
  }

  if (fv) {
    snap.valuation = {
      models: fv.models.map((mo) => ({ name: mo.name, value: r2(mo.value) })),
      avgFairValue: r2(fv.avg),
      upsideVsPricePct: r2(fv.upsidePct),
      assumedGrowthPct: r2(fv.growth),
    };
  }
  if (altman) snap.altmanZScore = { z: r2(altman.z), zone: altman.zone.label };

  return snap;
}
