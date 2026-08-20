import { C, mono } from "../../lib/theme";
import { Panel } from "../Panel";
import { buildImprovementPlan } from "../../lib/behavior";

const TONE = {
  warn: { color: C.bear, glyph: "▲", label: "LEAK" },
  info: { color: C.amber, glyph: "●", label: "NOTE" },
  good: { color: C.bull, glyph: "✓", label: "EDGE" },
};

function InsightCard({ insight }) {
  const t = TONE[insight.severity] || TONE.info;
  return (
    <div
      style={{
        border: `1px solid ${C.border}`,
        borderLeft: `3px solid ${t.color}`,
        borderRadius: 6,
        background: C.panel2,
        padding: "10px 12px",
        marginBottom: 8,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, marginBottom: 4 }}>
        <span style={{ fontFamily: mono, fontSize: 12, color: C.text, fontWeight: 600 }}>
          <span style={{ color: t.color, marginRight: 6 }}>{t.glyph}</span>
          {insight.title}
        </span>
        <span style={{ fontFamily: mono, fontSize: 12, color: t.color, whiteSpace: "nowrap" }}>{insight.metric}</span>
      </div>
      <div style={{ fontFamily: mono, fontSize: 11, color: C.muted, lineHeight: 1.55 }}>{insight.detail}</div>
    </div>
  );
}

export default function BehaviorPanel({ stats, insights }) {
  if (stats.empty) return null;
  const rules = buildImprovementPlan(insights, stats);

  return (
    <Panel
      title="Behavioral patterns"
      style={{ marginBottom: 14 }}
      right={<span style={{ fontFamily: mono, fontSize: 10, color: C.muted }}>{insights.length} detected</span>}
    >
      {insights.length === 0 ? (
        <div style={{ fontFamily: mono, fontSize: 11.5, color: C.muted, lineHeight: 1.6 }}>
          Not enough trades yet to detect reliable patterns. Keep logging — each insight needs a minimum sample so it
          isn't noise.
        </div>
      ) : (
        insights.map((i) => <InsightCard key={i.id} insight={i} />)
      )}

      <div style={{ marginTop: 14, borderTop: `1px solid ${C.border}`, paddingTop: 12 }}>
        <div style={{ fontFamily: mono, fontSize: 10, letterSpacing: "0.14em", color: C.amber, marginBottom: 8 }}>
          YOUR IMPROVEMENT PLAN
        </div>
        {rules.map((r, i) => (
          <div key={i} style={{ display: "flex", gap: 8, marginBottom: 7, fontFamily: mono, fontSize: 11.5, color: C.text, lineHeight: 1.5 }}>
            <span
              style={{
                flexShrink: 0,
                width: 18,
                height: 18,
                borderRadius: 4,
                border: `1px solid ${C.amber}`,
                color: C.amber,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 10,
              }}
            >
              {i + 1}
            </span>
            <span>{r}</span>
          </div>
        ))}
      </div>
    </Panel>
  );
}
