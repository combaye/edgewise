import { C, mono, sans } from "../../lib/theme";
import { money, pct, signed } from "../../lib/journal";

function Tile({ label, value, sub, tone }) {
  const color = tone === "bull" ? C.bull : tone === "bear" ? C.bear : tone === "amber" ? C.amber : C.text;
  return (
    <div
      style={{
        background: C.panel,
        border: `1px solid ${C.border}`,
        borderRadius: 8,
        padding: "12px 14px",
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
    >
      <span style={{ fontFamily: mono, fontSize: 9.5, letterSpacing: "0.14em", color: C.muted, textTransform: "uppercase" }}>
        {label}
      </span>
      <span style={{ fontFamily: sans, fontSize: 23, fontWeight: 700, color, lineHeight: 1 }}>{value}</span>
      {sub != null && <span style={{ fontFamily: mono, fontSize: 10.5, color: C.muted }}>{sub}</span>}
    </div>
  );
}

export default function StatTiles({ stats }) {
  if (stats.empty) return null;
  const pf = stats.profitFactor;
  const tiles = [
    {
      label: "Net P&L",
      value: money(stats.net, 0),
      sub: `${stats.nClosed} closed · ${stats.nOpen} open`,
      tone: stats.net >= 0 ? "bull" : "bear",
    },
    {
      label: "Win rate",
      value: pct(stats.winRate),
      sub: `${stats.nWins}W / ${stats.nLosses}L`,
      tone: stats.winRate >= 0.5 ? "bull" : "amber",
    },
    {
      label: "Expectancy",
      value: stats.hasR ? `${signed(stats.expectancyR)}R` : money(stats.expectancy$, 0),
      sub: "per trade",
      tone: (stats.hasR ? stats.expectancyR : stats.expectancy$) >= 0 ? "bull" : "bear",
    },
    {
      label: "Profit factor",
      value: pf === Infinity ? "∞" : pf.toFixed(2),
      sub: `payoff ${stats.payoff ? stats.payoff.toFixed(2) : "—"}:1`,
      tone: pf >= 1.5 ? "bull" : pf >= 1 ? "amber" : "bear",
    },
    {
      label: "Max drawdown",
      value: money(-stats.maxDD, 0),
      sub: `worst streak ${stats.maxLossStreak}L`,
      tone: "bear",
    },
    {
      label: "Discipline",
      value: pct(stats.disciplinePct),
      sub: `${stats.disciplineStreak} streak`,
      tone: stats.disciplinePct >= 0.8 ? "bull" : stats.disciplinePct >= 0.6 ? "amber" : "bear",
    },
  ];
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
        gap: 12,
        marginBottom: 14,
      }}
    >
      {tiles.map((t) => (
        <Tile key={t.label} {...t} />
      ))}
    </div>
  );
}
