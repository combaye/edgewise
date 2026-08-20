// Routing + fallback + caching for the data proxy. Framework-agnostic: takes a
// plain query object and an env, returns { status, body }. Used by both the
// Vite dev middleware and the Vercel serverless adapter.
//
// Strategy: price + history are served FREE-first (Yahoo, then class-specific
// CoinGecko/Frankfurter) with Twelve Data only as a last resort, so the scarce
// 800/day TD credits are spent almost entirely on fundamentals (which no free
// source provides). Every response is cached server-side and shared across all
// sessions.

import { assetMeta } from "../src/lib/assets.js";
import { cacheGet, cacheSet } from "./cache.js";
import * as P from "./providers.js";
import { SAMPLE_CONGRESS_TRADES } from "./congressData.js";

const TTL = { history: 6 * 3600_000, quote: 60_000, fundamental: 24 * 3600_000 };

function kindOf(path) {
  if (path === "/time_series") return "history";
  if (path === "/quote" || path === "/price") return "quote";
  return "fundamental";
}

function tdHistory(meta, key) {
  const start = new Date();
  start.setFullYear(start.getFullYear() - 10);
  return P.twelveData(
    "/time_series",
    { symbol: meta.api, interval: "1day", outputsize: 5000, start_date: start.toISOString().slice(0, 10), order: "ASC" },
    key
  );
}

function buildChain(kind, path, meta, tdKey) {
  if (kind === "fundamental") {
    return [() => P.twelveData(path, { symbol: meta.api }, tdKey)];
  }
  if (kind === "history") {
    const chain = [() => P.yahooHistory(meta)];
    if (meta.type === "crypto") chain.push(() => P.coingeckoHistory(meta));
    if (meta.type === "fx") chain.push(() => P.frankfurterHistory(meta));
    chain.push(() => tdHistory(meta, tdKey));
    return chain;
  }
  const chain = [() => P.yahooQuote(meta)];
  if (meta.type === "crypto") chain.push(() => P.coingeckoQuote(meta));
  if (meta.type === "fx") chain.push(() => P.frankfurterQuote(meta));
  chain.push(() => P.twelveData("/quote", { symbol: meta.api }, tdKey));
  return chain;
}

// Congressional trades feed (Capitol Trades clone). Not symbol-keyed: we cache
// the full recent feed and filter by optional ticker per request. Live source
// first, bundled sample as fallback so the view always renders. The live feed
// caches for an hour; the sample fallback only briefly, so we re-probe the BFF
// every few minutes and pick up its recovery instead of pinning stale sample
// data for the full hour.
async function congressHandler(query) {
  const cacheKey = "congress:feed";
  let payload = cacheGet(cacheKey);
  if (!payload) {
    try {
      const { trades } = await P.capitolTrades({ perPage: 200 });
      payload = { trades, source: "capitoltrades" };
      cacheSet(cacheKey, payload, 3_600_000);
    } catch {
      payload = { trades: SAMPLE_CONGRESS_TRADES, source: "sample" };
      cacheSet(cacheKey, payload, 300_000);
    }
  }
  let trades = payload.trades;
  const ticker = (query.ticker || "").toUpperCase().trim();
  if (ticker) trades = trades.filter((t) => t.ticker === ticker);
  return { status: 200, body: { trades, source: payload.source, asOf: Date.now() } };
}

export async function proxyHandler(query, env) {
  const path = query.path;
  if (path === "/congress") return congressHandler(query);

  const symbol = query.symbol;
  if (!path || !symbol) {
    return { status: 400, body: { status: "error", code: 400, message: "missing path or symbol" } };
  }

  const meta = assetMeta(symbol);
  const kind = kindOf(path);
  const cacheKey = `${path}:${meta.api}`;

  const cached = cacheGet(cacheKey);
  if (cached) return { status: 200, body: { ...cached, _cache: "hit" } };

  const chain = buildChain(kind, path, meta, env.TWELVEDATA_KEY);

  let lastErr;
  for (const step of chain) {
    try {
      const data = await step();
      cacheSet(cacheKey, data, TTL[kind]);
      return { status: 200, body: data };
    } catch (e) {
      lastErr = e;
    }
  }

  // every provider failed — surface the most useful upstream message (e.g. a
  // Twelve Data daily-limit message, which the client banner keys off)
  return {
    status: 200,
    body: { status: "error", code: lastErr?.code || 502, message: lastErr?.message || "all providers failed" },
  };
}
