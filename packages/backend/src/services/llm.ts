import Anthropic from "@anthropic-ai/sdk";
import { ExtractionResponseSchema, VerdictResponseSchema, RewriteResponseSchema } from "@verities/shared";
import type { ExtractedClaim, VerdictResponse, RewriteResponse } from "@verities/shared";
import { EXTRACTION_SYSTEM, buildExtractionPrompt } from "../prompts/extraction.js";
import { VERDICT_SYSTEM, buildVerdictPrompt } from "../prompts/verdict.js";
import { REWRITE_SYSTEM, buildRewritePrompt } from "../prompts/rewrite.js";

const client = new Anthropic();

interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  timeoutMs?: number;
}

async function callClaudeWithRetry(
  model: string,
  system: string,
  userMessage: string,
  maxTokens: number,
  options: RetryOptions = {}
): Promise<string> {
  const { maxRetries = 2, baseDelayMs = 1000, timeoutMs = 30000 } = options;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await Promise.race([
        client.messages.create({
          model,
          max_tokens: maxTokens,
          system,
          messages: [{ role: "user", content: userMessage }],
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`LLM call timed out after ${timeoutMs}ms`)), timeoutMs)
        ),
      ]);

      const textBlock = response.content.find((b) => b.type === "text");
      if (!textBlock || textBlock.type !== "text") {
        throw new Error("No text response from Claude");
      }
      return textBlock.text;
    } catch (err) {
      const isLastAttempt = attempt === maxRetries;
      if (isLastAttempt) throw err;

      const delay = baseDelayMs * Math.pow(2, attempt);
      console.warn(`LLM call failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${delay}ms:`, (err as Error).message);
      await new Promise((r) => setTimeout(r, delay));
    }
  }

  throw new Error("Unreachable");
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

export async function extractClaims(text: string, maxClaims: number): Promise<ExtractedClaim[]> {
  const prompt = buildExtractionPrompt(text, maxClaims);
  const raw = await callClaudeWithRetry(
    "claude-haiku-4-5-20251001", EXTRACTION_SYSTEM, prompt, 1000,
    { maxRetries: 2, baseDelayMs: 500, timeoutMs: 20000 }
  );
  return parseJSON(raw, ExtractionResponseSchema).claims;
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

  const raw = await callClaudeWithRetry(
    "claude-sonnet-4-5-20250929", VERDICT_SYSTEM, prompt, 500,
    { maxRetries: 2, baseDelayMs: 1000, timeoutMs: 30000 }
  );
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
  const raw = await callClaudeWithRetry(
    "claude-sonnet-4-5-20250929", REWRITE_SYSTEM, prompt, 300,
    { maxRetries: 2, baseDelayMs: 1000, timeoutMs: 30000 }
  );
  return parseJSON(raw, RewriteResponseSchema);
}
