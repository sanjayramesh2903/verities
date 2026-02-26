import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders, handleCors } from "../_shared/cors.ts";
import { requireAuth } from "../_shared/auth.ts";
import { getServiceClient } from "../_shared/supabase.ts";

serve(async (req: Request) => {
  const corsResult = handleCors(req);
  if (corsResult) return corsResult;

  const corsHeaders = getCorsHeaders();
  const url = new URL(req.url);
  const token = url.searchParams.get("token");

  // ── Public: GET /reports?token=<shareToken> ────────────────────────────
  if (token && req.method === "GET") {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("shared_reports")
      .select(
        "share_token, expires_at, checks(id, type, claim_count, created_at, result_json)"
      )
      .eq("share_token", token)
      .gt("expires_at", new Date().toISOString())
      .single();

    if (error || !data) {
      return new Response(
        JSON.stringify({ error: "Report not found or expired" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const report = data as {
      share_token: string;
      expires_at: string;
      checks: {
        id: string;
        type: string;
        claim_count: number;
        created_at: string;
        result_json: string;
      };
    };

    return new Response(
      JSON.stringify({
        id: report.checks.id,
        type: report.checks.type,
        claim_count: report.checks.claim_count,
        created_at: report.checks.created_at,
        result: JSON.parse(report.checks.result_json),
        expires_at: report.expires_at,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // ── Authenticated: POST /reports — create share link ──────────────────
  if (req.method === "POST") {
    let user, client;
    try {
      ({ user, client } = await requireAuth(req));
    } catch (e) {
      return new Response(JSON.stringify({ error: (e as Error).message }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let body: { check_id?: string };
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!body.check_id) {
      return new Response(JSON.stringify({ error: "check_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify ownership
    const { data: check } = await client
      .from("checks")
      .select("id")
      .eq("id", body.check_id)
      .eq("user_id", user.id)
      .single();

    if (!check) {
      return new Response(JSON.stringify({ error: "Check not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = getServiceClient();

    // Return existing share link if one already exists
    const { data: existing } = await supabase
      .from("shared_reports")
      .select("share_token, expires_at")
      .eq("check_id", body.check_id)
      .single();

    const report = existing ?? (
      await supabase
        .from("shared_reports")
        .insert({ user_id: user.id, check_id: body.check_id })
        .select("share_token, expires_at")
        .single()
    ).data;

    if (!report) {
      return new Response(
        JSON.stringify({ error: "Failed to create share link" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const frontendUrl =
      Deno.env.get("FRONTEND_URL") ?? "http://localhost:5173";
    const shareReport = report as { share_token: string; expires_at: string };
    return new Response(
      JSON.stringify({
        share_url: `${frontendUrl}/report/${shareReport.share_token}`,
        share_token: shareReport.share_token,
        expires_at: shareReport.expires_at,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  return new Response(JSON.stringify({ error: "Method not allowed" }), {
    status: 405,
    headers: corsHeaders,
  });
});
