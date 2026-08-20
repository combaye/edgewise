import { useQuery } from "@tanstack/react-query";
import { hasApiKey } from "../lib/api";
import { assetMeta } from "../lib/assets";
import { loadHistory } from "../lib/history";

// Query options exported separately so multi-symbol consumers (correlation
// matrix) can batch with useQueries against the same cache entries.
export function historicalQueryOptions(sym) {
  const meta = assetMeta(sym);
  return {
    queryKey: ["history", meta.api],
    enabled: hasApiKey,
    staleTime: Infinity,
    gcTime: 60 * 60 * 1000,
    retry: false,
    queryFn: () => loadHistory(meta),
  };
}

// 10 years of daily OHLC, ascending. Persisted in localStorage per symbol and
// refreshed only when the cached copy is older than 24 hours.
export function useHistorical(sym) {
  return useQuery(historicalQueryOptions(sym));
}
