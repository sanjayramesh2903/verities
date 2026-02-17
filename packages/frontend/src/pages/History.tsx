import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { History as HistoryIcon, Search, FileText, LogIn, ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { getHistory, type CheckSummary } from "../lib/api";
import Navbar from "../components/Navbar";

const PAGE_SIZE = 20;

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export default function History() {
  const { user, loading: authLoading, login } = useAuth();
  const [checks, setChecks] = useState<CheckSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    setError("");
    getHistory(PAGE_SIZE, offset)
      .then((res) => {
        setChecks(res.checks);
        setTotal(res.total);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [user, offset]);

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

  return (
    <div className="min-h-screen bg-ivory">
      <Navbar />
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <div className="mb-8 animate-rise">
          <div className="flex items-center gap-2">
            <HistoryIcon className="h-5 w-5 text-cerulean" />
            <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">Check History</h1>
          </div>
          <p className="mt-2 text-sm text-ink-muted">
            Your last 30 days of fact-checks and document reviews.
          </p>
        </div>

        {authLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-cerulean border-t-transparent" />
          </div>
        ) : !user ? (
          <div className="rounded-xl border border-vellum bg-parchment/50 p-10 text-center animate-rise">
            <LogIn className="mx-auto mb-4 h-10 w-10 text-ink-ghost" />
            <h2 className="font-display text-lg font-bold text-ink">Sign in to view your history</h2>
            <p className="mt-2 text-sm text-ink-muted">
              Your checks are saved for 30 days when you're signed in.
            </p>
            <button
              onClick={login}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-cerulean px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-cerulean/20 transition-all hover:bg-cerulean-light"
            >
              <LogIn className="h-4 w-4" />
              Sign in with Google
            </button>
          </div>
        ) : loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="annotation-card h-16 animate-shimmer" />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-xl border border-terracotta-border bg-terracotta-wash p-5 text-sm text-terracotta">
            {error}
          </div>
        ) : checks.length === 0 ? (
          <div className="rounded-xl border border-vellum bg-parchment/50 p-10 text-center animate-rise">
            <Clock className="mx-auto mb-4 h-10 w-10 text-ink-ghost" />
            <h2 className="font-display text-lg font-bold text-ink">No checks yet</h2>
            <p className="mt-2 text-sm text-ink-muted">
              Run a fact-check or document review to see your history here.
            </p>
            <div className="mt-5 flex justify-center gap-3">
              <Link
                to="/check"
                className="inline-flex items-center gap-2 rounded-xl bg-cerulean px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-cerulean-light"
              >
                <Search className="h-4 w-4" />
                Check Facts
              </Link>
              <Link
                to="/review"
                className="inline-flex items-center gap-2 rounded-xl border border-vellum bg-white px-4 py-2 text-sm font-semibold text-ink transition-all hover:border-stone"
              >
                <FileText className="h-4 w-4" />
                Review Document
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {checks.map((check, i) => (
                <Link
                  key={check.id}
                  to={`/history/${check.id}`}
                  className="annotation-card flex items-center gap-4 p-4 transition-shadow hover:shadow-md animate-slide-up"
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                    check.type === "analyze" ? "bg-cerulean-wash" : "bg-parchment"
                  }`}>
                    {check.type === "analyze"
                      ? <Search className="h-4 w-4 text-cerulean" />
                      : <FileText className="h-4 w-4 text-ink-muted" />
                    }
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">{check.inputSnippet}</p>
                    <p className="mt-0.5 text-xs text-ink-faint">{formatDate(check.createdAt)}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className="inline-block rounded-full bg-parchment px-2 py-0.5 text-xs font-medium text-ink-muted">
                      {check.claimCount} claim{check.claimCount !== 1 ? "s" : ""}
                    </span>
                  </div>
                </Link>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between">
                <button
                  onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                  disabled={offset === 0}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-vellum bg-white px-3 py-1.5 text-sm font-medium text-ink-muted transition-colors hover:border-stone disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </button>
                <span className="text-sm text-ink-faint">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setOffset(offset + PAGE_SIZE)}
                  disabled={offset + PAGE_SIZE >= total}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-vellum bg-white px-3 py-1.5 text-sm font-medium text-ink-muted transition-colors hover:border-stone disabled:opacity-40"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
