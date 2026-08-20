import { useMemo } from "react";
import { C, mono } from "../lib/theme";
import { computeOverbought } from "../lib/overbought";
import { Panel, QueryGate, EmptyState } from "./Panel";

const heatColor = (h) => (h >= 65 ? C.bear : h <= 35 ? C.bull : C.amber);
const zoneColor = (dir) => (dir === "ob" ? C.bear : dir === "os" ? C.bull : C.amber);

export default function OverboughtPanel({ history }) {
  const ob = useMemo(
    () => (history.data?.bars ? computeOverbought(history.data.bars) : null),
    [history.data]
  );

  return (
    <Panel
      title="Overbought / Oversold"
      right={
        ob && (
          <span style={{ fontFamily: mono, fontSize: 11, color: zoneColor(ob.zone.dir) }}>{ob.zone.label}</span>
        )
      }
    >
      <QueryGate query={history} loadingLabel="waiting for historical data…">
        {!ob ? (
          <EmptyState msg="Insufficient data for oscillator readings." />
        ) : (
          <>
            {/* heat meter: green (oversold) → amber → red (overbought) */}
            <div
              style={{
                height: 12,
                borderRadius: 6,
                position: "relative",
                marginBottom: 6,
                background: `linear-gradient(90deg, ${C.bull} 0%, ${C.amber} 50%, ${C.bear} 100%)`,
                opacity: 0.85,
              }}
            >
              <div
                style={{
                  position: "absolute",
                  left: `calc(${ob.score}% - 2px)`,
                  top: -3,
                  bottom: -3,
                  width: 4,
                  borderRadius: 2,
                  background: C.text,
                  boxShadow: "0 0 6px #000",
                }}
                title={`composite ${ob.score.toFixed(0)}`}
              />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontFamily: mono, fontSize: 9, color: C.muted, marginBottom: 12 }}>
              <span>0 OVERSOLD</span>
              <span style={{ color: zoneColor(ob.zone.dir), fontSize: 14, fontWeight: 700 }}>{ob.score.toFixed(0)}</span>
              <span>OVERBOUGHT 100</span>
            </div>

            {ob.components.map((c) => (
              <div key={c.name} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", borderBottom: `1px solid ${C.border}` }}>
                <span style={{ fontFamily: mono, fontSize: 11, color: C.muted, width: 110 }}>{c.name}</span>
                <div style={{ flex: 1, height: 6, borderRadius: 3, background: C.grid, position: "relative" }}>
                  <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${c.heat}%`, borderRadius: 3, background: heatColor(c.heat) }} />
                </div>
                <span style={{ fontFamily: mono, fontSize: 11, color: heatColor(c.heat), width: 48, textAlign: "right" }}>
                  {c.raw != null ? Number(c.raw).toFixed(c.name.includes("%B") ? 2 : c.name.includes("CCI") || c.name.includes("Williams") ? 0 : 1) : "—"}
                </span>
              </div>
            ))}
          </>
        )}
      </QueryGate>
    </Panel>
  );
}
