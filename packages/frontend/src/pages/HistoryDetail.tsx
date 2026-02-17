import { useState, useEffect, lazy, Suspense } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, GitFork } from "lucide-react";
import type { Claim } from "@verities/shared";
import { getHistoryById } from "../lib/api";
import Navbar from "../components/Navbar";
import ClaimCard from "../components/ClaimCard";

const ConceptGraph = lazy(() => import("../components/ConceptGraph"));

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export default function HistoryDetail() {
  const { id } = useParams<{ id: string }>();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [meta, setMeta] = useState<{ type: string; inputSnippet: string; claimCount: number; createdAt: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getHistoryById(id)
      .then((res) => {
        setMeta({
          type: res.type,
          inputSnippet: res.inputSnippet,
          claimCount: res.claimCount,
          createdAt: res.createdAt,
        });
        // The result JSON may be an analyze response with a claims array
        const result = res.result as { claims?: Claim[] };
        setClaims(result?.claims ?? []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const handleUseRewrite = (span: { start: number; end: number }, _text: string) => {
    // In history view, rewrites are for reference only (no active editor)
    void span;
  };

  return (
    <div className="min-h-screen bg-ivory">
      <Navbar />
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <Link
          to="/history"
          className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-ink transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to History
        </Link>

        {loading ? (
          <div className="space-y-4 mt-4">
            <div className="h-8 w-64 rounded animate-shimmer" />
            {[0, 1, 2].map((i) => (
              <div key={i} className="annotation-card h-24 animate-shimmer" />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-xl border border-terracotta-border bg-terracotta-wash p-5 text-sm text-terracotta">
            {error}
          </div>
        ) : (
          <>
            <div className="mb-8 animate-rise">
              <div className="flex items-center gap-2 mb-1">
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  meta?.type === "analyze"
                    ? "bg-cerulean-wash text-cerulean"
                    : "bg-parchment text-ink-muted"
                }`}>
                  {meta?.type === "analyze" ? "Fact Check" : "Document Review"}
                </span>
                <span className="text-xs text-ink-faint">{meta?.createdAt ? formatDate(meta.createdAt) : ""}</span>
              </div>
              <h1 className="font-display text-xl font-bold text-ink sm:text-2xl mt-2 line-clamp-3">
                {meta?.inputSnippet}
              </h1>
              <p className="mt-2 text-sm text-ink-muted">
                {meta?.claimCount} claim{meta?.claimCount !== 1 ? "s" : ""} verified
              </p>
            </div>

            {/* Claim cards */}
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

            {/* Concept graph */}
            {claims.length > 0 && (
              <div className="mt-10 animate-rise">
                <div className="mb-3 flex items-center gap-2">
                  <GitFork className="h-4 w-4 text-ink-muted" />
                  <h2 className="font-display text-base font-bold text-ink">Concept Map</h2>
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
          </>
        )}
      </div>
    </div>
  );
}
