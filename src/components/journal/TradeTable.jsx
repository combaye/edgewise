import { useMemo, useState } from "react";
import { C, mono } from "../../lib/theme";
import { Panel } from "../Panel";
import { money, signed, holdLabel } from "../../lib/journal";

const COLS = [
  { k: "sortTs", label: "Date", w: "1.2fr", align: "left" },
  { k: "symbol", label: "Sym", w: "0.8fr", align: "left" },
  { k: "dir", label: "Side", w: "0.7fr", align: "left" },
  { k: "setup", label: "Setup", w: "1fr", align: "left" },
  { k: "R", label: "R", w: "0.7fr", align: "right" },
  { k: "pnl", label: "P&L", w: "1fr", align: "right" },
  { k: "holdMs", label: "Hold", w: "0.7fr", align: "right" },
];

const th = (align) => ({ fontFamily: mono, fontSize: 9.5, letterSpacing: "0.1em", color: C.muted, textTransform: "uppercase", textAlign: align, cursor: "pointer", userSelect: "none" });

export default function TradeTable({ stats, onEdit, onDelete }) {
  const [sort, setSort] = useState({ k: "sortTs", dir: -1 });
  const rows = useMemo(() => {
    const xs = [...stats.all];
    const { k, dir } = sort;
    xs.sort((a, b) => {
      const av = a[k] ?? -Infinity;
      const bv = b[k] ?? -Infinity;
      if (typeof av === "string") return dir * av.localeCompare(bv);
      return dir * (av - bv);
    });
    return xs;
  }, [stats.all, sort]);

  const clickSort = (k) => setSort((s) => ({ k, dir: s.k === k ? -s.dir : -1 }));
  const grid = COLS.map((c) => c.w).join(" ") + " 60px";

  if (stats.all.length === 0) return null;

  return (
    <Panel title="Trade log" right={<span style={{ fontFamily: mono, fontSize: 10, color: C.muted }}>{stats.all.length} trades</span>}>
      <div style={{ display: "grid", gridTemplateColumns: grid, gap: 8, padding: "0 4px 8px", borderBottom: `1px solid ${C.border}` }}>
        {COLS.map((c) => (
          <span key={c.k} style={th(c.align)} onClick={() => clickSort(c.k)}>
            {c.label}
            {sort.k === c.k ? (sort.dir === -1 ? " ↓" : " ↑") : ""}
          </span>
        ))}
        <span />
      </div>
      <div style={{ maxHeight: 380, overflowY: "auto" }}>
        {rows.map((t) => (
          <div
            key={t.id}
            style={{
              display: "grid",
              gridTemplateColumns: grid,
              gap: 8,
              padding: "7px 4px",
              borderBottom: `1px solid ${C.grid}`,
              fontFamily: mono,
              fontSize: 11,
              alignItems: "center",
            }}
          >
            <span style={{ color: C.muted }}>{t.sortTs ? new Date(t.sortTs).toISOString().slice(5, 10) : "—"}</span>
            <span style={{ color: C.text }}>{t.symbol}</span>
            <span style={{ color: t.dir === 1 ? C.bull : C.bear }}>{t.dir === 1 ? "LONG" : "SHORT"}</span>
            <span style={{ color: C.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {t.setup || "—"}
              {t.rulesBroken.length > 0 && <span style={{ color: C.bear }}> ⚑</span>}
            </span>
            <span style={{ textAlign: "right", color: t.R == null ? C.muted : t.R >= 0 ? C.bull : C.bear }}>{t.R == null ? "—" : signed(t.R, 1)}</span>
            <span style={{ textAlign: "right", color: t.open ? C.amber : t.pnl >= 0 ? C.bull : C.bear }}>{t.open ? "OPEN" : money(t.pnl, 0)}</span>
            <span style={{ textAlign: "right", color: C.muted }}>{holdLabel(t.holdMs)}</span>
            <span style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
              <button onClick={() => onEdit(t)} title="edit" style={{ background: "transparent", border: "none", color: C.muted, cursor: "pointer", fontSize: 12 }}>
                ✎
              </button>
              <button onClick={() => onDelete(t.id)} title="delete" style={{ background: "transparent", border: "none", color: C.muted, cursor: "pointer", fontSize: 12 }}>
                ✕
              </button>
            </span>
          </div>
        ))}
      </div>
    </Panel>
  );
}
