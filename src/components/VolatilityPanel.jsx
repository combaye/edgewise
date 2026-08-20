import { useMemo } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { C, mono } from "../lib/theme";
import { fmt } from "../lib/assets";
import { computeRisk } from "../lib/risk";
import { Panel, QueryGate, EmptyState } from "./Panel";

const Row = ({ label, children }) => (
  <div style={{ display: "flex", justifyContent: "space-between", fontFamily: mono, fontSize: 12, padding: "6px 0", borderBottom: `1px solid ${C.border}` }}>
    <span style={{ color: C.muted }}>{label}</span>
    <span>{children}</span>
  </div>
);

export default function VolatilityPanel({ sym, history }) {
  const risk = useMemo(
    () => (history.data?.bars ? computeRisk(history.data.bars) : null),
    [history.data]
  );

  return (
    <Panel
      title="Volatility & Regime"
      right={
        risk && (
          <span
            style={{
              fontFamily: mono,
              fontSize: 10,
              letterSpacing: "0.1em",
              padding: "3px 8px",
              borderRadius: 5,
              border: `1px solid ${risk.trending ? C.bull : C.amber}`,
              color: risk.trending ? C.bull : C.amber,
            }}
          >
            {risk.regime}
          </span>
        )
      }
    >
      <QueryGate query={history} loadingLabel="waiting for historical data…">
        {!risk ? (
          <EmptyState msg="Insufficient data for volatility statistics." />
        ) : (
          <>
            <div style={{ height: 70, marginBottom: 10 }}>
              <ResponsiveContainer>
                <AreaChart data={risk.spark} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
                  <XAxis dataKey="date" hide />
                  <YAxis hide domain={["auto", "auto"]} />
                  <Tooltip
                    contentStyle={{ background: C.panel2, border: `1px solid ${C.border}`, fontFamily: mono, fontSize: 11 }}
                    formatter={(v) => [`${v}%`, "21d realized vol (ann.)"]}
                  />
                  <Area dataKey="vol" stroke={C.amber} strokeWidth={1.4} fill={C.amber} fillOpacity={0.12} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <Row label="Realized vol (21d, ann.)">
              {risk.curVol.toFixed(1)}%{" "}
              <span style={{ color: risk.volPctile >= 70 ? C.bear : risk.volPctile <= 30 ? C.bull : C.muted }}>
                · {risk.volPctile}th pctile (10y)
              </span>
            </Row>
            <Row label="Efficiency ratio (20d)">{risk.er.toFixed(2)} <span style={{ color: C.muted }}>· {risk.trending ? "trending" : risk.er <= 0.18 ? "choppy" : "mixed"}</span></Row>
            <Row label="ATR (14)">
              {fmt(risk.atr, sym)} <span style={{ color: C.muted }}>· {risk.atrPct.toFixed(2)}%/day</span>
            </Row>
            <Row label="Max drawdown (10y)"><span style={{ color: C.bear }}>{risk.maxDD.toFixed(1)}%</span></Row>
            <Row label="Current drawdown">
              <span style={{ color: risk.curDD < -1 ? C.bear : C.bull }}>{risk.curDD.toFixed(1)}%</span>{" "}
              <span style={{ color: C.muted }}>· {risk.underwaterDays} sessions off high</span>
            </Row>
          </>
        )}
      </QueryGate>
    </Panel>
  );
}
