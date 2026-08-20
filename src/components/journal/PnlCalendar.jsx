import { C, mono } from "../../lib/theme";
import { Panel } from "../Panel";
import { money } from "../../lib/journal";

const WD = ["M", "T", "W", "T", "F", "S", "S"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// mon=0..6 with Monday first (matches the WD header)
const mondayIndex = (jsDay) => (jsDay + 6) % 7;

function cellColor(pnl, maxAbs) {
  if (pnl == null) return { bg: C.panel2, fg: C.muted };
  const mag = maxAbs > 0 ? Math.min(1, Math.abs(pnl) / maxAbs) : 0;
  const a = 0.18 + mag * 0.62;
  const base = pnl >= 0 ? C.bull : C.bear;
  return { bg: hexA(base, a), fg: mag > 0.55 ? "#0D1117" : C.text };
}
// blend a hex over the panel background at alpha a (so text stays legible)
function hexA(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const bg = [13, 17, 23];
  const mix = (c, i) => Math.round(c * a + bg[i] * (1 - a));
  return `rgb(${mix(r, 0)}, ${mix(g, 1)}, ${mix(b, 2)})`;
}

function MonthGrid({ year, month, daily, maxAbs }) {
  const first = new Date(year, month, 1);
  const days = new Date(year, month + 1, 0).getDate();
  const lead = mondayIndex(first.getDay());
  const cells = [];
  for (let i = 0; i < lead; i++) cells.push(null);
  for (let d = 1; d <= days; d++) {
    const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    cells.push({ d, pnl: daily[key] ?? null });
  }
  return (
    <div style={{ minWidth: 210 }}>
      <div style={{ fontFamily: mono, fontSize: 10.5, letterSpacing: "0.1em", color: C.muted, marginBottom: 6 }}>
        {MONTHS[month]} {year}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3 }}>
        {WD.map((w, i) => (
          <div key={`h${i}`} style={{ fontFamily: mono, fontSize: 8.5, color: C.muted, textAlign: "center" }}>
            {w}
          </div>
        ))}
        {cells.map((c, i) => {
          if (!c) return <div key={i} />;
          const { bg, fg } = cellColor(c.pnl, maxAbs);
          const traded = c.pnl != null;
          return (
            <div
              key={i}
              title={traded ? `${MONTHS[month]} ${c.d}: ${money(c.pnl, 0)}` : `${MONTHS[month]} ${c.d}`}
              style={{
                aspectRatio: "1 / 1",
                borderRadius: 4,
                background: bg,
                border: `1px solid ${traded ? "transparent" : C.border}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: mono,
                fontSize: 9.5,
                color: fg,
              }}
            >
              {c.d}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function PnlCalendar({ stats }) {
  if (stats.empty) return null;
  const keys = Object.keys(stats.daily);
  if (keys.length === 0) return null;
  const maxAbs = Math.max(...Object.values(stats.daily).map((v) => Math.abs(v)));

  // distinct year-months present, sorted, capped to the last 3 for layout
  const months = [...new Set(keys.map((k) => k.slice(0, 7)))].sort().slice(-3);

  const greenDays = Object.values(stats.daily).filter((v) => v > 0).length;
  const redDays = Object.values(stats.daily).filter((v) => v < 0).length;

  return (
    <Panel
      title="P&L calendar"
      style={{ marginBottom: 14 }}
      right={
        <span style={{ fontFamily: mono, fontSize: 10, color: C.muted }}>
          <span style={{ color: C.bull }}>{greenDays} green</span> · <span style={{ color: C.bear }}>{redDays} red</span>
        </span>
      }
    >
      <div style={{ display: "flex", gap: 22, flexWrap: "wrap" }}>
        {months.map((ym) => {
          const [y, m] = ym.split("-").map(Number);
          return <MonthGrid key={ym} year={y} month={m - 1} daily={stats.daily} maxAbs={maxAbs} />;
        })}
      </div>
    </Panel>
  );
}
