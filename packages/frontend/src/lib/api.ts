import type {
  AnalyzeClaimsRequest,
  AnalyzeClaimsResponse,
  ReviewDocumentRequest,
  ReviewDocumentResponse,
  FormatCitationRequest,
  FormatCitationResponse,
} from "@verities/shared";

const BASE = "/api";

async function post<TReq, TRes>(path: string, body: TReq): Promise<TRes> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? `Request failed: ${res.status}`);
  }
  return res.json();
}

export function analyzeClaims(req: AnalyzeClaimsRequest): Promise<AnalyzeClaimsResponse> {
  return post("/analyze-claims", req);
}

export function reviewDocument(req: ReviewDocumentRequest): Promise<ReviewDocumentResponse> {
  return post("/review-document", req);
}

export function formatCitation(req: FormatCitationRequest): Promise<FormatCitationResponse> {
  return post("/format-citation", req);
}
