// Technical indicators. Pure functions only — input is ascending daily bars.

export function smaLast(vals, p) {
  if (vals.length < p) return null;
  let s = 0;
  for (let i = vals.length - p; i < vals.length; i++) s += vals[i];
  return s / p;
}

export function emaSeries(vals, p) {
  if (vals.length < p) return null;
  const k = 2 / (p + 1);
  let ema = vals.slice(0, p).reduce((a, b) => a + b, 0) / p;
  const out = new Array(p - 1).fill(null);
  out.push(ema);
  for (let i = p; i < vals.length; i++) {
    ema = vals[i] * k + ema * (1 - k);
    out.push(ema);
  }
  return out;
}

// Wilder-smoothed RSI, last value
export function rsiLast(closes, p = 14) {
  if (closes.length < p + 1) return null;
  let gain = 0, loss = 0;
  for (let i = 1; i <= p; i++) {
    const d = closes[i] - closes[i - 1];
    if (d >= 0) gain += d;
    else loss -= d;
  }
  gain /= p;
  loss /= p;
  for (let i = p + 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    gain = (gain * (p - 1) + Math.max(d, 0)) / p;
    loss = (loss * (p - 1) + Math.max(-d, 0)) / p;
  }
  if (gain + loss === 0) return 50;
  return 100 - 100 / (1 + gain / (loss || 1e-12));
}

export function macdLast(closes, fast = 12, slow = 26, signal = 9) {
  if (closes.length < slow + signal) return null;
  const ef = emaSeries(closes, fast);
  const es = emaSeries(closes, slow);
  const line = [];
  for (let i = slow - 1; i < closes.length; i++) line.push(ef[i] - es[i]);
  const sig = emaSeries(line, signal);
  const last = line.length - 1;
  return { macd: line[last], signal: sig[last], hist: line[last] - sig[last] };
}

// %B: position of last close within the Bollinger band (0 = lower, 1 = upper)
export function bollingerPctB(closes, p = 20, k = 2) {
  if (closes.length < p) return null;
  const win = closes.slice(-p);
  const m = win.reduce((a, b) => a + b, 0) / p;
  const sd = Math.sqrt(win.reduce((s, v) => s + (v - m) ** 2, 0) / p);
  if (sd === 0) return 0.5;
  return (closes[closes.length - 1] - (m - k * sd)) / (2 * k * sd);
}

// Wilder-smoothed ATR, last value
export function atrLast(bars, p = 14) {
  if (bars.length < p + 1) return null;
  const tr = [];
  for (let i = 1; i < bars.length; i++) {
    const pc = bars[i - 1].close;
    tr.push(Math.max(bars[i].high - bars[i].low, Math.abs(bars[i].high - pc), Math.abs(bars[i].low - pc)));
  }
  let atr = tr.slice(0, p).reduce((a, b) => a + b, 0) / p;
  for (let i = p; i < tr.length; i++) atr = (atr * (p - 1) + tr[i]) / p;
  return atr;
}

const sigOf = {
  rsi: (v) => (v >= 70 ? -1 : v >= 55 ? 1 : v <= 30 ? 1 : v <= 45 ? -1 : 0),
  pctB: (v) => (v > 1 ? -1 : v < 0 ? 1 : 0),
  pos52: (v) => (v >= 0.8 ? 1 : v <= 0.2 ? -1 : 0),
};
const SIG_LABEL = { 1: "bull", 0: "neut", "-1": "bear" };

export function computeTechnicals(bars) {
  if (!bars || bars.length < 220) return null;
  const closes = bars.map((b) => b.close);
  const price = closes[closes.length - 1];

  const rsi = rsiLast(closes, 14);
  const sma50 = smaLast(closes, 50);
  const sma200 = smaLast(closes, 200);
  const macd = macdLast(closes);
  const pctB = bollingerPctB(closes);
  const yr = bars.slice(-252);
  const hi52 = Math.max(...yr.map((b) => b.high));
  const lo52 = Math.min(...yr.map((b) => b.low));
  const pos52 = hi52 === lo52 ? 0.5 : (price - lo52) / (hi52 - lo52);

  const pctVs = (ref) => ((price - ref) / ref) * 100;
  const rows = [
    { name: "RSI (14)", value: rsi.toFixed(1), signal: sigOf.rsi(rsi) },
    { name: "Price vs SMA50", value: `${pctVs(sma50) >= 0 ? "+" : ""}${pctVs(sma50).toFixed(1)}%`, signal: price > sma50 ? 1 : -1 },
    { name: "Price vs SMA200", value: `${pctVs(sma200) >= 0 ? "+" : ""}${pctVs(sma200).toFixed(1)}%`, signal: price > sma200 ? 1 : -1 },
    { name: "SMA50 vs SMA200", value: sma50 > sma200 ? "golden cross" : "death cross", signal: sma50 > sma200 ? 1 : -1 },
    { name: "MACD histogram", value: macd.hist.toFixed(price >= 100 ? 2 : 4), signal: macd.hist > 0 ? 1 : -1 },
    { name: "Bollinger %B", value: pctB.toFixed(2), signal: sigOf.pctB(pctB) },
    { name: "52w range position", value: `${Math.round(pos52 * 100)}%`, signal: sigOf.pos52(pos52) },
  ];

  const score = rows.reduce((s, r) => s + r.signal, 0) / rows.length; // -1..1
  const counts = { 1: 0, 0: 0, "-1": 0 };
  rows.forEach((r) => counts[r.signal]++);
  const summary = `${counts[1]} bull · ${counts["-1"]} bear · ${counts[0]} neutral`;
  return { rows, score, summary, sigLabel: SIG_LABEL };
}
