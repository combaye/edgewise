import { useQuery } from "@tanstack/react-query";
import { tdRequest, hasApiKey } from "../lib/api";
import { assetMeta } from "../lib/assets";

// Polling cadence is deliberately conservative: the free tier is capped at
// 800 credits/DAY (not just 8/min), and every watchlist symbol costs 1 credit
// per refresh. A 5-minute quote interval keeps a multi-hour, multi-symbol
// session comfortably under the daily cap. /quote already returns price + day
// change, so there is no separate /price poll.
const QUOTE_STALE_MS = 4 * 60_000;
const QUOTE_REFETCH_MS = 5 * 60_000;

// Query options exported separately so multi-symbol consumers (alerts panel,
// market mood) share the same cache entries.
export function quoteQueryOptions(sym) {
  const meta = assetMeta(sym);
  return {
    queryKey: ["quote", meta.api],
    enabled: hasApiKey,
    staleTime: QUOTE_STALE_MS,
    refetchInterval: QUOTE_REFETCH_MS,
    refetchIntervalInBackground: false, // don't burn credits on hidden tabs
    retry: false,
    queryFn: async () => {
      const q = await tdRequest("/quote", { symbol: meta.api });
      const price = Number(q.close);
      if (!Number.isFinite(price)) throw new Error(`No quote data for ${meta.sym}`);
      return {
        price,
        changePct: Number.isFinite(Number(q.percent_change)) ? Number(q.percent_change) : null,
        name: q.name || meta.name,
        isOpen: Boolean(q.is_market_open),
      };
    },
  };
}

// Snapshot quote (/quote): price, day change, name. Shared by the top bar
// tabs and the watchlist rows via the query cache.
export function useQuote(sym) {
  return useQuery(quoteQueryOptions(sym));
}
