import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { toPng } from "html-to-image";
import ErrorBoundary from "./components/ErrorBoundary";
import CommandPalette from "./components/CommandPalette";
import TopBar from "./components/TopBar";
import MarketMoodPanel from "./components/MarketMoodPanel";
import CompositeGauge from "./components/CompositeGauge";
import TradePlanPanel from "./components/TradePlanPanel";
import RiskSizerPanel from "./components/RiskSizerPanel";
import AiAnalystPanel from "./components/AiAnalystPanel";
import ProjectionChart from "./components/ProjectionChart";
import ScenarioPanel from "./components/ScenarioPanel";
import MonteCarloPanel from "./components/MonteCarloPanel";
import VolatilityPanel from "./components/VolatilityPanel";
import SeasonalityChart from "./components/SeasonalityChart";
import TechnicalsPanel from "./components/TechnicalsPanel";
import OverboughtPanel from "./components/OverboughtPanel";
import CalendarPanel from "./components/CalendarPanel";
import BacktestPanel from "./components/BacktestPanel";
import SectorMapPanel from "./components/SectorMapPanel";
import CorrelationMatrix from "./components/CorrelationMatrix";
import CotPanel from "./components/CotPanel";
import FairValuePanel from "./components/FairValuePanel";
import InsiderPanel from "./components/InsiderPanel";
import CongressPanel from "./components/CongressPanel";
import CongressView from "./components/CongressView";
import AlertsPanel from "./components/AlertsPanel";
import ScreenerPanel from "./components/ScreenerPanel";
import Watchlist from "./components/Watchlist";
import JournalView from "./components/journal/JournalView";
import { useQuote } from "./hooks/useQuote";
import { useHistorical } from "./hooks/useHistorical";
import { useFundamentals } from "./hooks/useFundamentals";
import { useBalanceSheet, useIncomeStatement } from "./hooks/useFundamentalsExtra";
import {
  cachedAnalyzePattern,
  cachedSeasonality,
  cachedTechnicals,
  cachedResampleWeekly,
  cachedSignificance,
} from "./lib/analysisCache";
import { computeOverbought } from "./lib/overbought";
import { computeRisk } from "./lib/risk";
import { buildSnapshot } from "./lib/aiContext";
import { computeFairValue } from "./lib/fairValue";
import { computeAltmanZ } from "./lib/altman";
import { compositeScore } from "./lib/composite";
import { computeTradePlan } from "./lib/tradePlan";
import { TIMEFRAMES } from "./lib/resample";
import { hasApiKey, subscribeApiStatus, getApiStatus } from "./lib/api";
import { DEFAULT_ASSETS, assetMeta } from "./lib/assets";
import { CATALOG } from "./lib/catalog";
import { cacheGet, cacheSet } from "./lib/cache";
import { C, mono, sans } from "./lib/theme";

const DEFAULT_SYMBOLS = DEFAULT_ASSETS.map((a) => a.sym);

function DailyLimitBanner() {
  const status = useSyncExternalStore(subscribeApiStatus, getApiStatus, getApiStatus);
  if (!status.dailyExhausted) return null;
  return (
    <div
      style={{
        marginBottom: 14,
        padding: "12px 16px",
        borderRadius: 8,
        border: `1px solid ${C.amber}`,
        background: "#231a0d",
        fontFamily: mono,
        fontSize: 12,
      }}
    >
      <div style={{ color: C.amber, letterSpacing: "0.12em", marginBottom: 6 }}>⚠ FUNDAMENTALS PAUSED — TWELVE DATA DAILY LIMIT</div>
      <div style={{ color: C.muted, lineHeight: 1.7 }}>
        Today's Twelve Data budget (free tier: 800 credits/day) is used up, so valuation, earnings, and insider panels
        are paused until <span style={{ color: C.text }}>00:00 UTC</span>. Prices, charts, and all the analytics keep
        running — those come from free providers (Yahoo / CoinGecko / Frankfurter). A paid key removes the cap.
      </div>
    </div>
  );
}

function SetupBanner() {
  return (
    <div
      style={{
        marginBottom: 14,
        padding: "12px 16px",
        borderRadius: 8,
        border: `1px solid ${C.amber}`,
        background: "#231a0d",
        fontFamily: mono,
        fontSize: 12,
      }}
    >
      <div style={{ color: C.amber, letterSpacing: "0.12em", marginBottom: 6 }}>SETUP REQUIRED — API KEY MISSING</div>
      <div style={{ color: C.muted, lineHeight: 1.7 }}>
        Create a <span style={{ color: C.text }}>.env</span> file in the project root containing{" "}
        <span style={{ color: C.amber }}>VITE_TWELVEDATA_KEY=your_key</span> (free key at twelvedata.com), then restart
        the dev server. All panels stay offline until a key is configured.
      </div>
    </div>
  );
}

export default function App() {
  const [symbols, setSymbols] = useState(() => {
    const saved = cacheGet("watchlist");
    return Array.isArray(saved) && saved.length ? saved : DEFAULT_SYMBOLS;
  });
  const [sym, setSym] = useState(symbols[0] || "SPX");
  const [timeframe, setTimeframe] = useState("D");
  const [view, setView] = useState("terminal"); // terminal | journal | congress
  useEffect(() => {
    cacheSet("watchlist", symbols);
  }, [symbols]);

  const addSymbol = useCallback((raw) => {
    const meta = assetMeta(raw);
    if (!meta.sym) return;
    setSymbols((cur) => (cur.includes(meta.sym) ? cur : [...cur, meta.sym]));
    setSym(meta.sym);
  }, []);
  const removeSymbol = useCallback(
    (s) => {
      setSymbols((cur) => {
        if (cur.length <= 1 || !cur.includes(s)) return cur;
        const next = cur.filter((x) => x !== s);
        if (s === sym) setSym(next[0]);
        return next;
      });
    },
    [sym]
  );

  const rootRef = useRef(null);
  const exportPng = useCallback(async () => {
    if (!rootRef.current) return;
    try {
      const dataUrl = await toPng(rootRef.current, { backgroundColor: "#0D1117", pixelRatio: 1.5, cacheBust: true });
      const a = document.createElement("a");
      a.download = `forecaster-${sym}-${new Date().toISOString().slice(0, 10)}.png`;
      a.href = dataUrl;
      a.click();
    } catch (e) {
      console.error("PNG export failed", e);
    }
  }, [sym]);

  const commandItems = useMemo(() => {
    const goTo = (title) => () => {
      const el = [...document.querySelectorAll("span")].find((x) => x.textContent.trim().toLowerCase().startsWith(title.toLowerCase()));
      el?.scrollIntoView({ block: "start", behavior: "smooth" });
    };
    const actions = [
      { id: "a-journal", tag: "action", kind: "action", label: "Trading Journal", hint: "log & review trades", run: () => setView("journal") },
      { id: "a-congress", tag: "action", kind: "action", label: "Capitol Trades", hint: "congress stock disclosures", run: () => setView("congress") },
      { id: "a-terminal", tag: "action", kind: "action", label: "Terminal", hint: "back to dashboard", run: () => setView("terminal") },
      { id: "a-ai", tag: "action", kind: "action", label: "AI Analyst", hint: "brief & ask", run: goTo("AI Analyst") },
      { id: "a-screen", tag: "action", kind: "action", label: "Screener", hint: "universe scan", run: goTo("Screener") },
      { id: "a-sector", tag: "action", kind: "action", label: "Sector Map", run: goTo("Sector Map") },
      { id: "a-bt", tag: "action", kind: "action", label: "Backtest", run: goTo("Forecast Backtest") },
      { id: "a-tfd", tag: "action", kind: "action", label: "Timeframe: Daily", run: () => setTimeframe("D") },
      { id: "a-tfw", tag: "action", kind: "action", label: "Timeframe: Weekly", run: () => setTimeframe("W") },
      { id: "a-png", tag: "action", kind: "action", label: "Export dashboard PNG", run: exportPng },
      { id: "a-top", tag: "action", kind: "action", label: "Scroll to top", run: () => window.scrollTo({ top: 0, behavior: "smooth" }) },
    ];
    const seen = new Set();
    const instruments = [];
    for (const s of [...symbols, ...CATALOG.flatMap((c) => c.syms)]) {
      const meta = assetMeta(s);
      if (seen.has(meta.sym)) continue;
      seen.add(meta.sym);
      instruments.push({ id: `s-${meta.sym}`, tag: meta.type, kind: "symbol", label: meta.sym, hint: meta.name, run: () => addSymbol(meta.sym) });
    }
    return [...actions, ...instruments];
  }, [symbols, addSymbol, exportPng]);

  const quote = useQuote(sym);
  const price = quote.data?.price ?? null;
  const history = useHistorical(sym);
  const stats = useFundamentals(sym);
  const balanceSheet = useBalanceSheet(sym);
  const incomeStatement = useIncomeStatement(sym);

  const dailyBars = history.data?.bars ?? null;
  const weeklyBars = useMemo(() => cachedResampleWeekly(dailyBars), [dailyBars]);
  const tfBars = timeframe === "W" ? weeklyBars : dailyBars;

  const analysisDaily = useMemo(() => cachedAnalyzePattern(dailyBars, TIMEFRAMES.D.opts), [dailyBars]);
  const analysisWeekly = useMemo(() => cachedAnalyzePattern(weeklyBars, TIMEFRAMES.W.opts), [weeklyBars]);
  const analysis = timeframe === "W" ? analysisWeekly : analysisDaily;
  const significance = useMemo(
    () => (tfBars && analysis && !analysis.insufficient ? cachedSignificance(tfBars, analysis) : null),
    [tfBars, analysis]
  );

  const season = useMemo(() => cachedSeasonality(dailyBars), [dailyBars]);
  const tech = useMemo(() => cachedTechnicals(dailyBars), [dailyBars]);
  const fv = useMemo(() => (stats.data ? computeFairValue(stats.data, price) : null), [stats.data, price]);
  const altman = useMemo(
    () =>
      balanceSheet.data && incomeStatement.data ? computeAltmanZ(balanceSheet.data, incomeStatement.data, price) : null,
    [balanceSheet.data, incomeStatement.data, price]
  );
  // composite always uses the daily pattern read for stability across the timeframe toggle
  const composite = useMemo(
    () => compositeScore({ analysis: analysisDaily, season, tech, fvUpside: fv?.upsidePct ?? null }),
    [analysisDaily, season, tech, fv]
  );
  const risk = useMemo(() => (dailyBars ? computeRisk(dailyBars) : null), [dailyBars]);
  const tradePlan = useMemo(() => {
    // fall back to the last cached close when the live quote is unavailable
    const entryPrice = price ?? analysisDaily?.lastClose ?? null;
    return composite && analysisDaily && risk
      ? computeTradePlan({ score: composite.score, analysis: analysisDaily, atr: risk.atr, price: entryPrice })
      : null;
  }, [composite, analysisDaily, risk, price]);
  const overbought = useMemo(() => (dailyBars ? computeOverbought(dailyBars) : null), [dailyBars]);
  const aiSnapshot = useMemo(
    () =>
      analysisDaily && !analysisDaily.insufficient
        ? buildSnapshot({
            meta: assetMeta(sym),
            price: price ?? analysisDaily.lastClose,
            composite,
            analysis: analysisDaily,
            significance,
            season,
            tech,
            risk,
            overbought,
            tradePlan,
            fv,
            altman,
          })
        : null,
    [sym, price, composite, analysisDaily, significance, season, tech, risk, overbought, tradePlan, fv, altman]
  );

  // compact snapshot of the signals justifying a setup — attached to a trade when
  // it's logged from the terminal, so the journal can later score the signals.
  const signalSnapshot = useMemo(
    () =>
      composite
        ? {
            composite: Math.round(composite.score),
            label: composite.label,
            pBull: analysisDaily && !analysisDaily.insufficient ? analysisDaily.pBull : null,
            robustness: analysisDaily && !analysisDaily.insufficient ? analysisDaily.robustness : null,
            grade: significance?.grade?.label ?? null,
            capturedAt: Date.now(),
          }
        : null,
    [composite, analysisDaily, significance]
  );

  const grid2 = { display: "grid", gridTemplateColumns: "minmax(0,2.2fr) minmax(260px,1fr)", gap: 14, marginTop: 14 };

  return (
    <div ref={rootRef} style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: sans, padding: 14 }}>
      <CommandPalette items={commandItems} />
      {!hasApiKey && <SetupBanner />}
      <DailyLimitBanner />
      <TopBar symbols={symbols} sym={sym} setSym={setSym} onAdd={addSymbol} onExport={exportPng} view={view} setView={setView} />

      {view === "journal" ? (
        <ErrorBoundary label="JOURNAL">
          <JournalView />
        </ErrorBoundary>
      ) : view === "congress" ? (
        <ErrorBoundary label="CONGRESS">
          <CongressView onSelect={(t) => { addSymbol(t); setView("terminal"); }} />
        </ErrorBoundary>
      ) : (
        <>
      <ErrorBoundary label="MARKET MOOD">
        <MarketMoodPanel symbols={symbols} />
      </ErrorBoundary>

      <ErrorBoundary label="COMPOSITE">
        <CompositeGauge composite={composite} sym={sym} />
      </ErrorBoundary>

      <ErrorBoundary label="TRADE PLAN">
        <TradePlanPanel plan={tradePlan} sym={sym} />
      </ErrorBoundary>

      <ErrorBoundary label="POSITION SIZER">
        <RiskSizerPanel plan={tradePlan} sym={sym} signals={signalSnapshot} />
      </ErrorBoundary>

      <ErrorBoundary label="AI ANALYST">
        <AiAnalystPanel snapshot={aiSnapshot} sym={sym} />
      </ErrorBoundary>

      <div style={{ ...grid2, marginTop: 0 }}>
        <ErrorBoundary label="PROJECTION">
          <ProjectionChart
            sym={sym}
            history={history}
            bars={tfBars}
            analysis={analysis}
            timeframe={timeframe}
            setTimeframe={setTimeframe}
          />
        </ErrorBoundary>
        <ErrorBoundary label="SCENARIO">
          <ScenarioPanel history={history} analysis={analysis} significance={significance} />
        </ErrorBoundary>
      </div>

      <div style={grid2}>
        <ErrorBoundary label="MONTE CARLO">
          <MonteCarloPanel sym={sym} history={history} />
        </ErrorBoundary>
        <ErrorBoundary label="VOLATILITY">
          <VolatilityPanel sym={sym} history={history} />
        </ErrorBoundary>
      </div>

      <div style={grid2}>
        <ErrorBoundary label="SEASONALITY">
          <SeasonalityChart history={history} />
        </ErrorBoundary>
        <ErrorBoundary label="TECHNICALS">
          <TechnicalsPanel history={history} tech={tech} />
        </ErrorBoundary>
      </div>

      <div style={grid2}>
        <ErrorBoundary label="OVERBOUGHT/OVERSOLD">
          <OverboughtPanel history={history} />
        </ErrorBoundary>
        <ErrorBoundary label="CALENDAR">
          <CalendarPanel sym={sym} />
        </ErrorBoundary>
      </div>

      <ErrorBoundary label="BACKTEST">
        <BacktestPanel sym={sym} timeframe={timeframe} bars={tfBars} history={history} />
      </ErrorBoundary>

      <ErrorBoundary label="SECTOR MAP">
        <SectorMapPanel onSelect={addSymbol} />
      </ErrorBoundary>

      <div style={grid2}>
        <ErrorBoundary label="CORRELATION">
          <CorrelationMatrix symbols={symbols} />
        </ErrorBoundary>
        <ErrorBoundary label="COT">
          <CotPanel sym={sym} />
        </ErrorBoundary>
      </div>

      <div style={grid2}>
        <ErrorBoundary label="FAIR VALUE">
          <FairValuePanel sym={sym} price={price} stats={stats} fv={fv} altman={altman} />
        </ErrorBoundary>
        <ErrorBoundary label="INSIDERS">
          <InsiderPanel sym={sym} />
        </ErrorBoundary>
      </div>

      <div style={grid2}>
        <ErrorBoundary label="CONGRESS TRADES">
          <CongressPanel sym={sym} />
        </ErrorBoundary>
        <div />
      </div>

      <ErrorBoundary label="ALERTS">
        <AlertsPanel sym={sym} />
      </ErrorBoundary>

      <ErrorBoundary label="SCREENER">
        <ScreenerPanel onSelect={addSymbol} />
      </ErrorBoundary>

      <ErrorBoundary label="WATCHLIST">
        <Watchlist symbols={symbols} sym={sym} setSym={setSym} onAdd={addSymbol} onRemove={removeSymbol} />
      </ErrorBoundary>
        </>
      )}

      <div
        className="flex flex-wrap justify-between gap-2"
        style={{ marginTop: 12, fontFamily: mono, fontSize: 10.5, color: C.muted }}
      >
        <span>
          Pattern matches, simulations, backtests, and valuations are computed client-side from historical data. Not
          investment advice.
        </span>
        <span>
          Data:{" "}
          <a href="https://twelvedata.com" target="_blank" rel="noreferrer" style={{ color: C.muted }}>
            Twelve Data
          </a>{" "}
          ·{" "}
          <a href="https://publicreporting.cftc.gov" target="_blank" rel="noreferrer" style={{ color: C.muted }}>
            CFTC
          </a>
        </span>
      </div>
    </div>
  );
}
