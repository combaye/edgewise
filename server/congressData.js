// Bundled fallback dataset for the Capitol Trades clone. Used when the live
// CapitolTrades BFF is unreachable (their CloudFront/Lambda occasionally 503s)
// so the panel + view always render. Shape is the SAME normalized trade object
// the live provider emits, so the client never has to branch on the source —
// it only reads `source` to badge the data as live vs. illustrative.
//
// Trades follow the STOCK Act disclosure model: a transaction (txDate) reported
// publicly some days later (pubDate), in a bracketed dollar range. Figures here
// are representative/illustrative, not actual filings.

// US congressional disclosure size brackets (lower, upper) in USD.
export const SIZE_BRACKETS = [
  [1001, 15000],
  [15001, 50000],
  [50001, 100000],
  [100001, 250000],
  [250001, 500000],
  [500001, 1000000],
  [1000001, 5000000],
  [5000001, 25000000],
];

// politician registry keeps the trade rows compact and consistent
const P = {
  pelosi:    { politician: "Nancy Pelosi",        party: "democrat",   chamber: "house",  state: "CA" },
  tuberville:{ politician: "Tommy Tuberville",    party: "republican", chamber: "senate", state: "AL" },
  crenshaw:  { politician: "Dan Crenshaw",        party: "republican", chamber: "house",  state: "TX" },
  khanna:    { politician: "Ro Khanna",           party: "democrat",   chamber: "house",  state: "CA" },
  gottheimer:{ politician: "Josh Gottheimer",     party: "democrat",   chamber: "house",  state: "NJ" },
  mccaul:    { politician: "Michael McCaul",      party: "republican", chamber: "house",  state: "TX" },
  greene:    { politician: "Marjorie T. Greene",  party: "republican", chamber: "house",  state: "GA" },
  whitehouse:{ politician: "Sheldon Whitehouse",  party: "democrat",   chamber: "senate", state: "RI" },
  carper:    { politician: "Thomas Carper",       party: "democrat",   chamber: "senate", state: "DE" },
  fallon:    { politician: "Pat Fallon",          party: "republican", chamber: "house",  state: "TX" },
  blunt:     { politician: "Markwayne Mullin",    party: "republican", chamber: "senate", state: "OK" },
  garamendi: { politician: "John Garamendi",      party: "democrat",   chamber: "house",  state: "CA" },
  wyden:     { politician: "Ron Wyden",           party: "democrat",   chamber: "senate", state: "OR" },
  moran:     { politician: "Jerry Moran",         party: "republican", chamber: "senate", state: "KS" },
  scott:     { politician: "Rick Scott",          party: "republican", chamber: "senate", state: "FL" },
  spanberger:{ politician: "Abigail Spanberger",  party: "democrat",   chamber: "house",  state: "VA" },
};

// [key, ticker, issuer, txType, owner, txDate, pubDate, bracketIndex, price]
const ROWS = [
  ["pelosi",     "NVDA", "NVIDIA Corp",            "buy",  "spouse", "2026-05-18", "2026-06-12", 6, 131.4],
  ["pelosi",     "AAPL", "Apple Inc",              "sell", "spouse", "2026-05-18", "2026-06-12", 5, 212.8],
  ["pelosi",     "GOOGL","Alphabet Inc",           "buy",  "spouse", "2026-04-29", "2026-05-21", 5, 178.2],
  ["tuberville", "MSFT", "Microsoft Corp",         "buy",  "self",   "2026-06-02", "2026-06-15", 2, 441.0],
  ["tuberville", "XOM",  "Exxon Mobil Corp",       "buy",  "self",   "2026-06-02", "2026-06-15", 1, 113.7],
  ["tuberville", "TSLA", "Tesla Inc",              "sell", "self",   "2026-05-09", "2026-05-27", 2, 244.1],
  ["crenshaw",   "PLTR", "Palantir Technologies",  "buy",  "self",   "2026-05-30", "2026-06-14", 1, 28.9],
  ["crenshaw",   "LMT",  "Lockheed Martin Corp",   "buy",  "self",   "2026-04-15", "2026-05-02", 2, 472.3],
  ["khanna",     "JNJ",  "Johnson & Johnson",      "buy",  "joint",  "2026-06-05", "2026-06-16", 0, 152.6],
  ["khanna",     "PG",   "Procter & Gamble Co",    "buy",  "joint",  "2026-06-05", "2026-06-16", 0, 167.9],
  ["khanna",     "KO",   "Coca-Cola Co",           "buy",  "child",  "2026-05-22", "2026-06-03", 0, 62.4],
  ["gottheimer", "MSFT", "Microsoft Corp",         "buy",  "self",   "2026-05-26", "2026-06-09", 3, 438.5],
  ["gottheimer", "AMZN", "Amazon.com Inc",         "buy",  "self",   "2026-05-26", "2026-06-09", 3, 201.7],
  ["gottheimer", "NVDA", "NVIDIA Corp",            "buy",  "self",   "2026-05-12", "2026-05-30", 4, 124.8],
  ["mccaul",     "AVGO", "Broadcom Inc",           "buy",  "spouse", "2026-05-20", "2026-06-08", 3, 1612.0],
  ["mccaul",     "CRM",  "Salesforce Inc",         "sell", "spouse", "2026-05-20", "2026-06-08", 2, 268.4],
  ["greene",     "DJT",  "Trump Media & Tech",     "buy",  "self",   "2026-06-01", "2026-06-13", 1, 33.2],
  ["greene",     "RTX",  "RTX Corp",               "buy",  "self",   "2026-05-04", "2026-05-19", 1, 121.5],
  ["whitehouse", "VTI",  "Vanguard Total Mkt ETF", "buy",  "joint",  "2026-05-15", "2026-06-01", 2, 296.0],
  ["carper",     "T",    "AT&T Inc",               "sell", "self",   "2026-05-28", "2026-06-10", 1, 27.8],
  ["fallon",     "AMD",  "Advanced Micro Devices", "buy",  "self",   "2026-06-04", "2026-06-15", 2, 168.3],
  ["fallon",     "INTC", "Intel Corp",             "buy",  "self",   "2026-06-04", "2026-06-15", 1, 22.1],
  ["fallon",     "META", "Meta Platforms Inc",     "buy",  "self",   "2026-05-11", "2026-05-28", 2, 612.9],
  ["blunt",      "OXY",  "Occidental Petroleum",   "buy",  "self",   "2026-05-21", "2026-06-07", 4, 49.6],
  ["blunt",      "CVX",  "Chevron Corp",           "buy",  "self",   "2026-05-21", "2026-06-07", 3, 154.2],
  ["garamendi",  "DIS",  "Walt Disney Co",         "buy",  "spouse", "2026-06-03", "2026-06-14", 0, 112.7],
  ["wyden",      "GLD",  "SPDR Gold Shares",       "buy",  "joint",  "2026-05-17", "2026-06-02", 2, 248.1],
  ["moran",      "BA",   "Boeing Co",              "buy",  "self",   "2026-05-25", "2026-06-09", 2, 211.4],
  ["moran",      "GE",   "GE Aerospace",           "buy",  "self",   "2026-05-25", "2026-06-09", 2, 238.0],
  ["scott",      "UNH",  "UnitedHealth Group",     "sell", "self",   "2026-06-06", "2026-06-16", 5, 489.3],
  ["scott",      "JPM",  "JPMorgan Chase & Co",    "buy",  "self",   "2026-05-13", "2026-05-29", 4, 268.7],
  ["spanberger", "QQQ",  "Invesco QQQ Trust",      "buy",  "joint",  "2026-05-19", "2026-06-04", 1, 512.6],
  ["pelosi",     "TSLA", "Tesla Inc",              "buy",  "spouse", "2026-03-24", "2026-04-14", 6, 251.0],
  ["tuberville", "AAPL", "Apple Inc",              "buy",  "self",   "2026-04-08", "2026-04-22", 1, 205.4],
  ["crenshaw",   "NVDA", "NVIDIA Corp",            "buy",  "self",   "2026-04-30", "2026-05-16", 2, 121.9],
  ["gottheimer", "GOOGL","Alphabet Inc",           "buy",  "self",   "2026-04-21", "2026-05-07", 3, 171.2],
  ["khanna",     "WMT",  "Walmart Inc",            "buy",  "child",  "2026-04-18", "2026-05-01", 0, 92.5],
  ["mccaul",     "NOW",  "ServiceNow Inc",         "buy",  "spouse", "2026-04-27", "2026-05-13", 2, 978.4],
  ["scott",      "XOM",  "Exxon Mobil Corp",       "sell", "self",   "2026-04-10", "2026-04-26", 4, 109.8],
  ["fallon",     "NVDA", "NVIDIA Corp",            "buy",  "self",   "2026-04-14", "2026-04-30", 2, 118.6],
];

export const SAMPLE_CONGRESS_TRADES = ROWS.map(
  ([key, ticker, issuer, txType, owner, txDate, pubDate, bi, price], i) => {
    const [lo, hi] = SIZE_BRACKETS[bi];
    return {
      id: `s-${i}`,
      ...P[key],
      ticker,
      issuer,
      txType,
      owner,
      txDate,
      pubDate,
      sizeMin: lo,
      sizeMax: hi,
      price,
    };
  }
);
