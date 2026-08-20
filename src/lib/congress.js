// Client helpers for the Capitol Trades clone: party/type styling, dollar &
// range formatting, the disclosure "filed after N days" gap, and feed-level
// aggregate stats. Pure functions — no fetching here.
import { C } from "./theme";

export const PARTY = {
  democrat: { label: "Democrat", short: "D", color: "#4d7fff" },
  republican: { label: "Republican", short: "R", color: "#ff5a5a" },
  independent: { label: "Independent", short: "I", color: C.amber },
};

export const partyOf = (p) => PARTY[p] || PARTY.independent;

export const TYPE_COLOR = { buy: C.bull, sell: C.bear, exchange: C.amber };

const DAY = 86_400_000;

export function fmtUsd(v) {
  if (v == null || !Number.isFinite(v)) return "—";
  const a = Math.abs(v);
  if (a >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  if (a >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (a >= 1e3) return `$${Math.round(v / 1e3)}K`;
  return `$${Math.round(v)}`;
}

// "$50K–$100K" — the disclosed bracket, not an exact figure.
export function sizeLabel(t) {
  if (t.sizeMin == null && t.sizeMax == null) return "—";
  if (t.sizeMin != null && t.sizeMax != null && t.sizeMin !== t.sizeMax)
    return `${fmtUsd(t.sizeMin)}–${fmtUsd(t.sizeMax)}`;
  return fmtUsd(t.sizeMax ?? t.sizeMin);
}

// midpoint of the bracket — used for aggregate volume math
export const sizeMid = (t) =>
  t.sizeMin != null && t.sizeMax != null ? (t.sizeMin + t.sizeMax) / 2 : t.sizeMax ?? t.sizeMin ?? 0;

export function gapDays(t) {
  if (!t.txDate || !t.pubDate) return null;
  const d = Math.round((new Date(t.pubDate) - new Date(t.txDate)) / DAY);
  return Number.isFinite(d) ? Math.max(0, d) : null;
}

export function fmtDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(+d)) return "—";
  return d.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
}

// relative age like "5d ago" / "3w ago" for the feed timestamp column
export function ago(iso) {
  if (!iso) return "";
  const d = Math.round((Date.now() - new Date(iso)) / DAY);
  if (!Number.isFinite(d) || d < 0) return "";
  if (d === 0) return "today";
  if (d < 7) return `${d}d ago`;
  if (d < 30) return `${Math.round(d / 7)}w ago`;
  if (d < 365) return `${Math.round(d / 30)}mo ago`;
  return `${Math.round(d / 365)}y ago`;
}

export function summarize(trades) {
  const out = {
    total: trades.length,
    buys: 0,
    sells: 0,
    buyVol: 0,
    sellVol: 0,
    politicians: new Set(),
    issuers: new Set(),
    avgGap: null,
  };
  let gapSum = 0;
  let gapN = 0;
  for (const t of trades) {
    const mid = sizeMid(t);
    if (t.txType === "buy") {
      out.buys += 1;
      out.buyVol += mid;
    } else if (t.txType === "sell") {
      out.sells += 1;
      out.sellVol += mid;
    }
    out.politicians.add(t.politician);
    out.issuers.add(t.ticker);
    const g = gapDays(t);
    if (g != null) {
      gapSum += g;
      gapN += 1;
    }
  }
  out.politicians = out.politicians.size;
  out.issuers = out.issuers.size;
  out.avgGap = gapN ? Math.round(gapSum / gapN) : null;
  return out;
}

// Most-traded tickers across the (filtered) feed, for the leaderboard.
export function topIssuers(trades, n = 6) {
  const map = new Map();
  for (const t of trades) {
    const e = map.get(t.ticker) || { ticker: t.ticker, issuer: t.issuer, count: 0, vol: 0 };
    e.count += 1;
    e.vol += sizeMid(t);
    map.set(t.ticker, e);
  }
  return [...map.values()].sort((a, b) => b.count - a.count || b.vol - a.vol).slice(0, n);
}
