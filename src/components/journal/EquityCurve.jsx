import { useState } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, CartesianGrid } from "recharts";
import { C, mono } from "../../lib/theme";
import { Panel } from "../Panel";
import { money, signed } from "../../lib/journal";

const toggle = (active) => ({
  fontFamily: mono,
  fontSize: 10,
  letterSpacing: "0.08em",
  padding: "3px 10px",
  borderRadius: 6,
  cursor: "pointer",
  background: active ? "#1C2530" : "transparent",
  border: `1px solid ${active ? C.amber : C.border}`,
  color: active ? C.text : C.muted,
});

export default function EquityCurve({ stats }) {
  const [unit, setUnit] = useState("dollar"); // dollar | r
  if (stats.empty) return null;

  const isR = unit === "r";
  const data = stats.equity.map((p, i) => ({ i: i + 1, v: isR ? p.cumR : p.cum, day: p.day, sym: p.sym }));
  const last = data[data.length - 1]?.v ?? 0;
  const up = last >= 0;
  const stroke = up ? C.bull : C.bear;

  return (
    <Panel
      title="Equity curve"
      style={{ marginBottom: 14 }}
      right={
        <div style={{ display: "flex", gap: 6 }}>
          <button style={toggle(!isR)} onClick={() => setUnit("dollar")}>
            $
          </button>
          <button style={toggle(isR)} onClick={() => setUnit("r")}>
            R
          </button>
        </div>
      }
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 8 }}>
        <span style={{ fontFamily: mono, fontSize: 20, fontWeight: 700, color: stroke }}>
          {isR ? `${signed(last, 1)}R` : money(last, 0)}
        </span>
        <span style={{ fontFamily: mono, fontSize: 10.5, color: C.muted }}>cumulative over {data.length} trades</span>
      </div>
      <div style={{ width: "100%", height: 220 }}>
        <ResponsiveContainer>
          <AreaChart data={data} margin={{ top: 4, right: 6, bottom: 0, left: -8 }}>
            <defs>
              <linearGradient id="eqfill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={stroke} stopOpacity={0.35} />
                <stop offset="100%" stopColor={stroke} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={C.grid} strokeDasharray="2 4" vertical={false} />
            <XAxis dataKey="i" tick={{ fill: C.muted, fontSize: 10, fontFamily: mono }} tickLine={false} axisLine={{ stroke: C.border }} />
            <YAxis
              tick={{ fill: C.muted, fontSize: 10, fontFamily: mono }}
              tickLine={false}
              axisLine={false}
              width={52}
              tickFormatter={(v) => (isR ? `${v}R` : `$${Math.round(v / 1000)}k`.replace("$0k", "$0"))}
            />
            <ReferenceLine y={0} stroke={C.border} />
            <Tooltip
              contentStyle={{ background: C.panel2, border: `1px solid ${C.border}`, borderRadius: 6, fontFamily: mono, fontSize: 11 }}
              labelStyle={{ color: C.muted }}
              formatter={(v, _n, p) => [isR ? `${signed(v, 2)}R` : money(v, 0), `#${p.payload.i} ${p.payload.sym}`]}
              labelFormatter={(l) => `trade ${l}`}
            />
            <Area type="monotone" dataKey="v" stroke={stroke} strokeWidth={2} fill="url(#eqfill)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Panel>
  );
}
