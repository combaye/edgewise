import { useQuery } from "@tanstack/react-query";
import { fetchCot, cotSupported } from "../lib/cot";

// CFTC data is weekly and free — no Twelve Data credits involved.
export function useCot(sym) {
  return useQuery({
    queryKey: ["cot", sym],
    enabled: cotSupported(sym),
    staleTime: Infinity,
    retry: 1,
    queryFn: () => fetchCot(sym),
  });
}
