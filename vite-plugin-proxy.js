// Mounts the data proxy (/api/td) and the AI analyst (/api/ai) during
// `npm run dev`, in the same process as Vite — no separate server, no account,
// nothing to deploy for local use. The Twelve Data and Anthropic keys are read
// server-side here and never reach the client bundle.
import { proxyHandler } from "./server/proxyHandler.js";
import { aiStream, hasAiKey } from "./server/aiHandler.js";
import { MAX_BODY_BYTES, validateAiRequest, checkRateLimit, clientIp } from "./server/aiGuard.js";

// Reads the body but gives up past MAX_BODY_BYTES instead of buffering an
// arbitrarily large upload into memory. Resolves null when over the cap.
const readBody = (req) =>
  new Promise((resolve) => {
    let data = "";
    let over = false;
    req.on("data", (c) => {
      if (over) return;
      data += c;
      if (data.length > MAX_BODY_BYTES) {
        over = true;
        data = "";
      }
    });
    req.on("end", () => resolve(over ? null : data));
    req.on("error", () => resolve(""));
  });

const sendJson = (res, status, obj, headers = {}) => {
  res.statusCode = status;
  res.setHeader("content-type", "application/json");
  res.setHeader("cache-control", "no-store");
  for (const [k, v] of Object.entries(headers)) res.setHeader(k, v);
  res.end(JSON.stringify(obj));
};

export function apiProxy(env) {
  return {
    name: "forecaster-api-proxy",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url) return next();

        // ---- data proxy ----
        if (req.url.startsWith("/api/td")) {
          try {
            const url = new URL(req.url, "http://localhost");
            const { status, body } = await proxyHandler(Object.fromEntries(url.searchParams), env);
            res.statusCode = status;
            res.setHeader("content-type", "application/json");
            res.setHeader("cache-control", "no-store");
            res.end(JSON.stringify(body));
          } catch (e) {
            res.statusCode = 500;
            res.setHeader("content-type", "application/json");
            res.end(JSON.stringify({ status: "error", code: 500, message: e?.message || "proxy error" }));
          }
          return;
        }

        // ---- AI analyst (streaming) ----
        if (req.url.startsWith("/api/ai")) {
          if (req.method !== "POST") return sendJson(res, 405, { error: "POST only" });
          const raw = await readBody(req);
          if (raw === null) return sendJson(res, 413, { error: "request too large" });
          let body;
          try {
            body = JSON.parse(raw || "{}");
          } catch {
            return sendJson(res, 400, { error: "invalid JSON" });
          }
          const v = validateAiRequest(body);
          if (!v.ok) return sendJson(res, v.status, { error: v.error });
          if (!hasAiKey(env.ANTHROPIC_API_KEY)) return sendJson(res, 200, { error: "missing_key" });
          const rl = checkRateLimit(clientIp(req));
          if (!rl.ok) return sendJson(res, 429, { error: rl.error }, { "retry-after": String(rl.retryAfterSec) });

          // peek the first chunk so pre-stream errors (bad key, 400) surface as
          // JSON before we commit to a streaming text/plain response
          const it = aiStream(v.params, env.ANTHROPIC_API_KEY)[Symbol.asyncIterator]();
          let first;
          try {
            first = await it.next();
          } catch {
            // don't echo upstream error text (it can include account/billing detail)
            return sendJson(res, 502, { error: "AI request failed" });
          }
          res.statusCode = 200;
          res.setHeader("content-type", "text/plain; charset=utf-8");
          res.setHeader("cache-control", "no-store");
          try {
            if (!first.done && first.value) res.write(first.value);
            for (let r = await it.next(); !r.done; r = await it.next()) res.write(r.value);
          } catch {
            res.write("\n[error] stream interrupted");
          }
          res.end();
          return;
        }

        return next();
      });
    },
  };
}
