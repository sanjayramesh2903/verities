import { z } from "zod";
import { VERDICT_VALUES, CITATION_STYLES, CITATION_FORMATS, RISK_SIGNALS, LIMITS } from "./constants.js";

// ── Request Schemas ──

export const AnalyzeClaimsRequestSchema = z.object({
  text: z.string().min(1).max(LIMITS.ANALYZE_MAX_CHARS),
  citation_style: z.enum(CITATION_STYLES).default("mla"),
  options: z.object({
    max_claims: z.number().int().min(1).max(LIMITS.ANALYZE_MAX_CLAIMS).default(LIMITS.ANALYZE_DEFAULT_CLAIMS),
  }).default({}),
});

export const ReviewDocumentRequestSchema = z.object({
  text: z.string().min(1).max(LIMITS.REVIEW_MAX_CHARS),
  options: z.object({
    max_risk_claims: z.number().int().min(1).max(LIMITS.REVIEW_MAX_RISK_CLAIMS).default(LIMITS.REVIEW_DEFAULT_RISK_CLAIMS),
  }).default({}),
});

export const FormatCitationRequestSchema = z.object({
  source_url: z.string().url(),
  style: z.enum(CITATION_STYLES).default("mla"),
  format: z.enum(CITATION_FORMATS).default("both"),
});

// ── Response Schemas ──

export const SourceSchema = z.object({
  source_id: z.string().uuid(),
  title: z.string(),
  url: z.string().url(),
  snippet: z.string(),
  reliability_tier: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  citation_inline: z.string(),
  citation_bibliography: z.string(),
});

export const RewriteSchema = z.object({
  text: z.string(),
  confidence: z.number().min(0).max(1),
});

export const ClaimSchema = z.object({
  claim_id: z.string().uuid(),
  original_text: z.string(),
  span: z.object({ start: z.number(), end: z.number() }),
  verdict: z.enum(VERDICT_VALUES),
  explanation: z.string(),
  sources: z.array(SourceSchema),
  rewrites: z.array(RewriteSchema),
});

export const AnalyzeClaimsResponseSchema = z.object({
  request_id: z.string().uuid(),
  claims: z.array(ClaimSchema),
  metadata: z.object({
    processing_time_ms: z.number(),
    claims_extracted: z.number(),
    citation_style: z.enum(CITATION_STYLES),
  }),
});

export const HighRiskClaimSchema = z.object({
  claim_id: z.string().uuid(),
  original_text: z.string(),
  span: z.object({ start: z.number(), end: z.number() }),
  risk_score: z.number().min(0).max(1),
  risk_signals: z.array(z.enum(RISK_SIGNALS)),
  summary_verdict: z.string(),
});

export const ReviewDocumentResponseSchema = z.object({
  request_id: z.string().uuid(),
  total_claims_found: z.number(),
  high_risk_claims: z.array(HighRiskClaimSchema),
  metadata: z.object({
    processing_time_ms: z.number(),
    words_processed: z.number(),
    claims_scored: z.number(),
  }),
});

export const FormatCitationResponseSchema = z.object({
  citation_inline: z.string(),
  citation_bibliography: z.string(),
  metadata_used: z.object({
    author: z.string().nullable(),
    title: z.string(),
    publisher: z.string().nullable(),
    date: z.string().nullable(),
    url: z.string(),
  }),
});

// ── LLM Internal Schemas ──

// LLMs occasionally return numbers/dates as bare JSON numbers instead of strings.
// Accept both and coerce to string to avoid Zod validation failures.
const coercedString = z.union([
  z.string(),
  z.number().transform((n) => String(n)),
]).nullable().default(null);

export const ExtractedClaimSchema = z.object({
  subject: z.string(),
  predicate: z.string(),
  numbers: coercedString,
  dates: coercedString,
  original_text: z.string(),
  span_start: z.number().optional().default(0),
  span_end: z.number().optional().default(0),
});

export const ExtractionResponseSchema = z.object({
  claims: z.array(ExtractedClaimSchema),
});

export const VerdictResponseSchema = z.object({
  verdict: z.enum(VERDICT_VALUES),
  explanation: z.string(),
  source_ids: z.array(z.string()),
});

export const RewriteResponseSchema = z.object({
  rewrites: z.array(z.object({
    text: z.string(),
    confidence: z.number().min(0).max(1),
  })),
});

// ── Auth & Account Schemas ──

export const AuthUserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  displayName: z.string().nullable(),
  avatarUrl: z.string().nullable(),
});

// ── History Schemas ──

export const CheckSummarySchema = z.object({
  id: z.string().uuid(),
  type: z.enum(["analyze", "review"]),
  inputSnippet: z.string(),
  claimCount: z.number(),
  createdAt: z.string(),
});

export const CheckHistoryResponseSchema = z.object({
  checks: z.array(CheckSummarySchema),
  total: z.number(),
  offset: z.number(),
  limit: z.number(),
});

// ── User Preferences Schema ──

export const UserPreferencesSchema = z.object({
  citationStyle: z.enum(CITATION_STYLES).default("mla"),
  maxClaims: z.number().int().min(1).max(20).default(10),
});
