import { useState } from "react";
import { Search, AlertCircle, RefreshCw, Info } from "lucide-react";
import { LIMITS } from "@verities/shared";
import type { AnalyzeClaimsResponse, CitationStyle } from "@verities/shared";
import { analyzeClaims } from "../lib/api";
import Navbar from "../components/Navbar";
import ClaimCard from "../components/ClaimCard";

type Status = "idle" | "loading" | "success" | "error";

export default function CheckFacts() {
  const [text, setText] = useState("");
  const [citationStyle, setCitationStyle] = useState<CitationStyle>("mla");
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<AnalyzeClaimsResponse | null>(null);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!text.trim()) return;
    setStatus("loading");
    setError("");
    setResult(null);

    try {
      const res = await analyzeClaims({
        text,
        citation_style: citationStyle,
        options: { max_claims: 10 },
      });
      setResult(res);
      setStatus("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStatus("error");
    }
  };

  const handleUseRewrite = (span: { start: number; end: number }, rewriteText: string) => {
    setText((prev) => prev.slice(0, span.start) + rewriteText + prev.slice(span.end));
  };

  return (
    <div className="min-h-screen bg-ivory">
      <Navbar />

      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        {/* Header */}
        <div className="mb-8 animate-rise">
          <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">
            Check Facts
          </h1>
          <p className="mt-2 text-sm text-ink-muted">
            Paste your text below and we'll extract each factual claim, verify it against
            ranked sources, and provide verdicts with citations.
          </p>
        </div>

        {/* Input area */}
        <div className="space-y-4 animate-rise delay-100">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste your essay, report, or paragraph here..."
            rows={6}
            maxLength={LIMITS.ANALYZE_MAX_CHARS}
            className="manuscript-input w-full resize-y px-4 py-3 text-sm"
          />

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <label className="text-xs font-medium text-ink-muted">Citation style</label>
              <select
                value={citationStyle}
                onChange={(e) => setCitationStyle(e.target.value as CitationStyle)}
                className="rounded-lg border border-vellum bg-white px-3 py-1.5 text-sm text-ink transition-colors hover:border-stone focus:border-cerulean focus:outline-none focus:ring-2 focus:ring-cerulean-wash"
              >
                <option value="mla">MLA</option>
                <option value="apa">APA</option>
                <option value="chicago">Chicago</option>
              </select>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs text-ink-faint">
                {text.length}/{LIMITS.ANALYZE_MAX_CHARS}
              </span>
              <button
                onClick={handleSubmit}
                disabled={!text.trim() || status === "loading"}
                className="inline-flex items-center gap-2 rounded-xl bg-cerulean px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-cerulean/20 transition-all hover:bg-cerulean-light disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
              >
                {status === "loading" ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
                {status === "loading" ? "Checking..." : "Check facts"}
              </button>
            </div>
          </div>
        </div>

        {/* Loading skeleton */}
        {status === "loading" && (
          <div className="mt-8 space-y-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="annotation-card p-5" style={{ animationDelay: `${i * 100}ms` }}>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-16 rounded animate-shimmer" />
                    <div className="h-5 w-28 rounded-full animate-shimmer" />
                  </div>
                  <div className="h-4 w-full rounded animate-shimmer" />
                  <div className="h-4 w-3/4 rounded animate-shimmer" />
                  <div className="h-3 w-1/2 rounded animate-shimmer delay-100" />
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
            {/* Summary bar */}
            <div className="mb-4 flex items-center justify-between rounded-lg bg-parchment/70 px-4 py-2.5">
              <span className="text-xs font-medium text-ink-muted">
                {result.claims.length} claim{result.claims.length !== 1 ? "s" : ""} found
              </span>
              <span className="text-xs text-ink-faint">
                {(result.metadata.processing_time_ms / 1000).toFixed(1)}s
              </span>
            </div>

            {/* Claim cards */}
            <div className="space-y-4">
              {result.claims.map((claim, i) => (
                <ClaimCard
                  key={claim.claim_id}
                  claim={claim}
                  index={i}
                  onUseRewrite={handleUseRewrite}
                />
              ))}
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
