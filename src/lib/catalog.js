// Curated instrument catalog for the browse-and-add picker, grouped by class.
// Symbols here are confirmed to resolve on the free Twelve Data tier (raw index
// symbols like SPX/NDX are plan-gated, so major indices are offered as their
// liquid ETF proxies instead). Names/types are resolved via assetMeta(NAMES).

export const CATALOG = [
  {
    group: "Indexes (ETFs)",
    syms: ["SPY", "QQQ", "DIA", "IWM", "VTI", "EFA", "EEM", "TLT"],
  },
  {
    group: "Stocks",
    syms: [
      "AAPL", "MSFT", "NVDA", "AMZN", "GOOGL", "META", "TSLA", "AMD", "NFLX", "AVGO",
      "ORCL", "CRM", "ADBE", "CSCO", "QCOM", "INTC", "JPM", "BAC", "GS", "V", "MA",
      "DIS", "KO", "PEP", "WMT", "XOM", "CVX", "JNJ", "PG", "UNH", "HD", "BA", "CAT",
      "COIN", "PLTR", "UBER", "PYPL", "BABA",
    ],
  },
  {
    group: "Crypto",
    syms: ["BTCUSD", "ETHUSD", "SOLUSD", "XRPUSD", "ADAUSD", "DOGEUSD", "BNBUSD", "LTCUSD", "AVAXUSD", "LINKUSD", "DOTUSD", "MATICUSD"],
  },
  {
    group: "Forex",
    syms: ["EURUSD", "GBPUSD", "USDJPY", "AUDUSD", "USDCAD", "USDCHF", "NZDUSD", "EURGBP", "EURJPY", "GBPJPY"],
  },
  {
    group: "Commodities",
    syms: ["XAUUSD", "XAGUSD", "XPTUSD", "XPDUSD"],
  },
];

// Sector ETFs reserved for a future Sector Map feature.
export const SECTOR_ETFS = ["XLK", "XLF", "XLE", "XLV", "XLY", "XLI", "XLP", "XLU", "XLB", "XLRE", "XLC"];
