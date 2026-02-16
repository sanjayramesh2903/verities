import { z } from "zod";
import * as s from "./schemas.js";

export type AnalyzeClaimsRequest = z.infer<typeof s.AnalyzeClaimsRequestSchema>;
export type AnalyzeClaimsResponse = z.infer<typeof s.AnalyzeClaimsResponseSchema>;
export type ReviewDocumentRequest = z.infer<typeof s.ReviewDocumentRequestSchema>;
export type ReviewDocumentResponse = z.infer<typeof s.ReviewDocumentResponseSchema>;
export type FormatCitationRequest = z.infer<typeof s.FormatCitationRequestSchema>;
export type FormatCitationResponse = z.infer<typeof s.FormatCitationResponseSchema>;

export type Claim = z.infer<typeof s.ClaimSchema>;
export type Source = z.infer<typeof s.SourceSchema>;
export type Rewrite = z.infer<typeof s.RewriteSchema>;
export type HighRiskClaim = z.infer<typeof s.HighRiskClaimSchema>;

export type ExtractedClaim = z.infer<typeof s.ExtractedClaimSchema>;
export type VerdictResponse = z.infer<typeof s.VerdictResponseSchema>;
export type RewriteResponse = z.infer<typeof s.RewriteResponseSchema>;

export type Verdict = z.infer<typeof s.ClaimSchema>["verdict"];
export type CitationStyle = z.infer<typeof s.AnalyzeClaimsRequestSchema>["citation_style"];
export type CitationFormat = z.infer<typeof s.FormatCitationRequestSchema>["format"];
export type ReliabilityTier = 1 | 2 | 3 | 4;
export type RiskSignal = z.infer<typeof s.HighRiskClaimSchema>["risk_signals"][number];

// Auth & Account Types
export type AuthUser = z.infer<typeof s.AuthUserSchema>;
export type CheckSummary = z.infer<typeof s.CheckSummarySchema>;
export type CheckHistoryResponse = z.infer<typeof s.CheckHistoryResponseSchema>;
export type UserPreferences = z.infer<typeof s.UserPreferencesSchema>;
