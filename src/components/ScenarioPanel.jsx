import { C, mono } from "../lib/theme";
import { Panel, Pip, QueryGate, EmptyState } from "./Panel";

const pct = (v, digits = 1) => (v == null ? "—" : `${(v * 100).toFixed(digits)}%`);

const gradeColor = { bull: C.bull, amber: C.amber, muted: C.muted };

export default function ScenarioPanel({ history, analysis, significance }) {
  const a = analysis && !analysis.insufficient ? analysis : null;

  return (
    <Panel title="Scenario Probabilities">
      <QueryGate query={history} loadingLabel="waiting for historical data…">
        {!a ? (
          <EmptyState msg="Insufficient data — pattern statistics unavailable for this symbol." />
        ) : (
          <>
            <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
              <div style={{ flex: Math.max(a.pBull, 12), background: "#12281f", border: `1px solid ${C.bull}55`, borderRadius: 6, padding: "8px 10px" }}>
                <div style={{ fontFamily: mono, fontSize: 20, fontWeight: 700, color: C.bull }}>{a.pBull}%</div>
                <div style={{ fontSize: 11, color: C.muted }}>bullish · med {pct(a.upMed)}</div>
              </div>
              <div style={{ flex: Math.max(100 - a.pBull, 12), background: "#2a1717", border: `1px solid ${C.bear}55`, borderRadius: 6, padding: "8px 10px" }}>
                <div style={{ fontFamily: mono, fontSize: 20, fontWeight: 700, color: C.bear }}>{100 - a.pBull}%</div>
                <div style={{ fontSize: 11, color: C.muted }}>bearish · med {pct(a.dnMed)}</div>
              </div>
            </div>

            <div
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}
              title={a.robustnessCriteria.map((c) => `${c.pass ? "✓" : "✗"} ${c.label}`).join("\n")}
            >
              <span style={{ fontFamily: mono, fontSize: 11, color: C.muted, letterSpacing: "0.1em" }}>ROBUSTNESS</span>
              <span>
                {[1, 2, 3, 4, 5].map((i) => (
                  <Pip key={i} on={i <= a.robustness} />
                ))}
                <span style={{ fontFamily: mono, fontSize: 12, marginLeft: 4 }}>{a.robustness}/5</span>
              </span>
            </div>

            {significance && (
              <div
                style={{ marginBottom: 12, padding: "8px 10px", background: C.panel2, border: `1px solid ${C.border}`, borderRadius: 6 }}
                title={`Permutation test (${significance.nMatches} analogs vs random window selection). p = probability random picks are this directional. Lower = stronger edge.`}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontFamily: mono, fontSize: 11, color: C.muted, letterSpacing: "0.1em" }}>FORECAST EDGE</span>
                  <span style={{ fontFamily: mono, fontSize: 12 }}>
                    <span style={{ color: gradeColor[significance.grade.color], fontWeight: 700 }}>{significance.grade.label}</span>
                    <span style={{ color: C.muted }}> · {significance.grade.desc} · p={significance.pValue.toFixed(3)}</span>
                  </span>
                </div>
                <div style={{ fontFamily: mono, fontSize: 10.5, color: C.muted, marginTop: 4 }}>
                  {a.horizon}-session move · 90% CI{" "}
                  <span style={{ color: C.text }}>
                    [{significance.ci.loPct >= 0 ? "+" : ""}{significance.ci.loPct}%, {significance.ci.hiPct >= 0 ? "+" : ""}{significance.ci.hiPct}%]
                  </span>
                </div>
              </div>
            )}

            <div style={{ fontFamily: mono, fontSize: 11, color: C.muted, letterSpacing: "0.1em", marginBottom: 6 }}>
              TOP MATCHES · avg r={a.avgCorr.toFixed(2)}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 190, overflowY: "auto" }}>
              {a.matches.map((m, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontFamily: mono,
                    fontSize: 12,
                    padding: "5px 8px",
                    background: C.panel2,
                    border: `1px solid ${C.border}`,
                    borderRadius: 5,
                  }}
                >
                  <span style={{ color: C.muted }}>{m.label}</span>
                  <span>r={m.r.toFixed(2)}</span>
                  <span style={{ color: m.fwd >= 0 ? C.bull : C.bear }}>
                    {m.fwd >= 0 ? "+" : ""}
                    {(m.fwd * 100).toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </QueryGate>
    </Panel>
  );
}
