import { useMemo } from "react";
import { C, mono } from "../../lib/theme";
import { signed, pct, money } from "../../lib/journal";
import { signalScore } from "../../lib/signalScore";
import { Panel, EmptyState } from "../Panel";

const rColor = (r) => (r == null ? C.muted : r > 0 ? C.bull : r < 0 ? C.bear : C.muted);

function Table({ heading, rows }) {
  if (!rows.length) return null;
  return (
    <div style={{ flex: "1 1 260px", minWidth: 0 }}>
      <div style={{ fontFamily: mono, fontSize: 9.5, letterSpacing: "0.12em", color: C.muted, textTransform: "uppercase", marginBottom: 6 }}>
        {heading}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {rows.map((r) => (
          <div
            key={r.key}
            style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: mono, fontSize: 11.5, padding: "6px 9px", background: C.panel2, border: `1px solid ${C.border}`, borderRadius: 5 }}
          >
            <span style={{ color: C.text, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.key}</span>
            <span style={{ color: C.muted, width: 38, textAlign: "right" }}>{r.n}×</span>
            <span style={{ color: C.muted, width: 46, textAlign: "right" }}>{pct(r.winRate)}</span>
            <span style={{ color: rColor(r.avgR), width: 56, textAlign: "right", fontWeight: 700 }}>
              {r.avgR == null ? "—" : `${signed(r.avgR, 2)}R`}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SignalScorecard({ stats }) {
  const score = useMemo(() => signalScore(stats), [stats]);

  const headline =
    score && !score.insufficient && score.edgeVsBaseline != null ? (
      <span style={{ fontFamily: mono, fontSize: 11, color: rColor(score.edgeVsBaseline) }}>
        signal trades {signed(score.edgeVsBaseline, 2)}R vs baseline
      </span>
    ) : null;

  return (
    <Panel title="Signal Scorecard" right={headline}>
      {!score || score.insufficient ? (
        <EmptyState
          msg={`Scores whether the terminal's own signals make you money. ${
            score?.tagged ? `${score.tagged} setup${score.tagged === 1 ? "" : "s"}` : "No setups"
          } logged from the terminal so far — use “Log this setup” on the Position Sizer, then close them out to populate this.`}
        />
      ) : (
        <>
          <div style={{ fontFamily: mono, fontSize: 11.5, color: C.muted, lineHeight: 1.6, marginBottom: 12 }}>
            Across <span style={{ color: C.text }}>{score.tagged}</span> signal-logged trades you average{" "}
            <span style={{ color: rColor(score.sigAvgR), fontWeight: 700 }}>{score.sigAvgR == null ? "—" : `${signed(score.sigAvgR, 2)}R`}</span>
            {score.baselineR != null && (
              <>
                {" "}
                vs a <span style={{ color: C.text }}>{signed(score.baselineR, 2)}R</span> overall baseline.
              </>
            )}
          </div>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <Table heading="By composite bias" rows={score.bands} />
            <Table heading="By forecast grade" rows={score.grades} />
          </div>
        </>
      )}
    </Panel>
  );
}
