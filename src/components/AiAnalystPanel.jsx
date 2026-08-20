import { useRef, useState } from "react";
import { C, mono } from "../lib/theme";
import { Panel } from "./Panel";
import RichText from "./RichText";

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

export default function AiAnalystPanel({ snapshot, sym }) {
  const [text, setText] = useState("");
  const [status, setStatus] = useState("idle"); // idle | streaming | done | error | nokey
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const abortRef = useRef(null);

  const ready = Boolean(snapshot);

  async function run(mode, question) {
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
        body: JSON.stringify({ mode, payload: snapshot, question }),
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

  const submitAsk = (e) => {
    e.preventDefault();
    const question = q.trim();
    if (question) run("ask", question);
  };

  return (
    <Panel
      title={`AI Analyst — ${sym}`}
      style={{ marginBottom: 14 }}
      right={
        <button onClick={() => run("brief")} disabled={!ready || status === "streaming"} style={btnStyle(!ready || status === "streaming")}>
          {status === "streaming" ? "ANALYZING…" : text ? "REGENERATE BRIEF" : "GENERATE BRIEF"}
        </button>
      }
    >
      {status === "nokey" ? (
        <div style={{ fontFamily: mono, fontSize: 11.5, color: C.muted, lineHeight: 1.7 }}>
          <span style={{ color: C.amber }}>AI analyst is off.</span> Add{" "}
          <span style={{ color: C.text }}>ANTHROPIC_API_KEY</span> to your <span style={{ color: C.text }}>.env</span>{" "}
          (server-side, from console.anthropic.com) and restart the dev server. It reads every signal on this
          dashboard and writes a thesis, the drivers, and the risks — and answers questions about the instrument.
        </div>
      ) : status === "idle" && !text ? (
        <div style={{ fontFamily: mono, fontSize: 11.5, color: C.muted, lineHeight: 1.7 }}>
          Claude (Opus 4.8) reads the full dashboard — pattern forecast, seasonality, technicals, volatility regime,
          valuation, trade plan — and writes a concise analyst brief. Press{" "}
          <span style={{ color: C.amber }}>GENERATE BRIEF</span>, or ask a question below.
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

      {status !== "nokey" && (
        <form onSubmit={submitAsk} style={{ display: "flex", gap: 6, marginTop: 12 }}>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={`ask about ${sym}… e.g. "do the signals agree?" or "what's the bear case?"`}
            spellCheck={false}
            disabled={!ready}
            style={{
              flex: 1,
              fontFamily: mono,
              fontSize: 11.5,
              padding: "6px 10px",
              borderRadius: 6,
              background: C.panel2,
              border: `1px solid ${C.border}`,
              color: C.text,
              outline: "none",
            }}
          />
          <button type="submit" disabled={!ready || status === "streaming" || !q.trim()} style={btnStyle(!ready || status === "streaming" || !q.trim())}>
            ASK
          </button>
        </form>
      )}
    </Panel>
  );
}
