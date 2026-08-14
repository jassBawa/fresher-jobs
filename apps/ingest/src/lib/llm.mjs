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

};

// Order matters: first one with a usable key wins.
//
// Free tiers and local only. The paid frontier fallbacks were removed: this
// workload is JSON extraction plus four short prose fields, and the measured
// spread was ₹9/month against ₹276 for the same 25 postings/day — a 30× swing
// for output that gets *worse*, since a bigger model writes longer and more
// florid copy on a page whose only job is "can I apply, yes or no". Keeping
// them as a fallback meant a stray key in the environment could silently start
// billing for a job an 8B model already does well. See docs/decisions.md D11.
const ORDER = ["groq", "cerebras", "gemini", "openrouter"];

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

// A reasoning model answers with its scratchpad first, wrapped in a tag pair.
// Built from parts so the literal tags can't be eaten by anything that rewrites
// HTML in this file.
const THINK = "think(?:ing)?";
const THINK_BLOCK = new RegExp(`<${THINK}\\b[^>]*>[\\s\\S]*?</${THINK}>`, "gi");
const THINK_OPEN = new RegExp(`<${THINK}\\b[^>]*>`, "i");

const isRateLimit = (err) => / 429:|rate limited/i.test(err.message);

/** Pull a JSON value out of a model response that may carry a reasoning block,
 *  a markdown fence, or plain chatter around the answer. Exported for tests. */
export function parseJSON(text = "") {
  // Drop complete reasoning blocks. If one is left open the response was cut
  // off mid-thought and there is no answer in it to salvage — say so plainly
  // rather than parsing a brace out of the model's scratchpad.
  const body = text.replace(THINK_BLOCK, "");
  if (THINK_OPEN.test(body)) throw new Error("response truncated inside a reasoning block");

  const unfenced = body.match(/```(?:json)?\s*([\s\S]*?)```/)?.[1] ?? body;

  const start = unfenced.search(/[[{]/);
  if (start === -1) throw new Error("no JSON in response");
  const close = unfenced.lastIndexOf(unfenced[start] === "{" ? "}" : "]");
  if (close <= start) throw new Error("unterminated JSON in response");
  return JSON.parse(unfenced.slice(start, close + 1));
}

/** Ask for JSON, parse defensively. Retries once on malformed output and
 *  retries 429 rate limits with backoff until it succeeds or times out. */
export async function askJSON(prompt, { maxTokens = 1200, retries = 1 } = {}) {
  const name = activeProvider();
  const p = P[name];
  const model = p.model();
  const attempt = async () => parseJSON(await p.call(model, p.key(), prompt, maxTokens));

  let lastErr;
  for (let i = 0; i <= retries; i++) {
    try {
      return await attempt();
    } catch (err) {
      lastErr = err;
      if (!isRateLimit(err)) continue; // malformed output — just ask again
      // Wait out the window, then keep trying until the overall deadline.
      const wait = Number((err.message.match(/retry after (\d+)s/) || [])[1] || 30) * 1000;
      for (let j = 0; j < 20; j++) {
        await sleep(wait);
        try {
          return await attempt();
        } catch (e2) {
          lastErr = e2;
          if (!isRateLimit(e2)) break; // non-rate errors stop the wait-out loop
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
