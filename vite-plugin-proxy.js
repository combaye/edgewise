// Mounts the data proxy (/api/td) and the AI analyst (/api/ai) during
// `npm run dev`, in the same process as Vite — no separate server, no account,
// nothing to deploy for local use. The Twelve Data and Anthropic keys are read
// server-side here and never reach the client bundle.
import { proxyHandler } from "./server/proxyHandler.js";
import { aiStream, hasAiKey } from "./server/aiHandler.js";

const readBody = (req) =>
  new Promise((resolve) => {
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => resolve(data));
    req.on("error", () => resolve(""));
  });

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
          if (req.method !== "POST") {
            res.statusCode = 405;
            res.end("POST only");
            return;
          }
          let params;
          try {
            params = JSON.parse((await readBody(req)) || "{}");
          } catch {
            res.statusCode = 400;
            res.setHeader("content-type", "application/json");
            res.end(JSON.stringify({ error: "bad json" }));
            return;
          }
          if (!hasAiKey(env.ANTHROPIC_API_KEY)) {
            res.statusCode = 200;
            res.setHeader("content-type", "application/json");
            res.end(JSON.stringify({ error: "missing_key" }));
            return;
          }
          // peek the first chunk so pre-stream errors (bad key, 400) surface as
          // JSON before we commit to a streaming text/plain response
          const it = aiStream(params, env.ANTHROPIC_API_KEY)[Symbol.asyncIterator]();
          let first;
          try {
            first = await it.next();
          } catch (e) {
            res.statusCode = 200;
            res.setHeader("content-type", "application/json");
            res.end(JSON.stringify({ error: e?.message || "AI request failed" }));
            return;
          }
          res.statusCode = 200;
          res.setHeader("content-type", "text/plain; charset=utf-8");
          res.setHeader("cache-control", "no-store");
          try {
            if (!first.done && first.value) res.write(first.value);
            for (let r = await it.next(); !r.done; r = await it.next()) res.write(r.value);
          } catch (e) {
            res.write(`\n[error] ${e?.message || "stream failed"}`);
          }
          res.end();
          return;
        }

        return next();
      });
    },
  };
}
