// Shared history loader: cache-check → proxy fetch → parse to ascending bars.
// Used by the useHistorical hook AND the screener (which fetches a whole
// universe). Goes through the same client queue + localStorage + server cache.

import { tdRequest } from "./api";
import { cacheGet, cacheSet } from "./cache";

const DAY_MS = 24 * 60 * 60 * 1000;

export async function loadHistory(meta) {
  const cacheKey = `hist:${meta.sym}`;
  const cached = cacheGet(cacheKey, DAY_MS);
  if (cached?.bars?.length) return cached;

  const r = await tdRequest("/time_series", { symbol: meta.api });
  const values = Array.isArray(r?.values) ? r.values : [];
  const bars = values
    .map((v) => ({
      date: String(v.datetime).slice(0, 10),
      open: Number(v.open),
      high: Number(v.high),
      low: Number(v.low),
      close: Number(v.close),
    }))
    .filter((b) => Number.isFinite(b.close))
    .sort((a, b) => (a.date < b.date ? -1 : 1));

  if (!bars.length) throw new Error(`No historical data available for ${meta.sym}`);
  const data = { bars, fetchedAt: new Date().toISOString().slice(0, 10) };
  cacheSet(cacheKey, data);
  return data;
}
