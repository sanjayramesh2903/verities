import { useState, useEffect, useRef, useCallback, lazy, Suspense } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Search, AlertCircle, RefreshCw, Info, GitFork, TrendingUp } from "lucide-react";
import { LIMITS } from "@verities/shared";
import type { Claim, CitationStyle } from "@verities/shared";
import { analyzeClaimsStream, getUsage, type UsageData } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import Navbar from "../components/Navbar";
import ClaimCard from "../components/ClaimCard";
import UpgradeModal from "../components/UpgradeModal";

const ConceptGraph = lazy(() => import("../components/ConceptGraph"));

type Status = "idle" | "extracting" | "streaming" | "success" | "error";

export default function CheckFacts() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [text, setText] = useState(searchParams.get("text") ?? "");
  const autoSubmitted = useRef(false);
  const [citationStyle, setCitationStyle] = useState<CitationStyle>("mla");
  const [status, setStatus] = useState<Status>("idle");
  const [claims, setClaims] = useState<Claim[]>([]);
  const [totalClaims, setTotalClaims] = useState(0);
  const [processingTimeMs, setProcessingTimeMs] = useState(0);
  const [error, setError] = useState("");
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const { user } = useAuth();

  // Fetch usage quota when user is logged in
  useEffect(() => {
    if (user) {
      getUsage().then(setUsage).catch(() => {});
    }
  }, [user]);

  // Auto-submit if navigated here with ?text= param (e.g. from Review page)
  useEffect(() => {
    if (text.trim() && !autoSubmitted.current) {
      autoSubmitted.current = true;
      setSearchParams({}, { replace: true });
      handleSubmit();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = useCallback(async () => {
    if (!text.trim()) return;
    setStatus("extracting");
    setError("");
    setClaims([]);
    setTotalClaims(0);

    try {
      await analyzeClaimsStream(
        { text, citation_style: citationStyle, options: { max_claims: 10 } },
        {
          onExtraction(total) {
            setTotalClaims(total);
            setStatus("streaming");
          },
          onClaim(_index, claim) {
            setClaims((prev) => [...prev, claim]);
          },
          onDone(data) {
            setProcessingTimeMs(data.metadata.processing_time_ms);
            setStatus("success");
            // Refresh usage after a successful check
            if (user) getUsage().then(setUsage).catch(() => {});
          },
          onError(message) {
            setError(message);
            setStatus("error");
          },
        }
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      // 402 = quota exceeded — open upgrade modal
      if (msg.toLowerCase().includes("free tier") || msg.includes("402")) {
        setShowUpgrade(true);
        setStatus("idle");
      } else {
        setError(msg);
        setStatus("error");
      }
    }
  }, [text, citationStyle, user]);

  const handleUseRewrite = (span: { start: number; end: number }, rewriteText: string) => {
    setText((prev) => prev.slice(0, span.start) + rewriteText + prev.slice(span.end));
  };

  const isLoading = status === "extracting" || status === "streaming";

  const checksRemaining = usage
    ? Math.max(0, usage.checksLimit - usage.checksUsed)
    : null;
  const quotaExhausted = usage?.planTier === "free" && checksRemaining === 0;

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

        {/* Usage indicator — only for logged-in free tier users */}
        {usage && usage.planTier === "free" && (
          <div className={`mb-5 flex items-center justify-between rounded-lg px-4 py-2.5 animate-rise ${
            quotaExhausted
              ? "bg-terracotta-wash border border-terracotta-border"
              : "bg-parchment/60 border border-vellum"
          }`}>
            <div className="flex items-center gap-2">
              <TrendingUp className={`h-3.5 w-3.5 ${quotaExhausted ? "text-terracotta" : "text-ink-muted"}`} />
              <span className={`text-xs font-medium ${quotaExhausted ? "text-terracotta" : "text-ink-muted"}`}>
                {quotaExhausted
                  ? "You've used all free fact-checks this month"
                  : `${checksRemaining} of ${usage.checksLimit} fact-checks remaining this month`}
              </span>
            </div>
            <Link
              to="/pricing"
              className="text-xs font-semibold text-cerulean hover:underline"
            >
              {quotaExhausted ? "Upgrade to continue" : "Upgrade"}
            </Link>
          </div>
        )}

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
              {quotaExhausted ? (
                <button
                  onClick={() => setShowUpgrade(true)}
                  className="inline-flex items-center gap-2 rounded-xl bg-navy px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:bg-navy-light"
                >
                  Upgrade to continue
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={!text.trim() || isLoading}
                  className="inline-flex items-center gap-2 rounded-xl bg-cerulean px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-cerulean/20 transition-all hover:bg-cerulean-light disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                >
                  {isLoading ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                  {isLoading ? "Checking..." : "Check facts"}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Extracting phase — waiting for LLM to parse claims */}
        {status === "extracting" && (
          <div className="mt-8 space-y-4">
            <div className="flex items-center gap-2 rounded-lg bg-parchment/70 px-4 py-2.5">
              <RefreshCw className="h-3.5 w-3.5 animate-spin text-cerulean" />
              <span className="text-xs font-medium text-ink-muted">Extracting claims...</span>
            </div>
            {[0, 1, 2].map((i) => (
              <div key={i} className="annotation-card p-5" style={{ animationDelay: `${i * 100}ms` }}>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-16 rounded animate-shimmer" />
                    <div className="h-5 w-28 rounded-full animate-shimmer" />
                  </div>
                  <div className="h-4 w-full rounded animate-shimmer" />
                  <div className="h-4 w-3/4 rounded animate-shimmer" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Streaming phase — claims appear as they complete */}
        {status === "streaming" && (
          <div className="mt-8">
            <div className="mb-4 flex items-center justify-between rounded-lg bg-parchment/70 px-4 py-2.5">
              <div className="flex items-center gap-2">
                <RefreshCw className="h-3.5 w-3.5 animate-spin text-cerulean" />
                <span className="text-xs font-medium text-ink-muted">
                  Verifying claims... {claims.length}/{totalClaims}
                </span>
              </div>
              {/* Progress bar */}
              <div className="h-1.5 w-24 rounded-full bg-parchment overflow-hidden">
                <div
                  className="h-full rounded-full bg-cerulean transition-all duration-500"
                  style={{ width: `${totalClaims > 0 ? (claims.length / totalClaims) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div className="space-y-4">
              {claims.map((claim, i) => (
                <ClaimCard
                  key={claim.claim_id}
                  claim={claim}
                  index={i}
                  onUseRewrite={handleUseRewrite}
                />
              ))}
              {/* Remaining skeleton placeholders */}
              {Array.from({ length: totalClaims - claims.length }, (_, i) => (
                <div key={`skeleton-${i}`} className="annotation-card p-5">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-16 rounded animate-shimmer" />
                      <div className="h-5 w-28 rounded-full animate-shimmer" />
                    </div>
                    <div className="h-4 w-full rounded animate-shimmer" />
                    <div className="h-4 w-3/4 rounded animate-shimmer" />
                  </div>
                </div>
              ))}
            </div>
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

        {/* Final results */}
        {status === "success" && claims.length > 0 && (
          <div className="mt-8">
            <div className="mb-4 flex items-center justify-between rounded-lg bg-parchment/70 px-4 py-2.5">
              <span className="text-xs font-medium text-ink-muted">
                {claims.length} claim{claims.length !== 1 ? "s" : ""} found
              </span>
              <span className="text-xs text-ink-faint">
                {(processingTimeMs / 1000).toFixed(1)}s
              </span>
            </div>

            <div className="space-y-4">
              {claims.map((claim, i) => (
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

        {/* Concept Graph */}
        {status === "success" && claims.length > 0 && (
          <div className="mt-10 animate-rise">
            <div className="mb-3 flex items-center gap-2">
              <GitFork className="h-4 w-4 text-ink-muted" />
              <h2 className="font-display text-base font-bold text-ink">Concept Map</h2>
              <span className="text-xs text-ink-faint">— connections between claims and concepts</span>
            </div>
            <Suspense fallback={
              <div className="h-64 rounded-xl bg-slate-950/80 flex items-center justify-center">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-cerulean border-t-transparent" />
              </div>
            }>
              <ConceptGraph claims={claims} />
            </Suspense>
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

      <UpgradeModal open={showUpgrade} onClose={() => setShowUpgrade(false)} />
    </div>
  );
}
