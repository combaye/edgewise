import { useMemo } from "react";
import { C, mono } from "../lib/theme";
import { assetMeta, isEquity } from "../lib/assets";
import { useEarnings } from "../hooks/useFundamentalsExtra";
import { parseEarnings } from "../lib/earnings";
import { Panel, QueryGate, EmptyState } from "./Panel";

const eps = (v) => (v == null ? "—" : `${v >= 0 ? "" : "-"}$${Math.abs(v).toFixed(2)}`);

export default function CalendarPanel({ sym }) {
  const meta = assetMeta(sym);
  const earnings = useEarnings(sym);
  const data = useMemo(() => (earnings.data ? parseEarnings(earnings.data) : null), [earnings.data]);

  if (!isEquity(meta)) {
    return (
      <Panel title="Upcoming Calendar — Earnings">
        <EmptyState msg="Earnings calendar applies to equities only." />
      </Panel>
    );
  }

  return (
    <Panel
      title="Upcoming Calendar — Earnings"
      right={
        data?.beatRate != null && (
          <span style={{ fontFamily: mono, fontSize: 11, color: data.beatRate >= 0.5 ? C.bull : C.bear }}>
            beat rate {Math.round(data.beatRate * 100)}% ({data.beats}/{data.beatTotal})
          </span>
        )
      }
    >
      <QueryGate query={earnings} loadingLabel="fetching earnings history…">
        {!data ? (
          <EmptyState msg="No earnings data available for this symbol." />
        ) : (
          <>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
              <div style={{ flex: 1, minWidth: 130, padding: "8px 10px", background: C.panel2, border: `1px solid ${C.amber}55`, borderRadius: 6 }}>
                <div style={{ fontFamily: mono, fontSize: 10, color: C.muted, letterSpacing: "0.1em" }}>NEXT REPORT</div>
                <div style={{ fontFamily: mono, fontSize: 15, fontWeight: 700, color: C.amber }}>
                  {data.next ? data.next.date : "TBA"}
                </div>
                <div style={{ fontFamily: mono, fontSize: 11, color: C.muted }}>
                  est EPS {data.next ? eps(data.next.est) : "—"}
                </div>
              </div>
              <div style={{ flex: 1, minWidth: 130, padding: "8px 10px", background: C.panel2, border: `1px solid ${C.border}`, borderRadius: 6 }}>
                <div style={{ fontFamily: mono, fontSize: 10, color: C.muted, letterSpacing: "0.1em" }}>AVG SURPRISE</div>
                <div style={{ fontFamily: mono, fontSize: 15, fontWeight: 700, color: (data.avgSurprise ?? 0) >= 0 ? C.bull : C.bear }}>
                  {data.avgSurprise != null ? `${data.avgSurprise >= 0 ? "+" : ""}${data.avgSurprise.toFixed(1)}%` : "—"}
                </div>
                <div style={{ fontFamily: mono, fontSize: 11, color: C.muted }}>last {data.recent.length} reports</div>
              </div>
            </div>

            {data.breakeven?.detected && (
              <div style={{ fontFamily: mono, fontSize: 11, color: C.bull, padding: "6px 10px", background: "#12281f", border: `1px solid ${C.bull}55`, borderRadius: 6, marginBottom: 10 }}>
                ★ BREAKEVEN SIGNAL — turned profitable at {data.breakeven.turnedAt} after {data.breakeven.runLength} loss quarters
              </div>
            )}

            <div style={{ fontFamily: mono, fontSize: 11, color: C.muted, letterSpacing: "0.1em", marginBottom: 6 }}>RECENT REPORTS</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 150, overflowY: "auto" }}>
              {data.recent.map((r) => {
                const beat = r.est != null && r.actual >= r.est;
                return (
                  <div key={r.date} style={{ display: "flex", justifyContent: "space-between", fontFamily: mono, fontSize: 12, padding: "5px 8px", background: C.panel2, border: `1px solid ${C.border}`, borderRadius: 5 }}>
                    <span style={{ color: C.muted }}>{r.date}</span>
                    <span>est {eps(r.est)}</span>
                    <span style={{ color: beat ? C.bull : C.bear }}>act {eps(r.actual)}</span>
                    <span style={{ color: (r.surprise ?? 0) >= 0 ? C.bull : C.bear, width: 56, textAlign: "right" }}>
                      {r.surprise != null ? `${r.surprise >= 0 ? "+" : ""}${r.surprise.toFixed(0)}%` : "—"}
                    </span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </QueryGate>
    </Panel>
  );
}
