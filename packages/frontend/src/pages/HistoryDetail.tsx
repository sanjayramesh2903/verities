import { useState, useEffect, lazy, Suspense } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, GitFork, Share2, Check, Loader2, Bookmark, BookmarkCheck, FolderPlus, X } from "lucide-react";
import { toast } from "sonner";
import type { Claim } from "@verities/shared";
import {
  getHistoryById, getShareLink,
  getSavedClaims, saveClaim, unsaveClaim,
  getProjects, addCheckToProject,
  type Project,
} from "../lib/api";

interface CheckDetail {
  type: string;
  input_snippet: string;
  claim_count: number;
  created_at: string;
  result_json: unknown;
}
import Navbar from "../components/Navbar";
import ClaimCard from "../components/ClaimCard";

const ConceptGraph = lazy(() => import("../components/ConceptGraph"));

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

// ─── Add to Project modal ─────────────────────────────────────────────────

function AddToProjectModal({
  checkId,
  projects,
  onClose,
}: {
  checkId: string;
  projects: Project[];
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleAdd() {
    if (!selected) return;
    setSaving(true);
    try {
      await addCheckToProject(selected, checkId);
      const project = projects.find((p) => p.id === selected);
      toast.success(`Added to "${project?.name ?? "project"}"`);
      onClose();
    } catch {
      toast.error("Failed to add to project");
      setSaving(false);
    }
  }

  return (
    <div
      className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center p-4"
      aria-modal="true" role="dialog"
    >
      <div className="absolute inset-0 bg-navy/60 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div className="scholarly-card relative w-full max-w-sm animate-rise">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-ink-faint hover:bg-parchment hover:text-ink transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="px-6 pt-6 pb-3">
          <div className="flex items-center gap-2 mb-1">
            <FolderPlus className="h-5 w-5 text-cerulean" />
            <span className="text-xs font-semibold uppercase tracking-wider text-cerulean">Add to Project</span>
          </div>
          <h2 className="font-display text-lg font-bold text-ink">Select a project</h2>
        </div>

        <div className="px-6 pb-3 space-y-1.5 max-h-60 overflow-y-auto">
          {projects.length === 0 ? (
            <p className="py-4 text-center text-sm text-ink-muted">
              No projects yet.{" "}
              <Link to="/projects" className="text-cerulean hover:underline">Create one →</Link>
            </p>
          ) : (
            projects.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelected(p.id)}
                className={`w-full flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-all ${
                  selected === p.id
                    ? "border-cerulean bg-cerulean-wash"
                    : "border-vellum bg-white hover:border-stone"
                }`}
              >
                {selected === p.id
                  ? <Check className="h-4 w-4 text-cerulean shrink-0" />
                  : <FolderPlus className="h-4 w-4 text-ink-ghost shrink-0" />
                }
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">{p.name}</p>
                  <p className="text-[10px] text-ink-faint">{p.check_count} checks</p>
                </div>
              </button>
            ))
          )}
        </div>

        <div className="flex flex-col gap-2 px-6 pb-6 pt-3 sm:flex-row-reverse">
          <button
            onClick={handleAdd}
            disabled={!selected || saving || projects.length === 0}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-cerulean px-4 py-2 text-sm font-semibold text-white shadow-md shadow-cerulean/20 transition-all hover:bg-cerulean-light disabled:opacity-50"
          >
            {saving
              ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              : <FolderPlus className="h-4 w-4" />
            }
            Add to project
          </button>
          <button
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-xl border border-vellum px-4 py-2 text-sm font-medium text-ink-muted transition-colors hover:bg-parchment"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────

export default function HistoryDetail() {
  const { id } = useParams<{ id: string }>();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [meta, setMeta] = useState<{ type: string; inputSnippet: string; claimCount: number; createdAt: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sharing, setSharing] = useState(false);
  const [shared, setShared] = useState(false);

  // Projects & project modal
  const [projects, setProjects] = useState<Project[]>([]);
  const [showProjectModal, setShowProjectModal] = useState(false);

  // Saved claims: claim_id → saved_claim.id
  const [savedClaimMap, setSavedClaimMap] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      getHistoryById(id),
      getSavedClaims({ check_id: id }),
      getProjects(),
    ])
      .then(([res, { saved_claims }, { projects: ps }]) => {
        const detail = res as CheckDetail;
        setMeta({
          type: detail.type,
          inputSnippet: detail.input_snippet,
          claimCount: detail.claim_count,
          createdAt: detail.created_at,
        });
        const result = detail.result_json as { claims?: Claim[] };
        setClaims(result?.claims ?? []);

        const map: Record<string, string> = {};
        for (const sc of saved_claims) map[sc.claim_id] = sc.id;
        setSavedClaimMap(map);
        setProjects(ps);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const handleShare = async () => {
    if (!id) return;
    setSharing(true);
    try {
      const { share_url } = await getShareLink(id);
      await navigator.clipboard.writeText(share_url);
      setShared(true);
      toast.success("Share link copied to clipboard!");
      setTimeout(() => setShared(false), 3000);
    } catch {
      toast.error("Could not create share link. Please try again.");
    } finally {
      setSharing(false);
    }
  };

  async function handleToggleSave(claim: Claim) {
    if (!id) return;
    const existingSavedId = savedClaimMap[claim.claim_id];
    if (existingSavedId) {
      try {
        await unsaveClaim(existingSavedId);
        setSavedClaimMap((prev) => { const next = { ...prev }; delete next[claim.claim_id]; return next; });
        toast.success("Claim removed from library");
      } catch {
        toast.error("Failed to remove saved claim");
      }
    } else {
      try {
        const { saved_claim } = await saveClaim({
          check_id: id,
          claim_id: claim.claim_id,
          claim_text: claim.original_text,
          verdict: claim.verdict,
        });
        setSavedClaimMap((prev) => ({ ...prev, [claim.claim_id]: saved_claim.id }));
        toast.success("Claim saved to library");
      } catch {
        toast.error("Failed to save claim");
      }
    }
  }

  const handleUseRewrite = (span: { start: number; end: number }, _text: string) => {
    void span;
  };

  return (
    <div className="min-h-screen bg-ivory">
      <Navbar />
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <div className="mb-6 flex items-center justify-between">
          <Link
            to="/history"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-ink transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to History
          </Link>

          {!loading && !error && (
            <div className="flex items-center gap-2">
              {/* Add to Project button */}
              <button
                onClick={() => setShowProjectModal(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-vellum bg-white px-3 py-1.5 text-xs font-medium text-ink-muted transition-colors hover:border-stone hover:text-ink"
              >
                <FolderPlus className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Add to Project</span>
              </button>

              {/* Share button — analyze checks only */}
              {meta?.type === "analyze" && (
                <button
                  onClick={handleShare}
                  disabled={sharing}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-vellum bg-white px-3 py-1.5 text-xs font-medium text-ink-muted transition-colors hover:border-stone hover:text-ink disabled:opacity-50"
                >
                  {sharing ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : shared ? (
                    <Check className="h-3.5 w-3.5 text-sage" />
                  ) : (
                    <Share2 className="h-3.5 w-3.5" />
                  )}
                  {shared ? "Copied!" : "Share"}
                </button>
              )}
            </div>
          )}
        </div>

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

            {/* Claim cards with bookmark overlay */}
            <div className="space-y-4">
              {claims.map((claim, i) => {
                const isSaved = !!savedClaimMap[claim.claim_id];
                return (
                  <div key={claim.claim_id} className="relative">
                    <ClaimCard
                      claim={claim}
                      index={i}
                      onUseRewrite={handleUseRewrite}
                    />
                    <button
                      onClick={() => handleToggleSave(claim)}
                      className={`absolute top-3 right-3 rounded-lg p-1.5 transition-colors ${
                        isSaved
                          ? "text-cerulean hover:bg-parchment"
                          : "text-ink-ghost hover:text-cerulean hover:bg-cerulean-wash"
                      }`}
                      title={isSaved ? "Remove from library" : "Save to claim library"}
                    >
                      {isSaved
                        ? <BookmarkCheck className="h-4 w-4" />
                        : <Bookmark className="h-4 w-4" />
                      }
                    </button>
                  </div>
                );
              })}
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

      {showProjectModal && id && (
        <AddToProjectModal
          checkId={id}
          projects={projects}
          onClose={() => setShowProjectModal(false)}
        />
      )}
    </div>
  );
}
