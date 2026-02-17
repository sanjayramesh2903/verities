import { FastifyInstance } from "fastify";
import { ReviewDocumentRequestSchema } from "@verities/shared";
import { extractClaims } from "../services/llm.js";
import { scoreClaimRisk } from "../services/ranking.js";
import { randomUUID } from "crypto";
import { getUser } from "../auth/auth-hook.js";

export async function reviewDocumentRoute(server: FastifyInstance) {
  server.post("/review-document", async (request, reply) => {
    const startTime = Date.now();
    const parsed = ReviewDocumentRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid request", details: parsed.error.issues });
    }

    const { text, options } = parsed.data;
    const wordCount = text.split(/\s+/).length;

    let extractedClaims: Awaited<ReturnType<typeof extractClaims>>;
    try {
      extractedClaims = await extractClaims(text, 100);
    } catch (err) {
      return reply.status(503).send({ error: (err as Error).message });
    }

    const scoredClaims = extractedClaims
      .map((ec) => {
        const originalText = (ec.span_start < ec.span_end && ec.span_end <= text.length)
          ? text.slice(ec.span_start, ec.span_end)
          : ec.original_text || `${ec.subject} ${ec.predicate}`;
        const { score, signals } = scoreClaimRisk(originalText, ec);
        return {
          claim_id: randomUUID(),
          original_text: originalText,
          span: { start: ec.span_start, end: ec.span_end },
          risk_score: score,
          risk_signals: signals,
          summary_verdict: score > 0.7 ? "likely_overstated" : score > 0.4 ? "needs_review" : "likely_ok",
        };
      })
      .sort((a, b) => b.risk_score - a.risk_score)
      .slice(0, options.max_risk_claims);

    const response = {
      request_id: randomUUID(),
      total_claims_found: extractedClaims.length,
      high_risk_claims: scoredClaims,
      metadata: {
        processing_time_ms: Date.now() - startTime,
        words_processed: wordCount,
        claims_scored: extractedClaims.length,
      },
    };

    const user = getUser(request);

    // Save to history (fire-and-forget)
    if (user && server.repo) {
      server.repo.saveCheck(
        user.id,
        "review",
        text.slice(0, 200),
        JSON.stringify(response),
        scoredClaims.length
      ).catch((err) => server.log.error(err, "Failed to save review to history"));
    }

    // Audit log
    if (server.repo) {
      server.repo.logAudit(
        user?.id ?? null,
        "review",
        JSON.stringify({ claimsFound: extractedClaims.length, highRisk: scoredClaims.length }),
        request.ip
      ).catch(() => {});
    }

    return response;
  });
}
