import { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { getUserClient, getServiceClient } from "./supabase.ts";

export interface AuthUser {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  plan_tier: string;
  usage_checks_this_month: number;
  usage_reviews_this_month: number;
  usage_reset_at: string;
}

export async function requireAuth(
  req: Request
): Promise<{ user: AuthUser; client: SupabaseClient }> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) throw new Error("Missing Authorization header");

  const client = getUserClient(authHeader);
  const {
    data: { user: authUser },
    error,
  } = await client.auth.getUser();
  if (error || !authUser) throw new Error("Invalid or expired token");

  // Try to load the app-level user profile
  const { data: userData } = await client
    .from("users")
    .select(
      "id, email, display_name, avatar_url, plan_tier, usage_checks_this_month, usage_reviews_this_month, usage_reset_at"
    )
    .eq("id", authUser.id)
    .single();

  // If the profile doesn't exist yet (e.g. handle_new_user trigger missed),
  // create it on-demand using the service role client so RLS doesn't block it.
  if (!userData) {
    const svc = getServiceClient();
    await svc.from("users").upsert(
      {
        id: authUser.id,
        email: authUser.email ?? "",
        display_name:
          (authUser.user_metadata?.full_name as string | undefined) ?? null,
        avatar_url:
          (authUser.user_metadata?.avatar_url as string | undefined) ?? null,
        plan_tier: "free",
        usage_checks_this_month: 0,
        usage_reviews_this_month: 0,
        usage_reset_at: new Date(
          new Date().getFullYear(),
          new Date().getMonth() + 1,
          1
        ).toISOString(),
      },
      { onConflict: "id" }
    );

    const { data: created, error: createErr } = await svc
      .from("users")
      .select(
        "id, email, display_name, avatar_url, plan_tier, usage_checks_this_month, usage_reviews_this_month, usage_reset_at"
      )
      .eq("id", authUser.id)
      .single();

    if (createErr || !created) throw new Error("Failed to create user profile");
    return { user: created as AuthUser, client };
  }

  return { user: userData as AuthUser, client };
}

export async function optionalAuth(
  req: Request
): Promise<{ user: AuthUser | null; client: SupabaseClient }> {
  try {
    return await requireAuth(req);
  } catch {
    return { user: null, client: getServiceClient() };
  }
}
