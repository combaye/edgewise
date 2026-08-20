// Composite forecast score: weighted ensemble of the four analytics engines,
// mapped to a single -100..+100 bias. Pure functions only.

const clamp = (v) => Math.max(-100, Math.min(100, v));

export function compositeScore({ analysis, season, tech, fvUpside, month = new Date().getMonth() }) {
  const parts = [];

  if (analysis && !analysis.insufficient) {
    const conf = 0.5 + 0.5 * (analysis.robustness / 5); // robustness scales conviction
    parts.push({
      key: "PATTERN",
      weight: 0.35,
      score: clamp((analysis.pBull - 50) * 2 * conf),
      detail: `${analysis.pBull}% bull · robustness ${analysis.robustness}/5`,
    });
  }
  if (season) {
    const m = season[month];
    if (m && m.n > 0) {
      parts.push({
        key: "SEASONALITY",
        weight: 0.2,
        score: clamp(m.ret * 25 + (m.win - 50) * 1.2),
        detail: `${m.ret >= 0 ? "+" : ""}${m.ret}% mean · ${m.win}% win`,
      });
    }
  }
  if (tech) {
    parts.push({ key: "TECHNICALS", weight: 0.3, score: clamp(tech.score * 100), detail: tech.summary });
  }
  if (fvUpside != null) {
    parts.push({
      key: "VALUE",
      weight: 0.15,
      score: clamp(fvUpside * 2),
      detail: `${fvUpside >= 0 ? "+" : ""}${fvUpside.toFixed(1)}% vs fair value`,
    });
  }

  if (!parts.length) return null;
  const totalW = parts.reduce((s, p) => s + p.weight, 0);
  const score = parts.reduce((s, p) => s + p.score * p.weight, 0) / totalW;
  return { score, parts, label: labelFor(score) };
}

export function labelFor(score) {
  if (score >= 60) return "STRONG BULL";
  if (score >= 20) return "BULLISH";
  if (score > -20) return "NEUTRAL";
  if (score > -60) return "BEARISH";
  return "STRONG BEAR";
}
