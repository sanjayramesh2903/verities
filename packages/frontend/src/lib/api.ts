import type {
  AnalyzeClaimsRequest,
  AnalyzeClaimsResponse,
  ReviewDocumentRequest,
  ReviewDocumentResponse,
  FormatCitationRequest,
  FormatCitationResponse,
  Claim,
} from "@verities/shared";

export const BASE = import.meta.env.VITE_API_URL ?? "/api";

// ── Core helpers ─────────────────────────────────────────────────────────────

async function post<TReq, TRes>(path: string, body: TReq): Promise<TRes> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? `Request failed: ${res.status}`);
  }
  return res.json();
}

async function get<TRes>(path: string): Promise<TRes> {
  const res = await fetch(`${BASE}${path}`, {
    credentials: "include",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? `Request failed: ${res.status}`);
  }
  return res.json();
}

async function put<TReq, TRes>(path: string, body: TReq): Promise<TRes> {
  const res = await fetch(`${BASE}${path}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? `Request failed: ${res.status}`);
  }
  return res.json();
}

// ── Analysis ─────────────────────────────────────────────────────────────────

export function analyzeClaims(req: AnalyzeClaimsRequest): Promise<AnalyzeClaimsResponse> {
  return post("/analyze-claims", req);
}

/** SSE streaming version — calls onClaim as each claim completes */
export async function analyzeClaimsStream(
  req: AnalyzeClaimsRequest,
  callbacks: {
    onExtraction?: (total: number) => void;
    onClaim?: (index: number, claim: Claim) => void;
    onDone?: (data: { request_id: string; metadata: AnalyzeClaimsResponse["metadata"] }) => void;
    onError?: (message: string) => void;
  }
): Promise<void> {
  const res = await fetch(`${BASE}/analyze-claims/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(req),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? `Request failed: ${res.status}`);
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error("No response body");

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    let currentEvent = "";
    for (const line of lines) {
      if (line.startsWith("event: ")) {
        currentEvent = line.slice(7);
      } else if (line.startsWith("data: ")) {
        try {
          const data = JSON.parse(line.slice(6));
          switch (currentEvent) {
            case "extraction":
              callbacks.onExtraction?.(data.total);
              break;
            case "claim":
              callbacks.onClaim?.(data.index, data.claim);
              break;
            case "done":
              callbacks.onDone?.(data);
              break;
            case "error":
              callbacks.onError?.(data.message);
              break;
          }
        } catch { /* skip malformed data */ }
        currentEvent = "";
      }
    }
  }
}

export function reviewDocument(req: ReviewDocumentRequest): Promise<ReviewDocumentResponse> {
  return post("/review-document", req);
}

export function formatCitation(req: FormatCitationRequest): Promise<FormatCitationResponse> {
  return post("/format-citation", req);
}

// ── Auth ─────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  createdAt: string | null;
}

export function getMe(): Promise<AuthUser> {
  return get("/auth/me");
}

export async function logout(): Promise<void> {
  await post("/auth/logout", {});
}

// ── History ──────────────────────────────────────────────────────────────────

export interface CheckSummary {
  id: string;
  type: "analyze" | "review";
  inputSnippet: string;
  claimCount: number;
  createdAt: string;
}

export interface HistoryResponse {
  checks: CheckSummary[];
  total: number;
  offset: number;
  limit: number;
}

export function getHistory(limit = 20, offset = 0): Promise<HistoryResponse> {
  return get(`/history?limit=${limit}&offset=${offset}`);
}

export function getHistoryById(id: string): Promise<{
  id: string;
  type: string;
  inputSnippet: string;
  claimCount: number;
  createdAt: string;
  result: AnalyzeClaimsResponse;
}> {
  return get(`/history/${id}`);
}

// ── Preferences ──────────────────────────────────────────────────────────────

export interface UserPreferences {
  citationStyle: "mla" | "apa" | "chicago";
  maxClaims: number;
}

export function getPreferences(): Promise<UserPreferences> {
  return get("/preferences");
}

export function updatePreferences(prefs: Partial<UserPreferences>): Promise<UserPreferences> {
  return put("/preferences", prefs);
}

// ── Graph ─────────────────────────────────────────────────────────────────────

export interface GraphNode {
  id: string;
  label: string;
  claimCount: number;
}

export interface GraphEdge {
  source: string;
  target: string;
  weight: number;
}

export interface UserGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export function getUserGraph(): Promise<UserGraph> {
  return get("/graph");
}
