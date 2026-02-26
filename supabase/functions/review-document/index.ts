import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders, handleCors } from "../_shared/cors.ts";
import { optionalAuth } from "../_shared/auth.ts";
import { getServiceClient } from "../_shared/supabase.ts";
import { extractClaims } from "../_shared/llm.ts";

const FREE_TIER_REVIEW_LIMIT = 3;

type RiskSignal =
  | "superlative"
  | "specific_number"
  | "specific_date"
  | "statistical_assertion"
  | "no_citation";

interface RiskResult {
  score: number;
  signals: RiskSignal[];
  verdict: "likely_overstated" | "needs_review" | "likely_ok";
}

function scoreClaimRisk(text: string): RiskResult {
  const signals: RiskSignal[] = [];
  let score = 0;

  if (
    /\b(most|best|worst|largest|fastest|highest|lowest|greatest|only|never|always|every|all|none)\b/i.test(
      text
    )
  ) {
    signals.push("superlative");
    score += 0.3;
  }

  if (
    /\b\d+(\.\d+)?(\s*%|\s*percent|\s*million|\s*billion|\s*trillion)\b/i.test(
      text
    )
  ) {
    signals.push("statistical_assertion");
    score += 0.25;
  }

  if (/\b(19|20)\d{2}\b/.test(text)) {
    signals.push("specific_date");
    score += 0.15;
  }

  if (/\b\d{2,}\b/.test(text) && !signals.includes("statistical_assertion")) {
    signals.push("specific_number");
    score += 0.2;
  }

  if (
    !/\b(according to|cited|source|study|research|published|reported|found|showed|demonstrated)\b/i.test(
      text
    )
  ) {
    signals.push("no_citation");
    score += 0.1;
  }

  const cappedScore = Math.min(score, 1);
  const verdict =
    cappedScore > 0.7
      ? "likely_overstated"
      : cappedScore > 0.4
      ? "needs_review"
      : "likely_ok";

  return { score: Math.round(cappedScore * 100) / 100, signals, verdict };
}

serve(async (req: Request) => {
  const corsResult = handleCors(req);
  if (corsResult) return corsResult;

  const corsHeaders = getCorsHeaders();
  const start = Date.now();

  let userId: string | null = null;
  let planTier = "free";
  let reviewsUsed = 0;

  try {
    const { user } = await optionalAuth(req);
    if (user) {
      userId = user.id;
      planTier = user.plan_tier;
      reviewsUsed = user.usage_reviews_this_month;
    }
  } catch { /* anonymous */ }

  if (userId && planTier === "free" && reviewsUsed >= FREE_TIER_REVIEW_LIMIT) {
    return new Response(
      JSON.stringify({
        error: "free_tier_limit",
        message: `You've used all ${FREE_TIER_REVIEW_LIMIT} free reviews this month.`,
      }),
      {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  let body: { text?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { text } = body;
  if (!text || text.trim().length < 20) {
    return new Response(
      JSON.stringify({ error: "Text must be at least 20 characters" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Extract all claims (up to 100 for document review)
  const claims = await extractClaims(text, 100);

  // Score each claim
  const scored = claims.map((c) => ({
    claim_id: c.claim_id,
    original_text: c.original_text,
    ...scoreClaimRisk(c.original_text),
  }));

  // Filter to high-risk only (score > 0.4), sorted by score descending
  const highRiskClaims = scored
    .filter((c) => c.score > 0.4)
    .sort((a, b) => b.score - a.score);

  const result = {
    request_id: crypto.randomUUID(),
    total_claims_found: claims.length,
    high_risk_claims: highRiskClaims,
    metadata: {
      processing_time_ms: Date.now() - start,
      words_processed: text.split(/\s+/).filter(Boolean).length,
      claims_scored: scored.length,
    },
  };

  // Persist to history (non-blocking)
  if (userId) {
    const supabase = getServiceClient();
    supabase
      .from("checks")
      .insert({
        user_id: userId,
        type: "review",
        input_snippet: text.slice(0, 200),
        result_json: JSON.stringify(result),
        claim_count: highRiskClaims.length,
      })
      .then(() => {
        supabase.rpc("increment_usage", {
          p_user_id: userId!,
          p_type: "review",
        });
      });
  }

  return new Response(JSON.stringify(result), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
