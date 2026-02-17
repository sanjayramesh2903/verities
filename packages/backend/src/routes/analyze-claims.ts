import { FastifyInstance } from "fastify";
import { AnalyzeClaimsRequestSchema } from "@verities/shared";
import type { Claim, CitationStyle } from "@verities/shared";
import type { CacheService } from "../cache/cache.js";
import { extractClaims, generateVerdict, generateRewrite } from "../services/llm.js";
import { searchForClaim } from "../services/search.js";
import { rankSources } from "../services/ranking.js";
import { formatCitation } from "../services/citations.js";
import { randomUUID } from "crypto";
import { CacheKeys, CacheTTL } from "../cache/cache.js";
import { getUser } from "../auth/auth-hook.js";

function getOriginalText(
  ec: { span_start?: number; span_end?: number; original_text?: string; subject: string; predicate: string },
  fullText: string
): string {
  if (ec.span_start !== undefined && ec.span_end !== undefined &&
      ec.span_start < ec.span_end && ec.span_end <= fullText.length) {
    return fullText.slice(ec.span_start, ec.span_end);
  }
  return ec.original_text || `${ec.subject} ${ec.predicate}`;
}

async function processClaim(
  ec: Awaited<ReturnType<typeof extractClaims>>[number],
  text: string,
  citation_style: CitationStyle,
  cache: CacheService | undefined,
  server: FastifyInstance
): Promise<Claim> {
  const claimText = `${ec.subject} ${ec.predicate}`;
  const claimCacheKey = CacheKeys.claimResult(claimText, citation_style);

  if (cache) {
    const cached = await cache.get(claimCacheKey).catch(() => null) as Claim | null;
    if (cached) return cached;
  }

  const rawResults = await searchForClaim(claimText, cache);
  const rankedSources = rankSources(ec, rawResults);

  const claimSentence = getOriginalText(ec, text);

  const verdict = await generateVerdict(ec, rankedSources);

  // Skip rewrite for broadly_supported or unclear — no actionable improvement needed
  const rewriteResult = (verdict.verdict === "broadly_supported" || verdict.verdict === "unclear")
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
    original_text: getOriginalText(ec, text),
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

function makeErrorClaim(
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

export async function analyzeClaimsRoute(server: FastifyInstance) {
  // Original batch endpoint
  server.post("/analyze-claims", async (request, reply) => {
    const startTime = Date.now();
    const parsed = AnalyzeClaimsRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid request", details: parsed.error.issues });
    }

    let { text, citation_style, options } = parsed.data;
    const user = getUser(request);

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

    // Full-text block cache: return instantly for repeated identical requests
    const analyzeKey = CacheKeys.analyzeResult(text, citation_style);
    if (cache) {
      const cachedFull = await cache.get(analyzeKey).catch(() => null) as typeof response | null;
      if (cachedFull) {
        cachedFull.metadata.processing_time_ms = Date.now() - startTime;
        return cachedFull;
      }
    }

    const extractedClaims = await extractClaims(text, options.max_claims);

    const claims: Claim[] = await Promise.all(
      extractedClaims.map(async (ec) => {
        try {
          return await processClaim(ec, text, citation_style, cache, server);
        } catch (err) {
          server.log.error({ claim: ec.subject, error: (err as Error).message }, "Claim processing failed");
          return makeErrorClaim(ec, text);
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

    if (cache) {
      await cache.set(analyzeKey, response, CacheTTL.ANALYZE_RESULT).catch(() => {});
    }

    if (user && server.repo) {
      server.repo.saveCheck(
        user.id, "analyze", text.slice(0, 200), JSON.stringify(response), claims.length
      ).catch((err) => server.log.error(err, "Failed to save check to history"));
    }
    if (server.repo) {
      server.repo.logAudit(
        user?.id ?? null, "analyze", JSON.stringify({ claimCount: claims.length }), request.ip
      ).catch(() => {});
    }

    return response;
  });

  // SSE streaming endpoint — sends claims as they complete
  server.post("/analyze-claims/stream", async (request, reply) => {
    const startTime = Date.now();
    const parsed = AnalyzeClaimsRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid request", details: parsed.error.issues });
    }

    let { text, citation_style, options } = parsed.data;
    const user = getUser(request);

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

    reply.raw.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    });

    const send = (event: string, data: unknown) => {
      reply.raw.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    try {
      const cache = server.cache;

      // Full-text block cache: stream all cached claims instantly
      const analyzeKey = CacheKeys.analyzeResult(text, citation_style);
      if (cache) {
        const cachedFull = await cache.get(analyzeKey).catch(() => null) as { claims: Claim[]; metadata: object } | null;
        if (cachedFull) {
          send("extraction", { total: cachedFull.claims.length });
          cachedFull.claims.forEach((claim, index) => send("claim", { index, claim }));
          send("done", {
            request_id: randomUUID(),
            metadata: { ...cachedFull.metadata, processing_time_ms: Date.now() - startTime },
          });
          reply.raw.end();
          return;
        }
      }

      const extractedClaims = await extractClaims(text, options.max_claims);
      send("extraction", { total: extractedClaims.length });

      // Process claims in parallel but stream results as they complete
      const claims: Claim[] = [];
      const promises = extractedClaims.map(async (ec, index) => {
        try {
          const claim = await processClaim(ec, text, citation_style, cache, server);
          claims.push(claim);
          send("claim", { index, claim });
        } catch (err) {
          server.log.error({ claim: ec.subject, error: (err as Error).message }, "Claim processing failed");
          const claim = makeErrorClaim(ec, text);
          claims.push(claim);
          send("claim", { index, claim });
        }
      });

      await Promise.all(promises);

      const doneMetadata = {
        processing_time_ms: Date.now() - startTime,
        claims_extracted: claims.length,
        citation_style,
      };

      send("done", { request_id: randomUUID(), metadata: doneMetadata });

      // Cache the full result for sub-750ms future responses
      if (cache) {
        const fullResponse = { claims, metadata: doneMetadata };
        await cache.set(analyzeKey, fullResponse, CacheTTL.ANALYZE_RESULT).catch(() => {});
      }

      // Fire-and-forget history + audit
      if (user && server.repo) {
        const response = { request_id: randomUUID(), claims, metadata: doneMetadata };
        server.repo.saveCheck(user.id, "analyze", text.slice(0, 200), JSON.stringify(response), claims.length).catch(() => {});
      }
      if (server.repo) {
        server.repo.logAudit(user?.id ?? null, "analyze", JSON.stringify({ claimCount: claims.length }), request.ip).catch(() => {});
      }
    } catch (err) {
      send("error", { message: (err as Error).message });
    }

    reply.raw.end();
  });
}
