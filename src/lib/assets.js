// Asset metadata: maps display symbols (compact, e.g. EURUSD) to Twelve Data
// API symbols (slash form, e.g. EUR/USD) and classifies the asset type, which
// drives formatting and whether valuation models apply.

export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const DEFAULT_ASSETS = [
  { sym: "SPX", api: "SPX", name: "S&P 500 Index", type: "index" },
  { sym: "AAPL", api: "AAPL", name: "Apple Inc.", type: "stock" },
  { sym: "EURUSD", api: "EUR/USD", name: "Euro / US Dollar", type: "fx" },
  { sym: "XAUUSD", api: "XAU/USD", name: "Gold Spot", type: "commodity" },
  { sym: "BTCUSD", api: "BTC/USD", name: "Bitcoin", type: "crypto" },
];

const INDICES = new Set(["SPX", "NDX", "DJI", "RUT", "VIX", "IXIC", "FTSE", "DAX", "N225", "HSI"]);
const ETFS = new Set([
  "SPY", "QQQ", "DIA", "IWM", "EFA", "EEM", "VTI", "VOO", "TLT", "HYG", "ARKK",
  "GLD", "SLV", "USO", "XLK", "XLF", "XLE", "XLV", "XLY", "XLI", "XLP", "XLU", "XLB", "XLRE", "XLC",
]);
const CRYPTO = new Set([
  "BTC", "ETH", "SOL", "XRP", "ADA", "DOGE", "BNB", "LTC", "DOT", "AVAX", "LINK",
  "MATIC", "BCH", "ATOM", "UNI", "TRX", "XLM", "ETC", "FIL", "NEAR", "APT", "ARB", "OP", "SHIB",
]);
const METALS = new Set(["XAU", "XAG", "XPT", "XPD"]);
const CCY = new Set([
  "USD", "EUR", "GBP", "JPY", "CHF", "AUD", "NZD", "CAD", "SEK", "NOK", "DKK",
  "MXN", "SGD", "HKD", "CNY", "ZAR", "PLN", "TRY", "INR", "BRL",
]);

// Friendly display names for catalog instruments (falls back to the symbol).
export const NAMES = {
  SPX: "S&P 500 Index", NDX: "Nasdaq 100 Index", DJI: "Dow Jones 30", RUT: "Russell 2000",
  VIX: "Volatility Index", FTSE: "FTSE 100", DAX: "DAX 40", N225: "Nikkei 225", HSI: "Hang Seng",
  SPY: "S&P 500 ETF", QQQ: "Nasdaq 100 ETF", DIA: "Dow 30 ETF", IWM: "Russell 2000 ETF",
  EFA: "MSCI EAFE ETF", EEM: "Emerging Markets ETF", VTI: "Total US Market ETF", VOO: "Vanguard S&P 500",
  TLT: "20Y+ Treasury ETF", HYG: "High-Yield Bond ETF", ARKK: "ARK Innovation ETF",
  GLD: "Gold ETF", SLV: "Silver ETF", USO: "US Oil Fund",
  XLK: "Tech Sector", XLF: "Financials Sector", XLE: "Energy Sector", XLV: "Health Care Sector",
  XLY: "Cons. Discretionary", XLI: "Industrials Sector", XLP: "Cons. Staples", XLU: "Utilities Sector",
  XLB: "Materials Sector", XLRE: "Real Estate Sector", XLC: "Comm. Services",
  AAPL: "Apple Inc.", MSFT: "Microsoft Corp.", NVDA: "NVIDIA Corp.", AMZN: "Amazon.com", GOOGL: "Alphabet Inc.",
  META: "Meta Platforms", TSLA: "Tesla Inc.", AMD: "Advanced Micro Devices", NFLX: "Netflix Inc.", INTC: "Intel Corp.",
  AVGO: "Broadcom Inc.", ORCL: "Oracle Corp.", CRM: "Salesforce Inc.", ADBE: "Adobe Inc.", CSCO: "Cisco Systems",
  QCOM: "Qualcomm Inc.", JPM: "JPMorgan Chase", BAC: "Bank of America", V: "Visa Inc.", MA: "Mastercard Inc.",
  DIS: "Walt Disney Co.", KO: "Coca-Cola Co.", PEP: "PepsiCo Inc.", WMT: "Walmart Inc.", XOM: "Exxon Mobil",
  CVX: "Chevron Corp.", JNJ: "Johnson & Johnson", PG: "Procter & Gamble", UNH: "UnitedHealth Group", HD: "Home Depot",
  BA: "Boeing Co.", CAT: "Caterpillar Inc.", GS: "Goldman Sachs", PYPL: "PayPal Holdings", UBER: "Uber Technologies",
  COIN: "Coinbase Global", PLTR: "Palantir Tech", BABA: "Alibaba Group",
  BTCUSD: "Bitcoin", ETHUSD: "Ethereum", SOLUSD: "Solana", XRPUSD: "Ripple", ADAUSD: "Cardano",
  DOGEUSD: "Dogecoin", BNBUSD: "BNB", LTCUSD: "Litecoin", AVAXUSD: "Avalanche", LINKUSD: "Chainlink",
  DOTUSD: "Polkadot", MATICUSD: "Polygon", BCHUSD: "Bitcoin Cash", ATOMUSD: "Cosmos", UNIUSD: "Uniswap",
  EURUSD: "Euro / US Dollar", GBPUSD: "Pound / US Dollar", USDJPY: "US Dollar / Yen", AUDUSD: "Aussie / US Dollar",
  USDCAD: "US Dollar / Loonie", USDCHF: "US Dollar / Franc", NZDUSD: "Kiwi / US Dollar", EURGBP: "Euro / Pound",
  EURJPY: "Euro / Yen", GBPJPY: "Pound / Yen",
  XAUUSD: "Gold Spot", XAGUSD: "Silver Spot", XPTUSD: "Platinum Spot", XPDUSD: "Palladium Spot",
};

export function assetMeta(symRaw) {
  const sym = String(symRaw || "").toUpperCase().trim().replace(/\s+/g, "");
  const known = DEFAULT_ASSETS.find((a) => a.sym === sym || a.api === sym);
  if (known) return known;
  const name = NAMES[sym] || sym;
  if (ETFS.has(sym)) return { sym, api: sym, name, type: "etf" };
  if (INDICES.has(sym)) return { sym, api: sym, name, type: "index" };

  // pair detection: BASEQUOTE or BASE/QUOTE where QUOTE is a fiat currency
  const compact = sym.replace("/", "");
  if (compact.length > 3) {
    const base = compact.slice(0, compact.length - 3);
    const quote = compact.slice(-3);
    if (CCY.has(quote)) {
      const api = `${base}/${quote}`;
      const pairName = NAMES[compact] || api;
      if (METALS.has(base)) return { sym: compact, api, name: pairName, type: "commodity" };
      if (CRYPTO.has(base)) return { sym: compact, api, name: pairName, type: "crypto" };
      if (CCY.has(base)) return { sym: compact, api, name: pairName, type: "fx" };
    }
  }
  return { sym, api: sym, name, type: "stock" };
}

// Valuation models apply to single-company equities only (not ETFs/indices/FX/etc).
export const isEquity = (meta) => meta.type === "stock";

export function fmt(v, sym) {
  if (v == null || !Number.isFinite(v)) return "—";
  const type = sym ? assetMeta(sym).type : null;
  const d = type === "fx" ? 4 : v >= 1000 ? 0 : 2;
  return v.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
}
