import { useQuery } from "@tanstack/react-query";
import { tdRequest, hasApiKey } from "../lib/api";
import { assetMeta, isEquity } from "../lib/assets";
import { cacheGet, cacheSet } from "../lib/cache";

const DAY_MS = 24 * 60 * 60 * 1000;

// Fundamental statistics (/statistics) — only fetched for equities/indices;
// valuation models don't apply to FX, crypto, or commodities.
export function useFundamentals(sym) {
  const meta = assetMeta(sym);
  return useQuery({
    queryKey: ["statistics", meta.api],
    enabled: hasApiKey && isEquity(meta),
    staleTime: Infinity,
    retry: false,
    queryFn: async () => {
      const cacheKey = `stats:${meta.sym}`;
      const cached = cacheGet(cacheKey, DAY_MS);
      if (cached) return cached;
      const r = await tdRequest("/statistics", { symbol: meta.api });
      cacheSet(cacheKey, r);
      return r;
    },
  });
}
