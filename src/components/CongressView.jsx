import { useMemo, useState } from "react";
import { C, mono, sans } from "../lib/theme";
import { useCongress } from "../hooks/useCongress";
import {
  PARTY,
  partyOf,
  TYPE_COLOR,
  sizeLabel,
  fmtUsd,
  fmtDate,
  ago,
  gapDays,
  summarize,
  topIssuers,
} from "../lib/congress";
import { Loading, ErrorState, EmptyState } from "./Panel";

const Stat = ({ label, value, sub, color }) => (
  <div style={{ flex: "1 1 130px", minWidth: 0, background: C.panel, border: `1px solid ${C.border}`, borderRadius: 8, padding: "11px 14px" }}>
    <div style={{ fontFamily: mono, fontSize: 10, letterSpacing: "0.12em", color: C.muted, textTransform: "uppercase" }}>{label}</div>
    <div style={{ fontFamily: mono, fontSize: 20, fontWeight: 700, color: color || C.text, marginTop: 4, lineHeight: 1.1 }}>{value}</div>
    {sub && <div style={{ fontFamily: mono, fontSize: 10.5, color: C.muted, marginTop: 2 }}>{sub}</div>}
  </div>
);

const seg = (active) => ({
  fontFamily: mono,
  fontSize: 10.5,
  letterSpacing: "0.08em",
  padding: "5px 11px",
  borderRadius: 6,
  cursor: "pointer",
  background: active ? C.amber : "transparent",
  border: `1px solid ${active ? C.amber : C.border}`,
  color: active ? "#0D1117" : C.muted,
  fontWeight: active ? 700 : 400,
  whiteSpace: "nowrap",
});

function Segmented({ value, onChange, options }) {
  return (
    <div style={{ display: "flex", gap: 4 }}>
      {options.map((o) => (
        <button key={o.v} style={seg(value === o.v)} onClick={() => onChange(o.v)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

function PartyChip({ party, state, chamber }) {
  const p = partyOf(party);
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <span style={{ width: 18, height: 18, borderRadius: 4, background: `${p.color}22`, border: `1px solid ${p.color}`, color: p.color, fontFamily: mono, fontSize: 10, fontWeight: 700, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
        {p.short}
      </span>
      <span style={{ fontFamily: mono, fontSize: 10, color: C.muted }}>
        {chamber === "senate" ? "Sen." : "Rep."} {state}
      </span>
    </span>
  );
}

const TH = ({ children, style }) => (
  <th style={{ textAlign: "left", fontFamily: mono, fontSize: 9.5, letterSpacing: "0.1em", color: C.muted, textTransform: "uppercase", padding: "0 10px 8px", fontWeight: 400, ...style }}>
    {children}
  </th>
);
const TD = ({ children, style }) => (
  <td style={{ fontFamily: mono, fontSize: 12, color: C.text, padding: "9px 10px", borderTop: `1px solid ${C.border}`, ...style }}>{children}</td>
);

// Reusable disclosure table, shared by the main feed and the politician profile.
// `showPolitician={false}` drops the member column on a single-member profile.
function TradesTable({ trades, onSelectTicker, onSelectPolitician, showPolitician = true }) {
  if (!trades.length) return <EmptyState msg="No trades match these filters." />;
  return (
    <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden" }}>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: showPolitician ? 720 : 560 }}>
          <thead>
            <tr>
              {showPolitician && <TH style={{ paddingLeft: 14 }}>Politician</TH>}
              <TH style={showPolitician ? undefined : { paddingLeft: 14 }}>Issuer</TH>
              <TH>Published</TH>
              <TH>Traded</TH>
              <TH style={{ textAlign: "right" }}>Gap</TH>
              <TH style={{ textAlign: "center" }}>Type</TH>
              <TH style={{ textAlign: "right" }}>Size</TH>
              <TH style={{ textAlign: "right", paddingRight: 14 }}>Price</TH>
            </tr>
          </thead>
          <tbody>
            {trades.map((t) => {
              const gap = gapDays(t);
              const lateColor = gap == null ? C.muted : gap > 45 ? C.bear : gap > 30 ? C.amber : C.muted;
              return (
                <tr key={t.id}>
                  {showPolitician && (
                    <TD style={{ paddingLeft: 14 }}>
                      <button
                        onClick={() => onSelectPolitician?.(t.politician)}
                        title={`View ${t.politician}'s trades`}
                        style={{ background: "transparent", border: "none", padding: 0, cursor: "pointer", textAlign: "left", display: "flex", flexDirection: "column", gap: 3 }}
                      >
                        <span style={{ color: C.text }}>{t.politician}</span>
                        <PartyChip party={t.party} state={t.state} chamber={t.chamber} />
                      </button>
                    </TD>
                  )}
                  <TD style={showPolitician ? undefined : { paddingLeft: 14 }}>
                    <button
                      onClick={() => onSelectTicker?.(t.ticker)}
                      title={`Load ${t.ticker} in terminal`}
                      style={{ background: "transparent", border: "none", padding: 0, cursor: "pointer", textAlign: "left", display: "flex", flexDirection: "column", gap: 2 }}
                    >
                      <span style={{ fontFamily: mono, fontSize: 12, fontWeight: 700, color: C.amber }}>{t.ticker}</span>
                      <span style={{ fontFamily: mono, fontSize: 10, color: C.muted, maxWidth: 150, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.issuer}</span>
                    </button>
                  </TD>
                  <TD style={{ color: C.muted }}>
                    {fmtDate(t.pubDate)}
                    <span style={{ display: "block", fontSize: 10, color: "#6b7686" }}>{ago(t.pubDate)}</span>
                  </TD>
                  <TD style={{ color: C.muted }}>{fmtDate(t.txDate)}</TD>
                  <TD style={{ textAlign: "right", color: lateColor }}>{gap != null ? `${gap}d` : "—"}</TD>
                  <TD style={{ textAlign: "center" }}>
                    <span style={{ color: TYPE_COLOR[t.txType], textTransform: "uppercase", fontSize: 10, letterSpacing: "0.06em", border: `1px solid ${TYPE_COLOR[t.txType]}55`, borderRadius: 4, padding: "2px 7px" }}>
                      {t.txType}
                    </span>
                  </TD>
                  <TD style={{ textAlign: "right", color: C.text }}>{sizeLabel(t)}</TD>
                  <TD style={{ textAlign: "right", color: C.muted, paddingRight: 14 }}>{t.price != null ? `$${t.price.toFixed(2)}` : "—"}</TD>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Drill-down profile for one member: identity header, aggregate stats, their
// most-traded issuers, and full trade history.
function PoliticianProfile({ name, trades, onBack, onSelectTicker }) {
  const mine = useMemo(
    () => trades.filter((t) => t.politician === name).sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate)),
    [trades, name]
  );
  const stats = useMemo(() => summarize(mine), [mine]);
  const leaders = useMemo(() => topIssuers(mine, 8), [mine]);
  const id = mine[0];
  const p = id ? partyOf(id.party) : partyOf("independent");
  const vol = stats.buyVol + stats.sellVol;

  return (
    <>
      <button
        onClick={onBack}
        style={{ fontFamily: mono, fontSize: 11, letterSpacing: "0.06em", padding: "5px 11px", borderRadius: 6, cursor: "pointer", background: "transparent", border: `1px solid ${C.border}`, color: C.muted, marginBottom: 14 }}
      >
        ← ALL TRADES
      </button>

      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
        <span style={{ width: 40, height: 40, borderRadius: 8, background: `${p.color}22`, border: `1px solid ${p.color}`, color: p.color, fontFamily: mono, fontSize: 17, fontWeight: 700, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
          {p.short}
        </span>
        <div>
          <div style={{ fontFamily: mono, fontSize: 17, fontWeight: 700, color: C.text }}>{name}</div>
          <div style={{ fontFamily: mono, fontSize: 11, color: C.muted }}>
            {p.label} · {id?.chamber === "senate" ? "Senate" : "House"} · {id?.state}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
        <Stat label="Disclosures" value={stats.total} sub={`${stats.issuers} issuers`} />
        <Stat label="Buys / Sells" value={`${stats.buys}/${stats.sells}`} sub="filings" color={C.amber} />
        <Stat label="Est. volume" value={fmtUsd(vol)} sub="bracket midpoints" />
        <Stat label="Avg filing gap" value={stats.avgGap != null ? `${stats.avgGap}d` : "—"} sub="trade → disclosure" color={C.amber} />
      </div>

      {leaders.length > 0 && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
          {leaders.map((l) => (
            <button
              key={l.ticker}
              onClick={() => onSelectTicker?.(l.ticker)}
              title={`${l.issuer} — load in terminal`}
              style={{ fontFamily: mono, fontSize: 11, padding: "5px 10px", borderRadius: 6, cursor: "pointer", background: C.panel, border: `1px solid ${C.border}`, color: C.text, display: "inline-flex", gap: 7, alignItems: "center" }}
            >
              <span style={{ color: C.amber, fontWeight: 700 }}>{l.ticker}</span>
              <span style={{ color: C.muted }}>{l.count}×</span>
            </button>
          ))}
        </div>
      )}

      <TradesTable trades={mine} onSelectTicker={onSelectTicker} showPolitician={false} />
    </>
  );
}

export default function CongressView({ onSelect }) {
  const q = useCongress(null);
  const [search, setSearch] = useState("");
  const [party, setParty] = useState("all");
  const [chamber, setChamber] = useState("all");
  const [type, setType] = useState("all");
  const [pol, setPol] = useState(null); // selected politician → profile drill-down

  const all = q.data?.trades ?? [];
  const source = q.data?.source;

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return all
      .filter((t) => {
        if (party !== "all" && t.party !== party) return false;
        if (chamber !== "all" && t.chamber !== chamber) return false;
        if (type !== "all" && t.txType !== type) return false;
        if (needle && !`${t.politician} ${t.issuer} ${t.ticker}`.toLowerCase().includes(needle)) return false;
        return true;
      })
      .sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
  }, [all, search, party, chamber, type]);

  const stats = useMemo(() => summarize(filtered), [filtered]);
  const leaders = useMemo(() => topIssuers(filtered), [filtered]);

  return (
    <div style={{ fontFamily: sans }}>
      {/* header */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
        <span style={{ fontFamily: mono, fontWeight: 700, fontSize: 16, letterSpacing: "0.1em", color: C.amber }}>
          CAPITOL TRADES
        </span>
        <span style={{ fontFamily: mono, fontSize: 11.5, color: C.muted }}>
          US Congress stock disclosures — who's trading what, and how late they filed.
        </span>
        {source && (
          <span style={{ marginLeft: "auto", fontFamily: mono, fontSize: 10, letterSpacing: "0.08em", color: source === "sample" ? C.amber : C.bull, border: `1px solid ${source === "sample" ? C.amber : C.bull}66`, borderRadius: 5, padding: "3px 8px" }}>
            {source === "sample" ? "● SAMPLE DATA — live feed unavailable" : "● LIVE · capitoltrades.com"}
          </span>
        )}
      </div>

      {q.isPending ? (
        <Loading label="fetching congressional disclosures…" />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : pol ? (
        <PoliticianProfile name={pol} trades={all} onBack={() => setPol(null)} onSelectTicker={onSelect} />
      ) : (
        <>
          {/* stat tiles */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
            <Stat label="Disclosures" value={stats.total} sub={`${stats.politicians} members · ${stats.issuers} issuers`} />
            <Stat label="Buys" value={stats.buys} color={C.bull} sub="purchase filings" />
            <Stat label="Sells" value={stats.sells} color={C.bear} sub="sale filings" />
            <Stat label="Avg filing gap" value={stats.avgGap != null ? `${stats.avgGap}d` : "—"} sub="trade → disclosure" color={C.amber} />
          </div>

          {/* filter bar */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 14 }}>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search politician, company, ticker…"
              style={{ flex: "1 1 240px", minWidth: 0, fontFamily: mono, fontSize: 12, padding: "7px 11px", borderRadius: 6, background: C.panel2, border: `1px solid ${C.border}`, color: C.text, outline: "none" }}
            />
            <Segmented value={party} onChange={setParty} options={[{ v: "all", label: "ALL" }, { v: "democrat", label: "DEM" }, { v: "republican", label: "REP" }, { v: "independent", label: "IND" }]} />
            <Segmented value={chamber} onChange={setChamber} options={[{ v: "all", label: "BOTH" }, { v: "house", label: "HOUSE" }, { v: "senate", label: "SENATE" }]} />
            <Segmented value={type} onChange={setType} options={[{ v: "all", label: "ALL" }, { v: "buy", label: "BUY" }, { v: "sell", label: "SELL" }]} />
          </div>

          {/* most-traded leaderboard */}
          {leaders.length > 0 && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
              {leaders.map((l) => (
                <button
                  key={l.ticker}
                  onClick={() => onSelect?.(l.ticker)}
                  title={`${l.issuer} — load in terminal`}
                  style={{ fontFamily: mono, fontSize: 11, padding: "5px 10px", borderRadius: 6, cursor: "pointer", background: C.panel, border: `1px solid ${C.border}`, color: C.text, display: "inline-flex", gap: 7, alignItems: "center" }}
                >
                  <span style={{ color: C.amber, fontWeight: 700 }}>{l.ticker}</span>
                  <span style={{ color: C.muted }}>{l.count}×</span>
                </button>
              ))}
            </div>
          )}

          {/* trades table */}
          <TradesTable trades={filtered} onSelectTicker={onSelect} onSelectPolitician={setPol} />

          <div style={{ marginTop: 12, fontFamily: mono, fontSize: 10.5, color: C.muted, lineHeight: 1.6 }}>
            Disclosed under the STOCK Act; amounts are reported as brackets, not exact figures. A Capitol Trades–style
            view of US congressional filings · {filtered.length} of {all.length} trades shown.
          </div>
        </>
      )}
    </div>
  );
}
