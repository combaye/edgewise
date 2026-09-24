// Abuse protection for the AI endpoint. The endpoint is public by necessity
// (the browser calls it), so anything posted to it is attacker-controlled and
// every accepted call spends the operator's Anthropic credits. Three layers:
//
//   1. Shape  — only the three modes the app uses; the payload is rebuilt from
//               scratch with hard caps on depth, array length and string length,
//               so it can't smuggle a long free-form prompt ("write my essay…").
//   2. Size   — raw body and re-serialized payload are both byte-capped.
//   3. Rate   — per-client and per-instance budgets.
//
// Limitation, stated honestly: on serverless (Vercel) the rate-limit counters
// live in each function instance's memory, so they reset on cold starts and are
// not shared between instances. They stop casual abuse and runaway loops; the
// hard backstop is a monthly spend limit set in the Anthropic console. For a
// strict global limit, swap the Map for a shared store (e.g. Upstash Redis).

export const MAX_BODY_BYTES = 32_000;
const MAX_PAYLOAD_BYTES = 16_000;
const MAX_QUESTION_CHARS = 600;
const MAX_STRING = 400;
const MAX_ARRAY = 40;
const MAX_KEYS = 60;
const MAX_DEPTH = 5;

const MODES = new Set(["brief", "ask", "journal"]);

// ---------------------------------------------------------------- shape

// Rebuild the value keeping only JSON primitives, with every dimension capped.
// Anything unexpected is dropped rather than rejected, so honest clients never
// break, while oversized/abusive input is neutralised.
function sanitize(v, depth = 0) {
  if (v === null || typeof v === "boolean") return v;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string") return v.slice(0, MAX_STRING);
  if (depth >= MAX_DEPTH) return null;
  if (Array.isArray(v)) return v.slice(0, MAX_ARRAY).map((x) => sanitize(x, depth + 1));
  if (typeof v === "object") {
    const out = {};
    for (const k of Object.keys(v).slice(0, MAX_KEYS)) {
      if (k === "__proto__" || k === "constructor" || k === "prototype") continue;
      out[k.slice(0, 60)] = sanitize(v[k], depth + 1);
    }
    return out;
  }
  return null; // functions, undefined, symbols, bigint
}

/** Validate a parsed request body. Returns { ok, params } or { ok:false, status, error }. */
export function validateAiRequest(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, status: 400, error: "invalid request body" };
  }
  const mode = body.mode ?? "brief";
  if (!MODES.has(mode)) return { ok: false, status: 400, error: "unsupported mode" };

  if (!body.payload || typeof body.payload !== "object" || Array.isArray(body.payload)) {
    return { ok: false, status: 400, error: "payload must be an object" };
  }
  const payload = sanitize(body.payload);
  if (JSON.stringify(payload).length > MAX_PAYLOAD_BYTES) {
    return { ok: false, status: 413, error: "payload too large" };
  }

  let question;
  if (mode === "ask") {
    if (typeof body.question !== "string" || !body.question.trim()) {
      return { ok: false, status: 400, error: "question required" };
    }
    question = body.question.trim().slice(0, MAX_QUESTION_CHARS);
  }
  return { ok: true, params: { mode, payload, question } };
}

// ---------------------------------------------------------------- rate

const WINDOW_MS = 10 * 60_000;
const PER_CLIENT_PER_WINDOW = 10; // bursts: ~1 call/min sustained
const PER_CLIENT_PER_DAY = 60;
const GLOBAL_PER_DAY = 400; // per instance — ceiling on total spend

const clients = new Map(); // ip -> { hits: number[] (timestamps within 24h) }
let globalDay = { day: "", count: 0 };

/** Best-effort client identity. Behind Vercel the first X-Forwarded-For hop is the client. */
export function clientIp(req) {
  const xff = req.headers?.["x-forwarded-for"];
  const first = (Array.isArray(xff) ? xff[0] : xff || "").split(",")[0].trim();
  return first || req.socket?.remoteAddress || "unknown";
}

/** Record an attempt. Returns { ok:true } or { ok:false, retryAfterSec, error }. */
export function checkRateLimit(ip, now = Date.now()) {
  const today = new Date(now).toISOString().slice(0, 10);
  if (globalDay.day !== today) globalDay = { day: today, count: 0 };
  if (globalDay.count >= GLOBAL_PER_DAY) {
    return { ok: false, retryAfterSec: 3600, error: "daily AI budget reached — try again tomorrow" };
  }

  const rec = clients.get(ip) || { hits: [] };
  rec.hits = rec.hits.filter((t) => now - t < 24 * 3600_000);
  const inWindow = rec.hits.filter((t) => now - t < WINDOW_MS);

  if (rec.hits.length >= PER_CLIENT_PER_DAY) {
    return { ok: false, retryAfterSec: 3600, error: "daily limit reached for this client" };
  }
  if (inWindow.length >= PER_CLIENT_PER_WINDOW) {
    const retryAfterSec = Math.ceil((WINDOW_MS - (now - inWindow[0])) / 1000);
    return { ok: false, retryAfterSec, error: `rate limit — try again in ${Math.ceil(retryAfterSec / 60)} min` };
  }

  rec.hits.push(now);
  clients.set(ip, rec);
  globalDay.count += 1;

  // keep memory bounded on long-lived dev servers
  if (clients.size > 5000) {
    for (const [k, v] of clients) if (!v.hits.some((t) => now - t < 24 * 3600_000)) clients.delete(k);
  }
  return { ok: true };
}

/** Test hook. */
export function _resetRateLimits() {
  clients.clear();
  globalDay = { day: "", count: 0 };
}
