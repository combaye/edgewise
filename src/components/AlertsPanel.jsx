import { useEffect, useMemo, useRef, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import { C, mono } from "../lib/theme";
import { fmt, assetMeta } from "../lib/assets";
import { quoteQueryOptions } from "../hooks/useQuote";
import { cacheGet, cacheSet } from "../lib/cache";
import { Panel, EmptyState } from "./Panel";

const load = () => {
  const saved = cacheGet("alerts");
  return Array.isArray(saved) ? saved : [];
};

export default function AlertsPanel({ sym }) {
  const [alerts, setAlerts] = useState(load);
  const [dir, setDir] = useState("above");
  const [level, setLevel] = useState("");
  useEffect(() => {
    cacheSet("alerts", alerts);
  }, [alerts]);

  const watched = useMemo(() => [...new Set(alerts.map((a) => a.sym))], [alerts]);
  const quotes = useQueries({ queries: watched.map((s) => quoteQueryOptions(s)) });
  const priceOf = (s) => quotes[watched.indexOf(s)]?.data?.price ?? null;

  // Evaluate armed alerts whenever quotes refresh (or the alert list changes).
  // Side effects (notifications) stay in the effect body — never inside the
  // setAlerts updater, which React may invoke twice (StrictMode) and must be
  // pure. notifiedRef guards against double-firing across re-runs.
  const notifiedRef = useRef(new Set());
  useEffect(() => {
    const hits = alerts.filter((a) => {
      if (a.triggered) return false;
      const p = priceOf(a.sym);
      return p != null && (a.dir === "above" ? p >= a.level : p <= a.level);
    });
    if (!hits.length) return;
    for (const a of hits) {
      if (notifiedRef.current.has(a.id)) continue;
      notifiedRef.current.add(a.id);
      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        new Notification(`FORECASTER//TERMINAL — ${a.sym}`, {
          body: `crossed ${a.dir} ${fmt(a.level, a.sym)} (now ${fmt(priceOf(a.sym), a.sym)})`,
        });
      }
    }
    const at = new Date().toISOString();
    const hitIds = new Set(hits.map((a) => a.id));
    setAlerts((cur) => cur.map((a) => (hitIds.has(a.id) ? { ...a, triggered: true, triggeredAt: at } : a)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quotes.map((q) => q.dataUpdatedAt).join(","), alerts]);

  const add = (e) => {
    e.preventDefault();
    const lv = Number(level);
    if (!Number.isFinite(lv) || lv <= 0) return;
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission();
    }
    const meta = assetMeta(sym);
    setAlerts((cur) => [
      ...cur,
      { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, sym: meta.sym, dir, level: lv, triggered: false },
    ]);
    setLevel("");
  };

  const inputStyle = {
    fontFamily: mono,
    fontSize: 11,
    padding: "4px 8px",
    borderRadius: 5,
    background: C.panel2,
    border: `1px solid ${C.border}`,
    color: C.text,
    outline: "none",
  };

  return (
    <Panel
      title="Price Alerts"
      right={
        <form onSubmit={add} style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <span style={{ fontFamily: mono, fontSize: 11, color: C.amber }}>{sym}</span>
          <select value={dir} onChange={(e) => setDir(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
            <option value="above">above</option>
            <option value="below">below</option>
          </select>
          <input
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            placeholder="level"
            inputMode="decimal"
            style={{ ...inputStyle, width: 86 }}
          />
          <button
            type="submit"
            style={{ fontFamily: mono, fontSize: 10, letterSpacing: "0.1em", padding: "4px 10px", borderRadius: 5, cursor: "pointer", background: "transparent", border: `1px solid ${C.amber}`, color: C.amber }}
          >
            SET
          </button>
        </form>
      }
    >
      {!alerts.length ? (
        <EmptyState msg="No alerts. Set a level for the active symbol — alerts persist locally, are checked on every quote refresh, and fire a browser notification when crossed." />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 200, overflowY: "auto" }}>
          {alerts.map((a) => {
            const p = priceOf(a.sym);
            return (
              <div
                key={a.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  fontFamily: mono,
                  fontSize: 12,
                  padding: "6px 8px",
                  background: a.triggered ? "#2a2010" : C.panel2,
                  border: `1px solid ${a.triggered ? C.amber : C.border}`,
                  borderRadius: 5,
                }}
              >
                <span style={{ fontWeight: 700, minWidth: 64 }}>{a.sym}</span>
                <span style={{ color: C.muted }}>
                  {a.dir} {fmt(a.level, a.sym)}
                </span>
                <span style={{ color: C.muted }}>now {p != null ? fmt(p, a.sym) : "··"}</span>
                <span style={{ fontSize: 9.5, letterSpacing: "0.1em", color: a.triggered ? C.amber : C.bull }}>
                  {a.triggered ? "TRIGGERED" : "ARMED"}
                </span>
                <button
                  onClick={() => setAlerts((cur) => cur.filter((x) => x.id !== a.id))}
                  style={{ background: "transparent", border: "none", color: C.muted, cursor: "pointer", fontFamily: mono, fontSize: 12, padding: 0 }}
                  title="delete alert"
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>
      )}
    </Panel>
  );
}
