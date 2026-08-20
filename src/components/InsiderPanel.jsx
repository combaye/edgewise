import { useMemo } from "react";
import { C, mono } from "../lib/theme";
import { assetMeta, isEquity } from "../lib/assets";
import { useInsiders } from "../hooks/useFundamentalsExtra";
import { parseInsiders } from "../lib/insiders";
import { Panel, QueryGate, EmptyState } from "./Panel";

const fmtVal = (v) => {
  const a = Math.abs(v);
  if (a >= 1e9) return `${v < 0 ? "-" : ""}$${(a / 1e9).toFixed(1)}B`;
  if (a >= 1e6) return `${v < 0 ? "-" : ""}$${(a / 1e6).toFixed(1)}M`;
  if (a >= 1e3) return `${v < 0 ? "-" : ""}$${(a / 1e3).toFixed(0)}K`;
  return `${v < 0 ? "-" : ""}$${a.toFixed(0)}`;
};

const sideColor = { buy: C.bull, sell: C.bear, neutral: C.muted };

export default function InsiderPanel({ sym }) {
  const meta = assetMeta(sym);
  const insiders = useInsiders(sym);
  const data = useMemo(() => (insiders.data ? parseInsiders(insiders.data) : null), [insiders.data]);

  if (!isEquity(meta)) {
    return (
      <Panel title="Insider Transactions">
        <EmptyState msg="Insider filings apply to equities only." />
      </Panel>
    );
  }

  return (
    <Panel
      title="Insider Transactions"
      right={
        data && (
          <span style={{ fontFamily: mono, fontSize: 11, color: data.sentiment >= 0 ? C.bull : C.bear }}>
            {data.windowMonths}mo net {fmtVal(data.netVal)}
          </span>
        )
      }
    >
      <QueryGate query={insiders} loadingLabel="fetching insider filings…">
        {!data ? (
          <EmptyState msg="No insider transactions reported for this symbol." />
        ) : (
          <>
            <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
              <div style={{ flex: 1, padding: "7px 10px", background: "#12281f", border: `1px solid ${C.bull}44`, borderRadius: 6 }}>
                <div style={{ fontFamily: mono, fontSize: 11, color: C.bull, fontWeight: 700 }}>{fmtVal(data.buyVal)}</div>
                <div style={{ fontFamily: mono, fontSize: 10, color: C.muted }}>bought · {data.buyCount} filings</div>
              </div>
              <div style={{ flex: 1, padding: "7px 10px", background: "#2a1717", border: `1px solid ${C.bear}44`, borderRadius: 6 }}>
                <div style={{ fontFamily: mono, fontSize: 11, color: C.bear, fontWeight: 700 }}>{fmtVal(data.sellVal)}</div>
                <div style={{ fontFamily: mono, fontSize: 10, color: C.muted }}>sold · {data.sellCount} filings</div>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 180, overflowY: "auto" }}>
              {data.rows.map((r, i) => (
                <div key={i} title={r.description} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, fontFamily: mono, fontSize: 11.5, padding: "5px 8px", background: C.panel2, border: `1px solid ${C.border}`, borderRadius: 5 }}>
                  <span style={{ color: C.text, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {r.name}
                  </span>
                  <span style={{ color: C.muted, width: 70, textAlign: "right", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {r.position}
                  </span>
                  <span style={{ color: sideColor[r.side], width: 40, textAlign: "right", textTransform: "uppercase", fontSize: 9.5 }}>
                    {r.side}
                  </span>
                  <span style={{ color: sideColor[r.side], width: 56, textAlign: "right" }}>{r.value > 0 ? fmtVal(r.value) : "—"}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </QueryGate>
    </Panel>
  );
}
