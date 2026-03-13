import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders, handleCors } from "../_shared/cors.ts";
import { requireAuth } from "../_shared/auth.ts";

const VERDICT_SCORES: Record<string, number> = {
  broadly_supported: 100,
  unclear: 50,
  overstated: 25,
  disputed: 0,
};

function computeScore(checks: Array<{ type: string; result_json: string }>): number | null {
  const scores: number[] = [];
  for (const check of checks) {
    if (check.type !== "analyze") continue;
    try {
      const parsed = JSON.parse(check.result_json) as { claims?: Array<{ verdict: string }> };
      for (const claim of parsed.claims ?? []) {
        scores.push(VERDICT_SCORES[claim.verdict] ?? 50);
      }
    } catch { /* skip malformed */ }
  }
  if (scores.length === 0) return null;
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

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
  const projectId = url.searchParams.get("id");

  // ─── GET /projects — list all projects ───────────────────────────────────
  if (method === "GET" && !projectId) {
    const { data, error } = await client
      .from("projects")
      .select(`
        id, name, description, created_at, updated_at,
        project_checks(
          check_id,
          checks(type, result_json)
        )
      `)
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    if (error) return err(error.message, 500, corsHeaders);

    const projects = (data ?? []).map((p: Record<string, unknown>) => {
      const rows = (p.project_checks as Array<{ checks: { type: string; result_json: string } }>) ?? [];
      const checksForScore = rows.map((r) => r.checks).filter(Boolean);
      return {
        id: p.id,
        name: p.name,
        description: p.description,
        created_at: p.created_at,
        updated_at: p.updated_at,
        check_count: rows.length,
        credibility_score: computeScore(checksForScore),
      };
    });

    return new Response(JSON.stringify({ projects }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ─── GET /projects?id= — single project with checks ──────────────────────
  if (method === "GET" && projectId) {
    const { data, error } = await client
      .from("projects")
      .select(`
        id, name, description, created_at, updated_at,
        project_checks(
          added_at,
          checks(id, type, input_snippet, claim_count, created_at, result_json)
        )
      `)
      .eq("id", projectId)
      .eq("user_id", user.id)
      .single();

    if (error || !data) return err("Project not found", 404, corsHeaders);

    const p = data as Record<string, unknown>;
    const rows = (p.project_checks as Array<{
      added_at: string;
      checks: { id: string; type: string; input_snippet: string; claim_count: number; created_at: string; result_json: string };
    }>) ?? [];

    const checks = rows.map((r) => ({
      ...r.checks,
      result_json: r.checks.type === "analyze"
        ? (() => { try { return JSON.parse(r.checks.result_json); } catch { return null; } })()
        : null,
      added_at: r.added_at,
    }));

    return new Response(
      JSON.stringify({
        project: {
          id: p.id,
          name: p.name,
          description: p.description,
          created_at: p.created_at,
          updated_at: p.updated_at,
          credibility_score: computeScore(
            rows.map((r) => ({ type: r.checks.type, result_json: r.checks.result_json }))
          ),
          checks,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // ─── POST /projects — create, add_check, remove_check ───────────────────
  if (method === "POST") {
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return err("Invalid JSON body", 400, corsHeaders);
    }

    // add_check
    if (body.action === "add_check") {
      const { project_id, check_id } = body as { project_id: string; check_id: string };
      if (!project_id || !check_id) return err("project_id and check_id required", 400, corsHeaders);

      // Verify the check belongs to this user
      const { data: checkRow } = await client
        .from("checks")
        .select("id")
        .eq("id", check_id)
        .eq("user_id", user.id)
        .single();
      if (!checkRow) return err("Check not found", 404, corsHeaders);

      const { error } = await client
        .from("project_checks")
        .insert({ project_id, check_id });
      // Ignore unique constraint violation (already linked)
      if (error && !error.message.includes("duplicate")) return err(error.message, 500, corsHeaders);

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // remove_check
    if (body.action === "remove_check") {
      const { project_id, check_id } = body as { project_id: string; check_id: string };
      if (!project_id || !check_id) return err("project_id and check_id required", 400, corsHeaders);

      await client
        .from("project_checks")
        .delete()
        .eq("project_id", project_id)
        .eq("check_id", check_id);

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // create project
    const name = (body.name as string | undefined)?.trim();
    if (!name) return err("name is required", 400, corsHeaders);

    const { data, error } = await client
      .from("projects")
      .insert({ user_id: user.id, name, description: body.description ?? null })
      .select("id, name, description, created_at, updated_at")
      .single();

    if (error) return err(error.message, 500, corsHeaders);

    return new Response(
      JSON.stringify({ project: { ...data, check_count: 0, credibility_score: null } }),
      { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // ─── PATCH /projects — rename/update ─────────────────────────────────────
  if (method === "PATCH") {
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return err("Invalid JSON body", 400, corsHeaders);
    }
    const { id, name, description } = body as { id: string; name?: string; description?: string };
    if (!id) return err("id required", 400, corsHeaders);

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (name !== undefined) updates.name = name.trim();
    if (description !== undefined) updates.description = description;

    const { data, error } = await client
      .from("projects")
      .update(updates)
      .eq("id", id)
      .eq("user_id", user.id)
      .select("id, name, description, created_at, updated_at")
      .single();

    if (error || !data) return err("Project not found", 404, corsHeaders);

    return new Response(JSON.stringify({ project: data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ─── DELETE /projects?id= ─────────────────────────────────────────────────
  if (method === "DELETE" && projectId) {
    const { error } = await client
      .from("projects")
      .delete()
      .eq("id", projectId)
      .eq("user_id", user.id);

    if (error) return err(error.message, 500, corsHeaders);

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return err("Method not allowed", 405, corsHeaders);
});
