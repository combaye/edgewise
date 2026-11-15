// AI analyst endpoint core. Uses the official Anthropic SDK (Opus 5.5, adaptive
// thinking) and STREAMS the response so the terminal types it out live. The key
// lives server-side only. Framework-agnostic: exposes an async generator the
// dev middleware and the Vercel function both pump to the HTTP response.

import Anthropic from "@anthropic-ai/sdk";

const MODEL = "claude-opus-5-5";

export const hasAiKey = (apiKey) => Boolean(apiKey && String(apiKey).trim());

const BRIEF_SYSTEM = `You are the analyst engine inside EDGEWISE, a quantitative markets terminal.
You receive a JSON snapshot of one instrument's current computed signals: a historical pattern-matching
forecast, seasonality, technical indicators, a volatility/regime read, valuation models, and a mechanical
trade plan. Write a tight brief for an experienced trader.

Format exactly:
- Open with a 1–2 sentence THESIS stating the net read and how much conviction the signals justify.
- Then a line "WHAT'S DRIVING IT" followed by 2–4 "•" bullets, each tied to a specific signal and its number.
- Then a line "RISKS / WHAT FLIPS THIS" followed by 2–3 "•" bullets naming conflicting signals or conditions.

Rules: be concrete and numeric; call out where signals disagree; never manufacture confidence. Keep it under
~200 words. Use **bold** for signal names. No preamble, no "Here is", no sign-off. This is analysis of
mechanical signals for an experienced user — do NOT append an investment-advice disclaimer (the UI shows one).`;

const ASK_SYSTEM = `You are the analyst engine inside EDGEWISE. Answer the user's question using the
provided JSON snapshot of the instrument's computed signals plus general market knowledge. Be concise and
specific, cite the relevant numbers from the snapshot, and if the snapshot doesn't contain what's needed, say
so plainly. Use "•" bullets and **bold** sparingly. No preamble. Not investment advice — but don't add a disclaimer.`;

const JOURNAL_SYSTEM = `You are the trading-performance coach inside EDGEWISE. You receive a JSON
snapshot of one trader's OWN journal: aggregate stats (win rate, expectancy in R, profit factor, max drawdown,
discipline %), a list of already-detected behavioral patterns, performance broken down by setup / weekday /
emotion, and a tail of recent trades. Write a direct, personalized coaching brief for this trader.

Format exactly:
- Open with 1–2 sentences naming the single biggest thing helping them and the single biggest thing hurting them, with numbers.
- A line "WHAT'S WORKING" then 1–2 "•" bullets citing their best setups/habits and the numbers.
- A line "WHAT'S COSTING YOU" then 2–3 "•" bullets on the most damaging behavioral leaks, each quantified (R, $, win-rate).
- A line "THE PLAN" then exactly 3 numbered, concrete, mechanical rules they can apply next session (e.g. position limits, stop discipline, time/setup filters). Make them specific to THIS trader's data, not generic.

Rules: be concrete and numeric, reference their actual setups/numbers, and be honest — if expectancy is negative,
say the system isn't working yet and why. Use **bold** for the rule names and key terms. Keep it under ~230 words.
No preamble, no "Here is", no sign-off, no investment-advice disclaimer (the UI shows one).`;

function userContent({ mode, payload, question }) {
  const snap = "```json\n" + JSON.stringify(payload ?? {}, null, 1) + "\n```";
  if (mode === "ask") {
    return `Signal snapshot for ${payload?.symbol ?? "the instrument"}:\n${snap}\n\nQuestion: ${String(question || "").slice(0, 600)}`;
  }
  if (mode === "journal") {
    return `This trader's journal snapshot — write their coaching brief and improvement plan.\n\n${snap}`;
  }
  return `Current signal snapshot for ${payload?.symbol ?? "the instrument"} (${payload?.name ?? ""}). Write the analyst brief.\n\n${snap}`;
}

const SYSTEM_FOR = { ask: ASK_SYSTEM, journal: JOURNAL_SYSTEM };

export async function* aiStream(params, apiKey) {
  const client = new Anthropic({ apiKey });
  const stream = client.messages.stream({
    model: MODEL,
    max_tokens: 2500,
    thinking: { type: "adaptive" },
    output_config: { effort: "medium" },
    system: SYSTEM_FOR[params.mode] ?? BRIEF_SYSTEM,
    messages: [{ role: "user", content: userContent(params) }],
  });
  for await (const event of stream) {
    if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
      yield event.delta.text;
    }
  }
}
