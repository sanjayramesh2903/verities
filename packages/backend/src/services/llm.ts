import { ExtractionResponseSchema, VerdictResponseSchema, RewriteResponseSchema } from "@verities/shared";
import type { ExtractedClaim, VerdictResponse, RewriteResponse } from "@verities/shared";
import { EXTRACTION_SYSTEM, buildExtractionPrompt } from "../prompts/extraction.js";
import { VERDICT_SYSTEM, buildVerdictPrompt } from "../prompts/verdict.js";
import { REWRITE_SYSTEM, buildRewritePrompt } from "../prompts/rewrite.js";

const GROQ_BASE = "https://api.groq.com/openai/v1/chat/completions";

// Groq free models — fast inference, no credit card required
// https://console.groq.com/docs/models
const MODELS = [
  "llama-3.3-70b-versatile",
  "llama3-70b-8192",
  "mixtral-8x7b-32768",
  "llama-3.1-8b-instant",
];

interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  timeoutMs?: number;
}

async function callGroq(
  model: string,
  system: string,
  userMessage: string,
  timeoutMs: number
): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY environment variable is required");
  }

  const response = await Promise.race([
    fetch(GROQ_BASE, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: userMessage },
        ],
        response_format: { type: "json_object" },
      }),
    }),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`LLM call timed out after ${timeoutMs}ms`)), timeoutMs)
    ),
  ]);

  if (!response.ok) {
    const errBody = await response.text().catch(() => "");
    throw new Error(`Groq ${model} error ${response.status}: ${errBody}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) {
    throw new Error(`No text response from ${model}`);
  }
  return text;
}

/**
 * Try each free model in order. If one fails (rate limited, down, etc.),
 * move to the next. Retries the full model list up to maxRetries times.
 */
async function callWithFallback(
  system: string,
  userMessage: string,
  options: RetryOptions = {}
): Promise<string> {
  const { maxRetries = 1, baseDelayMs = 1000, timeoutMs = 30000 } = options;
  const lastErrors: string[] = [];

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    lastErrors.length = 0;
    for (const model of MODELS) {
      try {
        return await callGroq(model, system, userMessage, timeoutMs);
      } catch (err) {
        const msg = (err as Error).message;
        lastErrors.push(`${model.split("/")[1]}: ${msg}`);
        console.warn(`Model ${model} failed: ${msg}`);
      }
    }

    if (attempt < maxRetries) {
      const delay = baseDelayMs * Math.pow(2, attempt);
      console.warn(`All models failed (round ${attempt + 1}), retrying in ${delay}ms...`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }

  const summary = lastErrors[0] ?? "unknown error";
  throw new Error(`LLM unavailable — ${summary}`);
}

function parseJSON<T>(raw: string, schema: { safeParse: (v: unknown) => { success: boolean; data?: T; error?: unknown } }): T {
  const cleaned = raw.replace(/^```(?:json)?\s*\n?/m, "").replace(/\n?```\s*$/m, "").trim();
  const parsed = JSON.parse(cleaned);
  const result = schema.safeParse(parsed);
  if (!result.success) {
    throw new Error(`Schema validation failed: ${JSON.stringify(result.error)}`);
  }
  return result.data as T;
}

/**
 * Find the best matching position of `needle` in `haystack` using exact match
 * first, then falling back to case-insensitive and substring matching.
 */
function findSpan(haystack: string, needle: string): { start: number; end: number } {
  // Exact match
  let idx = haystack.indexOf(needle);
  if (idx !== -1) return { start: idx, end: idx + needle.length };

  // Case-insensitive match
  const lower = haystack.toLowerCase();
  const needleLower = needle.toLowerCase();
  idx = lower.indexOf(needleLower);
  if (idx !== -1) return { start: idx, end: idx + needle.length };

  // Try matching a significant substring (first 60 chars)
  const prefix = needleLower.slice(0, 60);
  if (prefix.length > 10) {
    idx = lower.indexOf(prefix);
    if (idx !== -1) {
      // Find the end of the sentence from this position
      const sentenceEnd = haystack.indexOf(".", idx + prefix.length);
      const end = sentenceEnd !== -1 ? sentenceEnd + 1 : Math.min(idx + needle.length, haystack.length);
      return { start: idx, end };
    }
  }

  // Fallback: return 0,0 (claim text will be used as-is from original_text)
  return { start: 0, end: 0 };
}

export async function extractClaims(text: string, maxClaims: number): Promise<ExtractedClaim[]> {
  const prompt = buildExtractionPrompt(text, maxClaims);
  const raw = await callWithFallback(EXTRACTION_SYSTEM, prompt, {
    maxRetries: 1, baseDelayMs: 500, timeoutMs: 20000,
  });
  const claims = parseJSON(raw, ExtractionResponseSchema).claims;

  // Post-process: compute correct spans from original_text via text matching
  const usedRanges: Array<{ start: number; end: number }> = [];
  return claims.map((claim) => {
    if (claim.original_text) {
      const span = findSpan(text, claim.original_text);
      // Avoid overlapping spans — search after already-used ranges
      if (span.start === 0 && span.end === 0) {
        // Could not find text at all; keep LLM spans if plausible
        if (claim.span_start !== undefined && claim.span_end !== undefined &&
            claim.span_start >= 0 && claim.span_end <= text.length && claim.span_start < claim.span_end) {
          return claim;
        }
      } else {
        claim.span_start = span.start;
        claim.span_end = span.end;
      }
    }
    return claim;
  });
}

export async function generateVerdict(
  claim: ExtractedClaim,
  sources: { id: string; title: string; url: string; snippet: string; tier: number }[]
): Promise<VerdictResponse> {
  if (sources.length === 0) {
    return {
      verdict: "unclear",
      explanation: "No reliable sources were found for this claim. Consider consulting textbooks, scholarly databases, or a librarian for verification.",
      source_ids: [],
    };
  }

  const prompt = buildVerdictPrompt(
    { subject: claim.subject, predicate: claim.predicate, numbers: claim.numbers, dates: claim.dates },
    sources.map((s) => ({ id: s.id, title: s.title, snippet: s.snippet, tier: s.tier }))
  );

  const raw = await callWithFallback(VERDICT_SYSTEM, prompt, {
    maxRetries: 1, baseDelayMs: 1000, timeoutMs: 20000,
  });
  return parseJSON(raw, VerdictResponseSchema);
}

export async function generateRewrite(
  originalText: string,
  sources: { title: string; snippet: string }[]
): Promise<RewriteResponse> {
  if (sources.length === 0) {
    return { rewrites: [] };
  }

  const prompt = buildRewritePrompt(originalText, sources);
  const raw = await callWithFallback(REWRITE_SYSTEM, prompt, {
    maxRetries: 1, baseDelayMs: 1000, timeoutMs: 15000,
  });
  return parseJSON(raw, RewriteResponseSchema);
}
