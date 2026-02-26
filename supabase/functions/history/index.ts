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

  const url = new URL(req.url);
  const checkId = url.searchParams.get("id");

  // GET /history?id=<checkId> — single check with full result
  if (checkId) {
    const { data, error } = await client
      .from("checks")
      .select("id, type, input_snippet, result_json, claim_count, created_at")
      .eq("user_id", user.id)
      .eq("id", checkId)
      .single();

    if (error || !data) {
      return new Response(JSON.stringify({ error: "Check not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const check = data as {
      id: string;
      type: string;
      input_snippet: string;
      result_json: string;
      claim_count: number;
      created_at: string;
    };

    return new Response(
      JSON.stringify({
        ...check,
        result_json: JSON.parse(check.result_json),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // GET /history — paginated list (no result_json, just summaries)
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "20"), 50);
  const offset = parseInt(url.searchParams.get("offset") ?? "0");

  const { data, error } = await client
    .from("checks")
    .select("id, type, input_snippet, claim_count, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ checks: data ?? [] }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
