import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders, handleCors } from "../_shared/cors.ts";
import { optionalAuth } from "../_shared/auth.ts";
import { getServiceClient } from "../_shared/supabase.ts";
import {
  extractClaims,
  generateVerdict,
  generateRewrite,
} from "../_shared/llm.ts";
import { searchForClaim } from "../_shared/search.ts";
import { formatCitation } from "../_shared/citations.ts";
import { getCached, setCached, cacheKey, TTL } from "../_shared/cache.ts";

const FREE_TIER_CHECK_LIMIT = 5;

serve(async (req: Request) => {
  const corsResult = handleCors(req);
  if (corsResult) return corsResult;

  const corsHeaders = getCorsHeaders();
  const start = Date.now();

  // Auth (optional — anonymous users allowed with unlimited checks)
  let userId: string | null = null;
  let planTier = "free";
  let checksUsed = 0;

  try {
    const { user } = await optionalAuth(req);
    if (user) {
      userId = user.id;
      planTier = user.plan_tier;
      checksUsed = user.usage_checks_this_month;
    }
  } catch { /* anonymous */ }

  // Quota check — only for authenticated free-tier users
  if (userId && planTier === "free" && checksUsed >= FREE_TIER_CHECK_LIMIT) {
    return new Response(
      JSON.stringify({
        error: "free_tier_limit",
        message: `You've used all ${FREE_TIER_CHECK_LIMIT} free checks this month. Upgrade to Pro for unlimited access.`,
      }),
      {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  let body: { text?: string; citationStyle?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { text, citationStyle = "mla" } = body;

  if (!text || text.trim().length < 20) {
    return new Response(
      JSON.stringify({ error: "Text must be at least 20 characters" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Check full-text block cache
  const fullKey = await cacheKey("analyze:v2", `${text}:${citationStyle}`);
  const cached = await getCached<object>(fullKey);
  if (cached) {
    return new Response(JSON.stringify(cached), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "X-Cache": "HIT",
      },
    });
  }

  // Get user's max claims preference
  let maxClaims = 10;
  if (userId) {
    const supabase = getServiceClient();
    const { data: prefs } = await supabase
      .from("user_preferences")
      .select("max_claims")
      .eq("user_id", userId)
      .single();
    if (prefs) maxClaims = (prefs as { max_claims: number }).max_claims;
  }

  // SSE streaming response
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(
            `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
          )
        );
      };

      try {
        // Step 1: Extract claims
        const extracted = await extractClaims(text, maxClaims);
        send("extraction", { total: extracted.length });

        const claimsResults: unknown[] = new Array(extracted.length);

        // Step 2: Process in batches of 3 (avoids Groq rate limits)
        const BATCH_SIZE = 3;
        for (let i = 0; i < extracted.length; i += BATCH_SIZE) {
          const batch = extracted.slice(i, i + BATCH_SIZE);

          await Promise.all(
            batch.map(async (claim, batchIdx) => {
              const globalIdx = i + batchIdx;
              const claimKey = await cacheKey(
                "claim:v2",
                `${claim.original_text}:${citationStyle}`
              );

              // Check per-claim cache
              let result = await getCached<object>(claimKey);

              if (!result) {
                const sources = await searchForClaim(claim.original_text);
                const verdictResult = await generateVerdict(
                  claim.original_text,
                  sources
                );

                const rewrites =
                  verdictResult.verdict === "contested" ||
                  verdictResult.verdict === "refuted"
                    ? await generateRewrite(claim.original_text, sources)
                    : [];

                const sourcesWithCitations = sources.map((s, si) => ({
                  source_id: crypto.randomUUID(),
                  title: s.title,
                  url: s.url,
                  snippet: s.snippet,
                  reliability_tier: s.reliability_tier,
                  citation_inline: formatCitation(
                    s,
                    si + 1,
                    citationStyle as "mla" | "apa" | "chicago",
                    "inline"
                  ),
                  citation_bibliography: formatCitation(
                    s,
                    si + 1,
                    citationStyle as "mla" | "apa" | "chicago",
                    "bibliography"
                  ),
                }));

                result = {
                  claim_id: claim.claim_id,
                  original_text: claim.original_text,
                  subject: claim.subject,
                  verdict: verdictResult.verdict,
                  confidence: verdictResult.confidence,
                  explanation: verdictResult.explanation,
                  sources: sourcesWithCitations,
                  rewrites,
                };

                await setCached(claimKey, result, TTL.CLAIM);
              }

              claimsResults[globalIdx] = result;
              send("claim", { index: globalIdx, claim: result });
            })
          );
        }

        const metadata = {
          processing_time_ms: Date.now() - start,
          claims_processed: claimsResults.filter(Boolean).length,
          citation_style: citationStyle,
        };

        send("done", { metadata });

        // Persist to history + increment usage (non-blocking)
        if (userId) {
          const supabase = getServiceClient();
          supabase
            .from("checks")
            .insert({
              user_id: userId,
              type: "analyze",
              input_snippet: text.slice(0, 200),
              result_json: JSON.stringify({
                claims: claimsResults,
                metadata,
              }),
              claim_count: claimsResults.filter(Boolean).length,
            })
            .select("id")
            .single()
            .then(({ data: check }) => {
              if (check) {
                supabase.rpc("increment_usage", {
                  p_user_id: userId,
                  p_type: "check",
                });
              }
            });
        }

        // Cache the full result
        await setCached(
          fullKey,
          { claims: claimsResults, metadata },
          TTL.ANALYZE
        );
      } catch (err) {
        send("error", { message: (err as Error).message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      ...corsHeaders,
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
});
