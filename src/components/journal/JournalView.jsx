import { useMemo, useState } from "react";
import { C, mono, sans } from "../../lib/theme";
import { useJournal } from "../../hooks/useJournal";
import { computeStats } from "../../lib/journal";
import { detectPatterns } from "../../lib/behavior";
import StatTiles from "./StatTiles";
import EquityCurve from "./EquityCurve";
import DisciplineStreak from "./DisciplineStreak";
import PnlCalendar from "./PnlCalendar";
import BreakdownPanel from "./BreakdownPanel";
import BehaviorPanel from "./BehaviorPanel";
import CoachPanel from "./CoachPanel";
import SignalScorecard from "./SignalScorecard";
import TradeTable from "./TradeTable";
import TradeForm from "./TradeForm";

const btn = (primary) => ({
  fontFamily: mono,
  fontSize: 11,
  letterSpacing: "0.08em",
  padding: "7px 16px",
  borderRadius: 6,
  cursor: "pointer",
  background: primary ? C.amber : "transparent",
  border: `1px solid ${primary ? C.amber : C.border}`,
  color: primary ? "#0D1117" : C.muted,
  fontWeight: primary ? 700 : 400,
});

const gridWide = { display: "grid", gridTemplateColumns: "minmax(0,2.1fr) minmax(280px,1fr)", gap: 14 };
const gridEven = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px,1fr))", gap: 14 };

function EmptyState({ onAdd, onSample }) {
  return (
    <div
      style={{
        border: `1px dashed ${C.border}`,
        borderRadius: 10,
        padding: "48px 24px",
        textAlign: "center",
        background: C.panel,
      }}
    >
      <div style={{ fontFamily: sans, fontSize: 20, fontWeight: 700, color: C.text, marginBottom: 8 }}>
        Your trading journal is empty
      </div>
      <div style={{ fontFamily: mono, fontSize: 12, color: C.muted, lineHeight: 1.7, maxWidth: 520, margin: "0 auto 22px" }}>
        Log every trade with its setup, your pre-trade emotion, and whether you followed your plan. The journal turns
        that into performance analytics, a behavioral-pattern engine, and a personalized improvement plan — so you
        actually learn from your own tape.
      </div>
      <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
        <button style={btn(true)} onClick={onAdd}>
          + LOG YOUR FIRST TRADE
        </button>
        <button style={btn(false)} onClick={onSample}>
          LOAD SAMPLE DATA
        </button>
      </div>
    </div>
  );
}

export default function JournalView() {
  const { trades, addTrade, updateTrade, deleteTrade, clearAll, loadSamples } = useJournal();
  const [form, setForm] = useState(null); // null | {} | trade

  const stats = useMemo(() => computeStats(trades), [trades]);
  const insights = useMemo(() => detectPatterns(stats), [stats]);

  const submit = (data) => {
    if (form?.id) updateTrade(form.id, data);
    else addTrade(data);
    setForm(null);
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontFamily: mono, fontSize: 13, letterSpacing: "0.16em", color: C.amber }}>TRADING JOURNAL</div>
          <div style={{ fontFamily: mono, fontSize: 10.5, color: C.muted, marginTop: 2 }}>
            log · analyze · recognize patterns · improve
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {trades.length > 0 && (
            <button style={btn(false)} onClick={() => window.confirm("Clear all journal entries? This cannot be undone.") && clearAll()}>
              CLEAR ALL
            </button>
          )}
          <button style={btn(true)} onClick={() => setForm({})}>
            + LOG TRADE
          </button>
        </div>
      </div>

      {trades.length === 0 ? (
        <EmptyState onAdd={() => setForm({})} onSample={loadSamples} />
      ) : stats.empty ? (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontFamily: mono, fontSize: 12, color: C.muted, padding: "16px", border: `1px solid ${C.border}`, borderRadius: 8, background: C.panel }}>
            {stats.nOpen} open position{stats.nOpen === 1 ? "" : "s"} logged, no closed trades yet. Close a trade (add an
            exit price) to unlock performance analytics.
          </div>
        </div>
      ) : (
        <>
          <StatTiles stats={stats} />
          <div style={gridWide}>
            <EquityCurve stats={stats} />
            <DisciplineStreak stats={stats} />
          </div>
          <div style={gridEven}>
            <PnlCalendar stats={stats} />
            <BreakdownPanel stats={stats} />
          </div>
          <div style={gridEven}>
            <BehaviorPanel stats={stats} insights={insights} />
            <CoachPanel stats={stats} insights={insights} />
          </div>
          <SignalScorecard stats={stats} />
        </>
      )}

      {trades.length > 0 && <TradeTable stats={stats} onEdit={(t) => setForm(t)} onDelete={deleteTrade} />}

      {form && <TradeForm initial={form} onSubmit={submit} onCancel={() => setForm(null)} />}
    </div>
  );
}
