import { useQuery } from "@tanstack/react-query";
import { tdRequest, hasApiKey } from "../lib/api";
import { assetMeta, isEquity } from "../lib/assets";
import { cacheGet, cacheSet } from "../lib/cache";

const DAY_MS = 24 * 60 * 60 * 1000;

// Generic cached fundamentals fetcher. Equities/indices only — these endpoints
// are not meaningful for FX/crypto/commodities and would just error.
function makeFundamentalHook(endpoint, keyPrefix) {
  return function useFundamentalEndpoint(sym) {
    const meta = assetMeta(sym);
    return useQuery({
      queryKey: [keyPrefix, meta.api],
      enabled: hasApiKey && isEquity(meta),
      staleTime: Infinity,
      retry: false,
      queryFn: async () => {
        const cacheKey = `${keyPrefix}:${meta.sym}`;
        const cached = cacheGet(cacheKey, DAY_MS);
        if (cached) return cached;
        const r = await tdRequest(endpoint, { symbol: meta.api });
        cacheSet(cacheKey, r);
        return r;
      },
    });
  };
}

export const useEarnings = makeFundamentalHook("/earnings", "earnings");
export const useInsiders = makeFundamentalHook("/insider_transactions", "insiders");
export const useBalanceSheet = makeFundamentalHook("/balance_sheet", "balsheet");
export const useIncomeStatement = makeFundamentalHook("/income_statement", "income");
