import { C, mono } from "../lib/theme";
import { fmt, assetMeta, isEquity } from "../lib/assets";
import { Panel, QueryGate, EmptyState } from "./Panel";

// stats (the /statistics query) and fv (computeFairValue output) are owned by
// App so the composite gauge can reuse the same valuation. altman is the
// Altman Z-Score result (or null).
export default function FairValuePanel({ sym, price, stats, fv, altman }) {
  const meta = assetMeta(sym);

  const body = () => {
    if (!isEquity(meta)) {
      return <EmptyState msg="Valuation model not applicable for this asset class." />;
    }
    return (
      <QueryGate query={stats} loadingLabel="fetching fundamentals…">
        {!fv ? (
          <EmptyState msg="Insufficient fundamental data for this symbol." />
        ) : (
          <>
            <FairValueBody fv={fv} price={price} sym={sym} />
            {altman && <AltmanZ altman={altman} />}
          </>
        )}
      </QueryGate>
    );
  };

  return <Panel title="Fair Value & Solvency">{body()}</Panel>;
}

const zColor = { safe: C.bull, grey: C.amber, distress: C.bear };

function AltmanZ({ altman }) {
  return (
    <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span
          style={{ fontFamily: mono, fontSize: 11, color: C.amber, letterSpacing: "0.12em" }}
          title="Altman Z-Score — bankruptcy-risk model (>2.99 safe · 1.81–2.99 grey · <1.81 distress)"
        >
          ALTMAN Z-SCORE
        </span>
        <span style={{ fontFamily: mono, fontSize: 18, fontWeight: 700, color: zColor[altman.zone.dir] }}>
          {altman.z.toFixed(2)}
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
        <span style={{ fontFamily: mono, fontSize: 11, color: zColor[altman.zone.dir], letterSpacing: "0.1em" }}>
          {altman.zone.label}
        </span>
        <span style={{ fontFamily: mono, fontSize: 10, color: C.muted }}>
          {altman.fiscalDate ? `FY ${altman.fiscalDate}` : ""}
        </span>
      </div>
    </div>
  );
}

function FairValueBody({ fv, price, sym }) {
  const upside = fv.upsidePct;
  return (
    <>
      {fv.models.map(({ name, value }) => (
        <div
          key={name}
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontFamily: mono,
            fontSize: 12,
            padding: "7px 0",
            borderBottom: `1px solid ${C.border}`,
          }}
        >
          <span style={{ color: C.muted }}>{name}</span>
          <span>{value != null && value > 0 ? fmt(value, sym) : "—"}</span>
        </div>
      ))}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "12px 0 8px" }}>
        <span style={{ fontFamily: mono, fontSize: 11, color: C.amber, letterSpacing: "0.12em" }}>AVG FAIR VALUE</span>
        <span style={{ fontFamily: mono, fontSize: 20, fontWeight: 700 }}>{fmt(fv.avg, sym)}</span>
      </div>
      {upside != null ? (
        <>
          <div style={{ height: 8, borderRadius: 4, background: C.grid, position: "relative", margin: "4px 0 8px" }}>
            <div
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                bottom: 0,
                borderRadius: 4,
                width: `${Math.min(100, Math.max(4, 50 + upside))}%`,
                background: upside >= 0 ? C.bull : C.bear,
                opacity: 0.85,
              }}
            />
            <div
              style={{ position: "absolute", left: "50%", top: -3, bottom: -3, width: 2, background: C.amber }}
              title={`current price ${fmt(price, sym)}`}
            />
          </div>
          <div style={{ fontFamily: mono, fontSize: 13, color: upside >= 0 ? C.bull : C.bear }}>
            {upside >= 0 ? "undervalued" : "overvalued"} · {upside >= 0 ? "+" : ""}
            {upside.toFixed(1)}% vs price
          </div>
        </>
      ) : (
        <div style={{ fontFamily: mono, fontSize: 11.5, color: C.muted }}>waiting for live price…</div>
      )}
      <div style={{ marginTop: 10, fontFamily: mono, fontSize: 10, color: C.muted }}>
        growth est {fv.growth.toFixed(1)}% ({fv.growthSource}) · cost of equity 9%
      </div>
    </>
  );
}
