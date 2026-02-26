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

  if (req.method === "GET") {
    const { data } = await client
      .from("user_preferences")
      .select("citation_style, max_claims")
      .eq("user_id", user.id)
      .single();

    return new Response(
      JSON.stringify(data ?? { citation_style: "mla", max_claims: 10 }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (req.method === "PUT") {
    let body: { citation_style?: string; max_claims?: number };
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate
    const validStyles = ["mla", "apa", "chicago"];
    if (body.citation_style && !validStyles.includes(body.citation_style)) {
      return new Response(
        JSON.stringify({ error: "Invalid citation style" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (body.max_claims && (body.max_claims < 1 || body.max_claims > 50)) {
      return new Response(
        JSON.stringify({ error: "max_claims must be between 1 and 50" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    await client.from("user_preferences").upsert({
      user_id: user.id,
      ...body,
      updated_at: new Date().toISOString(),
    });

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ error: "Method not allowed" }), {
    status: 405,
    headers: corsHeaders,
  });
});
