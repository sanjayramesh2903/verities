import { getServiceClient } from "./supabase.ts";

// Simple SHA-256 hash using Web Crypto API (available in Deno)
async function sha256(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function cacheKey(prefix: string, data: string): Promise<string> {
  const hash = await sha256(data);
  return `${prefix}:${hash.slice(0, 32)}`;
}

export async function getCached<T>(key: string): Promise<T | null> {
  try {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("result_cache")
      .select("value, expires_at")
      .eq("key", key)
      .single();

    if (error || !data) return null;
    if (new Date((data as { expires_at: string }).expires_at) < new Date()) {
      // Expired — delete async, return null
      supabase.from("result_cache").delete().eq("key", key);
      return null;
    }
    return JSON.parse((data as { value: string }).value) as T;
  } catch {
    return null; // Cache failure is non-fatal
  }
}

export async function setCached(
  key: string,
  value: unknown,
  ttlSeconds: number
): Promise<void> {
  try {
    const supabase = getServiceClient();
    const expiresAt = new Date(
      Date.now() + ttlSeconds * 1000
    ).toISOString();
    await supabase.from("result_cache").upsert({
      key,
      value: JSON.stringify(value),
      expires_at: expiresAt,
    });
  } catch {
    // Cache write failure is non-fatal
  }
}

// TTL constants (in seconds)
export const TTL = {
  CLAIM: 7 * 24 * 3600,    // 7 days
  SEARCH: 1 * 3600,         // 1 hour
  ANALYZE: 4 * 24 * 3600,   // 4 days
  SOURCE: 24 * 3600,        // 24 hours
} as const;
