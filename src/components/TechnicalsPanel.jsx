import { useMemo } from "react";
import { C, mono } from "../lib/theme";
import { computeTechnicals } from "../lib/technicals";
import { Panel, QueryGate, EmptyState } from "./Panel";

const SIG = {
  1: { label: "BULL", color: C.bull },
  0: { label: "NEUT", color: C.muted },
  "-1": { label: "BEAR", color: C.bear },
};

export default function TechnicalsPanel({ history, tech }) {
  const t = tech ?? null;

  return (
    <Panel
      title="Technicals"
      right={
        t && (
          <span style={{ fontFamily: mono, fontSize: 11, color: t.score >= 0.15 ? C.bull : t.score <= -0.15 ? C.bear : C.muted }}>
            {t.summary}
          </span>
        )
      }
    >
      <QueryGate query={history} loadingLabel="waiting for historical data…">
        {!t ? (
          <EmptyState msg="Insufficient data — technical indicators need ~1 year of history." />
        ) : (
          <>
            {t.rows.map((r) => {
              const s = SIG[r.signal];
              return (
                <div
                  key={r.name}
                  style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontFamily: mono, fontSize: 12, padding: "6px 0", borderBottom: `1px solid ${C.border}` }}
                >
                  <span style={{ color: C.muted, flex: 1 }}>{r.name}</span>
                  <span style={{ flex: 1, textAlign: "right", paddingRight: 12 }}>{r.value}</span>
                  <span
                    style={{
                      fontSize: 9.5,
                      letterSpacing: "0.1em",
                      padding: "2px 7px",
                      borderRadius: 4,
                      border: `1px solid ${s.color}66`,
                      color: s.color,
                      minWidth: 42,
                      textAlign: "center",
                    }}
                  >
                    {s.label}
                  </span>
                </div>
              );
            })}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", paddingTop: 12 }}>
              <span style={{ fontFamily: mono, fontSize: 11, color: C.amber, letterSpacing: "0.12em" }}>TECH SCORE</span>
              <span style={{ fontFamily: mono, fontSize: 18, fontWeight: 700, color: t.score >= 0.15 ? C.bull : t.score <= -0.15 ? C.bear : C.text }}>
                {t.score >= 0 ? "+" : ""}
                {(t.score * 100).toFixed(0)}
              </span>
            </div>
          </>
        )}
      </QueryGate>
    </Panel>
  );
}
