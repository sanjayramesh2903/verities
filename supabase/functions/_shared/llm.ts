import { buildExtractionPrompt } from "./prompts/extraction.ts";
import { buildVerdictPrompt, SourceForPrompt } from "./prompts/verdict.ts";
import { buildRewritePrompt } from "./prompts/rewrite.ts";

const GROQ_MODELS = [
  "llama-3.3-70b-versatile",
  "llama-3.1-70b-versatile",
  "mixtral-8x7b-32768",
  "llama3-8b-8192",
];

async function callGroq(
  model: string,
  prompt: string,
  maxTokens = 1200
): Promise<string> {
  const apiKey = Deno.env.get("GROQ_API_KEY");
  if (!apiKey) throw new Error("GROQ_API_KEY not set");

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      max_tokens: maxTokens,
      temperature: 0.1,
    }),
    signal: AbortSignal.timeout(30_000),
  });

  if (res.status === 429) throw new Error("RATE_LIMIT");
  if (!res.ok) throw new Error(`Groq HTTP ${res.status}: ${await res.text()}`);

  const json = await res.json();
  return json.choices[0].message.content as string;
}

export async function callGroqWithFallback(
  prompt: string,
  maxTokens = 1200
): Promise<string> {
  for (let attempt = 0; attempt < 2; attempt++) {
    for (const model of GROQ_MODELS) {
      try {
        return await callGroq(model, prompt, maxTokens);
      } catch (err) {
        const msg = (err as Error).message;
        if (msg === "RATE_LIMIT") {
          await new Promise((r) => setTimeout(r, 600));
          continue;
        }
        // Non-rate-limit errors: skip this model
        console.warn(`Model ${model} failed: ${msg}`);
      }
    }
    await new Promise((r) => setTimeout(r, attempt === 0 ? 1000 : 2000));
  }
  throw new Error(
    "All Groq models temporarily unavailable. Please try again in a moment."
  );
}

// ─── Parse helper: strips markdown fences, extracts JSON ────────────────
function parseJson<T>(raw: string): T {
  const cleaned = raw
    .replace(/^```(?:json)?\n?/m, "")
    .replace(/\n?```$/m, "")
    .trim();
  return JSON.parse(cleaned) as T;
}

// ─── Exports ─────────────────────────────────────────────────────────────

export interface ExtractedClaim {
  claim_id: string;
  original_text: string;
  subject: string;
  predicate: string;
}

export async function extractClaims(
  text: string,
  maxClaims = 10
): Promise<ExtractedClaim[]> {
  const prompt = buildExtractionPrompt(text, maxClaims);
  const raw = await callGroqWithFallback(prompt, 800);

  let parsed: { claims?: ExtractedClaim[] } | ExtractedClaim[] = parseJson(raw);
  if (!Array.isArray(parsed)) {
    parsed = (parsed as { claims?: ExtractedClaim[] }).claims ?? [];
  }

  return (parsed as ExtractedClaim[]).slice(0, maxClaims);
}

export interface VerdictResult {
  verdict: "broadly_supported" | "contested" | "refuted" | "unclear";
  confidence: number;
  explanation: string;
  source_ids: string[];
}

export async function generateVerdict(
  claimText: string,
  sources: SourceForPrompt[]
): Promise<VerdictResult> {
  if (sources.length === 0) {
    return {
      verdict: "unclear",
      confidence: 0,
      explanation: "No sources were found to evaluate this claim.",
      source_ids: [],
    };
  }
  const prompt = buildVerdictPrompt(claimText, sources);
  const raw = await callGroqWithFallback(prompt, 400);
  return parseJson<VerdictResult>(raw);
}

export async function generateRewrite(
  originalText: string,
  sources: SourceForPrompt[]
): Promise<string[]> {
  if (sources.length === 0) return [];
  const prompt = buildRewritePrompt(
    originalText,
    sources.map((s) => ({ title: s.title, url: s.url, snippet: s.snippet }))
  );
  const raw = await callGroqWithFallback(prompt, 300);
  const parsed = parseJson<{ rewrites?: string[] }>(raw);
  return parsed.rewrites ?? [];
}
