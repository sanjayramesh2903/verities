import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders, handleCors } from "../_shared/cors.ts";
import { requireAuth } from "../_shared/auth.ts";

const LIMITS = {
  free: { checks: 5, reviews: 3 },
  pro: { checks: 999, reviews: 999 },
} as const;

serve(async (req: Request) => {
  const corsResult = handleCors(req);
  if (corsResult) return corsResult;

  const corsHeaders = getCorsHeaders();

  let user;
  try {
    ({ user } = await requireAuth(req));
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const tier = (user.plan_tier as keyof typeof LIMITS) ?? "free";
  const limits = LIMITS[tier] ?? LIMITS.free;

  return new Response(
    JSON.stringify({
      plan_tier: tier,
      checks_used: user.usage_checks_this_month,
      checks_limit: limits.checks,
      reviews_used: user.usage_reviews_this_month,
      reviews_limit: limits.reviews,
      reset_at: user.usage_reset_at,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
