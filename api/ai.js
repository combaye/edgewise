// Vercel serverless adapter for the AI analyst. Streams the response. Set
// ANTHROPIC_API_KEY in the Vercel project env (Settings → Environment Variables).
import { aiStream, hasAiKey } from "../server/aiHandler.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).send("POST only");
    return;
  }
  const params = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
  if (!hasAiKey(process.env.ANTHROPIC_API_KEY)) {
    res.status(200).json({ error: "missing_key" });
    return;
  }
  const it = aiStream(params, process.env.ANTHROPIC_API_KEY)[Symbol.asyncIterator]();
  let first;
  try {
    first = await it.next();
  } catch (e) {
    res.status(200).json({ error: e?.message || "AI request failed" });
    return;
  }
  res.setHeader("content-type", "text/plain; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  try {
    if (!first.done && first.value) res.write(first.value);
    for (let r = await it.next(); !r.done; r = await it.next()) res.write(r.value);
  } catch (e) {
    res.write(`\n[error] ${e?.message || "stream failed"}`);
  }
  res.end();
}
