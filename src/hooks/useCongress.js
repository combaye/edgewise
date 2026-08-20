import { useQuery } from "@tanstack/react-query";
import { tdRequest } from "../lib/api";

// Congressional trades feed via our proxy (/api/td?path=/congress). The proxy
// caches the live CapitolTrades feed for an hour and falls back to a bundled
// sample set, tagging the response `source` so the UI can badge it honestly.
// Pass a ticker to scope the feed to one issuer (used by the terminal panel);
// pass enabled:false to skip fetching entirely (e.g. non-equity symbols).
export function useCongress(ticker, { enabled = true } = {}) {
  return useQuery({
    queryKey: ["congress", ticker || "all"],
    enabled,
    staleTime: 30 * 60_000,
    gcTime: 60 * 60_000,
    retry: 1,
    queryFn: () => tdRequest("/congress", ticker ? { ticker } : {}),
  });
}
