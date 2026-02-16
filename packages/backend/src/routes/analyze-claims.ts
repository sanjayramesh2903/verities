import { FastifyInstance } from "fastify";
import { AnalyzeClaimsRequestSchema } from "@verities/shared";
import type { Claim } from "@verities/shared";
import { extractClaims, generateVerdict, generateRewrite } from "../services/llm.js";
import { searchForClaim } from "../services/search.js";
import { rankSources } from "../services/ranking.js";
import { formatCitation } from "../services/citations.js";
import { randomUUID } from "crypto";
import { CacheKeys, CacheTTL } from "../cache/cache.js";
import { getUser } from "../auth/auth-hook.js";

export async function analyzeClaimsRoute(server: FastifyInstance) {
  server.post("/analyze-claims", async (request, reply) => {
    const startTime = Date.now();
    const parsed = AnalyzeClaimsRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid request", details: parsed.error.issues });
    }

    let { text, citation_style, options } = parsed.data;
    const user = getUser(request);

    // Apply user preferences as defaults
    if (user && server.repo) {
      try {
        const prefs = await server.repo.getUserPreferences(user.id);
        if (!request.body || !(request.body as Record<string, unknown>).citation_style) {
          citation_style = prefs.citationStyle as typeof citation_style;
        }
        if (!request.body || !(request.body as Record<string, unknown>).options) {
          options = { max_claims: prefs.maxClaims };
        }
      } catch { /* use request defaults */ }
    }

    const cache = server.cache;
    const extractedClaims = await extractClaims(text, options.max_claims);

    // Process each claim with error isolation
    const claims: Claim[] = await Promise.all(
      extractedClaims.map(async (ec) => {
        try {
          const claimText = `${ec.subject} ${ec.predicate}`;

          // Check claim-level cache
          const claimCacheKey = CacheKeys.claimResult(claimText, citation_style);
          if (cache) {
            const cached = await cache.get<Claim>(claimCacheKey).catch(() => null);
            if (cached) return cached;
          }

          const rawResults = await searchForClaim(claimText, cache);
          const rankedSources = rankSources(ec, rawResults);

          const verdict = await generateVerdict(ec, rankedSources);
          const rewrites = await generateRewrite(
            text.slice(ec.span_start, ec.span_end),
            rankedSources
          );

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
            original_text: text.slice(ec.span_start, ec.span_end),
            span: { start: ec.span_start, end: ec.span_end },
            verdict: verdict.verdict,
            explanation: verdict.explanation,
            sources,
            rewrites: rewrites.rewrites,
          };

          // Cache the result
          if (cache) {
            await cache.set(claimCacheKey, claim, CacheTTL.CLAIM_RESULT).catch(() => {});
          }

          return claim;
        } catch (err) {
          // Per-claim error isolation: return "unclear" instead of failing the whole request
          server.log.error({ claim: ec.subject, error: (err as Error).message }, "Claim processing failed");
          return {
            claim_id: randomUUID(),
            original_text: text.slice(ec.span_start, ec.span_end),
            span: { start: ec.span_start, end: ec.span_end },
            verdict: "unclear" as const,
            explanation: "We could not verify this claim at this time. Please try again later.",
            sources: [],
            rewrites: [],
          };
        }
      })
    );

    const response = {
      request_id: randomUUID(),
      claims,
      metadata: {
        processing_time_ms: Date.now() - startTime,
        claims_extracted: claims.length,
        citation_style,
      },
    };

    // Save to history (fire-and-forget)
    if (user && server.repo) {
      server.repo.saveCheck(
        user.id,
        "analyze",
        text.slice(0, 200),
        JSON.stringify(response),
        claims.length
      ).catch((err) => server.log.error(err, "Failed to save check to history"));
    }

    // Audit log
    if (server.repo) {
      server.repo.logAudit(
        user?.id ?? null,
        "analyze",
        JSON.stringify({ claimCount: claims.length }),
        request.ip
      ).catch(() => {});
    }

    return response;
  });
}
