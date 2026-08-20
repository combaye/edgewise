import { useMemo, useState } from "react";
import { C, mono } from "../../lib/theme";
import { EMOTIONS, RULES, enrichTrade, signed } from "../../lib/journal";

const SETUPS = ["breakout", "reversal", "pullback", "trend", "news-fade", "range", "scalp"];

const field = {
  fontFamily: mono,
  fontSize: 12,
  padding: "7px 9px",
  borderRadius: 6,
  background: C.panel2,
  border: `1px solid ${C.border}`,
  color: C.text,
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
};
const lbl = { fontFamily: mono, fontSize: 9.5, letterSpacing: "0.1em", color: C.muted, marginBottom: 4, display: "block", textTransform: "uppercase" };

function Chip({ active, onClick, color = C.amber, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        fontFamily: mono,
        fontSize: 10.5,
        padding: "4px 10px",
        borderRadius: 14,
        cursor: "pointer",
        background: active ? "#1C2530" : "transparent",
        border: `1px solid ${active ? color : C.border}`,
        color: active ? C.text : C.muted,
        textTransform: "capitalize",
      }}
    >
      {children}
    </button>
  );
}

const nowLocal = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
};

const blank = () => ({
  symbol: "",
  direction: "long",
  entryPrice: "",
  exitPrice: "",
  size: "",
  fees: "",
  entryDate: nowLocal(),
  exitDate: "",
  setup: "",
  plannedStop: "",
  plannedTarget: "",
  followedPlan: true,
  emotion: "calm",
  rulesBroken: [],
  rating: 3,
  notes: "",
});

// ISO (or Date) → value a <input type="datetime-local"> accepts, in local time
const toLocalInput = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
};

export default function TradeForm({ initial, onSubmit, onCancel }) {
  const [f, setF] = useState(() => {
    const base = { ...blank(), ...(initial || {}) };
    if (initial?.entryDate) base.entryDate = toLocalInput(initial.entryDate);
    if (initial?.exitDate) base.exitDate = toLocalInput(initial.exitDate);
    return base;
  });
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target?.value ?? e }));
  const toggleRule = (r) => setF((s) => ({ ...s, rulesBroken: s.rulesBroken.includes(r) ? s.rulesBroken.filter((x) => x !== r) : [...s.rulesBroken, r] }));

  // live R / R:R preview off the in-progress values
  const preview = useMemo(() => {
    const t = enrichTrade({ ...f, entryDate: f.entryDate || null, exitDate: f.exitDate || null });
    return { pnl: t.pnl, R: t.R, rr: t.plannedRR };
  }, [f]);

  const submit = (e) => {
    e.preventDefault();
    if (!f.symbol.trim() || f.entryPrice === "" || f.size === "") return;
    onSubmit({
      ...f,
      symbol: f.symbol.trim().toUpperCase(),
      setup: f.setup.trim(),
      entryDate: f.entryDate ? new Date(f.entryDate).toISOString() : null,
      exitDate: f.exitDate ? new Date(f.exitDate).toISOString() : null,
      followedPlan: f.rulesBroken.length === 0 ? f.followedPlan : false,
    });
  };

  return (
    <div
      onClick={onCancel}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(5,8,12,0.72)",
        zIndex: 50,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "5vh 16px",
        overflowY: "auto",
      }}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        style={{
          width: "min(620px, 100%)",
          background: C.panel,
          border: `1px solid ${C.border}`,
          borderRadius: 10,
          padding: 18,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <span style={{ fontFamily: mono, fontSize: 12, letterSpacing: "0.14em", color: C.amber, textTransform: "uppercase" }}>
            {initial?.id ? "Edit trade" : "Log a trade"}
          </span>
          <button type="button" onClick={onCancel} style={{ background: "transparent", border: "none", color: C.muted, cursor: "pointer", fontSize: 18, fontFamily: mono }}>
            ×
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 12 }}>
          <div style={{ gridColumn: "span 2" }}>
            <label style={lbl}>Symbol *</label>
            <input style={field} value={f.symbol} onChange={set("symbol")} placeholder="NVDA" spellCheck={false} autoFocus />
          </div>
          <div style={{ gridColumn: "span 2" }}>
            <label style={lbl}>Direction</label>
            <div style={{ display: "flex", gap: 6 }}>
              <Chip active={f.direction === "long"} color={C.bull} onClick={() => set("direction")("long")}>
                long
              </Chip>
              <Chip active={f.direction === "short"} color={C.bear} onClick={() => set("direction")("short")}>
                short
              </Chip>
            </div>
          </div>
          <div>
            <label style={lbl}>Entry *</label>
            <input style={field} value={f.entryPrice} onChange={set("entryPrice")} inputMode="decimal" placeholder="123.0" />
          </div>
          <div>
            <label style={lbl}>Exit</label>
            <input style={field} value={f.exitPrice} onChange={set("exitPrice")} inputMode="decimal" placeholder="open" />
          </div>
          <div>
            <label style={lbl}>Size *</label>
            <input style={field} value={f.size} onChange={set("size")} inputMode="decimal" placeholder="100" />
          </div>
          <div>
            <label style={lbl}>Fees</label>
            <input style={field} value={f.fees} onChange={set("fees")} inputMode="decimal" placeholder="0" />
          </div>
          <div>
            <label style={lbl}>Stop</label>
            <input style={field} value={f.plannedStop} onChange={set("plannedStop")} inputMode="decimal" placeholder="enables R" />
          </div>
          <div>
            <label style={lbl}>Target</label>
            <input style={field} value={f.plannedTarget} onChange={set("plannedTarget")} inputMode="decimal" placeholder="opt." />
          </div>
          <div style={{ gridColumn: "span 2" }}>
            <label style={lbl}>Setup</label>
            <input style={field} value={f.setup} onChange={set("setup")} list="setup-suggestions" placeholder="breakout" spellCheck={false} />
            <datalist id="setup-suggestions">
              {SETUPS.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </div>
          <div style={{ gridColumn: "span 2" }}>
            <label style={lbl}>Entry time</label>
            <input style={field} type="datetime-local" value={f.entryDate} onChange={set("entryDate")} />
          </div>
          <div style={{ gridColumn: "span 2" }}>
            <label style={lbl}>Exit time</label>
            <input style={field} type="datetime-local" value={f.exitDate} onChange={set("exitDate")} />
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={lbl}>Pre-trade emotion</label>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {EMOTIONS.map((em) => (
              <Chip key={em} active={f.emotion === em} onClick={() => set("emotion")(em)}>
                {em}
              </Chip>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={lbl}>Rules broken (leave empty if you followed your plan)</label>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {RULES.map((r) => (
              <Chip key={r} active={f.rulesBroken.includes(r)} color={C.bear} onClick={() => toggleRule(r)}>
                {r}
              </Chip>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={lbl}>Notes</label>
          <textarea style={{ ...field, minHeight: 54, resize: "vertical" }} value={f.notes} onChange={set("notes")} placeholder="What did you see? How did you execute?" />
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div style={{ fontFamily: mono, fontSize: 11.5, color: C.muted, display: "flex", gap: 14 }}>
            <span>
              P&L: <span style={{ color: preview.pnl == null ? C.muted : preview.pnl >= 0 ? C.bull : C.bear }}>{preview.pnl == null ? "open" : `$${preview.pnl.toFixed(0)}`}</span>
            </span>
            <span>
              R: <span style={{ color: preview.R == null ? C.muted : preview.R >= 0 ? C.bull : C.bear }}>{preview.R == null ? "—" : `${signed(preview.R, 2)}`}</span>
            </span>
            <span>
              R:R <span style={{ color: C.text }}>{preview.rr == null ? "—" : `${preview.rr.toFixed(1)}:1`}</span>
            </span>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" onClick={onCancel} style={{ fontFamily: mono, fontSize: 11, padding: "7px 16px", borderRadius: 6, cursor: "pointer", background: "transparent", border: `1px solid ${C.border}`, color: C.muted }}>
              CANCEL
            </button>
            <button type="submit" style={{ fontFamily: mono, fontSize: 11, letterSpacing: "0.08em", padding: "7px 18px", borderRadius: 6, cursor: "pointer", background: C.amber, border: `1px solid ${C.amber}`, color: "#0D1117", fontWeight: 700 }}>
              {initial?.id ? "SAVE" : "LOG TRADE"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
