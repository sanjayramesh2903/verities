import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, AlertCircle, RefreshCw, Info, BarChart3, AlertTriangle, CheckCircle2 } from "lucide-react";
import { LIMITS } from "@verities/shared";
import type { ReviewDocumentResponse } from "@verities/shared";
import { reviewDocument } from "../lib/api";
import Navbar from "../components/Navbar";
import RiskClaimRow from "../components/RiskClaimRow";

type Status = "idle" | "loading" | "success" | "error";

export default function ReviewDocument() {
  const navigate = useNavigate();
  const [text, setText] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<ReviewDocumentResponse | null>(null);
  const [error, setError] = useState("");

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const wordCountColor =
    wordCount > 2000 ? "text-terracotta" : wordCount > 1500 ? "text-amber" : "text-ink-faint";

  const handleSubmit = async () => {
    if (!text.trim()) return;
    setStatus("loading");
    setError("");
    setResult(null);

    try {
      const res = await reviewDocument({ text, options: { max_risk_claims: 20 } });
      setResult(res);
      setStatus("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStatus("error");
    }
  };

  const highRiskCount = result?.high_risk_claims.filter((c) => c.risk_score > 0.7).length ?? 0;
  const medRiskCount = result?.high_risk_claims.filter((c) => c.risk_score > 0.4 && c.risk_score <= 0.7).length ?? 0;

  return (
    <div className="min-h-screen bg-ivory">
      <Navbar />

      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        {/* Header */}
        <div className="mb-8 animate-rise">
          <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">
            Review Document
          </h1>
          <p className="mt-2 text-sm text-ink-muted">
            Paste a longer document to scan for high-risk claims. We'll flag assertions
            that are most likely to need verification.
          </p>
        </div>

        {/* Input area */}
        <div className="space-y-4 animate-rise delay-100">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste your document (up to 2,000 words)..."
            rows={10}
            maxLength={LIMITS.REVIEW_MAX_CHARS}
            className="manuscript-input w-full resize-y px-4 py-3 text-sm"
          />

          <div className="flex items-center justify-between">
            <span className={`text-xs font-medium ${wordCountColor}`}>
              {wordCount} word{wordCount !== 1 ? "s" : ""}
            </span>
            <button
              onClick={handleSubmit}
              disabled={!text.trim() || status === "loading"}
              className="inline-flex items-center gap-2 rounded-xl bg-cerulean px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-cerulean/20 transition-all hover:bg-cerulean-light disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
            >
              {status === "loading" ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <FileText className="h-4 w-4" />
              )}
              {status === "loading" ? "Reviewing..." : "Review document"}
            </button>
          </div>
        </div>

        {/* Loading */}
        {status === "loading" && (
          <div className="mt-8 space-y-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="scholarly-card p-4">
                <div className="space-y-2">
                  <div className="h-4 w-3/4 rounded animate-shimmer" />
                  <div className="h-1.5 w-full rounded-full animate-shimmer" />
                  <div className="flex gap-1.5">
                    <div className="h-5 w-16 rounded-md animate-shimmer" />
                    <div className="h-5 w-14 rounded-md animate-shimmer" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error state */}
        {status === "error" && (
          <div className="mt-8 rounded-xl border border-terracotta-border bg-terracotta-wash p-5 animate-slide-up">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-terracotta" />
              <div>
                <h3 className="text-sm font-semibold text-terracotta">Something went wrong</h3>
                <p className="mt-1 text-sm text-ink-muted">{error}</p>
                <button
                  onClick={handleSubmit}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-terracotta border border-terracotta-border transition-colors hover:bg-terracotta-wash"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Try again
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Results */}
        {status === "success" && result && (
          <div className="mt-8">
            {/* Summary stats */}
            <div className="mb-6 grid grid-cols-3 gap-3">
              <div className="scholarly-card p-4 text-center">
                <BarChart3 className="mx-auto mb-1.5 h-5 w-5 text-cerulean" />
                <div className="text-lg font-bold text-ink">{result.total_claims_found}</div>
                <div className="text-[11px] font-medium text-ink-faint">Claims Found</div>
              </div>
              <div className="scholarly-card p-4 text-center">
                <AlertTriangle className="mx-auto mb-1.5 h-5 w-5 text-terracotta" />
                <div className="text-lg font-bold text-ink">{highRiskCount}</div>
                <div className="text-[11px] font-medium text-ink-faint">High Risk</div>
              </div>
              <div className="scholarly-card p-4 text-center">
                <CheckCircle2 className="mx-auto mb-1.5 h-5 w-5 text-amber" />
                <div className="text-lg font-bold text-ink">{medRiskCount}</div>
                <div className="text-[11px] font-medium text-ink-faint">Needs Review</div>
              </div>
            </div>

            {/* Risk claim rows */}
            {result.high_risk_claims.length > 0 ? (
              <div className="space-y-3">
                {result.high_risk_claims.map((claim, i) => (
                  <RiskClaimRow
                    key={claim.claim_id}
                    claim={claim}
                    index={i}
                    onClick={() => {
                      navigate(`/check?text=${encodeURIComponent(claim.original_text)}`);
                    }}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-sage-border bg-sage-wash p-8 text-center animate-slide-up">
                <CheckCircle2 className="mx-auto mb-3 h-8 w-8 text-sage" />
                <h3 className="text-base font-semibold text-ink">Looking good!</h3>
                <p className="mt-1.5 text-sm text-ink-muted">
                  No high-risk claims were found in your document.
                </p>
              </div>
            )}

            {/* Processing info */}
            <div className="mt-4 text-right text-xs text-ink-faint">
              {result.metadata.words_processed} words processed in{" "}
              {(result.metadata.processing_time_ms / 1000).toFixed(1)}s
            </div>
          </div>
        )}

        {/* Disclaimer */}
        <div className="mt-10 flex items-start gap-2 rounded-lg bg-parchment/50 px-4 py-3">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-ink-ghost" />
          <p className="text-xs leading-relaxed text-ink-faint">
            Verities helps you check — it does not guarantee accuracy. Always consult
            primary sources and use your own judgement for important claims.
          </p>
        </div>
      </div>
    </div>
  );
}
