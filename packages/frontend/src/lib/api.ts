import { supabase, FUNCTIONS_URL } from "./supabase";

// ─── Auth header helper ───────────────────────────────────────────────────
async function getAuthHeaders(): Promise<Record<string, string>> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (session?.access_token) {
    headers["Authorization"] = `Bearer ${session.access_token}`;
  }
  return headers;
}

// ─── Generic fetch helper ─────────────────────────────────────────────────
async function callFunction<T>(
  name: string,
  body?: unknown,
  method = "POST"
): Promise<T> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${FUNCTIONS_URL}/${name}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    let errData: { error?: string; message?: string; status?: number } = {};
    try {
      errData = await res.json();
    } catch {
      errData = { error: res.statusText };
    }
    const err = Object.assign(
      new Error(errData.message ?? errData.error ?? "Request failed"),
      { status: res.status, data: errData }
    );
    throw err;
  }

  return res.json() as Promise<T>;
}

// ─── Auth ─────────────────────────────────────────────────────────────────
export const getMe = () =>
  callFunction<{
    id: string;
    email: string;
    displayName: string | null;
    avatarUrl: string | null;
    planTier: string;
  }>("me", undefined, "GET");

// ─── Analyze Claims (SSE Streaming) ──────────────────────────────────────
export async function analyzeClaimsStream(params: {
  text: string;
  citationStyle: string;
  onExtraction: (total: number) => void;
  onClaim: (index: number, claim: unknown) => void;
  onDone: (metadata: unknown) => void;
  onError: (msg: string) => void;
  signal?: AbortSignal;
}): Promise<void> {
  const headers = await getAuthHeaders();
  let res: Response;

  try {
    res = await fetch(`${FUNCTIONS_URL}/analyze-claims`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        text: params.text,
        citationStyle: params.citationStyle,
      }),
      signal: params.signal,
    });
  } catch (err) {
    if ((err as Error).name === "AbortError") return;
    params.onError((err as Error).message);
    return;
  }

  if (!res.ok) {
    let errData: { error?: string; message?: string } = {};
    try {
      errData = await res.json();
    } catch { /* ignore */ }
    params.onError(
      errData.error === "free_tier_limit"
        ? "free_tier_limit"
        : errData.message ?? "Analysis failed"
    );
    return;
  }

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";

    for (const part of parts) {
      if (!part.trim()) continue;
      const lines = part.split("\n");
      let event = "";
      let data = "";
      for (const line of lines) {
        if (line.startsWith("event: ")) event = line.slice(7).trim();
        else if (line.startsWith("data: ")) data = line.slice(6).trim();
      }
      if (!data) continue;
      try {
        const parsed = JSON.parse(data);
        if (event === "extraction") params.onExtraction(parsed.total);
        else if (event === "claim") params.onClaim(parsed.index, parsed.claim);
        else if (event === "done") params.onDone(parsed.metadata);
        else if (event === "error") params.onError(parsed.message);
      } catch { /* skip malformed events */ }
    }
  }
}

// ─── Review Document ──────────────────────────────────────────────────────
export const reviewDocument = (text: string) =>
  callFunction<{
    request_id: string;
    total_claims_found: number;
    high_risk_claims: unknown[];
    metadata: unknown;
  }>("review-document", { text });

// ─── History ─────────────────────────────────────────────────────────────
export const getHistory = (limit = 20, offset = 0) =>
  callFunction<{ checks: unknown[] }>(
    `history?limit=${limit}&offset=${offset}`,
    undefined,
    "GET"
  );

export const getHistoryById = (id: string) =>
  callFunction<unknown>(`history?id=${encodeURIComponent(id)}`, undefined, "GET");

// ─── Graph ────────────────────────────────────────────────────────────────
export const getGraph = () =>
  callFunction<{ topics: unknown[]; edges: unknown[] }>(
    "graph",
    undefined,
    "GET"
  );

// ─── Usage ────────────────────────────────────────────────────────────────
export const getUsage = () =>
  callFunction<{
    plan_tier: string;
    checks_used: number;
    checks_limit: number;
    reviews_used: number;
    reviews_limit: number;
    reset_at: string;
  }>("usage", undefined, "GET");

// ─── Preferences ─────────────────────────────────────────────────────────
export const getPreferences = () =>
  callFunction<{ citation_style: string; max_claims: number }>(
    "preferences",
    undefined,
    "GET"
  );

export const updatePreferences = (prefs: {
  citation_style?: string;
  max_claims?: number;
}) => callFunction("preferences", prefs, "PUT");

// ─── Reports ─────────────────────────────────────────────────────────────
export const getShareLink = (checkId: string) =>
  callFunction<{ share_url: string; share_token: string; expires_at: string }>(
    "reports",
    { check_id: checkId }
  );

export const getPublicReport = (token: string) =>
  callFunction<unknown>(
    `reports?token=${encodeURIComponent(token)}`,
    undefined,
    "GET"
  );
