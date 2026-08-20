// Journal persistence. Trades live in localStorage under fct:journal:trades via
// the shared cache helpers (same pattern App.jsx uses for the watchlist). Small
// CRUD surface; the analytics layer (lib/journal, lib/behavior) is pure on top.

import { useCallback, useEffect, useState } from "react";
import { cacheGet, cacheSet } from "../lib/cache";
import { makeSampleTrades } from "../lib/sampleTrades";

const KEY = "journal:trades";
const uid = () => `t-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

export function useJournal() {
  const [trades, setTrades] = useState(() => {
    const saved = cacheGet(KEY);
    return Array.isArray(saved) ? saved : [];
  });

  useEffect(() => {
    cacheSet(KEY, trades);
  }, [trades]);

  const addTrade = useCallback((t) => {
    const trade = { ...t, id: t.id || uid(), createdAt: t.createdAt || Date.now() };
    setTrades((cur) => [...cur, trade]);
    return trade.id;
  }, []);

  const updateTrade = useCallback((id, patch) => {
    setTrades((cur) => cur.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }, []);

  const deleteTrade = useCallback((id) => {
    setTrades((cur) => cur.filter((t) => t.id !== id));
  }, []);

  const clearAll = useCallback(() => setTrades([]), []);

  const loadSamples = useCallback(() => setTrades(makeSampleTrades()), []);

  return { trades, addTrade, updateTrade, deleteTrade, clearAll, loadSamples };
}
