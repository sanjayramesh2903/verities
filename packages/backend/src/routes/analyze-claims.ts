import { FastifyInstance } from "fastify";
import { AnalyzeClaimsRequestSchema } from "@verities/shared";
import type { Claim, CitationStyle } from "@verities/shared";
import type { CacheService } from "../cache/cache.js";
import { extractClaims } from "../services/llm.js";
import { randomUUID } from "crypto";
import { CacheKeys, CacheTTL } from "../cache/cache.js";
import { getUser } from "../auth/auth-hook.js";
import { enforceQuota } from "../middleware/quota.js";
import { processClaim, makeErrorClaim } from "../services/fact-check.js";

export async function analyzeClaimsRoute(server: FastifyInstance) {
  // Original batch endpoint
  server.post("/analyze-claims", async (request, reply) => {
    // Enforce monthly quota for free-tier users
    const allowed = await enforceQuota("check", request, reply);
    if (!allowed) return;

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
      server.repo.incrementUsage(user.id, "check").catch(() => {});
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
    // Enforce monthly quota before opening the SSE stream
    const allowed = await enforceQuota("check", request, reply);
    if (!allowed) return;

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

    const corsOrigin = reply.getHeader("access-control-allow-origin") as string | undefined;
    reply.raw.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
      ...(corsOrigin ? {
        "Access-Control-Allow-Origin": corsOrigin,
        "Access-Control-Allow-Credentials": "true",
        "Vary": "Origin",
      } : {}),
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

      // Fire-and-forget history + quota increment + audit
      if (user && server.repo) {
        const response = { request_id: randomUUID(), claims, metadata: doneMetadata };
        server.repo.saveCheck(user.id, "analyze", text.slice(0, 200), JSON.stringify(response), claims.length).catch(() => {});
        server.repo.incrementUsage(user.id, "check").catch(() => {});
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
