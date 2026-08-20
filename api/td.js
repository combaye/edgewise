// Vercel serverless adapter for production. Same proxyHandler as dev. Set
// TWELVEDATA_KEY in the Vercel project env (Settings → Environment Variables).
import { proxyHandler } from "../server/proxyHandler.js";

export default async function handler(req, res) {
  try {
    const { status, body } = await proxyHandler(req.query || {}, {
      TWELVEDATA_KEY: process.env.TWELVEDATA_KEY,
    });
    res.setHeader("content-type", "application/json");
    // allow Vercel's edge cache to dedupe identical upstream calls briefly
    res.setHeader("cache-control", "public, max-age=30, stale-while-revalidate=300");
    res.status(status).send(JSON.stringify(body));
  } catch (e) {
    res.status(500).json({ status: "error", code: 500, message: e?.message || "proxy error" });
  }
}
