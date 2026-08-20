import { useEffect, useRef, useState } from "react";
import { C, mono } from "../lib/theme";
import { CATALOG } from "../lib/catalog";
import { assetMeta } from "../lib/assets";

const typeColor = {
  etf: C.amber,
  index: C.amber,
  stock: C.text,
  crypto: "#b88af0",
  fx: "#5fb8d8",
  commodity: "#e0b341",
};

// Dropdown that browses the categorized instrument catalog. Clicking a chip
// adds it to the watchlist (or just selects it if already present).
export default function InstrumentPicker({ symbols, onAdd, onSelect }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onEsc = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  const inWatch = new Set(symbols);
  const query = q.trim().toUpperCase();
  const matches = (sym, name) => !query || sym.includes(query) || name.toUpperCase().includes(query);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          fontFamily: mono,
          fontSize: 12,
          padding: "6px 12px",
          borderRadius: 6,
          cursor: "pointer",
          background: open ? "#1C2530" : "transparent",
          border: `1px solid ${C.amber}`,
          color: C.amber,
          letterSpacing: "0.05em",
        }}
      >
        + INSTRUMENTS
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            zIndex: 50,
            width: 460,
            maxWidth: "90vw",
            maxHeight: 460,
            overflowY: "auto",
            background: C.panel,
            border: `1px solid ${C.border}`,
            borderRadius: 8,
            boxShadow: "0 12px 32px #000a",
            padding: 12,
          }}
        >
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="filter instruments…"
            spellCheck={false}
            style={{
              width: "100%",
              boxSizing: "border-box",
              fontFamily: mono,
              fontSize: 12,
              padding: "6px 10px",
              borderRadius: 6,
              background: C.panel2,
              border: `1px solid ${C.border}`,
              color: C.text,
              outline: "none",
              marginBottom: 10,
            }}
          />

          {CATALOG.map((cat) => {
            const items = cat.syms
              .map((s) => ({ s, meta: assetMeta(s) }))
              .filter(({ s, meta }) => matches(s, meta.name));
            if (!items.length) return null;
            return (
              <div key={cat.group} style={{ marginBottom: 12 }}>
                <div style={{ fontFamily: mono, fontSize: 10, letterSpacing: "0.14em", color: C.muted, marginBottom: 6 }}>
                  {cat.group.toUpperCase()}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {items.map(({ s, meta }) => {
                    const added = inWatch.has(meta.sym);
                    return (
                      <button
                        key={s}
                        title={meta.name}
                        onClick={() => {
                          if (added) onSelect(meta.sym);
                          else onAdd(meta.sym);
                          setOpen(false);
                        }}
                        style={{
                          fontFamily: mono,
                          fontSize: 11,
                          padding: "5px 9px",
                          borderRadius: 6,
                          cursor: "pointer",
                          background: added ? "#1C2530" : C.panel2,
                          border: `1px solid ${added ? C.amber : C.border}`,
                          color: typeColor[meta.type] || C.text,
                          display: "flex",
                          alignItems: "center",
                          gap: 5,
                        }}
                      >
                        {added && <span style={{ color: C.amber }}>✓</span>}
                        <span style={{ fontWeight: 700 }}>{meta.sym}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
