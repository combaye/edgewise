import { useMemo } from "react";
import { C, mono } from "../lib/theme";
import { assetMeta } from "../lib/assets";
import { useCongress } from "../hooks/useCongress";
import { partyOf, TYPE_COLOR, sizeLabel, fmtDate, gapDays } from "../lib/congress";
import { Panel, QueryGate, EmptyState } from "./Panel";

// Compact, symbol-scoped slice of the Capitol Trades feed for the terminal grid.
// Mirrors the InsiderPanel layout but for congressional disclosures.
export default function CongressPanel({ sym }) {
  const meta = assetMeta(sym);
  const eligible = meta.type === "stock" || meta.type === "etf";
  const q = useCongress(eligible ? meta.sym : null, { enabled: eligible });
  const trades = useMemo(() => {
    const list = q.data?.trades ?? [];
    return [...list].sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
  }, [q.data]);
  const source = q.data?.source;

  if (!eligible) {
    return (
      <Panel title="Congress Trades">
        <EmptyState msg="Congressional disclosures cover US-listed equities & ETFs only." />
      </Panel>
    );
  }

  return (
    <Panel
      title="Congress Trades"
      right={
        source && (
          <span style={{ fontFamily: mono, fontSize: 10, color: source === "sample" ? C.amber : C.muted, letterSpacing: "0.08em" }}>
            {source === "sample" ? "SAMPLE DATA" : "LIVE · capitoltrades"}
          </span>
        )
      }
    >
      <QueryGate query={q} loadingLabel="fetching disclosures…">
        {!trades.length ? (
          <EmptyState msg={`No congressional trades on record for ${meta.sym}.`} />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 200, overflowY: "auto" }}>
            {trades.map((t) => {
              const pc = partyOf(t.party).color;
              const gap = gapDays(t);
              return (
                <div
                  key={t.id}
                  title={`${t.politician} · filed ${gap ?? "?"}d after ${fmtDate(t.txDate)}`}
                  style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: mono, fontSize: 11.5, padding: "5px 8px", background: C.panel2, border: `1px solid ${C.border}`, borderRadius: 5 }}
                >
                  <span style={{ width: 5, height: 18, borderRadius: 2, background: pc, flexShrink: 0 }} />
                  <span style={{ color: C.text, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {t.politician}
                  </span>
                  <span style={{ color: TYPE_COLOR[t.txType], width: 38, textAlign: "right", textTransform: "uppercase", fontSize: 9.5 }}>
                    {t.txType}
                  </span>
                  <span style={{ color: C.muted, width: 78, textAlign: "right", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {sizeLabel(t)}
                  </span>
                  <span style={{ color: C.muted, width: 54, textAlign: "right", fontSize: 10 }}>{fmtDate(t.pubDate).slice(0, 6)}</span>
                </div>
              );
            })}
          </div>
        )}
      </QueryGate>
    </Panel>
  );
}
