import { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  FileText, AlertCircle, RefreshCw, Info, BarChart3,
  AlertTriangle, CheckCircle2, Upload, X, Sparkles, TrendingUp,
} from "lucide-react";
import { LIMITS } from "@verities/shared";
import type { ReviewDocumentResponse } from "@verities/shared";
import { reviewDocument, getUsage, type UsageData } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { extractTextFromFile, SUPPORTED_EXTENSIONS, DocumentParseError } from "../lib/parseDocument";
import Navbar from "../components/Navbar";
import RiskClaimRow from "../components/RiskClaimRow";
import RiskGraph from "../components/RiskGraph";
import UpgradeModal from "../components/UpgradeModal";

type Status = "idle" | "parsing" | "loading" | "success" | "error";

function ConfettiDots() {
  const dots = Array.from({ length: 18 });
  const colors = ["#4ade80", "#60a5fa", "#f87171", "#fb923c", "#a78bfa", "#34d399"];
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl">
      {dots.map((_, i) => (
        <span
          key={i}
          className="confetti-dot"
          style={{
            left: `${5 + Math.random() * 90}%`,
            animationDelay: `${i * 120}ms`,
            animationDuration: `${900 + Math.random() * 600}ms`,
            background: colors[i % colors.length],
          }}
        />
      ))}
    </div>
  );
}

export default function ReviewDocument() {
  const navigate = useNavigate();
  const [text, setText] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<ReviewDocumentResponse | null>(null);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const { user } = useAuth();

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const charCount = text.length;
  const wordCountColor =
    wordCount > 2000 ? "text-terracotta" : wordCount > 1500 ? "text-amber" : "text-ink-faint";

  // Fetch usage quota when user is logged in
  useEffect(() => {
    if (user) {
      getUsage().then(setUsage).catch(() => {});
    }
  }, [user]);

  const handleFile = useCallback(async (file: File) => {
    setStatus("parsing");
    setError("");
    setFileName(file.name);
    try {
      const extracted = await extractTextFromFile(file);
      setText(extracted.slice(0, LIMITS.REVIEW_MAX_CHARS));
      setStatus("idle");
    } catch (err) {
      setError(err instanceof DocumentParseError ? err.message : "Failed to read file.");
      setStatus("error");
      setFileName(null);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  };

  const clearFile = () => {
    setText("");
    setFileName(null);
    setResult(null);
    setStatus("idle");
    setError("");
  };

  const handleSubmit = async () => {
    if (!text.trim()) return;
    setStatus("loading");
    setError("");
    setResult(null);

    try {
      const res = await reviewDocument({ text, options: { max_risk_claims: 20 } });
      setResult(res);
      setStatus("success");
      // Refresh usage after successful review
      if (user) getUsage().then(setUsage).catch(() => {});
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      // 402 = quota exceeded
      if (msg.toLowerCase().includes("free tier") || msg.includes("402")) {
        setShowUpgrade(true);
        setStatus("idle");
      } else {
        setError(msg);
        setStatus("error");
      }
    }
  };

  const highRiskCount = result?.high_risk_claims.filter((c) => c.risk_score > 0.7).length ?? 0;
  const medRiskCount =
    result?.high_risk_claims.filter((c) => c.risk_score > 0.4 && c.risk_score <= 0.7).length ?? 0;
  const okCount =
    result?.high_risk_claims.filter((c) => c.risk_score <= 0.4).length ?? 0;

  const reviewsRemaining = usage
    ? usage.reviewsLimit === null ? null : Math.max(0, usage.reviewsLimit - usage.reviewsUsed)
    : null;
  const quotaExhausted = usage?.planTier === "free" && reviewsRemaining === 0;

  return (
    <div className="min-h-screen bg-ivory">
      <Navbar />

      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        {/* Header */}
        <div className="mb-8 animate-rise">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cerulean/20 bg-cerulean-wash px-3 py-1 animate-pop-in">
            <Sparkles className="h-3 w-3 text-cerulean" />
            <span className="text-[11px] font-semibold text-cerulean uppercase tracking-wider">Risk Scanner</span>
          </div>
          <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">
            Review Document
          </h1>
          <p className="mt-2 text-sm text-ink-muted">
            Paste text or upload a file to scan for high-risk claims. We flag assertions
            most likely to need verification.
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
                  ? "You've used all free document reviews this month"
                  : `${reviewsRemaining} of ${usage.reviewsLimit} document reviews remaining this month`}
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
          {/* Drop zone */}
          <div
            className={`drop-zone ${dragOver ? "drag-over" : ""}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => !fileName && fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={SUPPORTED_EXTENSIONS.join(",")}
              className="sr-only"
              onChange={handleFileInput}
            />

            {status === "parsing" ? (
              <div className="flex flex-col items-center gap-2 py-6">
                <RefreshCw className="h-6 w-6 animate-spin text-cerulean" />
                <p className="text-sm font-medium text-ink-muted">Extracting text…</p>
              </div>
            ) : fileName ? (
              <div className="flex items-center gap-3 py-4 px-2">
                <FileText className="h-5 w-5 text-cerulean shrink-0" />
                <span className="text-sm font-medium text-ink truncate flex-1">{fileName}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); clearFile(); }}
                  className="rounded-md p-1 hover:bg-terracotta-wash transition-colors"
                >
                  <X className="h-4 w-4 text-terracotta" />
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 py-6 cursor-pointer">
                <Upload className="h-6 w-6 text-ink-ghost" />
                <p className="text-sm font-medium text-ink-muted">
                  Drop a file here or <span className="text-cerulean font-semibold">browse</span>
                </p>
                <p className="text-[11px] text-ink-ghost">
                  {SUPPORTED_EXTENSIONS.join(" · ")} · max 5 MB
                </p>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-vellum" />
            <span className="text-[11px] font-medium text-ink-ghost uppercase tracking-wider">or paste text</span>
            <div className="h-px flex-1 bg-vellum" />
          </div>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste your document (up to 2,000 words)…"
            rows={10}
            maxLength={LIMITS.REVIEW_MAX_CHARS}
            className="manuscript-input w-full resize-y px-4 py-3 text-sm"
          />

          <div className="flex items-center justify-between">
            <span className={`text-xs font-medium ${wordCountColor}`}>
              {wordCount.toLocaleString()} word{wordCount !== 1 ? "s" : ""}
              <span className="ml-2 text-ink-ghost">
                ({charCount.toLocaleString()} / {LIMITS.REVIEW_MAX_CHARS.toLocaleString()} chars)
              </span>
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
                disabled={!text.trim() || status === "loading" || status === "parsing"}
                className="inline-flex items-center gap-2 rounded-xl bg-cerulean px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-cerulean/20 transition-all hover:bg-cerulean-light hover:shadow-lg hover:shadow-cerulean/30 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:translate-y-0"
              >
                {status === "loading" ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <FileText className="h-4 w-4" />
                )}
                {status === "loading" ? "Reviewing…" : "Review document"}
              </button>
            )}
          </div>
        </div>

        {/* Loading skeletons */}
        {status === "loading" && (
          <div className="mt-8 space-y-4 animate-fade-in">
            {/* Stat card skeletons */}
            <div className="grid grid-cols-3 gap-3 mb-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="scholarly-card p-4 text-center">
                  <div className="mx-auto mb-2 h-5 w-5 rounded-full animate-shimmer" />
                  <div className="mx-auto h-6 w-10 rounded animate-shimmer mb-1" />
                  <div className="mx-auto h-3 w-16 rounded animate-shimmer" />
                </div>
              ))}
            </div>
            {/* Claim row skeletons */}
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="scholarly-card p-4">
                <div className="space-y-2">
                  <div className="h-4 w-3/4 rounded animate-shimmer" />
                  <div className="h-4 w-1/2 rounded animate-shimmer" />
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
            {/* Summary stat cards */}
            <div className="mb-6 grid grid-cols-3 gap-3">
              {[
                { icon: BarChart3, color: "text-cerulean", value: result.total_claims_found, label: "Claims Found" },
                { icon: AlertTriangle, color: "text-terracotta", value: highRiskCount, label: "High Risk" },
                { icon: CheckCircle2, color: "text-amber", value: medRiskCount, label: "Needs Review" },
              ].map(({ icon: Icon, color, value, label }, i) => (
                <div
                  key={label}
                  className="scholarly-card p-4 text-center animate-pop-in"
                  style={{ animationDelay: `${i * 80}ms` }}
                >
                  <Icon className={`mx-auto mb-1.5 h-5 w-5 ${color}`} />
                  <div className="text-lg font-bold text-ink animate-count-up">{value}</div>
                  <div className="text-[11px] font-medium text-ink-faint">{label}</div>
                </div>
              ))}
            </div>

            {/* Risk Graph */}
            {result.high_risk_claims.length > 0 && (
              <div className="mb-6">
                <RiskGraph claims={result.high_risk_claims} />
              </div>
            )}

            {/* Risk claim rows */}
            {result.high_risk_claims.length > 0 ? (
              <div className="space-y-3">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-faint mb-2">
                  {result.high_risk_claims.length} flagged claim{result.high_risk_claims.length !== 1 ? "s" : ""}
                </h2>
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
              <div className="relative rounded-xl border border-sage-border bg-sage-wash p-10 text-center animate-slide-up overflow-hidden">
                <ConfettiDots />
                <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-sage relative z-10" />
                <h3 className="text-lg font-semibold text-ink relative z-10">All clear!</h3>
                <p className="mt-1.5 text-sm text-ink-muted relative z-10">
                  No high-risk claims were found. Your writing looks solid.
                  {okCount > 0 && ` ${okCount} claim${okCount !== 1 ? "s" : ""} passed review.`}
                </p>
              </div>
            )}

            {/* Processing info */}
            <div className="mt-4 text-right text-xs text-ink-ghost">
              {result.metadata.words_processed.toLocaleString()} words processed in{" "}
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

      <UpgradeModal open={showUpgrade} onClose={() => setShowUpgrade(false)} />
    </div>
  );
}
