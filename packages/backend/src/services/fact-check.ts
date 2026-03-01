/**
 * Shared fact-checking pipeline.
 * Used by both analyze-claims and review-document routes so they
 * produce consistent verdicts from the same search → rank → LLM flow.
 */
import { FastifyInstance } from "fastify";
import type { Claim, CitationStyle } from "@verities/shared";
import { randomUUID } from "crypto";
import type { CacheService } from "../cache/cache.js";
import { CacheKeys, CacheTTL } from "../cache/cache.js";
import { extractClaims, generateVerdict, generateRewrite } from "./llm.js";
import { searchForClaim } from "./search.js";
import { rankSources } from "./ranking.js";
import { formatCitation } from "./citations.js";

export type ExtractedClaimItem = Awaited<ReturnType<typeof extractClaims>>[number];

export function getOriginalText(
  ec: { span_start?: number; span_end?: number; original_text?: string; subject: string; predicate: string },
  fullText: string
): string {
  if (
    ec.span_start !== undefined &&
    ec.span_end !== undefined &&
    ec.span_start >= 0 &&
    ec.span_start < ec.span_end &&
    ec.span_end <= fullText.length
  ) {
    return fullText.slice(ec.span_start, ec.span_end);
  }
  return ec.original_text || `${ec.subject} ${ec.predicate}`;
}

export async function processClaim(
  ec: ExtractedClaimItem,
  text: string,
  citation_style: CitationStyle,
  cache: CacheService | undefined,
  server: FastifyInstance
): Promise<Claim> {
  const claimText = `${ec.subject} ${ec.predicate}`;
  const claimCacheKey = CacheKeys.claimResult(claimText, citation_style);

  if (cache) {
    const cached = await cache.get(claimCacheKey).catch(() => null) as Claim | null;
    if (cached) {
      // Re-derive position fields so one user's original_text / span never leaks into another's response
      return {
        ...cached,
        claim_id: randomUUID(),
        original_text: getOriginalText(ec, text),
        span: { start: ec.span_start ?? 0, end: ec.span_end ?? 0 },
      };
    }
  }

  const rawResults = await searchForClaim(claimText, cache, {
    numbers: ec.numbers,
    dates: ec.dates,
  });
  const rankedSources = rankSources(ec, rawResults);

  const claimSentence = getOriginalText(ec, text);
  const verdict = await generateVerdict(ec, rankedSources);

  // Skip rewrite for broadly_supported or unclear — no actionable improvement needed
  const rewriteResult =
    verdict.verdict === "broadly_supported" || verdict.verdict === "unclear"
      ? { rewrites: [] }
      : await generateRewrite(claimSentence, rankedSources);

  const sources = rankedSources.map((rs) => ({
    source_id: randomUUID(),
    title: rs.title,
    url: rs.url,
    snippet: rs.snippet,
    reliability_tier: rs.tier as 1 | 2 | 3 | 4,
    citation_inline: formatCitation(rs, citation_style, "inline"),
    citation_bibliography: formatCitation(rs, citation_style, "bibliography"),
  }));

  const claim: Claim = {
    claim_id: randomUUID(),
    original_text: claimSentence,
    span: { start: ec.span_start ?? 0, end: ec.span_end ?? 0 },
    verdict: verdict.verdict,
    explanation: verdict.explanation,
    sources,
    rewrites: rewriteResult.rewrites,
  };

  if (cache) {
    await cache.set(claimCacheKey, claim, CacheTTL.CLAIM_RESULT).catch(() => {});
  }

  return claim;
}

export function makeErrorClaim(
  ec: { span_start?: number; span_end?: number; original_text?: string; subject: string; predicate: string },
  text: string
): Claim {
  return {
    claim_id: randomUUID(),
    original_text: getOriginalText(ec, text),
    span: { start: ec.span_start ?? 0, end: ec.span_end ?? 0 },
    verdict: "unclear" as const,
    explanation: "We could not verify this claim at this time. Please try again later.",
    sources: [],
    rewrites: [],
  };
}
