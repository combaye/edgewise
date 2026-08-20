import { useEffect, useRef, useState } from "react";
import {
  ComposedChart, Line, XAxis, YAxis, Tooltip, ReferenceLine, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { C, mono } from "../lib/theme";
import { TIMEFRAMES } from "../lib/resample";
import { Panel, QueryGate, EmptyState } from "./Panel";

// results survive symbol switches within the session
const resultCache = new Map();

const Stat = ({ label, value, color }) => (
  <div style={{ fontFamily: mono, fontSize: 11, padding: "5px 9px", background: C.panel2, border: `1px solid ${C.border}`, borderRadius: 5 }}>
    <span style={{ color: C.muted }}>{label} </span>
    <span style={{ color: color || C.text, fontWeight: 700 }}>{value}</span>
  </div>
);

export default function BacktestPanel({ sym, timeframe, bars, history }) {
  const cacheKey = `${sym}:${timeframe}:${bars?.length ?? 0}`;
  const [run, setRun] = useState(() => resultCache.get(cacheKey) ?? { status: "idle" });
  const workerRef = useRef(null);

  useEffect(() => {
    setRun(resultCache.get(cacheKey) ?? { status: "idle" });
    return () => workerRef.current?.terminate();
  }, [cacheKey]);

  const start = () => {
    if (!bars?.length) return;
    workerRef.current?.terminate();
    const w = new Worker(new URL("../workers/backtest.worker.js", import.meta.url), { type: "module" });
    workerRef.current = w;
    setRun({ status: "running", progress: 0 });
    w.onmessage = (e) => {
      if (e.data.type === "progress") setRun({ status: "running", progress: e.data.progress });
      else if (e.data.type === "done") {
        const next = { status: "done", result: e.data.result };
        resultCache.set(cacheKey, next);
        setRun(next);
        w.terminate();
      } else {
        setRun({ status: "error", message: e.data.message });
        w.terminate();
      }
    };
    const tf = TIMEFRAMES[timeframe].opts;
    // weekly burn-in ~3y of weekly bars
    w.postMessage({ bars, opts: { ...tf, stride: tf.horizon, burnIn: timeframe === "W" ? 156 : 756 } });
  };

  const unit = TIMEFRAMES[timeframe].unit;
  const r = run.status === "done" ? run.result : null;

  return (
    <Panel
      title={`Forecast Backtest — walk-forward, ${TIMEFRAMES[timeframe].label.toLowerCase()}`}
      style={{ marginTop: 14 }}
      right={
        <button
          onClick={start}
          disabled={run.status === "running" || !bars?.length}
          style={{
            fontFamily: mono,
            fontSize: 10,
            letterSpacing: "0.1em",
            padding: "4px 12px",
            borderRadius: 5,
            cursor: run.status === "running" ? "default" : "pointer",
            background: "transparent",
            border: `1px solid ${C.amber}`,
            color: C.amber,
            opacity: run.status === "running" ? 0.5 : 1,
          }}
        >
          {run.status === "running" ? "RUNNING…" : r ? "RE-RUN" : "RUN BACKTEST"}
        </button>
      }
    >
      <QueryGate query={history} loadingLabel="waiting for historical data…">
        {run.status === "idle" && (
          <EmptyState msg={`Replays the pattern engine at every past ${TIMEFRAMES[timeframe].opts.horizon}-${unit.slice(0, -1)} step using only data available at the time (no lookahead), then compares following the signal vs buy & hold. Runs in a background worker — press RUN BACKTEST.`} />
        )}
        {run.status === "running" && (
          <div style={{ padding: "14px 4px" }}>
            <div style={{ fontFamily: mono, fontSize: 11, color: C.muted, marginBottom: 8 }}>
              scanning history without lookahead… {Math.round((run.progress ?? 0) * 100)}%
            </div>
            <div style={{ height: 6, borderRadius: 3, background: C.grid }}>
              <div style={{ height: "100%", borderRadius: 3, width: `${(run.progress ?? 0) * 100}%`, background: C.amber, transition: "width .3s" }} />
            </div>
          </div>
        )}
        {run.status === "error" && <EmptyState msg={`Backtest failed: ${run.message}`} />}
        {r?.insufficient && <EmptyState msg="Insufficient history for a meaningful walk-forward test." />}
        {r && !r.insufficient && (
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.6fr) minmax(220px,1fr)", gap: 16 }}>
            <div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
                <Stat label="signals" value={`${r.nActive}/${r.nEvals}`} />
                <Stat
                  label="hit rate"
                  value={r.hitRate != null ? `${Math.round(r.hitRate * 100)}%` : "—"}
                  color={r.hitRate >= 0.5 ? C.bull : C.bear}
                />
                <Stat
                  label={`avg edge/trade (${TIMEFRAMES[timeframe].opts.horizon} ${unit})`}
                  value={r.avgEdge != null ? `${r.avgEdge >= 0 ? "+" : ""}${(r.avgEdge * 100).toFixed(2)}%` : "—"}
                  color={r.avgEdge >= 0 ? C.bull : C.bear}
                />
                <Stat label="strategy" value={`${r.eqFinal.toFixed(2)}x`} color={r.eqFinal >= r.bhFinal ? C.bull : C.bear} />
                <Stat label="buy & hold" value={`${r.bhFinal.toFixed(2)}x`} />
                <Stat label="Sharpe" value={r.sharpe != null ? r.sharpe.toFixed(2) : "—"} color={r.sharpe >= 1 ? C.bull : r.sharpe < 0 ? C.bear : C.text} />
                <Stat label="Sortino" value={r.sortino != null ? r.sortino.toFixed(2) : "—"} color={r.sortino >= 1 ? C.bull : r.sortino < 0 ? C.bear : C.text} />
                <Stat label="profit factor" value={r.profitFactor != null ? r.profitFactor.toFixed(2) : "—"} color={r.profitFactor >= 1.3 ? C.bull : r.profitFactor < 1 ? C.bear : C.text} />
                <Stat label="max DD" value={`${r.maxDD.toFixed(1)}%`} color={C.bear} />
                <Stat label="cost" value={`${r.costBps}bps`} />
              </div>
              <div style={{ height: 180 }}>
                <ResponsiveContainer>
                  <ComposedChart data={r.curve} margin={{ top: 6, right: 8, bottom: 0, left: 0 }}>
                    <CartesianGrid stroke={C.grid} strokeDasharray="2 6" />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: C.muted, fontSize: 9, fontFamily: mono }}
                      tickFormatter={(d) => d?.slice(0, 7)}
                      minTickGap={48}
                      stroke={C.border}
                    />
                    <YAxis
                      domain={["auto", "auto"]}
                      tick={{ fill: C.muted, fontSize: 10, fontFamily: mono }}
                      tickFormatter={(v) => `${v}x`}
                      stroke={C.border}
                      width={50}
                    />
                    <Tooltip
                      contentStyle={{ background: C.panel2, border: `1px solid ${C.border}`, fontFamily: mono, fontSize: 12 }}
                      formatter={(v, n) => [`${v}x`, n]}
                    />
                    <ReferenceLine y={1} stroke={C.border} />
                    <Line dataKey="eq" stroke={C.amber} dot={false} strokeWidth={1.8} name="pattern strategy" />
                    <Line dataKey="bh" stroke={C.muted} dot={false} strokeWidth={1.2} strokeDasharray="4 4" name="buy & hold" />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div>
              <div style={{ fontFamily: mono, fontSize: 11, color: C.muted, letterSpacing: "0.1em", marginBottom: 6 }}>
                CALIBRATION — P(bull) vs realized
              </div>
              {r.calibration.map((b) => (
                <div
                  key={b.label}
                  style={{ display: "flex", justifyContent: "space-between", fontFamily: mono, fontSize: 12, padding: "6px 8px", background: C.panel2, border: `1px solid ${C.border}`, borderRadius: 5, marginBottom: 4 }}
                >
                  <span style={{ color: C.muted }}>pBull {b.label}</span>
                  <span style={{ color: C.muted }}>n={b.n}</span>
                  <span style={{ color: b.realizedUp == null ? C.muted : b.realizedUp >= 50 ? C.bull : C.bear }}>
                    {b.realizedUp == null ? "—" : `${b.realizedUp}% up`}
                  </span>
                </div>
              ))}
              <div style={{ fontFamily: mono, fontSize: 10, color: C.muted, marginTop: 8, lineHeight: 1.6 }}>
                A calibrated forecaster shows realized up-rates rising with predicted P(bull). Signals fire at ≥{r.threshold}%
                / ≤{100 - r.threshold}%.
              </div>
            </div>
          </div>
        )}
      </QueryGate>
    </Panel>
  );
}
