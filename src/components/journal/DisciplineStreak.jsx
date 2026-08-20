import { C, mono, sans } from "../../lib/theme";
import { Panel } from "../Panel";
import { pct } from "../../lib/journal";

function Ring({ value }) {
  const r = 46;
  const c = 2 * Math.PI * r;
  const color = value >= 0.8 ? C.bull : value >= 0.6 ? C.amber : C.bear;
  return (
    <svg width="120" height="120" viewBox="0 0 120 120">
      <circle cx="60" cy="60" r={r} fill="none" stroke={C.grid} strokeWidth="10" />
      <circle
        cx="60"
        cy="60"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - value)}
        transform="rotate(-90 60 60)"
        style={{ transition: "stroke-dashoffset 0.6s ease" }}
      />
      <text x="60" y="56" textAnchor="middle" fontFamily={sans} fontSize="24" fontWeight="700" fill={color}>
        {pct(value)}
      </text>
      <text x="60" y="74" textAnchor="middle" fontFamily={mono} fontSize="9" letterSpacing="0.1em" fill={C.muted}>
        FOLLOWED PLAN
      </text>
    </svg>
  );
}

// milestone nudge based on the current consecutive-disciplined streak
function nudge(streak) {
  if (streak >= 20) return { txt: `🏆 ${streak} disciplined trades — elite consistency.`, color: C.bull };
  if (streak >= 10) return { txt: `🔥 ${streak} disciplined trades in a row — keep the chain alive.`, color: C.bull };
  if (streak >= 5) return { txt: `${streak}-trade discipline streak. 5 more for a 🔥 milestone.`, color: C.amber };
  if (streak >= 1) return { txt: `${streak} clean trade${streak > 1 ? "s" : ""} so far — build the streak.`, color: C.muted };
  return { txt: "Your last trade broke a rule. Reset and start a clean streak.", color: C.bear };
}

export default function DisciplineStreak({ stats }) {
  if (stats.empty) return null;
  const n = nudge(stats.disciplineStreak);
  // count rule-break frequency for the mini-list
  const counts = {};
  for (const t of stats.closed) for (const r of t.rulesBroken) counts[r] = (counts[r] || 0) + 1;
  const topRules = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 3);

  return (
    <Panel title="Discipline" style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
        <Ring value={stats.disciplinePct} />
        <div style={{ flex: 1, minWidth: 160 }}>
          <div
            style={{
              fontFamily: mono,
              fontSize: 12,
              color: n.color,
              lineHeight: 1.5,
              padding: "8px 10px",
              border: `1px solid ${C.border}`,
              borderRadius: 6,
              background: C.panel2,
              marginBottom: 10,
            }}
          >
            {n.txt}
          </div>
          {topRules.length > 0 ? (
            <div>
              <div style={{ fontFamily: mono, fontSize: 9.5, letterSpacing: "0.12em", color: C.muted, marginBottom: 5 }}>
                MOST-BROKEN RULES
              </div>
              {topRules.map(([rule, ct]) => (
                <div key={rule} style={{ display: "flex", justifyContent: "space-between", fontFamily: mono, fontSize: 11, marginBottom: 3 }}>
                  <span style={{ color: C.text }}>{rule}</span>
                  <span style={{ color: C.bear }}>×{ct}</span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontFamily: mono, fontSize: 11, color: C.bull }}>No rule-breaks logged. Spotless.</div>
          )}
        </div>
      </div>
    </Panel>
  );
}
