import { C, mono } from "../lib/theme";
import { Panel } from "./Panel";

const colorFor = (s) => (s >= 20 ? C.bull : s <= -20 ? C.bear : C.amber);

// Full-width strip: ensemble bias gauge (-100..+100) plus the component
// breakdown that produced it.
export default function CompositeGauge({ composite, sym }) {
  return (
    <Panel title={`Composite Forecast — ${sym}`} style={{ marginBottom: 14 }}>
      {!composite ? (
        <div style={{ fontFamily: mono, fontSize: 11.5, color: C.muted }}>
          waiting for at least one analytics engine to report…
        </div>
      ) : (
        <div style={{ display: "flex", gap: 24, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ minWidth: 150 }}>
            <div style={{ fontFamily: mono, fontSize: 26, fontWeight: 700, color: colorFor(composite.score) }}>
              {composite.score >= 0 ? "+" : ""}
              {composite.score.toFixed(0)}
            </div>
            <div style={{ fontFamily: mono, fontSize: 11, letterSpacing: "0.14em", color: colorFor(composite.score) }}>
              {composite.label}
            </div>
          </div>

          <div style={{ flex: "1 1 260px", minWidth: 220 }}>
            <div style={{ height: 10, borderRadius: 5, background: C.grid, position: "relative" }}>
              <div style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: 1, background: C.border }} />
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  bottom: 0,
                  borderRadius: 5,
                  left: composite.score >= 0 ? "50%" : `${50 + composite.score / 2}%`,
                  width: `${Math.abs(composite.score) / 2}%`,
                  background: colorFor(composite.score),
                  opacity: 0.85,
                }}
              />
              <div
                style={{
                  position: "absolute",
                  left: `calc(${50 + composite.score / 2}% - 1px)`,
                  top: -3,
                  bottom: -3,
                  width: 2,
                  background: C.amber,
                }}
              />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontFamily: mono, fontSize: 9, color: C.muted, marginTop: 4 }}>
              <span>-100 BEAR</span>
              <span>0</span>
              <span>BULL +100</span>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {composite.parts.map((p) => (
              <div
                key={p.key}
                title={p.detail}
                style={{
                  fontFamily: mono,
                  fontSize: 10.5,
                  padding: "6px 10px",
                  borderRadius: 6,
                  background: C.panel2,
                  border: `1px solid ${C.border}`,
                }}
              >
                <div style={{ color: C.muted, letterSpacing: "0.1em", marginBottom: 2 }}>
                  {p.key} <span style={{ opacity: 0.6 }}>w{Math.round(p.weight * 100)}%</span>
                </div>
                <div style={{ color: colorFor(p.score), fontWeight: 700 }}>
                  {p.score >= 0 ? "+" : ""}
                  {p.score.toFixed(0)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Panel>
  );
}
