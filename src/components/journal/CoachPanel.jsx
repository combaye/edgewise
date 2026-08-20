import { useRef, useState } from "react";
import { C, mono } from "../../lib/theme";
import { Panel } from "../Panel";
import RichText from "../RichText";

const btnStyle = (disabled) => ({
  fontFamily: mono,
  fontSize: 10,
  letterSpacing: "0.1em",
  padding: "5px 14px",
  borderRadius: 6,
  cursor: disabled ? "default" : "pointer",
  background: "transparent",
  border: `1px solid ${C.amber}`,
  color: C.amber,
  opacity: disabled ? 0.5 : 1,
});

// Compact, privacy-light snapshot for the coach: aggregate stats + the detected
// behavioral insights + a short recent-trades tail. No need to ship raw history.
function buildPayload(stats, insights) {
  const r3 = (x) => (x == null ? null : Math.round(x * 1000) / 1000);
  const brk = (g) => g.rows.slice(0, 6).map((r) => ({ key: r.key, n: r.n, winRate: r3(r.winRate), net: Math.round(r.net), expR: r3(r.expectancyR) }));
  return {
    summary: {
      closed: stats.nClosed,
      open: stats.nOpen,
      net: Math.round(stats.net),
      winRate: r3(stats.winRate),
      expectancyR: r3(stats.expectancyR),
      profitFactor: stats.profitFactor === Infinity ? "inf" : r3(stats.profitFactor),
      payoff: r3(stats.payoff),
      maxDrawdown: Math.round(stats.maxDD),
      maxLossStreak: stats.maxLossStreak,
      disciplinePct: r3(stats.disciplinePct),
      disciplineStreak: stats.disciplineStreak,
    },
    insights: insights.map((i) => ({ id: i.id, severity: i.severity, title: i.title, detail: i.detail })),
    breakdowns: { setup: brk(stats.breakdowns.setup), weekday: brk(stats.breakdowns.weekday), emotion: brk(stats.breakdowns.emotion) },
    recentTrades: stats.closed.slice(-12).map((t) => ({
      sym: t.symbol,
      dir: t.dir === 1 ? "long" : "short",
      R: r3(t.R),
      pnl: t.pnl == null ? null : Math.round(t.pnl),
      setup: t.setup,
      emotion: t.emotion,
      rulesBroken: t.rulesBroken,
    })),
  };
}

export default function CoachPanel({ stats, insights }) {
  const [text, setText] = useState("");
  const [status, setStatus] = useState("idle"); // idle | streaming | done | error | nokey
  const [error, setError] = useState("");
  const abortRef = useRef(null);
  const ready = !stats.empty && stats.nClosed >= 3;

  async function run() {
    if (!ready || status === "streaming") return;
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setText("");
    setError("");
    setStatus("streaming");
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode: "journal", payload: buildPayload(stats, insights) }),
        signal: ctrl.signal,
      });
      const ct = res.headers.get("content-type") || "";
      if (ct.includes("application/json")) {
        const j = await res.json();
        if (j.error === "missing_key") setStatus("nokey");
        else {
          setError(j.error || "AI request failed");
          setStatus("error");
        }
        return;
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        setText((t) => t + dec.decode(value, { stream: true }));
      }
      setStatus("done");
    } catch (e) {
      if (e?.name === "AbortError") return;
      setError(e?.message || "network error");
      setStatus("error");
    }
  }

  return (
    <Panel
      title="AI Trading Coach"
      style={{ marginBottom: 14 }}
      right={
        <button onClick={run} disabled={!ready || status === "streaming"} style={btnStyle(!ready || status === "streaming")}>
          {status === "streaming" ? "COACHING…" : text ? "REGENERATE PLAN" : "BUILD MY PLAN"}
        </button>
      }
    >
      {status === "nokey" ? (
        <div style={{ fontFamily: mono, fontSize: 11.5, color: C.muted, lineHeight: 1.7 }}>
          <span style={{ color: C.amber }}>AI coach is off.</span> Add{" "}
          <span style={{ color: C.text }}>ANTHROPIC_API_KEY</span> to your <span style={{ color: C.text }}>.env</span>{" "}
          (server-side) and restart. The coach reads your stats and behavioral patterns and writes a personalized
          improvement plan. The rule-based plan in the panel above always works without a key.
        </div>
      ) : !ready ? (
        <div style={{ fontFamily: mono, fontSize: 11.5, color: C.muted, lineHeight: 1.7 }}>
          Log at least 3 closed trades and the coach (Claude Opus 4.8) will read your full performance and behavioral
          profile — win rate, expectancy, discipline, your detected leaks — and write a concrete plan: what's working,
          what's costing you, and the specific changes to make next.
        </div>
      ) : status === "idle" && !text ? (
        <div style={{ fontFamily: mono, fontSize: 11.5, color: C.muted, lineHeight: 1.7 }}>
          Press <span style={{ color: C.amber }}>BUILD MY PLAN</span> — the coach reads every computed stat and the
          {" "}{insights.length} detected behavioral pattern{insights.length === 1 ? "" : "s"} and writes your
          personalized improvement plan.
        </div>
      ) : (
        <>
          <RichText text={text} />
          {status === "streaming" && (
            <span className="live-pulse" style={{ display: "inline-block", marginTop: 4, color: C.amber, fontFamily: mono }}>
              ▌
            </span>
          )}
          {status === "error" && <div style={{ fontFamily: mono, fontSize: 11.5, color: C.bear }}>⚠ {error}</div>}
        </>
      )}
    </Panel>
  );
}
