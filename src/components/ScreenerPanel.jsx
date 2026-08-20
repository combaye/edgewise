import { useMemo, useRef, useState } from "react";
import { C, mono } from "../lib/theme";
import { fmt, assetMeta } from "../lib/assets";
import { loadHistory } from "../lib/history";
import { SCREEN_UNIVERSE } from "../lib/screener";
import { Panel, EmptyState } from "./Panel";

const COLS = [
  { key: "sym", label: "SYMBOL", w: "84px", align: "left", sortable: false },
  { key: "last", label: "LAST", w: "1fr", num: true },
  { key: "chg1dPct", label: "1D%", w: "0.8fr", num: true, signed: true },
  { key: "composite", label: "SCORE", w: "0.8fr", num: true, signed: true },
  { key: "pBull", label: "P(BULL)", w: "0.8fr", num: true },
  { key: "seasonRetPct", label: "SEASON", w: "0.9fr", num: true, signed: true },
  { key: "obScore", label: "OB/OS", w: "0.8fr", num: true },
  { key: "techScore", label: "TECH", w: "0.8fr", num: true, signed: true },
];
const GRID = COLS.map((c) => c.w).join(" ");

const cell = { fontFamily: mono, fontSize: 12, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" };
const signColor = (v) => (v == null ? C.muted : v >= 0 ? C.bull : C.bear);

export default function ScreenerPanel({ onSelect }) {
  const [status, setStatus] = useState("idle"); // idle | loading | scanning | done | error
  const [progress, setProgress] = useState({ fetched: 0, scored: 0, total: SCREEN_UNIVERSE.length });
  const [rows, setRows] = useState([]);
  const [errorMsg, setErrorMsg] = useState("");
  const [sortKey, setSortKey] = useState("composite");
  const [sortDir, setSortDir] = useState("desc");
  const workerRef = useRef(null);

  async function run() {
    if (status === "loading" || status === "scanning") return;
    setStatus("loading");
    setErrorMsg("");
    setProgress({ fetched: 0, scored: 0, total: SCREEN_UNIVERSE.length });
    let fetched = 0;
    const settled = await Promise.allSettled(
      SCREEN_UNIVERSE.map(async (s) => {
        const meta = assetMeta(s);
        const data = await loadHistory(meta);
        fetched += 1;
        setProgress((p) => ({ ...p, fetched }));
        return { sym: meta.sym, bars: data.bars };
      })
    );
    const items = settled.filter((r) => r.status === "fulfilled").map((r) => r.value);
    if (!items.length) {
      setStatus("error");
      setErrorMsg("Could not load history for any symbol — try again shortly.");
      return;
    }

    setStatus("scanning");
    workerRef.current?.terminate();
    const w = new Worker(new URL("../workers/screener.worker.js", import.meta.url), { type: "module" });
    workerRef.current = w;
    w.onmessage = (e) => {
      if (e.data.type === "progress") setProgress((p) => ({ ...p, scored: e.data.done, total: e.data.total }));
      else if (e.data.type === "done") {
        setRows(e.data.rows);
        setStatus("done");
        w.terminate();
      }
    };
    w.postMessage({ items });
  }

  const sorted = useMemo(() => {
    const arr = [...rows];
    arr.sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === "string") return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortDir === "asc" ? av - bv : bv - av;
    });
    return arr;
  }, [rows, sortKey, sortDir]);

  const ideas = useMemo(() => {
    if (!rows.length) return null;
    const byComp = [...rows].filter((r) => r.composite != null).sort((a, b) => b.composite - a.composite);
    const bySeason = [...rows].filter((r) => r.seasonRetPct != null).sort((a, b) => b.seasonRetPct - a.seasonRetPct);
    return {
      bull: byComp.slice(0, 3),
      bear: byComp.slice(-3).reverse(),
      seasonal: bySeason.slice(0, 3),
    };
  }, [rows]);

  const setSort = (key) => {
    if (key === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir(key === "sym" ? "asc" : "desc");
    }
  };

  const busy = status === "loading" || status === "scanning";

  return (
    <Panel
      title="Screener — universe scan"
      style={{ marginTop: 14 }}
      right={
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {status === "done" && <span style={{ fontFamily: mono, fontSize: 11, color: C.muted }}>{rows.length} scored</span>}
          <button
            onClick={run}
            disabled={busy}
            style={{
              fontFamily: mono,
              fontSize: 10,
              letterSpacing: "0.1em",
              padding: "4px 12px",
              borderRadius: 5,
              cursor: busy ? "default" : "pointer",
              background: "transparent",
              border: `1px solid ${C.amber}`,
              color: C.amber,
              opacity: busy ? 0.5 : 1,
            }}
          >
            {status === "loading" ? "LOADING…" : status === "scanning" ? "SCANNING…" : rows.length ? "RE-SCAN" : "RUN SCAN"}
          </button>
        </div>
      }
    >
      {status === "idle" && (
        <EmptyState msg={`Scans ${SCREEN_UNIVERSE.length} liquid large caps and ranks each by composite score, pattern bias, current-month seasonality, overbought/oversold, and technicals — the "Rankings / Quantum Screener". Runs in a background worker. Press RUN SCAN.`} />
      )}

      {busy && (
        <div style={{ padding: "14px 4px" }}>
          <div style={{ fontFamily: mono, fontSize: 11, color: C.muted, marginBottom: 8 }}>
            {status === "loading"
              ? `loading history… ${progress.fetched}/${progress.total}`
              : `scoring signals… ${progress.scored}/${progress.total}`}
          </div>
          <div style={{ height: 6, borderRadius: 3, background: C.grid }}>
            <div
              style={{
                height: "100%",
                borderRadius: 3,
                width: `${((status === "loading" ? progress.fetched : progress.scored) / progress.total) * 100}%`,
                background: C.amber,
                transition: "width .2s",
              }}
            />
          </div>
        </div>
      )}

      {status === "error" && <EmptyState msg={errorMsg} />}

      {status === "done" && (
        <>
          {ideas && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
              <IdeaChip label="▲ TOP SETUPS" color={C.bull} items={ideas.bull.map((r) => `${r.sym} +${r.composite}`)} onSelect={onSelect} syms={ideas.bull.map((r) => r.sym)} />
              <IdeaChip label="▼ WEAKEST" color={C.bear} items={ideas.bear.map((r) => `${r.sym} ${r.composite}`)} onSelect={onSelect} syms={ideas.bear.map((r) => r.sym)} />
              <IdeaChip label="☀ SEASONAL TAILWIND" color={C.amber} items={ideas.seasonal.map((r) => `${r.sym} ${r.seasonRetPct >= 0 ? "+" : ""}${r.seasonRetPct}%`)} onSelect={onSelect} syms={ideas.seasonal.map((r) => r.sym)} />
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: GRID, gap: 8, padding: "0 8px 6px", borderBottom: `1px solid ${C.border}` }}>
            {COLS.map((c) => (
              <span
                key={c.key}
                onClick={() => c.sortable !== false && setSort(c.key)}
                style={{
                  fontFamily: mono,
                  fontSize: 10,
                  letterSpacing: "0.08em",
                  color: sortKey === c.key ? C.amber : C.muted,
                  cursor: c.sortable === false ? "default" : "pointer",
                  textAlign: c.num ? "right" : "left",
                  userSelect: "none",
                }}
              >
                {c.label}
                {sortKey === c.key ? (sortDir === "asc" ? " ▲" : " ▼") : ""}
              </span>
            ))}
          </div>

          <div style={{ display: "flex", flexDirection: "column", maxHeight: 360, overflowY: "auto" }}>
            {sorted.map((r) => (
              <div
                key={r.sym}
                onClick={() => onSelect?.(r.sym)}
                style={{ display: "grid", gridTemplateColumns: GRID, gap: 8, alignItems: "center", padding: "6px 8px", cursor: "pointer", borderBottom: `1px solid ${C.border}` }}
              >
                <span style={{ ...cell, fontWeight: 700, color: C.text }}>{r.sym}</span>
                <span style={{ ...cell, textAlign: "right" }}>{fmt(r.last, r.sym)}</span>
                <span style={{ ...cell, textAlign: "right", color: signColor(r.chg1dPct) }}>
                  {r.chg1dPct == null ? "—" : `${r.chg1dPct >= 0 ? "+" : ""}${r.chg1dPct.toFixed(2)}`}
                </span>
                <span style={{ ...cell, textAlign: "right", fontWeight: 700, color: r.composite == null ? C.muted : r.composite >= 20 ? C.bull : r.composite <= -20 ? C.bear : C.text }}>
                  {r.composite == null ? "—" : `${r.composite >= 0 ? "+" : ""}${r.composite}`}
                </span>
                <span style={{ ...cell, textAlign: "right", color: r.pBull == null ? C.muted : r.pBull >= 50 ? C.bull : C.bear }}>
                  {r.pBull == null ? "—" : `${r.pBull}%`}
                </span>
                <span style={{ ...cell, textAlign: "right", color: signColor(r.seasonRetPct) }}>
                  {r.seasonRetPct == null ? "—" : `${r.seasonRetPct >= 0 ? "+" : ""}${r.seasonRetPct}%`}
                </span>
                <span style={{ ...cell, textAlign: "right", color: r.obScore == null ? C.muted : r.obScore >= 65 ? C.bear : r.obScore <= 35 ? C.bull : C.amber }}>
                  {r.obScore == null ? "—" : r.obScore}
                </span>
                <span style={{ ...cell, textAlign: "right", color: r.techScore == null ? C.muted : r.techScore >= 15 ? C.bull : r.techScore <= -15 ? C.bear : C.text }}>
                  {r.techScore == null ? "—" : `${r.techScore >= 0 ? "+" : ""}${r.techScore}`}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </Panel>
  );
}

function IdeaChip({ label, color, items, syms, onSelect }) {
  return (
    <div style={{ flex: "1 1 200px", minWidth: 180, padding: "8px 10px", background: C.panel2, border: `1px solid ${C.border}`, borderRadius: 6 }}>
      <div style={{ fontFamily: mono, fontSize: 10, letterSpacing: "0.1em", color, marginBottom: 5 }}>{label}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {items.map((t, i) => (
          <span
            key={i}
            onClick={() => onSelect?.(syms[i])}
            style={{ fontFamily: mono, fontSize: 11, color: C.text, cursor: "pointer", borderBottom: `1px dotted ${C.border}` }}
          >
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}
