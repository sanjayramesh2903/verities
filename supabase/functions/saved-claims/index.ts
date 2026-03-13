import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders, handleCors } from "../_shared/cors.ts";
import { requireAuth } from "../_shared/auth.ts";

function err(msg: string, status: number, corsHeaders: Record<string, string>) {
  return new Response(JSON.stringify({ error: msg }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req: Request) => {
  const corsResult = handleCors(req);
  if (corsResult) return corsResult;

  const corsHeaders = getCorsHeaders();

  let user: Awaited<ReturnType<typeof requireAuth>>["user"];
  let client: Awaited<ReturnType<typeof requireAuth>>["client"];
  try {
    ({ user, client } = await requireAuth(req));
  } catch (e) {
    return err((e as Error).message, 401, corsHeaders);
  }

  const url = new URL(req.url);
  const method = req.method;

  // ─── GET /saved-claims ────────────────────────────────────────────────────
  if (method === "GET") {
    const projectId = url.searchParams.get("project_id");
    const checkId = url.searchParams.get("check_id");

    let query = client
      .from("saved_claims")
      .select("id, check_id, claim_id, claim_text, verdict, project_id, note, saved_at")
      .eq("user_id", user.id)
      .order("saved_at", { ascending: false });

    if (projectId) query = query.eq("project_id", projectId);
    if (checkId)   query = query.eq("check_id", checkId);

    const { data, error } = await query;
    if (error) return err(error.message, 500, corsHeaders);

    return new Response(JSON.stringify({ saved_claims: data ?? [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ─── POST /saved-claims — save a claim ────────────────────────────────────
  if (method === "POST") {
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return err("Invalid JSON body", 400, corsHeaders);
    }

    const { check_id, claim_id, claim_text, verdict, project_id, note } = body as {
      check_id: string;
      claim_id: string;
      claim_text: string;
      verdict: string;
      project_id?: string;
      note?: string;
    };

    if (!check_id || !claim_id || !claim_text || !verdict) {
      return err("check_id, claim_id, claim_text, and verdict are required", 400, corsHeaders);
    }

    // Verify the check belongs to this user
    const { data: checkRow } = await client
      .from("checks")
      .select("id")
      .eq("id", check_id)
      .eq("user_id", user.id)
      .single();
    if (!checkRow) return err("Check not found", 404, corsHeaders);

    const { data, error } = await client
      .from("saved_claims")
      .upsert(
        { user_id: user.id, check_id, claim_id, claim_text, verdict, project_id: project_id ?? null, note: note ?? null },
        { onConflict: "user_id,check_id,claim_id" }
      )
      .select("id, check_id, claim_id, claim_text, verdict, project_id, note, saved_at")
      .single();

    if (error) return err(error.message, 500, corsHeaders);

    return new Response(JSON.stringify({ saved_claim: data }), {
      status: 201,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ─── DELETE /saved-claims?id= ─────────────────────────────────────────────
  if (method === "DELETE") {
    const savedClaimId = url.searchParams.get("id");
    if (!savedClaimId) return err("id required", 400, corsHeaders);

    const { error } = await client
      .from("saved_claims")
      .delete()
      .eq("id", savedClaimId)
      .eq("user_id", user.id);

    if (error) return err(error.message, 500, corsHeaders);

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return err("Method not allowed", 405, corsHeaders);
});
