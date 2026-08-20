// Insider-transaction analytics. Pure functions only — input is the Twelve Data
// /insider_transactions response
// { insider_transactions: [{full_name, position, date_reported, shares, value, description}] }.

const num = (v) => {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
};

// Classify a filing as buy / sell / neutral from its description text. Gifts,
// option grants, and tax-withholding lines carry no directional signal.
function classify(desc = "") {
  const d = desc.toLowerCase();
  if (/\b(purchase|buy|acquir)/.test(d)) return "buy";
  if (/\b(sale|sell|sold|disposed)/.test(d)) return "sell";
  return "neutral";
}

export function parseInsiders(resp) {
  const list = Array.isArray(resp?.insider_transactions) ? resp.insider_transactions : [];
  if (!list.length) return null;

  const rows = list
    .map((t) => ({
      name: t.full_name || "—",
      position: t.position || "",
      date: String(t.date_reported).slice(0, 10),
      shares: num(t.shares),
      value: num(t.value),
      side: classify(t.description),
      description: t.description || "",
    }))
    .sort((a, b) => (a.date < b.date ? 1 : -1)); // newest first

  // 6-month directional summary
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - 6);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  const recent = rows.filter((r) => r.date >= cutoffStr);
  const buys = recent.filter((r) => r.side === "buy");
  const sells = recent.filter((r) => r.side === "sell");
  const buyVal = buys.reduce((s, r) => s + r.value, 0);
  const sellVal = sells.reduce((s, r) => s + r.value, 0);
  const netVal = buyVal - sellVal;
  const total = buyVal + sellVal;

  return {
    rows: rows.slice(0, 12),
    buyCount: buys.length,
    sellCount: sells.length,
    buyVal,
    sellVal,
    netVal,
    // sentiment in [-1, 1]: +1 all buying, -1 all selling
    sentiment: total > 0 ? netVal / total : 0,
    windowMonths: 6,
  };
}
