// Fair-value models. Pure functions only — input is the raw Twelve Data
// /statistics response plus the current price.
//
// 1. DCF (simplified Benjamin Graham):  EPS * (8.5 + 2 * growth%)
// 2. Peter Lynch (PEG target of 1.0):   EPS * growth%
// 3. EVA proxy:                          BVPS + ((ROE - kE) / kE) * BVPS
//
// growth% comes from the analyst estimate implied by PE / PEG when both are
// available (PEG = PE / growth), otherwise defaults to 8%.

const COST_OF_EQUITY = 0.09;
const DEFAULT_GROWTH = 8;
const MAX_GROWTH = 25;

const num = (v) => {
  const x = Number(v);
  return Number.isFinite(x) ? x : null;
};

export function computeFairValue(statsResponse, price) {
  const s = statsResponse?.statistics;
  if (!s) return null;

  const fin = s.financials ?? {};
  const eps = num(fin.income_statement?.diluted_eps_ttm);
  const bvps = num(fin.balance_sheet?.book_value_per_share_mrq);
  const roe = num(fin.return_on_equity_ttm);
  const pe = num(s.valuations_metrics?.trailing_pe);
  const peg = num(s.valuations_metrics?.peg_ratio);

  let growth = DEFAULT_GROWTH;
  let growthSource = "default 8%";
  if (pe && peg && peg > 0 && pe > 0) {
    growth = Math.min(MAX_GROWTH, Math.max(0, pe / peg));
    growthSource = "implied by PE/PEG";
  }

  const models = [
    { name: "Discounted Cash Flow", value: eps != null && eps > 0 ? eps * (8.5 + 2 * growth) : null },
    { name: "Peter Lynch", value: eps != null && eps > 0 ? eps * growth : null },
    {
      name: "Economic Value Added",
      value: bvps != null && roe != null ? bvps + ((roe - COST_OF_EQUITY) / COST_OF_EQUITY) * bvps : null,
    },
  ];

  const valid = models.filter((m) => m.value != null && m.value > 0);
  if (!valid.length) return null;

  const avg = valid.reduce((sum, m) => sum + m.value, 0) / valid.length;
  const upsidePct = price ? ((avg - price) / price) * 100 : null;
  return { models, avg, upsidePct, growth, growthSource };
}
