import { useMemo } from "react";
import {
  ComposedChart, Line, Area, XAxis, YAxis, Tooltip, ReferenceLine,
  ResponsiveContainer, CartesianGrid,
} from "recharts";
import { C, mono } from "../lib/theme";
import { fmt } from "../lib/assets";
import { buildProjectionSeries } from "../lib/patternMatch";
import { TIMEFRAMES } from "../lib/resample";
import { Panel, QueryGate, EmptyState } from "./Panel";

function TimeframeToggle({ timeframe, setTimeframe }) {
  return (
    <div style={{ display: "flex", gap: 4 }}>
      {Object.entries(TIMEFRAMES).map(([key, tf]) => (
        <button
          key={key}
          onClick={() => setTimeframe(key)}
          style={{
            fontFamily: mono,
            fontSize: 10,
            letterSpacing: "0.08em",
            padding: "3px 8px",
            borderRadius: 5,
            cursor: "pointer",
            background: timeframe === key ? "#1C2530" : "transparent",
            border: `1px solid ${timeframe === key ? C.amber : C.border}`,
            color: timeframe === key ? C.amber : C.muted,
          }}
        >
          {tf.label}
        </button>
      ))}
    </div>
  );
}

export default function ProjectionChart({ sym, history, bars, analysis, timeframe, setTimeframe }) {
  const series = useMemo(
    () => (bars?.length && analysis && !analysis.insufficient ? buildProjectionSeries(bars, analysis) : null),
    [bars, analysis]
  );

  const tf = TIMEFRAMES[timeframe];
  const ok = analysis && !analysis.insufficient;
  const matchCount = ok ? analysis.matches.length : null;
  const topAnalog = ok ? analysis.matches[0] : null;

  return (
    <Panel
      title={`Pattern Projection — ${tf.opts.lookback}${timeframe.toLowerCase()} lookback / ${tf.opts.horizon}${timeframe.toLowerCase()} horizon`}
      right={
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {topAnalog && (
            <span style={{ fontFamily: mono, fontSize: 11, color: "#7da7c4" }} title="single closest historical analog overlaid on the chart">
              closest: {topAnalog.label} · r={topAnalog.r.toFixed(2)}
            </span>
          )}
          {matchCount != null && (
            <span style={{ fontFamily: mono, fontSize: 11, color: C.muted }}>{matchCount} matches</span>
          )}
          <TimeframeToggle timeframe={timeframe} setTimeframe={setTimeframe} />
        </div>
      }
    >
      <QueryGate query={history} loadingLabel="fetching 10y of daily history… (rate-limited — first load can take a moment)">
        {!series ? (
          <EmptyState msg="Insufficient data — not enough history to run the pattern matcher on this timeframe." />
        ) : (
          <div style={{ height: 320 }}>
            <ResponsiveContainer>
              <ComposedChart data={series} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid stroke={C.grid} strokeDasharray="2 6" />
                <XAxis
                  dataKey="t"
                  tick={{ fill: C.muted, fontSize: 10, fontFamily: mono }}
                  tickFormatter={(t) => (t === 0 ? "today" : t > 0 ? `+${t}` : t)}
                  stroke={C.border}
                />
                <YAxis
                  domain={["auto", "auto"]}
                  tick={{ fill: C.muted, fontSize: 10, fontFamily: mono }}
                  tickFormatter={(v) => fmt(v, sym)}
                  stroke={C.border}
                  width={70}
                />
                <Tooltip
                  contentStyle={{ background: C.panel2, border: `1px solid ${C.border}`, fontFamily: mono, fontSize: 12 }}
                  labelFormatter={(t) => (t === 0 ? "today" : `${t > 0 ? "+" : ""}${t} ${tf.unit}`)}
                  formatter={(v, n) => (Array.isArray(v) ? null : [fmt(v, sym), n])}
                />
                <ReferenceLine x={0} stroke={C.amber} strokeDasharray="4 4" />
                <Area dataKey="band" stroke="none" fill={C.amber} fillOpacity={0.1} />
                <Line dataKey="analog" stroke="#7da7c4" dot={false} strokeWidth={1.2} strokeDasharray="2 3" name="closest analog" connectNulls />
                <Line dataKey="price" stroke={C.text} dot={false} strokeWidth={1.8} name="price" />
                <Line dataKey="bull" stroke={C.bull} dot={false} strokeWidth={1.6} strokeDasharray="5 4" name="bullish path" />
                <Line dataKey="bear" stroke={C.bear} dot={false} strokeWidth={1.6} strokeDasharray="5 4" name="bearish path" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </QueryGate>
    </Panel>
  );
}
