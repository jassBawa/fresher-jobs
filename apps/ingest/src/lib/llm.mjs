// Provider-agnostic JSON-mode LLM call. No SDK, no dependencies.
//
// Almost everything here speaks the OpenAI chat-completions shape, so they share
// one adapter and differ only by base URL, key and model. Ordered cheapest-and-
// fastest first: a local model costs nothing, Groq and Cerebras are free-tier and
// very fast, and the big paid providers sit at the bottom as a fallback.

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Wraps providers (Groq, Cerebras, Gemini, OpenAI, OpenRouter) comfortably inside
// their free tiers. The real ceiling on free plans is requests/min and
// tokens/min (Groq: llama-3.1-8b-instant = 30 RPM / 6,000 TPM), which 429s when
// exceeded. We enforce a minimum gap between calls and, on a 429, honor the
// Retry-After header so a burst degrades into a slow crawl instead of failing.
const MIN_GAP_MS = Math.max(Number(process.env.INGEST_DELAY_MS || 0), 1500);
let lastCallAt = 0;

async function pace() {
  const wait = lastCallAt + MIN_GAP_MS - Date.now();
  if (wait > 0) await sleep(wait);
  lastCallAt = Date.now();
}

function retryAfterMs(res, fallbackMs) {
  const ra = Number.parseFloat(res.headers.get("retry-after"));
  if (Number.isFinite(ra) && ra >= 0) return ra * 1000;
  // x-ratelimit-reset-tokens is a unix-epoch seconds timestamp on some providers
  const reset = Number.parseFloat(res.headers.get("x-ratelimit-reset-tokens"));
  if (Number.isFinite(reset) && reset > 0) {
    const wait = reset * 1000 - Date.now();
    if (wait > 0) return wait;
  }
  return fallbackMs;
}

const oai = (name, baseURL, keyEnv, model, extraHeaders = {}) => ({
  name,
  key: () => (keyEnv ? process.env[keyEnv] : "local"),
  model: () => process.env.LLM_MODEL || model,
  async call(model, key, prompt, maxTokens) {
    await pace();
    const r = await fetch(`${baseURL}/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${key}`,
        ...extraHeaders,
      },
      signal: AbortSignal.timeout(90000),
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.4,
        max_tokens: maxTokens,
      }),
    });
    if (r.status === 429) {
      throw new Error(`${name} 429: rate limited — retry after ${(retryAfterMs(r, 30000) / 1000).toFixed(0)}s`);
    }
    if (!r.ok) throw new Error(`${name} ${r.status}: ${(await r.text()).slice(0, 300)}`);
    const d = await r.json();
    return d.choices?.[0]?.message?.content ?? "";
  },
});

const P = {
  // ---- free / near-free / fast -------------------------------------------
  ollama: oai("ollama", process.env.OLLAMA_HOST || "http://localhost:11434/v1", null, "qwen2.5:3b"),
  groq: oai("groq", "https://api.groq.com/openai/v1", "GROQ_API_KEY", "llama-3.1-8b-instant"),
  cerebras: oai("cerebras", "https://api.cerebras.ai/v1", "CEREBRAS_API_KEY", "llama3.1-8b"),
  openrouter: oai("openrouter", "https://openrouter.ai/api/v1", "OPENROUTER_API_KEY", "meta-llama/llama-3.3-70b-instruct:free"),

  // ---- Gemini uses its native API: strict JSON mode is more reliable ------
  gemini: {
    name: "gemini",
    key: () => process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY,
    model: () => process.env.LLM_MODEL || "gemini-2.5-flash-lite",
    async call(model, key, prompt, maxTokens) {
      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          signal: AbortSignal.timeout(90000),
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              responseMimeType: "application/json",
              temperature: 0.4,
              maxOutputTokens: maxTokens,
            },
          }),
        }
      );
      if (!r.ok) throw new Error(`gemini ${r.status}: ${(await r.text()).slice(0, 300)}`);
      const d = await r.json();
      return d.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") ?? "";
    },
  },

  // ---- paid fallbacks ------------------------------------------------------
  openai: oai("openai", "https://api.openai.com/v1", "OPENAI_API_KEY", "gpt-5-nano"),
  anthropic: {
    name: "anthropic",
    key: () => process.env.ANTHROPIC_API_KEY,
    model: () => process.env.LLM_MODEL || "claude-haiku-4-5-20251001",
    async call(model, key, prompt, maxTokens) {
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": key,
          "anthropic-version": "2023-06-01",
        },
        signal: AbortSignal.timeout(90000),
        body: JSON.stringify({
          model,
          max_tokens: maxTokens,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      if (!r.ok) throw new Error(`anthropic ${r.status}: ${(await r.text()).slice(0, 300)}`);
      const d = await r.json();
      return d.content?.map((c) => c.text || "").join("") ?? "";
    },
  },
};

// Order matters: first one with a usable key wins.
const ORDER = ["groq", "cerebras", "gemini", "openrouter", "openai", "anthropic"];

let cached = null;

export function activeProvider() {
  if (cached) return cached;

  const forced = process.env.LLM_PROVIDER;
  if (forced) {
    if (!P[forced]) throw new Error(`Unknown LLM_PROVIDER "${forced}". Options: ${Object.keys(P).join(", ")}`);
    if (forced !== "ollama" && !P[forced].key()) {
      throw new Error(`LLM_PROVIDER=${forced} but its API key is not set`);
    }
    return (cached = forced);
  }

  const found = ORDER.find((n) => P[n].key());
  if (!found) {
    throw new Error(
      "No LLM configured. Cheapest options:\n" +
        "    • Groq      — free tier, very fast:  GROQ_API_KEY=…      (console.groq.com)\n" +
        "    • Cerebras  — free tier, fastest:    CEREBRAS_API_KEY=…  (cloud.cerebras.ai)\n" +
        "    • Gemini    — free tier:             GEMINI_API_KEY=…    (aistudio.google.com)\n" +
        "    • Local     — no key, no cost:       LLM_PROVIDER=ollama (ollama serve)\n" +
        "  See .env.example."
    );
  }
  return (cached = found);
}

/** Ask for JSON, parse defensively. Retries once on malformed output and
 *  retries 429 rate limits with backoff until it succeeds or times out. */
export async function askJSON(prompt, { maxTokens = 1200, retries = 1 } = {}) {
  const name = activeProvider();
  const p = P[name];
  const model = p.model();

  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const text = await p.call(model, p.key(), prompt, maxTokens);
      // Small models sometimes wrap JSON in prose, a fence, or a  thinking block.
      const body = (text.match(/```(?:json)?\s*([\s\S]*?)```/)?.[1] ?? text).replace(
        / thinking[\s\S]*?<\/think>/gi,
        ""
      );
      const start = body.search(/[[{]/);
      if (start === -1) throw new Error("no JSON in response");
      const close = body.lastIndexOf(body[start] === "{" ? "}" : "]");
      return JSON.parse(body.slice(start, close + 1));
    } catch (err) {
      lastErr = err;
      const rateLimited = / 429:|rate limited/i.test(err.message);
      if (!rateLimited) continue;
      // Wait out the window, then keep trying until the overall deadline.
      const wait = Number((err.message.match(/retry after (\d+)s/) || [])[1] || 30) * 1000;
      for (let i = 0; i < 20; i++) {
        await sleep(wait);
        try {
          const text = await p.call(model, p.key(), prompt, maxTokens);
          const body = (text.match(/```(?:json)?\s*([\s\S]*?)```/)?.[1] ?? text).replace(
            / thinking[\s\S]*?<\/think>/gi,
            ""
          );
          const start = body.search(/[[{]/);
          if (start === -1) throw new Error("no JSON in response");
          const close = body.lastIndexOf(body[start] === "{" ? "}" : "]");
          return JSON.parse(body.slice(start, close + 1));
        } catch (e2) {
          lastErr = e2;
          if (!/ 429:|rate limited/i.test(e2.message)) throw e2; // non-rate errors fail fast
        }
      }
    }
  }
  throw new Error(`${name}/${model} failed: ${lastErr.message}`);
}

export function providerBanner() {
  const name = activeProvider();
  return `${name} · ${P[name].model()}`;
}
