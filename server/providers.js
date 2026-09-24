// Provider adapters. Each returns data NORMALIZED to the Twelve Data response
// shape the client already parses, so the React layer is provider-agnostic:
//   /time_series -> { values: [{ datetime, open, high, low, close }] }
//   /quote       -> { close, percent_change, name, is_market_open }
//   fundamentals -> native Twelve Data JSON (Twelve Data only)
//
// Each adapter throws on failure so the router can fall through to the next.

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
const TD_BASE = "https://api.twelvedata.com";

async function getJSON(url, opts = {}) {
  const ctl = AbortSignal.timeout ? AbortSignal.timeout(20_000) : undefined;
  const res = await fetch(url, { headers: { "User-Agent": UA, accept: "application/json" }, signal: ctl, ...opts });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
async function getText(url) {
  const ctl = AbortSignal.timeout ? AbortSignal.timeout(20_000) : undefined;
  const res = await fetch(url, { headers: { "User-Agent": UA }, signal: ctl });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

// ---------------- symbol mapping ----------------
const INDEX_YAHOO = {
  SPX: "^GSPC", NDX: "^NDX", DJI: "^DJI", RUT: "^RUT", VIX: "^VIX",
  IXIC: "^IXIC", FTSE: "^FTSE", DAX: "^GDAXI", N225: "^N225", HSI: "^HSI",
};
const METAL_YAHOO = { XAU: "GC=F", XAG: "SI=F", XPT: "PL=F", XPD: "PA=F" };
const CG_IDS = {
  BTC: "bitcoin", ETH: "ethereum", SOL: "solana", XRP: "ripple", ADA: "cardano",
  DOGE: "dogecoin", BNB: "binancecoin", LTC: "litecoin", AVAX: "avalanche-2",
  LINK: "chainlink", DOT: "polkadot", MATIC: "matic-network", BCH: "bitcoin-cash",
  ATOM: "cosmos", UNI: "uniswap", TRX: "tron", XLM: "stellar", ETC: "ethereum-classic",
};

function yahooSymbol(meta) {
  const { sym, api, type } = meta;
  if (type === "fx") return api.replace("/", "") + "=X"; // EUR/USD -> EURUSD=X
  if (type === "crypto") return api.replace("/", "-"); // BTC/USD -> BTC-USD
  if (type === "commodity") {
    const base = api.split("/")[0];
    return METAL_YAHOO[base] || api.replace("/", "") + "=X";
  }
  if (type === "index") return INDEX_YAHOO[sym] || sym;
  return sym; // stock / etf
}

const baseCcy = (api) => api.split("/")[0];
const quoteCcy = (api) => (api.includes("/") ? api.split("/")[1] : "USD");

// ---------------- Yahoo (universal price + history) ----------------
const YH_HOSTS = ["query1.finance.yahoo.com", "query2.finance.yahoo.com"];

async function yahooChart(meta, range) {
  const ysym = yahooSymbol(meta);
  let lastErr;
  for (const host of YH_HOSTS) {
    try {
      const url = `https://${host}/v8/finance/chart/${encodeURIComponent(ysym)}?range=${range}&interval=1d`;
      const j = await getJSON(url);
      const r = j?.chart?.result?.[0];
      if (!r) throw new Error("no chart result");
      return r;
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error("yahoo failed");
}

export async function yahooHistory(meta) {
  const r = await yahooChart(meta, "10y");
  const ts = r.timestamp || [];
  const q = r.indicators?.quote?.[0] || {};
  const adj = r.indicators?.adjclose?.[0]?.adjclose;
  const values = [];
  for (let i = 0; i < ts.length; i++) {
    const close = adj?.[i] ?? q.close?.[i];
    if (close == null) continue;
    values.push({
      datetime: new Date(ts[i] * 1000).toISOString().slice(0, 10),
      open: q.open?.[i] ?? close,
      high: q.high?.[i] ?? close,
      low: q.low?.[i] ?? close,
      close,
    });
  }
  if (!values.length) throw new Error("yahoo: empty history");
  return { values, _provider: "yahoo" };
}

export async function yahooQuote(meta) {
  const r = await yahooChart(meta, "5d");
  const m = r.meta || {};
  const price = m.regularMarketPrice;
  if (price == null) throw new Error("yahoo: no price");
  const prev = m.chartPreviousClose ?? m.previousClose ?? price;
  return {
    close: price,
    percent_change: prev ? ((price / prev - 1) * 100).toFixed(4) : null,
    name: m.shortName || m.longName || meta.name,
    is_market_open: false,
    _provider: "yahoo",
  };
}

// ---------------- CoinGecko (crypto) ----------------
function cgId(meta) {
  const id = CG_IDS[baseCcy(meta.api)];
  if (!id) throw new Error(`coingecko: unmapped ${meta.api}`);
  return id;
}

export async function coingeckoQuote(meta) {
  const id = cgId(meta);
  const j = await getJSON(`https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${id}`);
  const row = Array.isArray(j) ? j[0] : null;
  if (!row?.current_price) throw new Error("coingecko: no price");
  return {
    close: row.current_price,
    percent_change: row.price_change_percentage_24h != null ? row.price_change_percentage_24h.toFixed(4) : null,
    name: row.name || meta.name,
    is_market_open: true,
    _provider: "coingecko",
  };
}

export async function coingeckoHistory(meta) {
  const id = cgId(meta);
  const j = await getJSON(`https://api.coingecko.com/api/v3/coins/${id}/market_chart?vs_currency=usd&days=max&interval=daily`);
  const prices = j?.prices || [];
  // market_chart is close-only; synthesize OHLC = close (sufficient for our
  // close-based pattern/seasonality math, slightly degrades ATR)
  const values = prices.map(([ts, c]) => {
    const d = new Date(ts).toISOString().slice(0, 10);
    return { datetime: d, open: c, high: c, low: c, close: c };
  });
  if (values.length < 60) throw new Error("coingecko: thin history");
  return { values, _provider: "coingecko" };
}

// ---------------- Frankfurter (FX, ECB) ----------------
export async function frankfurterQuote(meta) {
  const from = baseCcy(meta.api);
  const to = quoteCcy(meta.api);
  const j = await getJSON(`https://api.frankfurter.app/latest?from=${from}&to=${to}`);
  const rate = j?.rates?.[to];
  if (rate == null) throw new Error("frankfurter: no rate");
  return { close: rate, percent_change: null, name: `${from}/${to}`, is_market_open: false, _provider: "frankfurter" };
}

export async function frankfurterHistory(meta) {
  const from = baseCcy(meta.api);
  const to = quoteCcy(meta.api);
  const start = new Date();
  start.setFullYear(start.getFullYear() - 10);
  const j = await getJSON(`https://api.frankfurter.app/${start.toISOString().slice(0, 10)}..?from=${from}&to=${to}`);
  const rates = j?.rates || {};
  const values = Object.keys(rates)
    .sort()
    .map((d) => {
      const c = rates[d][to];
      return { datetime: d, open: c, high: c, low: c, close: c };
    })
    .filter((v) => v.close != null);
  if (values.length < 60) throw new Error("frankfurter: thin history");
  return { values, _provider: "frankfurter" };
}

// ---------------- CapitolTrades (congressional trade disclosures) ----------------
// Their public BFF backs www.capitoltrades.com. We fetch the most-recent feed
// and normalize each row to the flat trade shape the client renders. Throws on
// any failure so the router falls back to the bundled sample dataset.
const PARTY_MAP = { democrat: "democrat", republican: "republican", independent: "independent", D: "democrat", R: "republican", I: "independent" };

export async function capitolTrades({ perPage = 200, page = 1 } = {}) {
  const qs = new URLSearchParams({
    per_page: String(perPage),
    page: String(page),
    sortBy: "-pubDate",
  }).toString();
  const j = await getJSON(`https://bff.capitoltrades.com/trades?${qs}`, {
    headers: {
      accept: "application/json",
      origin: "https://www.capitoltrades.com",
      referer: "https://www.capitoltrades.com/",
      "user-agent": UA,
    },
  });
  const rows = Array.isArray(j?.data) ? j.data : [];
  const trades = rows
    .map((r) => {
      const pol = r.politician || {};
      const name = [pol.firstName, pol.lastName].filter(Boolean).join(" ") || pol.fullName || "Unknown";
      const ticker = (r.issuerTicker || r.asset?.assetTicker || "").split(":")[0].toUpperCase();
      const tx = String(r.txType || "").toLowerCase();
      return {
        id: String(r._txId ?? r.txId ?? `${name}-${r.txDate}-${ticker}`),
        politician: name,
        party: PARTY_MAP[pol.party] || "independent",
        chamber: String(pol.chamber || r.chamber || "").toLowerCase() === "senate" ? "senate" : "house",
        state: (pol.state || "").toUpperCase(),
        ticker,
        issuer: r.issuerName || r.asset?.assetName || ticker,
        txType: tx.startsWith("buy") || tx === "receive" ? "buy" : tx.startsWith("sell") ? "sell" : "exchange",
        owner: (r.owner || "self").toLowerCase(),
        txDate: r.txDate,
        pubDate: r.pubDate,
        sizeMin: r.sizeRangeLow ?? r.value ?? null,
        sizeMax: r.sizeRangeHigh ?? r.value ?? null,
        price: r.price ?? null,
      };
    })
    .filter((t) => t.ticker && t.txDate);
  if (!trades.length) throw new Error("capitoltrades: empty feed");
  return { trades, _provider: "capitoltrades" };
}

// ---------------- Twelve Data (primary fundamentals; price/history fallback) ----------------
export async function twelveData(path, params, key) {
  if (!key) throw new Error("no Twelve Data key configured");
  // Defense in depth: the router allow-lists paths, but this is the line that
  // attaches the key, so it independently refuses anything that isn't a plain
  // "/segment" and verifies the final host before any request leaves.
  if (!/^\/[a-z_]+$/.test(path)) throw new Error("invalid Twelve Data path");
  const url = new URL(`${TD_BASE}${path}`);
  if (url.hostname !== "api.twelvedata.com") throw new Error("refusing non-Twelve-Data host");
  url.search = new URLSearchParams({ ...params, apikey: key }).toString();
  const data = await getJSON(url.toString());
  if (data && data.status === "error") {
    const err = new Error(data.message || `Twelve Data error ${data.code}`);
    err.code = Number(data.code);
    err.twelveData = true;
    throw err;
  }
  return { ...data, _provider: "twelvedata" };
}
