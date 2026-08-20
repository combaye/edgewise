import { useMemo, useState } from "react";
import {
  BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ReferenceLine,
  ResponsiveContainer, CartesianGrid, LabelList,
} from "recharts";
import { C, mono } from "../lib/theme";
import { MONTHS } from "../lib/assets";
import { computeSeasonality, computeDayOfWeek } from "../lib/seasonality";
import { Panel, QueryGate, EmptyState } from "./Panel";

function ToggleGroup({ value, setValue, options }) {
  return (
    <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
      {options.map(([key, label]) => (
        <button
          key={key}
          onClick={() => setValue(key)}
          style={{
            fontFamily: mono,
            fontSize: 10,
            letterSpacing: "0.08em",
            padding: "3px 8px",
            borderRadius: 5,
            cursor: "pointer",
            background: value === key ? "#1C2530" : "transparent",
            border: `1px solid ${value === key ? C.amber : C.border}`,
            color: value === key ? C.amber : C.muted,
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export default function SeasonalityChart({ history }) {
  const [mode, setMode] = useState("ret"); // ret | win
  const [dim, setDim] = useState("month"); // month | dow

  const monthly = useMemo(
    () => (history.data?.bars ? computeSeasonality(history.data.bars) : null),
    [history.data]
  );
  const dow = useMemo(
    () => (history.data?.bars ? computeDayOfWeek(history.data.bars) : null),
    [history.data]
  );

  const data = dim === "month" ? monthly : dow;
  const now = new Date();
  const curIdx = dim === "month" ? now.getMonth() : Math.min(4, (now.getDay() + 6) % 7);
  const years = history.data?.bars ? Math.max(1, Math.round(history.data.bars.length / 252)) : null;
  const isRet = mode === "ret";
  const retDigits = dim === "dow" ? 3 : 2;

  return (
    <Panel
      title={`Seasonality — ${years ?? "·"}y ${dim === "month" ? "monthly" : "day-of-week"} ${isRet ? "mean return" : "win rate"}`}
      right={
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <ToggleGroup value={dim} setValue={setDim} options={[["month", "MONTHLY"], ["dow", "DAY OF WEEK"]]} />
          <ToggleGroup value={mode} setValue={setMode} options={[["ret", "MEAN RETURN"], ["win", "WIN RATE"]]} />
        </div>
      }
    >
      <QueryGate query={history} loadingLabel="waiting for historical data…">
        {!data ? (
          <EmptyState msg="Insufficient data — need at least ~1 year of history for seasonality." />
        ) : (
          <div style={{ height: 200 }}>
            <ResponsiveContainer>
              <BarChart data={data} margin={{ top: 16, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid stroke={C.grid} strokeDasharray="2 6" vertical={false} />
                <XAxis dataKey="m" tick={{ fill: C.muted, fontSize: 10, fontFamily: mono }} stroke={C.border} />
                <YAxis
                  domain={isRet ? ["auto", "auto"] : [0, 100]}
                  tick={{ fill: C.muted, fontSize: 10, fontFamily: mono }}
                  tickFormatter={(v) => `${v}%`}
                  stroke={C.border}
                  width={48}
                />
                <Tooltip
                  contentStyle={{ background: C.panel2, border: `1px solid ${C.border}`, fontFamily: mono, fontSize: 12 }}
                  formatter={(v, name, entry) => {
                    const d = entry?.payload;
                    return isRet
                      ? [`${v}% · win ${d?.win}% (n=${d?.n})`, "mean return"]
                      : [`${v}% · mean ${d?.ret}% (n=${d?.n})`, "win rate"];
                  }}
                  cursor={{ fill: "#ffffff08" }}
                />
                <ReferenceLine y={isRet ? 0 : 50} stroke={C.border} />
                <Bar dataKey={isRet ? "ret" : "win"} radius={[3, 3, 0, 0]}>
                  <LabelList
                    dataKey={isRet ? "win" : "ret"}
                    position="top"
                    formatter={(v) => (isRet ? `${v}%` : `${v > 0 ? "+" : ""}${Number(v).toFixed(retDigits)}%`)}
                    style={{ fill: C.muted, fontSize: 8.5, fontFamily: mono }}
                  />
                  {data.map((e, i) => (
                    <Cell
                      key={i}
                      fill={i === curIdx ? C.amber : (isRet ? e.ret >= 0 : e.win >= 50) ? C.bull : C.bear}
                      fillOpacity={i === curIdx ? 1 : 0.55}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </QueryGate>
    </Panel>
  );
}
