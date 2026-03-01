import { FastifyInstance } from "fastify";
import { ReviewDocumentRequestSchema } from "@verities/shared";
import type { Claim } from "@verities/shared";
import { extractClaims } from "../services/llm.js";
import { scoreClaimRisk } from "../services/ranking.js";
import { processClaim, makeErrorClaim, getOriginalText } from "../services/fact-check.js";
import { randomUUID } from "crypto";
import { getUser } from "../auth/auth-hook.js";
import { enforceQuota } from "../middleware/quota.js";

/** Maximum claims to run through the full AI pipeline per review request. */
const AI_REVIEW_CLAIM_CAP = 15;

/** Map an AI verdict to a numeric risk score used by the frontend. */
function verdictToRiskScore(verdict: Claim["verdict"]): number {
  switch (verdict) {
    case "disputed":          return 0.90;
    case "overstated":        return 0.75;
    case "unclear":           return 0.55;
    case "broadly_supported": return 0.10;
    default:                  return 0.55;
  }
}

/**
 * Run an array of async task factories with bounded concurrency.
 * Ensures at most `concurrency` tasks execute simultaneously.
 */
async function runConcurrent<T>(
  tasks: Array<() => Promise<T>>,
  concurrency: number
): Promise<T[]> {
  const results: T[] = new Array(tasks.length);
  let i = 0;
  async function worker() {
    while (i < tasks.length) {
      const index = i++;
      results[index] = await tasks[index]();
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));
  return results;
}

export async function reviewDocumentRoute(server: FastifyInstance) {
  server.post("/review-document", async (request, reply) => {
    // Enforce monthly quota for free-tier users
    const allowed = await enforceQuota("review", request, reply);
    if (!allowed) return;

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

    // Step 1: Pre-score all claims syntactically to prioritize which ones get AI-checked.
    const preScoredClaims = extractedClaims.map((ec) => {
      const originalText = getOriginalText(ec, text);
      const { score, signals } = scoreClaimRisk(originalText, ec);
      return { ec, originalText, score, signals };
    });

    // Step 2: Sort by syntactic risk, take top N for AI verification.
    preScoredClaims.sort((a, b) => b.score - a.score);
    const toVerify = preScoredClaims.slice(0, AI_REVIEW_CLAIM_CAP);

    // Step 3: Run the full search + LLM verdict pipeline with bounded concurrency.
    const cache = server.cache;
    const tasks = toVerify.map(({ ec }) => async (): Promise<Claim> => {
      try {
        // Use "mla" as a fixed citation style — citations are not shown in review results
        return await processClaim(ec, text, "mla", cache, server);
      } catch (err) {
        server.log.error({ claim: ec.subject, error: (err as Error).message }, "Review claim processing failed");
        return makeErrorClaim(ec, text);
      }
    });

    const verifiedClaims = await runConcurrent(tasks, 3);

    // Step 4: Map AI verdicts → risk scores and build the response shape.
    const scoredClaims = verifiedClaims
      .map((claim, idx) => {
        const { signals } = toVerify[idx];
        return {
          claim_id: claim.claim_id,
          original_text: claim.original_text,
          span: claim.span,
          risk_score: verdictToRiskScore(claim.verdict),
          risk_signals: signals,
          summary_verdict: claim.verdict,
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
        claims_ai_checked: verifiedClaims.length,
      },
    };

    const user = getUser(request);

    if (user && server.repo) {
      server.repo.saveCheck(
        user.id,
        "review",
        text.slice(0, 200),
        JSON.stringify(response),
        scoredClaims.length
      ).catch((err) => server.log.error(err, "Failed to save review to history"));
      server.repo.incrementUsage(user.id, "review").catch(() => {});
    }

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
