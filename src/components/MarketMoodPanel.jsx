import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import { C, mono } from "../lib/theme";
import { historicalQueryOptions } from "../hooks/useHistorical";
import { computeMarketMood } from "../lib/mood";
import { Panel, EmptyState, Loading } from "./Panel";

// 0–100 fear↔greed scale → color (red fear, amber neutral, green greed)
const moodColor = (s) => (s >= 62 ? C.bull : s <= 38 ? C.bear : C.amber);

// semicircular needle gauge
function Gauge({ score }) {
  const angle = -90 + (score / 100) * 180; // -90° (fear) .. +90° (greed)
  const cx = 100, cy = 100, r = 84;
  const arc = (from, to, color, width) => {
    const a0 = ((from / 100) * 180 - 180) * (Math.PI / 180);
    const a1 = ((to / 100) * 180 - 180) * (Math.PI / 180);
    const large = to - from > 50 ? 1 : 0;
    return (
      <path
        d={`M ${cx + r * Math.cos(a0)} ${cy + r * Math.sin(a0)} A ${r} ${r} 0 ${large} 1 ${cx + r * Math.cos(a1)} ${cy + r * Math.sin(a1)}`}
        fill="none"
        stroke={color}
        strokeWidth={width}
        strokeLinecap="round"
      />
    );
  };
  return (
    <svg viewBox="0 0 200 116" style={{ width: 200, height: 116 }}>
      {arc(0, 20, C.bear, 10)}
      {arc(20, 40, "#c98a3c", 10)}
      {arc(40, 60, C.amber, 10)}
      {arc(60, 80, "#5fb87a", 10)}
      {arc(80, 100, C.bull, 10)}
      <line
        x1={cx}
        y1={cy}
        x2={cx + (r - 14) * Math.cos((angle - 90) * (Math.PI / 180))}
        y2={cy + (r - 14) * Math.sin((angle - 90) * (Math.PI / 180))}
        stroke={C.text}
        strokeWidth={3}
        strokeLinecap="round"
      />
      <circle cx={cx} cy={cy} r={6} fill={C.text} />
    </svg>
  );
}

export default function MarketMoodPanel({ symbols }) {
  const queries = useQueries({ queries: symbols.map((s) => historicalQueryOptions(s)) });

  // constant-size deps: symbols + a signature of which queries have resolved
  const dataSig = queries.map((q) => q.dataUpdatedAt || 0).join("|");
  const seriesList = useMemo(() => {
    const out = [];
    symbols.forEach((s, i) => {
      if (queries[i].data?.bars) out.push({ sym: s, bars: queries[i].data.bars });
    });
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbols, dataSig]);

  const mood = useMemo(() => computeMarketMood(seriesList), [seriesList]);
  const anyLoading = queries.some((q) => q.isPending && q.fetchStatus !== "idle");

  return (
    <Panel
      title="Market Mood — Fear & Greed"
      style={{ marginBottom: 14 }}
      right={mood && <span style={{ fontFamily: mono, fontSize: 11, color: C.muted }}>{mood.n} assets</span>}
    >
      {!mood ? (
        anyLoading ? (
          <Loading label="aggregating breadth, momentum & volatility across the watchlist…" />
        ) : (
          <EmptyState msg="Need history for at least two watchlist assets to gauge market mood." />
        )
      ) : (
        <div style={{ display: "flex", gap: 24, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ position: "relative", textAlign: "center" }}>
            <Gauge score={mood.score} />
            <div style={{ marginTop: -8 }}>
              <div style={{ fontFamily: mono, fontSize: 26, fontWeight: 700, color: moodColor(mood.score) }}>
                {mood.score.toFixed(0)}
              </div>
              <div style={{ fontFamily: mono, fontSize: 11, letterSpacing: "0.14em", color: moodColor(mood.score) }}>
                {mood.label}
              </div>
            </div>
          </div>

          <div style={{ flex: "1 1 300px", minWidth: 240, display: "flex", flexDirection: "column", gap: 6 }}>
            {mood.components.map((c) => (
              <div key={c.key} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontFamily: mono, fontSize: 10.5, color: C.muted, width: 150 }}>{c.label}</span>
                <div style={{ flex: 1, height: 6, borderRadius: 3, background: C.grid, position: "relative" }}>
                  <div
                    style={{
                      position: "absolute",
                      left: 0,
                      top: 0,
                      bottom: 0,
                      width: `${c.value * 100}%`,
                      borderRadius: 3,
                      background: moodColor(c.value * 100),
                    }}
                  />
                </div>
                <span style={{ fontFamily: mono, fontSize: 10, color: C.muted, width: 50, textAlign: "right" }}>
                  w{Math.round(c.weight * 100)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Panel>
  );
}
