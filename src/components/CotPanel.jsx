import {
  ComposedChart, Line, XAxis, YAxis, Tooltip, ReferenceLine, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { C, mono } from "../lib/theme";
import { cotSupported } from "../lib/cot";
import { useCot } from "../hooks/useCot";
import { Panel, EmptyState, ErrorState, Loading } from "./Panel";

const fmtK = (v) => `${v >= 0 ? "" : "-"}${Math.abs(v) >= 1000 ? `${(Math.abs(v) / 1000).toFixed(0)}k` : Math.abs(v)}`;

export default function CotPanel({ sym }) {
  const cot = useCot(sym);

  const body = () => {
    if (!cotSupported(sym)) {
      return <EmptyState msg="No CFTC futures positioning exists for this asset (single equities are not COT markets). Supported: SPX, XAUUSD, EURUSD, BTCUSD and other major futures." />;
    }
    if (cot.isPending) return <Loading label="fetching CFTC commitment of traders…" />;
    if (cot.isError) return <ErrorState error={cot.error} onRetry={() => cot.refetch()} />;
    const d = cot.data;
    const stretched = d.pctile3y >= 85 || d.pctile3y <= 15;
    return (
      <>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10, fontFamily: mono, fontSize: 11 }}>
          {[
            ["net spec", fmtK(d.current), d.current >= 0 ? C.bull : C.bear],
            ["wk Δ", `${d.weeklyChange >= 0 ? "+" : ""}${fmtK(d.weeklyChange)}`, d.weeklyChange >= 0 ? C.bull : C.bear],
            ["3y pctile", `${d.pctile3y}%`, stretched ? C.amber : C.text],
            ["net %OI", d.netPctOi != null ? `${d.netPctOi}%` : "—", C.text],
          ].map(([label, value, color]) => (
            <div key={label} style={{ padding: "5px 9px", background: C.panel2, border: `1px solid ${C.border}`, borderRadius: 5 }}>
              <span style={{ color: C.muted }}>{label} </span>
              <span style={{ color, fontWeight: 700 }}>{value}</span>
            </div>
          ))}
        </div>
        <div style={{ height: 170 }}>
          <ResponsiveContainer>
            <ComposedChart data={d.rows} margin={{ top: 6, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid stroke={C.grid} strokeDasharray="2 6" />
              <XAxis
                dataKey="date"
                tick={{ fill: C.muted, fontSize: 9, fontFamily: mono }}
                tickFormatter={(dt) => dt?.slice(0, 7)}
                minTickGap={42}
                stroke={C.border}
              />
              <YAxis
                tick={{ fill: C.muted, fontSize: 10, fontFamily: mono }}
                tickFormatter={fmtK}
                stroke={C.border}
                width={54}
              />
              <Tooltip
                contentStyle={{ background: C.panel2, border: `1px solid ${C.border}`, fontFamily: mono, fontSize: 12 }}
                formatter={(v, n) => [Number(v).toLocaleString("en-US"), n]}
              />
              <ReferenceLine y={0} stroke={C.border} />
              <Line dataKey="net" stroke={C.amber} dot={false} strokeWidth={1.6} name="net non-commercial" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <div style={{ fontFamily: mono, fontSize: 10, color: C.muted, marginTop: 8 }}>
          {d.market} · weekly CFTC legacy report{stretched ? " · positioning stretched — crowd-reversal risk" : ""}
        </div>
      </>
    );
  };

  return <Panel title="Smart Money — COT Positioning">{body()}</Panel>;
}
