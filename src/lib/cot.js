// CFTC Commitment of Traders (legacy futures-only report) via the official
// public Socrata API — free, no key. Net non-commercial ("large speculator")
// positioning per market, cached 24h in localStorage.

import axios from "axios";
import { cacheGet, cacheSet } from "./cache.js";

const ENDPOINT = "https://publicreporting.cftc.gov/resource/6dca-aqww.json";
const DAY_MS = 24 * 60 * 60 * 1000;

// market_and_exchange_names prefix per supported display symbol
export const COT_MARKETS = {
  XAUUSD: "GOLD - COMMODITY EXCHANGE",
  EURUSD: "EURO FX - CHICAGO MERCANTILE EXCHANGE",
  GBPUSD: "BRITISH POUND",
  JPYUSD: "JAPANESE YEN",
  BTCUSD: "BITCOIN - CHICAGO MERCANTILE EXCHANGE",
  SPX: "E-MINI S&P 500",
  NDX: "NASDAQ MINI",
  XAGUSD: "SILVER - COMMODITY EXCHANGE",
};

export const cotSupported = (sym) => Boolean(COT_MARKETS[sym]);

export async function fetchCot(sym) {
  const prefix = COT_MARKETS[sym];
  if (!prefix) return null;

  const cacheKey = `cot:${sym}`;
  const cached = cacheGet(cacheKey, DAY_MS);
  if (cached) return cached;

  const { data } = await axios.get(ENDPOINT, {
    params: {
      $where: `starts_with(market_and_exchange_names, '${prefix}')`,
      $order: "report_date_as_yyyy_mm_dd DESC",
      $limit: 400,
      $select:
        "market_and_exchange_names,report_date_as_yyyy_mm_dd,open_interest_all,noncomm_positions_long_all,noncomm_positions_short_all",
    },
  });
  if (!Array.isArray(data) || !data.length) throw new Error(`No COT data found for ${sym}`);

  // the prefix can match several contract listings — keep the one the newest report uses
  const market = data[0].market_and_exchange_names;
  const rows = data
    .filter((r) => r.market_and_exchange_names === market)
    .map((r) => {
      const long = Number(r.noncomm_positions_long_all) || 0;
      const short = Number(r.noncomm_positions_short_all) || 0;
      const oi = Number(r.open_interest_all) || 0;
      return {
        date: String(r.report_date_as_yyyy_mm_dd).slice(0, 10),
        net: long - short,
        long,
        short,
        oi,
        netPctOi: oi ? +(((long - short) / oi) * 100).toFixed(1) : null,
      };
    })
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .slice(-156); // ~3 years of weekly reports

  const result = { market, rows, ...cotStats(rows) };
  cacheSet(cacheKey, result);
  return result;
}

function cotStats(rows) {
  const nets = rows.map((r) => r.net);
  const cur = nets[nets.length - 1];
  const prev = nets.length > 1 ? nets[nets.length - 2] : cur;
  const pctile = Math.round((nets.filter((v) => v <= cur).length / nets.length) * 100);
  const yr = rows.slice(-52);
  return {
    current: cur,
    weeklyChange: cur - prev,
    pctile3y: pctile,
    hi52: Math.max(...yr.map((r) => r.net)),
    lo52: Math.min(...yr.map((r) => r.net)),
    netPctOi: rows[rows.length - 1].netPctOi,
  };
}
