import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders, handleCors } from "../_shared/cors.ts";
import { requireAuth } from "../_shared/auth.ts";

serve(async (req: Request) => {
  const corsResult = handleCors(req);
  if (corsResult) return corsResult;

  const corsHeaders = getCorsHeaders();

  let user, client;
  try {
    ({ user, client } = await requireAuth(req));
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const [topicsRes, edgesRes] = await Promise.all([
    client
      .from("topics")
      .select("id, label, claim_count")
      .eq("user_id", user.id)
      .order("claim_count", { ascending: false })
      .limit(100),
    client
      .from("topic_edges")
      .select(
        "source_id, target_id, weight, relationship_type, relationship_label"
      )
      .eq("user_id", user.id)
      .order("weight", { ascending: false })
      .limit(500),
  ]);

  return new Response(
    JSON.stringify({
      topics: topicsRes.data ?? [],
      edges: edgesRes.data ?? [],
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
