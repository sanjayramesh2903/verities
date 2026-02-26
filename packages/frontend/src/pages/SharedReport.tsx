import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowRight, BookOpen, FileText, Calendar } from "lucide-react";
import type { Claim } from "@verities/shared";
import { getPublicReport, type SharedReportData } from "../lib/api";
import ClaimCard from "../components/ClaimCard";

export default function SharedReport() {
  const { shareToken } = useParams<{ shareToken: string }>();

  const [data, setData] = useState<SharedReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!shareToken) {
      setError("Invalid report link.");
      setLoading(false);
      return;
    }

    getPublicReport(shareToken)
      .then((report) => {
        setData(report);
      })
      .catch((err: Error) => {
        if (err.message.includes("410") || err.message.toLowerCase().includes("expired")) {
          setError("This report link has expired and is no longer available.");
        } else if (err.message.includes("404") || err.message.toLowerCase().includes("not found")) {
          setError("Report not found. The link may be invalid.");
        } else {
          setError(err.message || "Failed to load the report.");
        }
      })
      .finally(() => setLoading(false));
  }, [shareToken]);

  const claims: Claim[] =
    data?.result?.claims ?? [];

  const typeLabel =
    data?.type === "review" ? "Document Review" : "Fact Check";

  const formattedDate = data?.createdAt
    ? new Date(data.createdAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  return (
    <div className="min-h-screen bg-ivory">
      {/* Minimal header */}
      <header className="border-b border-vellum bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-6 py-4">
          <BookOpen className="h-5 w-5 text-cerulean" />
          <span className="font-display text-lg font-bold tracking-tight text-ink">
            Verities
          </span>
          <span className="text-ink-ghost">·</span>
          <span className="text-sm text-ink-muted">Shared Fact-Check Report</span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10">
        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-vellum border-t-cerulean" />
            <p className="text-sm text-ink-muted">Loading report…</p>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="rounded-xl border border-terracotta-border bg-terracotta-wash p-5 text-sm text-terracotta">
            {error}
          </div>
        )}

        {/* Success */}
        {!loading && !error && data && (
          <div className="animate-rise space-y-6">
            {/* Metadata row */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Type badge */}
              <span className="inline-flex items-center gap-1.5 rounded-full border border-vellum bg-white px-3 py-1 text-xs font-semibold text-ink-muted">
                <FileText className="h-3 w-3" />
                {typeLabel}
              </span>

              {/* Date */}
              {formattedDate && (
                <span className="inline-flex items-center gap-1.5 text-xs text-ink-faint">
                  <Calendar className="h-3 w-3" />
                  {formattedDate}
                </span>
              )}

              {/* Claim count */}
              {claims.length > 0 && (
                <span className="text-xs text-ink-faint">
                  {claims.length} claim{claims.length !== 1 ? "s" : ""} analysed
                </span>
              )}
            </div>

            {/* Input snippet */}
            {data.inputSnippet && (
              <blockquote className="rounded-xl border-l-4 border-cerulean bg-cerulean/5 px-5 py-4">
                <p className="text-sm leading-relaxed text-ink-muted italic">
                  "{data.inputSnippet}"
                </p>
              </blockquote>
            )}

            {/* Claims */}
            {claims.length === 0 ? (
              <p className="text-sm text-ink-muted">No claims found in this report.</p>
            ) : (
              <div className="space-y-4">
                {claims.map((claim, i) => (
                  <ClaimCard
                    key={claim.claim_id ?? i}
                    claim={claim}
                    index={i}
                    onUseRewrite={() => {}}
                  />
                ))}
              </div>
            )}

            {/* CTA */}
            <div className="rounded-xl border border-vellum bg-white p-6 text-center">
              <p className="mb-1 font-display text-base font-semibold text-ink">
                Want to fact-check your own writing?
              </p>
              <p className="mb-4 text-sm text-ink-muted">
                Verities analyses claims, finds sources, and suggests rewrites — in seconds.
              </p>
              <Link
                to="/check"
                className="inline-flex items-center gap-2 rounded-xl bg-cerulean px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-cerulean/20 transition-all hover:bg-cerulean-light"
              >
                Check your own writing
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
