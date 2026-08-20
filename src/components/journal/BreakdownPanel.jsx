import { useState } from "react";
import { C, mono } from "../../lib/theme";
import { Panel } from "../Panel";
import { money, pct, signed } from "../../lib/journal";

const tabBtn = (active) => ({
  fontFamily: mono,
  fontSize: 10,
  letterSpacing: "0.06em",
  padding: "3px 9px",
  borderRadius: 6,
  cursor: "pointer",
  background: active ? "#1C2530" : "transparent",
  border: `1px solid ${active ? C.amber : C.border}`,
  color: active ? C.text : C.muted,
  textTransform: "capitalize",
});

function Row({ r, maxAbs }) {
  const w = maxAbs > 0 ? Math.min(100, (Math.abs(r.net) / maxAbs) * 100) : 0;
  const pos = r.net >= 0;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(70px,1.1fr) 2fr minmax(64px,auto)", gap: 10, alignItems: "center", marginBottom: 7 }}>
      <span style={{ fontFamily: mono, fontSize: 11.5, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {r.key}
        <span style={{ color: C.muted }}> ·{r.n}</span>
      </span>
      <div style={{ position: "relative", height: 16, background: C.panel2, borderRadius: 4, overflow: "hidden" }}>
        <div
          style={{
            position: "absolute",
            left: pos ? "50%" : `${50 - w / 2}%`,
            width: `${w / 2}%`,
            top: 0,
            bottom: 0,
            background: pos ? C.bull : C.bear,
            opacity: 0.8,
          }}
        />
        <div style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: 1, background: C.border }} />
      </div>
      <span style={{ fontFamily: mono, fontSize: 11, color: pos ? C.bull : C.bear, textAlign: "right" }}>
        {money(r.net, 0)}
        <span style={{ color: C.muted }}> {r.expectancyR != null ? `${signed(r.expectancyR, 1)}R` : pct(r.winRate)}</span>
      </span>
    </div>
  );
}

export default function BreakdownPanel({ stats }) {
  const [tab, setTab] = useState("setup");
  if (stats.empty) return null;
  const groups = stats.breakdowns;
  const keys = Object.keys(groups);
  const active = groups[tab];
  const maxAbs = Math.max(1, ...active.rows.map((r) => Math.abs(r.net)));

  return (
    <Panel
      title="Performance breakdown"
      style={{ marginBottom: 14 }}
      right={
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
          {keys.map((k) => (
            <button key={k} style={tabBtn(k === tab)} onClick={() => setTab(k)}>
              {k}
            </button>
          ))}
        </div>
      }
    >
      {active.rows.length === 0 ? (
        <div style={{ fontFamily: mono, fontSize: 11, color: C.muted }}>No data for this breakdown yet.</div>
      ) : (
        active.rows.map((r) => <Row key={r.key} r={r} maxAbs={maxAbs} />)
      )}
    </Panel>
  );
}
