import axios from "axios";

// The data layer now goes through our own /api/td proxy, which hides the key,
// caches every response server-side (shared across all sessions), and falls
// back across Yahoo / CoinGecko / Frankfurter / Twelve Data. Price & history
// are served from FREE providers first, so they stay live even when the Twelve
// Data daily budget is exhausted — only fundamentals (valuation/earnings/
// insiders) depend on Twelve Data and can pause.
export const hasApiKey = true; // proxy is always available; the client holds no key

const client = axios.create({ baseURL: "/api/td", timeout: 30_000 });

// The proxy + server cache do the rate-limit heavy lifting; the client just
// caps concurrency so a cold load doesn't fan out 30 requests at once.
const MAX_CONCURRENT = 5;
let inFlight = 0;
const queue = [];

const isDailyLimit = (msg) => /for the day|daily (api )?limit|credits per day|per day/i.test(msg || "");

// ---- tiny external store so React can show a (fundamentals-only) limit banner ----
let snapshot = { dailyExhausted: false };
const listeners = new Set();
export function subscribeApiStatus(cb) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
export function getApiStatus() {
  return snapshot;
}
function setDailyExhausted(v) {
  if (snapshot.dailyExhausted === v) return;
  snapshot = { dailyExhausted: v };
  listeners.forEach((l) => l());
}

export function tdRequest(path, params = {}) {
  return new Promise((resolve, reject) => {
    queue.push({ path, params, resolve, reject });
    pump();
  });
}

function pump() {
  while (inFlight < MAX_CONCURRENT && queue.length) {
    const job = queue.shift();
    inFlight += 1;
    client
      .get("", { params: { path: job.path, ...job.params } })
      .then(({ data }) => {
        if (data && data.status === "error") {
          if (isDailyLimit(data.message)) setDailyExhausted(true);
          job.reject(new Error(data.message || `Data error ${data.code}`));
        } else {
          job.resolve(data);
        }
      })
      .catch((err) => job.reject(new Error(err?.response?.data?.message || err?.message || "Network error")))
      .finally(() => {
        inFlight -= 1;
        pump();
      });
  }
}
