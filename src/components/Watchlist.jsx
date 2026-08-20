import { useMemo, useState } from "react";
import { C, mono } from "../lib/theme";
import { fmt, assetMeta, isEquity, MONTHS } from "../lib/assets";
import { useQuote } from "../hooks/useQuote";
import { useHistorical } from "../hooks/useHistorical";
import { useFundamentals } from "../hooks/useFundamentals";
import { cachedAnalyzePattern, cachedSeasonality, cachedTechnicals } from "../lib/analysisCache";
import { TIMEFRAMES } from "../lib/resample";
import { computeFairValue } from "../lib/fairValue";
import { compositeScore } from "../lib/composite";
import { Panel } from "./Panel";

const COLS = "110px 1fr 0.8fr 1fr 1fr 0.9fr 0.9fr 56px";
const curMonth = () => new Date().getMonth();

const cell = { fontFamily: mono, fontSize: 12, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" };
const Pending = () => (
  <span className="live-pulse" style={{ ...cell, color: C.muted }}>
    ··
  </span>
);

function WatchRow({ sym, active, onSelect, onRemove }) {
  const meta = assetMeta(sym);
  const quote = useQuote(sym);
  const history = useHistorical(sym);
  const stats = useFundamentals(sym);

  // cached* dedupe with App's analyses for the active symbol and across
  // remounts; passing TIMEFRAMES.D.opts (== the defaults) shares the cache key.
  const bars = history.data?.bars ?? null;
  const analysis = useMemo(() => cachedAnalyzePattern(bars, TIMEFRAMES.D.opts), [bars]);
  const season = useMemo(() => cachedSeasonality(bars), [bars]);
  const tech = useMemo(() => cachedTechnicals(bars), [bars]);
  const fv = useMemo(
    () => (stats.data && quote.data ? computeFairValue(stats.data, quote.data.price) : null),
    [stats.data, quote.data]
  );
  const composite = useMemo(
    () => compositeScore({ analysis, season, tech, fvUpside: fv?.upsidePct ?? null }),
    [analysis, season, tech, fv]
  );

  const chg = quote.data?.changePct;
  const bias = analysis && !analysis.insufficient ? analysis : null;
  const bull = bias ? bias.pBull >= 50 : null;
  const monthRet = season ? season[curMonth()].ret : null;
  const hasError = quote.isError || history.isError;
  const errMsg = quote.error?.message || history.error?.message;

  return (
    <div
      onClick={onSelect}
      title={errMsg}
      style={{
        display: "grid",
        gridTemplateColumns: COLS,
        gap: 8,
        alignItems: "center",
        padding: "7px 10px",
        borderRadius: 6,
        cursor: "pointer",
        background: active ? "#1C2530" : "transparent",
        border: `1px solid ${active ? C.amber : "transparent"}`,
        borderBottom: `1px solid ${active ? C.amber : C.border}`,
      }}
    >
      <span style={{ ...cell, fontWeight: 700, color: active ? C.amber : C.text }}>
        {sym} <span style={{ fontWeight: 400, fontSize: 10, color: C.muted }}>{meta.type}</span>
      </span>

      {quote.isError ? (
        <span style={{ ...cell, color: C.bear }}>⚠ err</span>
      ) : quote.data ? (
        <span style={cell}>{fmt(quote.data.price, sym)}</span>
      ) : (
        <Pending />
      )}

      {chg != null ? (
        <span style={{ ...cell, color: chg >= 0 ? C.bull : C.bear }}>
          {chg >= 0 ? "▲" : "▼"}
          {Math.abs(chg).toFixed(2)}%
        </span>
      ) : quote.isError ? (
        <span style={{ ...cell, color: C.muted }}>—</span>
      ) : (
        <Pending />
      )}

      {history.isError ? (
        <span style={{ ...cell, color: C.muted }}>—</span>
      ) : bias ? (
        <span style={{ ...cell, color: bull ? C.bull : C.bear }}>
          {bull ? "▲" : "▼"} {bull ? bias.pBull : 100 - bias.pBull}% {bull ? "bull" : "bear"}
        </span>
      ) : history.data ? (
        <span style={{ ...cell, color: C.muted }}>insuff.</span>
      ) : (
        <Pending />
      )}

      {history.isError ? (
        <span style={{ ...cell, color: C.muted }}>—</span>
      ) : monthRet != null ? (
        <span style={{ ...cell, color: monthRet >= 0 ? C.bull : C.bear }}>
          {monthRet >= 0 ? "+" : ""}
          {monthRet.toFixed(2)}%
        </span>
      ) : history.data ? (
        <span style={{ ...cell, color: C.muted }}>—</span>
      ) : (
        <Pending />
      )}

      {!isEquity(meta) ? (
        <span style={{ ...cell, color: C.muted }}>n/a</span>
      ) : stats.isError ? (
        <span style={{ ...cell, color: C.muted }} title={stats.error?.message}>
          —
        </span>
      ) : fv?.upsidePct != null ? (
        <span style={{ ...cell, color: fv.upsidePct >= 0 ? C.bull : C.bear }}>
          {fv.upsidePct >= 0 ? "+" : ""}
          {fv.upsidePct.toFixed(1)}%
        </span>
      ) : stats.data ? (
        <span style={{ ...cell, color: C.muted }}>—</span>
      ) : (
        <Pending />
      )}

      {composite ? (
        <span
          title={composite.parts.map((p) => `${p.key} ${p.score >= 0 ? "+" : ""}${p.score.toFixed(0)}`).join(" · ")}
          style={{
            ...cell,
            fontWeight: 700,
            color: composite.score >= 20 ? C.bull : composite.score <= -20 ? C.bear : C.text,
          }}
        >
          {composite.score >= 0 ? "+" : ""}
          {composite.score.toFixed(0)}
        </span>
      ) : history.isError ? (
        <span style={{ ...cell, color: C.muted }}>—</span>
      ) : (
        <Pending />
      )}

      <span style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
        {hasError && (
          <button
            title="retry"
            onClick={(e) => {
              e.stopPropagation();
              if (quote.isError) quote.refetch();
              if (history.isError) history.refetch();
            }}
            style={{ fontFamily: mono, fontSize: 12, background: "transparent", border: "none", color: C.amber, cursor: "pointer", padding: 0 }}
          >
            ↻
          </button>
        )}
        <button
          title="remove from watchlist"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          style={{ fontFamily: mono, fontSize: 12, background: "transparent", border: "none", color: C.muted, cursor: "pointer", padding: 0 }}
        >
          ×
        </button>
      </span>
    </div>
  );
}

export default function Watchlist({ symbols, sym, setSym, onAdd, onRemove }) {
  const [input, setInput] = useState("");
  const submit = (e) => {
    e.preventDefault();
    const s = input.trim().toUpperCase();
    if (s) {
      onAdd(s);
      setInput("");
    }
  };

  return (
    <Panel
      title="Watchlist / Screener"
      style={{ marginTop: 14 }}
      right={
        <form onSubmit={submit} style={{ display: "flex", gap: 6 }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="add ticker · e.g. MSFT, GBPUSD"
            spellCheck={false}
            style={{
              fontFamily: mono,
              fontSize: 11,
              padding: "4px 8px",
              borderRadius: 5,
              background: C.panel2,
              border: `1px solid ${C.border}`,
              color: C.text,
              outline: "none",
              width: 180,
            }}
          />
          <button
            type="submit"
            style={{
              fontFamily: mono,
              fontSize: 10,
              letterSpacing: "0.1em",
              padding: "4px 10px",
              borderRadius: 5,
              cursor: "pointer",
              background: "transparent",
              border: `1px solid ${C.amber}`,
              color: C.amber,
            }}
          >
            ADD
          </button>
        </form>
      }
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: COLS,
          gap: 8,
          padding: "0 10px 7px",
          fontFamily: mono,
          fontSize: 10,
          letterSpacing: "0.1em",
          color: C.muted,
        }}
      >
        <span>SYMBOL</span>
        <span>PRICE</span>
        <span>1D</span>
        <span>PATTERN BIAS</span>
        <span>SEASON ({MONTHS[curMonth()]})</span>
        <span>FV GAP</span>
        <span>SCORE</span>
        <span />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {symbols.map((s) => (
          <WatchRow key={s} sym={s} active={s === sym} onSelect={() => setSym(s)} onRemove={() => onRemove(s)} />
        ))}
      </div>
    </Panel>
  );
}
