import { C, mono } from "../lib/theme";
import { fmt } from "../lib/assets";
import { Panel } from "./Panel";

const dirColor = { LONG: C.bull, SHORT: C.bear, NEUTRAL: C.amber };
const qualityColor = { favorable: C.bull, fair: C.amber, poor: C.bear, "n/a": C.muted };

const Leg = ({ label, value, sub, color }) => (
  <div style={{ flex: 1, minWidth: 110, padding: "8px 10px", background: C.panel2, border: `1px solid ${C.border}`, borderRadius: 6 }}>
    <div style={{ fontFamily: mono, fontSize: 10, color: C.muted, letterSpacing: "0.1em" }}>{label}</div>
    <div style={{ fontFamily: mono, fontSize: 15, fontWeight: 700, color: color || C.text }}>{value}</div>
    {sub && <div style={{ fontFamily: mono, fontSize: 10.5, color: C.muted }}>{sub}</div>}
  </div>
);

export default function TradePlanPanel({ plan, sym }) {
  return (
    <Panel
      title={`Trade Plan — ${sym}`}
      style={{ marginBottom: 14 }}
      right={
        plan &&
        plan.dir !== "NEUTRAL" && (
          <span style={{ fontFamily: mono, fontSize: 11, color: qualityColor[plan.quality] }}>
            R:R {plan.rr != null ? plan.rr.toFixed(2) : "—"} · {plan.quality}
          </span>
        )
      }
    >
      {!plan ? (
        <div style={{ fontFamily: mono, fontSize: 11.5, color: C.muted }}>
          waiting for price, projection, and volatility inputs…
        </div>
      ) : plan.dir === "NEUTRAL" ? (
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontFamily: mono, fontSize: 15, fontWeight: 700, color: C.amber }}>NEUTRAL</span>
          <span style={{ fontFamily: mono, fontSize: 11.5, color: C.muted }}>{plan.note}</span>
        </div>
      ) : (
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "stretch" }}>
          <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", minWidth: 96, padding: "0 6px" }}>
            <div style={{ fontFamily: mono, fontSize: 22, fontWeight: 700, color: dirColor[plan.dir] }}>{plan.dir}</div>
            <div style={{ fontFamily: mono, fontSize: 10, color: C.muted }}>{plan.horizon}-session horizon</div>
          </div>
          <Leg label="ENTRY" value={fmt(plan.entry, sym)} sub="at market" />
          <Leg
            label="STOP"
            value={fmt(plan.stop, sym)}
            sub={`${plan.stopPct >= 0 ? "+" : ""}${plan.stopPct.toFixed(1)}% · 1.5×ATR`}
            color={C.bear}
          />
          <Leg
            label="TARGET"
            value={fmt(plan.target, sym)}
            sub={`${plan.targetPct >= 0 ? "+" : ""}${plan.targetPct.toFixed(1)}% · proj. median`}
            color={C.bull}
          />
          <Leg
            label="RISK : REWARD"
            value={plan.rr != null ? `${plan.rr.toFixed(2)} : 1` : "—"}
            sub={plan.quality}
            color={qualityColor[plan.quality]}
          />
        </div>
      )}
      <div style={{ marginTop: 10, fontFamily: mono, fontSize: 9.5, color: C.muted }}>
        Mechanical synthesis of composite bias + projection + ATR. Not investment advice.
      </div>
    </Panel>
  );
}
