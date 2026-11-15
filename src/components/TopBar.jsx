import { C, mono } from "../lib/theme";
import { fmt, assetMeta } from "../lib/assets";
import { useQuote } from "../hooks/useQuote";
import InstrumentPicker from "./InstrumentPicker";

function AssetTab({ sym, active, onSelect }) {
  const quote = useQuote(sym);
  const chg = quote.data?.changePct;
  return (
    <button
      onClick={onSelect}
      style={{
        fontFamily: mono,
        fontSize: 12,
        padding: "6px 10px",
        borderRadius: 6,
        cursor: "pointer",
        background: active ? "#1C2530" : "transparent",
        border: `1px solid ${active ? C.amber : C.border}`,
        color: active ? C.text : C.muted,
      }}
    >
      {sym}{" "}
      {chg == null ? (
        <span className={quote.isPending ? "live-pulse" : ""} style={{ color: C.muted }}>
          ··
        </span>
      ) : (
        <span style={{ color: chg >= 0 ? C.bull : C.bear }}>
          {chg >= 0 ? "▲" : "▼"}
          {Math.abs(chg).toFixed(2)}%
        </span>
      )}
    </button>
  );
}

const segBtn = (active) => ({
  fontFamily: mono,
  fontSize: 10.5,
  letterSpacing: "0.1em",
  padding: "5px 12px",
  borderRadius: 6,
  cursor: "pointer",
  background: active ? C.amber : "transparent",
  border: `1px solid ${active ? C.amber : C.border}`,
  color: active ? "#0D1117" : C.muted,
  fontWeight: active ? 700 : 400,
});

function ViewToggle({ view, setView }) {
  return (
    <div style={{ display: "flex", gap: 4 }}>
      <button style={segBtn(view === "terminal")} onClick={() => setView("terminal")}>
        TERMINAL
      </button>
      <button style={segBtn(view === "journal")} onClick={() => setView("journal")}>
        JOURNAL
      </button>
      <button style={segBtn(view === "congress")} onClick={() => setView("congress")}>
        CONGRESS
      </button>
    </div>
  );
}

export default function TopBar({ symbols, sym, setSym, onAdd, onExport, view = "terminal", setView }) {
  const meta = assetMeta(sym);
  const quote = useQuote(sym);
  const price = quote.data?.price;
  const updatedAt = quote.dataUpdatedAt || 0;
  const fresh = updatedAt > 0 && Date.now() - updatedAt < 6 * 60_000;
  const hideMarketUi = view !== "terminal"; // journal & congress views are global, not symbol-scoped

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", marginBottom: 14 }}>
      <div style={{ fontFamily: mono, fontWeight: 700, fontSize: 15, letterSpacing: "0.18em", color: C.amber }}>
        EDGE<span style={{ color: C.muted }}>WISE</span>
      </div>
      {setView && <ViewToggle view={view} setView={setView} />}
      {!hideMarketUi && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {symbols.map((s) => (
            <AssetTab key={s} sym={s} active={s === sym} onSelect={() => setSym(s)} />
          ))}
          <InstrumentPicker symbols={symbols} onAdd={onAdd} onSelect={setSym} />
        </div>
      )}
      <div style={{ marginLeft: "auto", fontFamily: mono, fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
        <button
          onClick={() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true }))}
          title="command palette"
          style={{ fontFamily: mono, fontSize: 11, padding: "4px 8px", borderRadius: 6, cursor: "pointer", background: "transparent", border: `1px solid ${C.border}`, color: C.muted }}
        >
          ⌘K
        </button>
        {!hideMarketUi && onExport && (
          <button
            onClick={onExport}
            title="export dashboard as PNG"
            style={{ fontFamily: mono, fontSize: 11, padding: "4px 8px", borderRadius: 6, cursor: "pointer", background: "transparent", border: `1px solid ${C.border}`, color: C.muted }}
          >
            ⤓ PNG
          </button>
        )}
        {!hideMarketUi && (
          <>
            <span style={{ color: C.muted }}>{quote.data?.name ?? meta.name} · </span>
            <span style={{ fontSize: 16, fontWeight: 700 }}>{price != null ? fmt(price, meta.sym) : "—"}</span>
            <span
              className={fresh ? "live-pulse" : ""}
              title={fresh ? "live — recently updated" : "awaiting fresh data"}
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: fresh ? C.amber : C.grid,
                boxShadow: fresh ? `0 0 6px ${C.amber}88` : "none",
              }}
            />
          </>
        )}
      </div>
    </div>
  );
}
