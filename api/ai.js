// Vercel serverless adapter for the AI analyst. Streams the response. Set
// ANTHROPIC_API_KEY in the Vercel project env (Settings → Environment Variables),
// and ALSO set a monthly spend limit in the Anthropic console as a hard backstop.
import { aiStream, hasAiKey } from "../server/aiHandler.js";
import { MAX_BODY_BYTES, validateAiRequest, checkRateLimit, clientIp } from "../server/aiGuard.js";

const fail = (res, status, error, extraHeaders = {}) => {
  for (const [k, v] of Object.entries(extraHeaders)) res.setHeader(k, v);
  res.status(status).json({ error });
};

export default async function handler(req, res) {
  res.setHeader("cache-control", "no-store");
  if (req.method !== "POST") return fail(res, 405, "POST only");

  // size cap: trust neither the header nor Vercel's parser alone
  if (Number(req.headers["content-length"] || 0) > MAX_BODY_BYTES) return fail(res, 413, "request too large");
  let body = req.body;
  try {
    if (typeof body === "string") body = JSON.parse(body || "{}");
  } catch {
    return fail(res, 400, "invalid JSON");
  }
  if (JSON.stringify(body ?? {}).length > MAX_BODY_BYTES) return fail(res, 413, "request too large");

  const v = validateAiRequest(body);
  if (!v.ok) return fail(res, v.status, v.error);

  if (!hasAiKey(process.env.ANTHROPIC_API_KEY)) return res.status(200).json({ error: "missing_key" });

  const rl = checkRateLimit(clientIp(req));
  if (!rl.ok) return fail(res, 429, rl.error, { "retry-after": String(rl.retryAfterSec) });

  const it = aiStream(v.params, process.env.ANTHROPIC_API_KEY)[Symbol.asyncIterator]();
  let first;
  try {
    first = await it.next();
  } catch {
    // don't echo upstream error text (it can include account/billing detail)
    return fail(res, 502, "AI request failed");
  }
  res.setHeader("content-type", "text/plain; charset=utf-8");
  try {
    if (!first.done && first.value) res.write(first.value);
    for (let r = await it.next(); !r.done; r = await it.next()) res.write(r.value);
  } catch {
    res.write("\n[error] stream interrupted");
  }
  res.end();
}
