import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import { C, mono } from "../lib/theme";
import { historicalQueryOptions } from "../hooks/useHistorical";
import { pearson } from "../lib/patternMatch";
import { Panel, EmptyState, Loading } from "./Panel";

const WINDOW = 63;

function buildMatrix(seriesBySym) {
  const syms = Object.keys(seriesBySym);
  if (syms.length < 2) return null;

  // daily returns keyed by date, then intersect dates across all assets
  const retMaps = syms.map((s) => {
    const bars = seriesBySym[s];
    const m = new Map();
    for (let i = 1; i < bars.length; i++) m.set(bars[i].date, bars[i].close / bars[i - 1].close - 1);
    return m;
  });
  let common = [...retMaps[0].keys()].filter((d) => retMaps.every((m) => m.has(d)));
  common = common.slice(-WINDOW);
  if (common.length < 30) return null;

  const vectors = retMaps.map((m) => common.map((d) => m.get(d)));
  const grid = syms.map((_, i) => syms.map((_, j) => (i === j ? 1 : pearson(vectors[i], vectors[j]))));
  return { syms, grid, n: common.length };
}

export default function CorrelationMatrix({ symbols }) {
  const queries = useQueries({ queries: symbols.map((s) => historicalQueryOptions(s)) });

  // constant-size deps: symbols + a signature of which queries have resolved
  const dataSig = queries.map((q) => q.dataUpdatedAt || 0).join("|");
  const ready = useMemo(() => {
    const out = {};
    symbols.forEach((s, i) => {
      if (queries[i].data?.bars) out[s] = queries[i].data.bars;
    });
    return out;
  }, [symbols, dataSig]); // eslint-disable-line react-hooks/exhaustive-deps

  const matrix = useMemo(() => buildMatrix(ready), [ready]);
  const anyLoading = queries.some((q) => q.isPending && q.fetchStatus !== "idle");

  return (
    <Panel
      title={`Correlation Matrix — ${WINDOW}d daily returns`}
      right={matrix && <span style={{ fontFamily: mono, fontSize: 11, color: C.muted }}>{matrix.n} aligned sessions</span>}
    >
      {!matrix ? (
        anyLoading ? (
          <Loading label="aligning return series across assets…" />
        ) : (
          <EmptyState msg="Need history for at least two watchlist assets to compute correlations." />
        )
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ borderCollapse: "separate", borderSpacing: 3, fontFamily: mono, fontSize: 11, width: "100%" }}>
            <thead>
              <tr>
                <th />
                {matrix.syms.map((s) => (
                  <th key={s} style={{ color: C.muted, fontWeight: 400, padding: "2px 6px", textAlign: "center" }}>
                    {s}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matrix.syms.map((rowSym, i) => (
                <tr key={rowSym}>
                  <td style={{ color: C.muted, padding: "2px 6px", whiteSpace: "nowrap" }}>{rowSym}</td>
                  {matrix.grid[i].map((r, j) => {
                    const base = r >= 0 ? "61, 220, 151" : "255, 107, 107"; // C.bull / C.bear rgb
                    return (
                      <td
                        key={j}
                        style={{
                          textAlign: "center",
                          padding: "6px 4px",
                          borderRadius: 4,
                          background: i === j ? C.grid : `rgba(${base}, ${Math.min(0.55, Math.abs(r) * 0.55)})`,
                          color: i === j ? C.muted : C.text,
                          minWidth: 52,
                        }}
                      >
                        {i === j ? "—" : r.toFixed(2)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}
