import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import {
  ScatterChart, Scatter, XAxis, YAxis, ZAxis, ReferenceLine, ReferenceArea,
  Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { C, mono } from "../lib/theme";
import { historicalQueryOptions } from "../hooks/useHistorical";
import { SECTOR_ETFS } from "../lib/catalog";
import { computeSectorMap } from "../lib/sectorMap";
import { Panel, EmptyState, Loading } from "./Panel";

const BENCH = "SPY";
const quadColor = { leading: C.bull, weakening: C.amber, lagging: C.bear, improving: "#5fb8d8" };

export default function SectorMapPanel({ onSelect }) {
  const symbols = useMemo(() => [BENCH, ...SECTOR_ETFS], []);
  const queries = useQueries({ queries: symbols.map((s) => historicalQueryOptions(s)) });
  const dataSig = queries.map((q) => q.dataUpdatedAt || 0).join("|");

  const map = useMemo(() => {
    const benchBars = queries[0].data?.bars;
    if (!benchBars) return null;
    const sectorSeries = [];
    SECTOR_ETFS.forEach((s, i) => {
      const bars = queries[i + 1].data?.bars;
      if (bars) sectorSeries.push({ sym: s, bars });
    });
    return computeSectorMap(sectorSeries, benchBars);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataSig]);

  const anyLoading = queries.some((q) => q.isPending && q.fetchStatus !== "idle");
  const errored = queries.filter((q) => q.isError).length;

  const bound = map ? Math.max(1, ...map.points.flatMap((p) => [Math.abs(p.x), Math.abs(p.y)])) * 1.25 : 1;

  const Dot = (props) => {
    const { cx, cy, payload } = props;
    if (cx == null || cy == null) return null;
    return (
      <g style={{ cursor: "pointer" }} onClick={() => onSelect?.(payload.sym)}>
        <circle cx={cx} cy={cy} r={4.5} fill={quadColor[payload.quadrant]} stroke={C.bg} strokeWidth={1} />
        <text x={cx + 7} y={cy + 3.5} fontFamily={mono} fontSize={10} fontWeight={700} fill={C.text}>
          {payload.sym}
        </text>
      </g>
    );
  };

  return (
    <Panel
      title="Sector Map — rotation vs S&P 500"
      style={{ marginTop: 14 }}
      right={
        map && (
          <span style={{ fontFamily: mono, fontSize: 11, letterSpacing: "0.08em", color: phaseColor(map) }}>
            {map.phase}
          </span>
        )
      }
    >
      {!map ? (
        anyLoading ? (
          <Loading label={`aligning 11 sector ETFs vs ${BENCH}… (first load is rate-limited)`} />
        ) : (
          <EmptyState
            msg={
              errored
                ? `Sector data unavailable (${errored} symbols failed). Retry shortly — the free tier is rate-limited.`
                : "Insufficient data to build the sector map."
            }
          />
        )
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.7fr) minmax(180px,1fr)", gap: 16 }}>
          <div style={{ height: 340 }}>
            <ResponsiveContainer>
              <ScatterChart margin={{ top: 10, right: 16, bottom: 18, left: 0 }}>
                <CartesianGrid stroke={C.grid} strokeDasharray="2 6" />
                {/* quadrant tints */}
                <ReferenceArea x1={0} x2={bound} y1={0} y2={bound} fill={C.bull} fillOpacity={0.05} />
                <ReferenceArea x1={0} x2={bound} y1={-bound} y2={0} fill={C.amber} fillOpacity={0.05} />
                <ReferenceArea x1={-bound} x2={0} y1={-bound} y2={0} fill={C.bear} fillOpacity={0.05} />
                <ReferenceArea x1={-bound} x2={0} y1={0} y2={bound} fill="#5fb8d8" fillOpacity={0.05} />
                <ReferenceLine x={0} stroke={C.border} />
                <ReferenceLine y={0} stroke={C.border} />
                <XAxis
                  type="number"
                  dataKey="x"
                  domain={[-bound, bound]}
                  tick={{ fill: C.muted, fontSize: 9, fontFamily: mono }}
                  stroke={C.border}
                  tickFormatter={(v) => v.toFixed(1)}
                  label={{ value: "RS-RATIO  (weak ◄ ► strong)", position: "bottom", offset: 4, fill: C.muted, fontSize: 9, fontFamily: mono }}
                />
                <YAxis
                  type="number"
                  dataKey="y"
                  domain={[-bound, bound]}
                  tick={{ fill: C.muted, fontSize: 9, fontFamily: mono }}
                  stroke={C.border}
                  width={34}
                  tickFormatter={(v) => v.toFixed(1)}
                  label={{ value: "MOMENTUM", angle: -90, position: "insideLeft", fill: C.muted, fontSize: 9, fontFamily: mono }}
                />
                <ZAxis range={[60, 60]} />
                <Tooltip
                  cursor={{ strokeDasharray: "3 3", stroke: C.border }}
                  contentStyle={{ background: C.panel2, border: `1px solid ${C.border}`, fontFamily: mono, fontSize: 12 }}
                  formatter={(v, n) => [Number(v).toFixed(2), n === "x" ? "RS-Ratio" : "Momentum"]}
                  labelFormatter={() => ""}
                />
                <Scatter data={map.points} shape={<Dot />} isAnimationActive={false} />
              </ScatterChart>
            </ResponsiveContainer>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div>
              <div style={{ fontFamily: mono, fontSize: 11, letterSpacing: "0.12em", color: phaseColor(map), marginBottom: 4 }}>
                {map.phase}
              </div>
              <div style={{ fontFamily: mono, fontSize: 10.5, color: C.muted, lineHeight: 1.6 }}>{map.detail}</div>
            </div>
            <Legend />
            <div style={{ fontFamily: mono, fontSize: 11 }}>
              <div style={{ color: C.bull }}>▲ leaders: {map.leaders.join(" · ")}</div>
              <div style={{ color: C.bear, marginTop: 3 }}>▼ laggards: {map.laggards.join(" · ")}</div>
            </div>
            <div style={{ fontFamily: mono, fontSize: 9.5, color: C.muted, lineHeight: 1.6 }}>
              Click any sector to load it. Quadrants: leading (strong+rising), weakening (strong+falling), lagging
              (weak+falling), improving (weak+rising).
            </div>
          </div>
        </div>
      )}
    </Panel>
  );
}

function phaseColor(map) {
  if (map.phase.includes("RECOVERY") || map.phase.includes("EARLY")) return C.bull;
  if (map.phase.includes("CONTRACTION")) return C.bear;
  if (map.phase.includes("LATE")) return C.amber;
  return C.text;
}

function Legend() {
  const items = [
    ["leading", "Leading"],
    ["weakening", "Weakening"],
    ["improving", "Improving"],
    ["lagging", "Lagging"],
  ];
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {items.map(([k, label]) => (
        <span key={k} style={{ display: "flex", alignItems: "center", gap: 4, fontFamily: mono, fontSize: 10, color: C.muted }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: quadColor[k] }} />
          {label}
        </span>
      ))}
    </div>
  );
}
