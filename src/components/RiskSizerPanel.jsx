import { useEffect, useMemo, useState } from "react";
import { C, mono } from "../lib/theme";
import { fmt } from "../lib/assets";
import { cacheGet, cacheSet } from "../lib/cache";
import { computeStats, pct } from "../lib/journal";
import { positionSize, kelly, riskOfRuin, heatVerdict } from "../lib/sizing";
import { buildPlannedTrade, logPlannedSetup } from "../lib/plannedTrade";
import { Panel, EmptyState } from "./Panel";

const COLORS = { bull: C.bull, amber: C.amber, bear: C.bear, muted: C.muted };
const money = (x) =>
  x == null || !Number.isFinite(x) ? "—" : `${x < 0 ? "-" : ""}$${Math.abs(x).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;

const field = {
  fontFamily: mono,
  fontSize: 13,
  padding: "6px 9px",
  borderRadius: 6,
  background: C.panel2,
  border: `1px solid ${C.border}`,
  color: C.text,
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
};
const lbl = { fontFamily: mono, fontSize: 9.5, letterSpacing: "0.1em", color: C.muted, marginBottom: 4, display: "block", textTransform: "uppercase" };

const Out = ({ label, value, sub, color }) => (
  <div style={{ flex: 1, minWidth: 96, padding: "8px 10px", background: C.panel2, border: `1px solid ${C.border}`, borderRadius: 6 }}>
    <div style={{ fontFamily: mono, fontSize: 10, color: C.muted, letterSpacing: "0.1em" }}>{label}</div>
    <div style={{ fontFamily: mono, fontSize: 16, fontWeight: 700, color: color || C.text }}>{value}</div>
    {sub && <div style={{ fontFamily: mono, fontSize: 10, color: C.muted }}>{sub}</div>}
  </div>
);

export default function RiskSizerPanel({ plan, sym, signals }) {
  const [account, setAccount] = useState(() => String(cacheGet("sizing:account") ?? 10000));
  const [riskPct, setRiskPct] = useState(() => String(cacheGet("sizing:riskPct") ?? 1));
  const [logged, setLogged] = useState(null); // null | "ok"

  useEffect(() => {
    const n = Number(account);
    if (Number.isFinite(n) && n > 0) cacheSet("sizing:account", n);
  }, [account]);
  useEffect(() => {
    const n = Number(riskPct);
    if (Number.isFinite(n) && n > 0) cacheSet("sizing:riskPct", n);
  }, [riskPct]);

  // the trader's own edge, read from the journal store (computed once per mount)
  const stats = useMemo(() => computeStats(cacheGet("journal:trades") || []), []);
  const hasEdgeData = !stats.empty && stats.hasR && stats.payoff != null;

  const acct = Number(account);
  const risk = Number(riskPct);
  const sizeable = plan && plan.dir && plan.dir !== "NEUTRAL" && Number.isFinite(plan.entry) && Number.isFinite(plan.stop);

  const ps = useMemo(
    () => (sizeable ? positionSize({ account: acct, riskPct: risk, entry: plan.entry, stop: plan.stop }) : null),
    [sizeable, acct, risk, plan]
  );
  const k = useMemo(() => (hasEdgeData ? kelly({ winRate: stats.winRate, payoff: stats.payoff }) : null), [hasEdgeData, stats]);
  const ror = useMemo(
    () => (hasEdgeData && Number.isFinite(risk) && risk > 0 ? riskOfRuin({ winRate: stats.winRate, payoff: stats.payoff, riskFraction: risk / 100 }) : null),
    [hasEdgeData, stats, risk]
  );
  const heat = k ? heatVerdict(risk, k.halfPct) : null;

  // Reset the "logged" confirmation when the setup identity changes (symbol or
  // direction) — NOT on plan.entry, which tracks the live quote and would
  // re-arm the button on every tick, inviting duplicate logs of the same setup.
  useEffect(() => setLogged(null), [sym, plan?.dir]);

  const onLog = () => {
    if (!ps || ps.units <= 0) return;
    const trade = buildPlannedTrade({ sym, plan, units: ps.units, signals });
    logPlannedSetup(trade);
    setLogged("ok");
  };

  return (
    <Panel
      title={`Position Sizer — ${sym}`}
      style={{ marginBottom: 14 }}
      right={
        ps && ps.units > 0 ? (
          <span style={{ fontFamily: mono, fontSize: 11, color: C.text }}>
            {ps.units} units · {money(ps.notional)}
          </span>
        ) : null
      }
    >
      {!sizeable ? (
        <EmptyState msg="No directional setup to size — the composite bias is neutral, so there's no entry/stop to risk against." />
      ) : (
        <>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
            <div style={{ flex: "1 1 140px" }}>
              <label style={lbl}>Account size ($)</label>
              <input style={field} value={account} onChange={(e) => setAccount(e.target.value)} inputMode="decimal" />
            </div>
            <div style={{ flex: "1 1 110px" }}>
              <label style={lbl}>Risk / trade (%)</label>
              <input style={field} value={riskPct} onChange={(e) => setRiskPct(e.target.value)} inputMode="decimal" />
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Out label="SIZE" value={ps && ps.units > 0 ? ps.units : "—"} sub="units" color={C.amber} />
            <Out label="$ AT RISK" value={ps ? money(ps.actualRisk) : "—"} sub={`to ${fmt(plan.stop, sym)} stop`} color={C.bear} />
            <Out label="NOTIONAL" value={ps ? money(ps.notional) : "—"} sub={ps?.notionalPct != null ? `${ps.notionalPct.toFixed(0)}% of account` : null} />
            <Out label="ENTRY" value={fmt(plan.entry, sym)} sub={`${plan.dir.toLowerCase()} @ market`} color={plan.dir === "SHORT" ? C.bear : C.bull} />
          </div>

          {/* Kelly + risk-of-ruin, grounded in the trader's real journal edge */}
          <div style={{ marginTop: 12, padding: "10px 12px", background: C.panel2, border: `1px solid ${C.border}`, borderRadius: 6, fontFamily: mono, fontSize: 11.5, lineHeight: 1.7 }}>
            {hasEdgeData && k ? (
              <>
                <div style={{ color: C.muted }}>
                  Your edge:{" "}
                  <span style={{ color: C.text }}>{pct(stats.winRate)} win</span> ·{" "}
                  <span style={{ color: C.text }}>{stats.payoff.toFixed(2)}:1 payoff</span>
                  {" → "}
                  {k.hasEdge ? (
                    <>
                      ½-Kelly <span style={{ color: C.bull }}>{k.halfPct.toFixed(1)}%</span> · full{" "}
                      <span style={{ color: C.muted }}>{k.fullPct.toFixed(1)}%</span>
                    </>
                  ) : (
                    <span style={{ color: C.bear }}>negative expectancy — no edge to bet</span>
                  )}
                </div>
                <div style={{ color: C.muted, marginTop: 3 }}>
                  {heat && (
                    <>
                      Your {risk}% is <span style={{ color: COLORS[heat.color] }}>{heat.label}</span>
                      {" · "}
                    </>
                  )}
                  {ror != null && (
                    <>
                      ~<span style={{ color: ror > 0.2 ? C.bear : ror > 0.05 ? C.amber : C.bull }}>{(ror * 100).toFixed(0)}%</span>{" "}
                      chance of a 50% drawdown over 200 trades
                    </>
                  )}
                </div>
              </>
            ) : (
              <div style={{ color: C.muted }}>
                Log closed trades <span style={{ color: C.text }}>with a stop</span> in the Journal to unlock Kelly-optimal
                sizing and a risk-of-ruin read from your own win rate & payoff.
              </div>
            )}
          </div>

          <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <button
              onClick={onLog}
              disabled={!ps || ps.units <= 0 || logged === "ok"}
              style={{
                fontFamily: mono,
                fontSize: 11,
                letterSpacing: "0.08em",
                padding: "7px 16px",
                borderRadius: 6,
                cursor: !ps || ps.units <= 0 || logged === "ok" ? "default" : "pointer",
                background: logged === "ok" ? "transparent" : C.amber,
                border: `1px solid ${logged === "ok" ? C.bull : C.amber}`,
                color: logged === "ok" ? C.bull : "#0D1117",
                fontWeight: 700,
                opacity: !ps || ps.units <= 0 ? 0.5 : 1,
              }}
            >
              {logged === "ok" ? "✓ LOGGED TO JOURNAL" : "LOG THIS SETUP"}
            </button>
            <span style={{ fontFamily: mono, fontSize: 10, color: C.muted }}>
              {logged === "ok"
                ? "Open position saved with its signal snapshot — add the exit later to score it."
                : "Snapshots this sized bet + signals into the journal as an open position."}
            </span>
          </div>

          <div style={{ marginTop: 10, fontFamily: mono, fontSize: 9.5, color: C.muted }}>
            Fixed-fractional sizing to the plan's stop. Kelly & ruin use your journal's realized edge. Not investment advice.
          </div>
        </>
      )}
    </Panel>
  );
}
