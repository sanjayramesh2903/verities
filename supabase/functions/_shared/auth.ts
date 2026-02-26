import { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { getUserClient } from "./supabase.ts";

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

  const { data: userData, error: userErr } = await client
    .from("users")
    .select(
      "id, email, display_name, avatar_url, plan_tier, usage_checks_this_month, usage_reviews_this_month, usage_reset_at"
    )
    .eq("id", authUser.id)
    .single();

  if (userErr || !userData) throw new Error("User profile not found");
  return { user: userData as AuthUser, client };
}

export async function optionalAuth(
  req: Request
): Promise<{ user: AuthUser | null; client: SupabaseClient }> {
  try {
    return await requireAuth(req);
  } catch {
    const { getServiceClient } = await import("./supabase.ts");
    return { user: null, client: getServiceClient() };
  }
}
