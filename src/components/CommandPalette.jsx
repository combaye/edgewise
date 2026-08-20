import { useEffect, useMemo, useRef, useState } from "react";
import { C, mono } from "../lib/theme";

// Bloomberg-style command bar. Ctrl/Cmd-K opens it; type to filter instruments
// and actions; ↑/↓ to move, Enter to run, Esc to close. `items` come from App.
export default function CommandPalette({ items }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) {
      setQ("");
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  const filtered = useMemo(() => {
    const query = q.trim().toUpperCase();
    const list = !query
      ? items
      : items.filter((it) => it.label.toUpperCase().includes(query) || (it.hint || "").toUpperCase().includes(query));
    return list.slice(0, 60);
  }, [q, items]);

  useEffect(() => {
    if (active >= filtered.length) setActive(0);
  }, [filtered, active]);

  if (!open) return null;

  const run = (it) => {
    if (!it) return;
    setOpen(false);
    it.run();
  };

  const onKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      run(filtered[active]);
    }
  };

  return (
    <div
      onMouseDown={() => setOpen(false)}
      style={{ position: "fixed", inset: 0, zIndex: 1000, background: "#000a", display: "flex", justifyContent: "center", paddingTop: "12vh" }}
    >
      <div
        onMouseDown={(e) => e.stopPropagation()}
        style={{ width: 560, maxWidth: "92vw", height: "fit-content", maxHeight: "70vh", display: "flex", flexDirection: "column", background: C.panel, border: `1px solid ${C.amber}`, borderRadius: 10, boxShadow: "0 20px 60px #000c", overflow: "hidden" }}
      >
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="jump to an instrument or run a command…"
          spellCheck={false}
          style={{ fontFamily: mono, fontSize: 14, padding: "14px 16px", background: "transparent", border: "none", borderBottom: `1px solid ${C.border}`, color: C.text, outline: "none" }}
        />
        <div style={{ overflowY: "auto" }}>
          {filtered.length === 0 ? (
            <div style={{ fontFamily: mono, fontSize: 12, color: C.muted, padding: "16px" }}>no matches</div>
          ) : (
            filtered.map((it, i) => (
              <div
                key={it.id}
                onMouseEnter={() => setActive(i)}
                onClick={() => run(it)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "9px 16px",
                  cursor: "pointer",
                  background: i === active ? "#1C2530" : "transparent",
                  borderLeft: `2px solid ${i === active ? C.amber : "transparent"}`,
                }}
              >
                <span style={{ fontFamily: mono, fontSize: 9.5, letterSpacing: "0.08em", color: it.kind === "action" ? C.amber : C.muted, width: 60, textTransform: "uppercase" }}>
                  {it.tag}
                </span>
                <span style={{ fontFamily: mono, fontSize: 13, color: C.text, fontWeight: 700 }}>{it.label}</span>
                {it.hint && <span style={{ fontFamily: mono, fontSize: 11, color: C.muted, marginLeft: "auto" }}>{it.hint}</span>}
              </div>
            ))
          )}
        </div>
        <div style={{ fontFamily: mono, fontSize: 10, color: C.muted, padding: "8px 16px", borderTop: `1px solid ${C.border}`, display: "flex", gap: 14 }}>
          <span>↑↓ navigate</span>
          <span>↵ run</span>
          <span>esc close</span>
          <span style={{ marginLeft: "auto" }}>⌘/ctrl K</span>
        </div>
      </div>
    </div>
  );
}
