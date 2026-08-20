import { useMemo } from "react";
import {
  ComposedChart, Line, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { C, mono } from "../lib/theme";
import { fmt } from "../lib/assets";
import { monteCarlo } from "../lib/montecarlo";
import { Panel, QueryGate, EmptyState } from "./Panel";

const Stat = ({ label, value, color }) => (
  <div style={{ fontFamily: mono, fontSize: 11, padding: "5px 8px", background: C.panel2, border: `1px solid ${C.border}`, borderRadius: 5 }}>
    <span style={{ color: C.muted }}>{label} </span>
    <span style={{ color: color || C.text, fontWeight: 700 }}>{value}</span>
  </div>
);

export default function MonteCarloPanel({ sym, history }) {
  const mc = useMemo(() => {
    if (!history.data?.bars) return null;
    const bars = history.data.bars;
    return monteCarlo(bars, { seed: `${sym}:${bars[bars.length - 1].date}` });
  }, [history.data, sym]);

  return (
    <Panel
      title="Monte Carlo — 21d horizon"
      right={<span style={{ fontFamily: mono, fontSize: 11, color: C.muted }}>2,000 block-bootstrap paths</span>}
    >
      <QueryGate query={history} loadingLabel="waiting for historical data…">
        {!mc ? (
          <EmptyState msg="Insufficient data — need at least a year of history to bootstrap returns." />
        ) : (
          <>
            <div style={{ height: 190 }}>
              <ResponsiveContainer>
                <ComposedChart data={mc.rows} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                  <CartesianGrid stroke={C.grid} strokeDasharray="2 6" />
                  <XAxis
                    dataKey="t"
                    tick={{ fill: C.muted, fontSize: 10, fontFamily: mono }}
                    tickFormatter={(t) => (t === 0 ? "today" : `+${t}`)}
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
                    labelFormatter={(t) => (t === 0 ? "today" : `+${t} sessions`)}
                    formatter={(v, n) => (Array.isArray(v) ? null : [fmt(v, sym), n])}
                  />
                  <Area dataKey="band95" stroke="none" fill={C.amber} fillOpacity={0.07} name="5–95%" />
                  <Area dataKey="band50" stroke="none" fill={C.amber} fillOpacity={0.16} name="25–75%" />
                  <Line dataKey="p50" stroke={C.amber} dot={false} strokeWidth={1.6} strokeDasharray="5 4" name="median" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
              <Stat label="P(up)" value={`${Math.round(mc.stats.pUp * 100)}%`} color={mc.stats.pUp >= 0.5 ? C.bull : C.bear} />
              <Stat label="median" value={fmt(mc.stats.median, sym)} />
              <Stat label="VaR95" value={`${(mc.stats.var95 * 100).toFixed(1)}%`} color={C.bear} />
              <Stat label="CVaR95" value={`${(mc.stats.cvar95 * 100).toFixed(1)}%`} color={C.bear} />
              <Stat label="P(>+5%)" value={`${Math.round(mc.stats.probUp5 * 100)}%`} color={C.bull} />
              <Stat label="P(<-5%)" value={`${Math.round(mc.stats.probDn5 * 100)}%`} color={C.bear} />
            </div>
          </>
        )}
      </QueryGate>
    </Panel>
  );
}
