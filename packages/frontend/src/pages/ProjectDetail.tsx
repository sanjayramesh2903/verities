import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft, FolderOpen, Search, FileText, Plus, X, Pencil,
  Trash2, Bookmark, BookmarkCheck, Check,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../contexts/AuthContext";
import {
  getProjectById, updateProject, deleteProject,
  addCheckToProject, removeCheckFromProject,
  getSavedClaims, saveClaim, unsaveClaim,
  getHistory,
  type ProjectDetail as ProjectDetailType,
  type ProjectCheck,
  type SavedClaim,
} from "../lib/api";
import Navbar from "../components/Navbar";
import VerdictBadge from "../components/VerdictBadge";
import type { Verdict } from "@verities/shared";

// ─── Credibility score helpers ────────────────────────────────────────────

const VERDICT_SCORES: Record<string, number> = {
  broadly_supported: 100,
  unclear: 50,
  overstated: 25,
  disputed: 0,
};

function computeCredibilityScore(checks: ProjectCheck[]): number | null {
  const scores: number[] = [];
  for (const check of checks) {
    const claims = check.result_json?.claims ?? [];
    for (const claim of claims) {
      scores.push(VERDICT_SCORES[claim.verdict] ?? 50);
    }
  }
  if (scores.length === 0) return null;
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

function scoreColor(s: number): string {
  if (s > 80) return "text-sage";
  if (s >= 50) return "text-amber";
  return "text-terracotta";
}

function scoreBg(s: number): string {
  if (s > 80) return "bg-sage-wash border-sage-border text-sage";
  if (s >= 50) return "bg-amber-wash border-amber-border text-amber";
  return "bg-terracotta-wash border-terracotta-border text-terracotta";
}

// ─── Formatting helpers ───────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

// ─── Add checks modal ─────────────────────────────────────────────────────

interface HistorySummary {
  id: string;
  type: "analyze" | "review";
  input_snippet: string;
  claim_count: number;
  created_at: string;
}

function AddChecksModal({
  projectId,
  existingCheckIds,
  onClose,
  onAdded,
}: {
  projectId: string;
  existingCheckIds: Set<string>;
  onClose: () => void;
  onAdded: (ids: string[]) => void;
}) {
  const [allChecks, setAllChecks] = useState<HistorySummary[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getHistory(50, 0)
      .then((res) => setAllChecks(res.checks as HistorySummary[]))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function handleAdd() {
    if (selected.size === 0) return;
    setSaving(true);
    try {
      await Promise.all([...selected].map((id) => addCheckToProject(projectId, id)));
      onAdded([...selected]);
      toast.success(`Added ${selected.size} check${selected.size !== 1 ? "s" : ""} to project`);
    } catch {
      toast.error("Failed to add checks");
    } finally {
      setSaving(false);
    }
  }

  const available = allChecks.filter((c) => !existingCheckIds.has(c.id));

  return (
    <div
      className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center p-4"
      aria-modal="true" role="dialog"
    >
      <div className="absolute inset-0 bg-navy/60 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div className="scholarly-card relative w-full max-w-lg animate-rise flex flex-col max-h-[80vh]">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-ink-faint transition-colors hover:bg-parchment hover:text-ink"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="px-6 pt-6 pb-3 shrink-0">
          <div className="flex items-center gap-2 mb-1">
            <Plus className="h-5 w-5 text-cerulean" />
            <span className="text-xs font-semibold uppercase tracking-wider text-cerulean">
              Add Checks
            </span>
          </div>
          <h2 className="font-display text-xl font-bold text-ink">
            Add from history
          </h2>
          <p className="mt-1 text-sm text-ink-muted">
            Select checks to add to this project.
          </p>
        </div>

        <div className="overflow-y-auto flex-1 px-6 pb-2">
          {loading ? (
            <div className="space-y-2 py-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="annotation-card h-12 animate-shimmer" />
              ))}
            </div>
          ) : available.length === 0 ? (
            <p className="py-8 text-center text-sm text-ink-muted">
              No more checks to add.
            </p>
          ) : (
            <div className="space-y-2 py-2">
              {available.map((c) => {
                const isSelected = selected.has(c.id);
                return (
                  <button
                    key={c.id}
                    onClick={() => toggle(c.id)}
                    className={`w-full flex items-center gap-3 rounded-xl border p-3 text-left transition-all ${
                      isSelected
                        ? "border-cerulean bg-cerulean-wash"
                        : "border-vellum bg-white hover:border-stone"
                    }`}
                  >
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
                      isSelected ? "bg-cerulean" : c.type === "analyze" ? "bg-cerulean-wash" : "bg-parchment"
                    }`}>
                      {isSelected
                        ? <Check className="h-4 w-4 text-white" />
                        : c.type === "analyze"
                          ? <Search className="h-4 w-4 text-cerulean" />
                          : <FileText className="h-4 w-4 text-ink-muted" />
                      }
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-ink">{c.input_snippet}</p>
                      <p className="text-[10px] text-ink-faint">{formatDate(c.created_at)} · {c.claim_count} claims</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2 px-6 py-4 shrink-0 border-t border-vellum sm:flex-row-reverse">
          <button
            onClick={handleAdd}
            disabled={selected.size === 0 || saving}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-cerulean px-5 py-2 text-sm font-semibold text-white shadow-md shadow-cerulean/20 transition-all hover:bg-cerulean-light disabled:opacity-50"
          >
            {saving
              ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              : <Plus className="h-4 w-4" />
            }
            {selected.size > 0 ? `Add ${selected.size} check${selected.size !== 1 ? "s" : ""}` : "Add checks"}
          </button>
          <button
            onClick={onClose}
            disabled={saving}
            className="inline-flex items-center justify-center rounded-xl border border-vellum px-5 py-2 text-sm font-medium text-ink-muted transition-colors hover:bg-parchment"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [project, setProject] = useState<ProjectDetailType | null>(null);
  const [savedClaims, setSavedClaims] = useState<SavedClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"checks" | "saved">("checks");

  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  const [showAddModal, setShowAddModal] = useState(false);

  // Saved claim state: map from claim_id → saved_claim.id
  const [savedClaimMap, setSavedClaimMap] = useState<Record<string, string>>({});

  const existingCheckIds = new Set((project?.checks ?? []).map((c) => c.id));

  // Load project + saved claims
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      getProjectById(id),
      getSavedClaims({ project_id: id }),
    ])
      .then(([{ project: p }, { saved_claims }]) => {
        setProject(p);
        const map: Record<string, string> = {};
        for (const sc of saved_claims) map[sc.claim_id] = sc.id;
        setSavedClaimMap(map);
        setSavedClaims(saved_claims);
      })
      .catch(() => navigate("/projects"))
      .finally(() => setLoading(false));
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reload after adding checks
  const reloadProject = useCallback(() => {
    if (!id) return;
    getProjectById(id).then(({ project: p }) => setProject(p)).catch(() => {});
  }, [id]);

  // Edit handlers
  function startEdit() {
    if (!project) return;
    setEditName(project.name);
    setEditDesc(project.description ?? "");
    setEditing(true);
  }

  async function saveEdit() {
    if (!project || !id) return;
    const trimmed = editName.trim();
    if (!trimmed) return;
    setEditSaving(true);
    try {
      const { project: updated } = await updateProject({ id, name: trimmed, description: editDesc.trim() || undefined });
      setProject((prev) => prev ? { ...prev, name: updated.name, description: updated.description } : prev);
      setEditing(false);
      toast.success("Project updated");
    } catch {
      toast.error("Failed to update project");
    } finally {
      setEditSaving(false);
    }
  }

  async function handleDelete() {
    if (!project || !id) return;
    if (!window.confirm(`Delete "${project.name}"? This cannot be undone.`)) return;
    try {
      await deleteProject(id);
      toast.success("Project deleted");
      navigate("/projects");
    } catch {
      toast.error("Failed to delete project");
    }
  }

  async function handleRemoveCheck(checkId: string) {
    if (!project || !id) return;
    try {
      await removeCheckFromProject(id, checkId);
      setProject((prev) =>
        prev ? { ...prev, checks: prev.checks.filter((c) => c.id !== checkId) } : prev
      );
      toast.success("Check removed from project");
    } catch {
      toast.error("Failed to remove check");
    }
  }

  async function handleToggleSave(claim: { claim_id: string; original_text: string; verdict: string }) {
    if (!id) return;
    const existingSavedId = savedClaimMap[claim.claim_id];

    if (existingSavedId) {
      try {
        await unsaveClaim(existingSavedId);
        setSavedClaimMap((prev) => { const next = { ...prev }; delete next[claim.claim_id]; return next; });
        setSavedClaims((prev) => prev.filter((sc) => sc.id !== existingSavedId));
        toast.success("Claim removed from library");
      } catch {
        toast.error("Failed to remove saved claim");
      }
    } else {
      // Need check_id — find the check that contains this claim
      const parentCheck = project?.checks.find((c) =>
        c.result_json?.claims?.some((cl) => cl.claim_id === claim.claim_id)
      );
      if (!parentCheck) return;
      try {
        const { saved_claim } = await saveClaim({
          check_id: parentCheck.id,
          claim_id: claim.claim_id,
          claim_text: claim.original_text,
          verdict: claim.verdict,
          project_id: id,
        });
        setSavedClaimMap((prev) => ({ ...prev, [claim.claim_id]: saved_claim.id }));
        setSavedClaims((prev) => [saved_claim, ...prev]);
        toast.success("Claim saved to library");
      } catch {
        toast.error("Failed to save claim");
      }
    }
  }

  const score = project ? computeCredibilityScore(project.checks) : null;

  if (loading) {
    return (
      <div className="min-h-screen bg-ivory">
        <Navbar />
        <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
          <div className="h-8 w-40 rounded-lg bg-parchment animate-shimmer mb-6" />
          <div className="h-24 rounded-xl bg-parchment animate-shimmer mb-4" />
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => <div key={i} className="annotation-card h-16 animate-shimmer" />)}
          </div>
        </div>
      </div>
    );
  }

  if (!project) return null;

  return (
    <div className="min-h-screen bg-ivory">
      <Navbar />
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">

        {/* Back link */}
        <Link
          to="/projects"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-ink-muted transition-colors hover:text-ink animate-rise"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          My Projects
        </Link>

        {/* Project header */}
        <div className="mb-6 flex items-start gap-4 animate-rise">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-cerulean-wash">
            <FolderOpen className="h-6 w-6 text-cerulean" />
          </div>

          <div className="min-w-0 flex-1">
            {editing ? (
              <div className="space-y-2">
                <input
                  autoFocus
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") setEditing(false); }}
                  maxLength={120}
                  className="w-full rounded-lg border border-cerulean bg-white px-3 py-1.5 font-display text-xl font-bold text-ink focus:outline-none focus:ring-2 focus:ring-cerulean/20"
                />
                <input
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  maxLength={500}
                  placeholder="Description (optional)"
                  className="w-full rounded-lg border border-vellum bg-white px-3 py-1.5 text-sm text-ink placeholder:text-ink-ghost focus:border-cerulean focus:outline-none"
                />
                <div className="flex gap-2">
                  <button
                    onClick={saveEdit}
                    disabled={editSaving}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-cerulean px-3 py-1.5 text-xs font-semibold text-white transition-all hover:bg-cerulean-light disabled:opacity-60"
                  >
                    {editSaving
                      ? <span className="h-3.5 w-3.5 animate-spin rounded-full border border-white/30 border-t-white" />
                      : <Check className="h-3.5 w-3.5" />
                    }
                    Save
                  </button>
                  <button
                    onClick={() => setEditing(false)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-vellum px-3 py-1.5 text-xs font-medium text-ink-muted transition-colors hover:bg-parchment"
                  >
                    <X className="h-3.5 w-3.5" />
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <h1 className="font-display text-2xl font-bold text-ink leading-tight">
                  {project.name}
                </h1>
                {project.description && (
                  <p className="mt-1 text-sm text-ink-muted">{project.description}</p>
                )}
                <div className="mt-2 flex items-center gap-2">
                  <button
                    onClick={startEdit}
                    className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-ink-faint transition-colors hover:bg-parchment hover:text-ink"
                  >
                    <Pencil className="h-3 w-3" />
                    Edit
                  </button>
                  <button
                    onClick={handleDelete}
                    className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-ink-faint transition-colors hover:bg-terracotta-wash hover:text-terracotta"
                  >
                    <Trash2 className="h-3 w-3" />
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Credibility score widget */}
          {score !== null && (
            <div className={`shrink-0 rounded-xl border px-4 py-3 text-center ${scoreBg(score)}`}>
              <p className={`text-3xl font-bold font-display leading-none ${scoreColor(score)}`}>
                {score}
              </p>
              <p className="mt-1 text-[10px] uppercase tracking-widest text-ink-faint">
                Credibility
              </p>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="mb-4 flex gap-1 border-b border-vellum">
          {(["checks", "saved"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                activeTab === tab
                  ? "border-cerulean text-cerulean"
                  : "border-transparent text-ink-muted hover:text-ink"
              }`}
            >
              {tab === "checks"
                ? `Checks (${project.checks.length})`
                : `Saved Claims (${savedClaims.length})`
              }
            </button>
          ))}
        </div>

        {/* ── Checks tab ── */}
        {activeTab === "checks" && (
          <div className="space-y-3">
            <div className="flex justify-end">
              <button
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center gap-2 rounded-xl border border-vellum bg-white px-4 py-2 text-sm font-medium text-ink-muted transition-colors hover:bg-parchment hover:text-ink"
              >
                <Plus className="h-3.5 w-3.5" />
                Add checks
              </button>
            </div>

            {project.checks.length === 0 ? (
              <div className="rounded-xl border border-vellum bg-parchment/50 p-10 text-center">
                <FileText className="mx-auto mb-3 h-10 w-10 text-ink-ghost" />
                <p className="text-sm font-medium text-ink">No checks yet</p>
                <p className="mt-1 text-xs text-ink-muted">
                  Add checks from your history or run a new fact-check.
                </p>
              </div>
            ) : (
              project.checks.map((check, i) => (
                <div
                  key={check.id}
                  className="annotation-card flex items-start gap-3 p-4 animate-slide-up"
                  style={{ animationDelay: `${i * 30}ms` }}
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
                    <Link
                      to={`/history/${check.id}`}
                      className="block truncate text-sm font-medium text-ink hover:text-cerulean transition-colors"
                    >
                      {check.input_snippet}
                    </Link>
                    <p className="mt-0.5 text-xs text-ink-faint">
                      {formatDate(check.created_at)} · {check.claim_count} claims
                    </p>

                    {/* Claim bookmark buttons */}
                    {check.result_json?.claims && check.result_json.claims.length > 0 && (
                      <div className="mt-3 space-y-1.5">
                        {check.result_json.claims.map((claim) => {
                          const isSaved = !!savedClaimMap[claim.claim_id];
                          return (
                            <div
                              key={claim.claim_id}
                              className="flex items-start gap-2 rounded-lg bg-ivory px-2.5 py-2"
                            >
                              <VerdictBadge verdict={claim.verdict as Verdict} />
                              <p className="flex-1 min-w-0 text-xs text-ink leading-relaxed line-clamp-2">
                                {claim.original_text}
                              </p>
                              <button
                                onClick={() => handleToggleSave(claim)}
                                className={`shrink-0 rounded-md p-1 transition-colors ${
                                  isSaved
                                    ? "text-cerulean hover:text-ink-muted"
                                    : "text-ink-ghost hover:text-cerulean"
                                }`}
                                title={isSaved ? "Remove from library" : "Save to library"}
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
                    )}
                  </div>
                  <button
                    onClick={() => handleRemoveCheck(check.id)}
                    className="shrink-0 rounded-lg p-1.5 text-ink-ghost transition-colors hover:bg-terracotta-wash hover:text-terracotta"
                    title="Remove from project"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {/* ── Saved Claims tab ── */}
        {activeTab === "saved" && (
          <div className="space-y-3">
            {savedClaims.length === 0 ? (
              <div className="rounded-xl border border-vellum bg-parchment/50 p-10 text-center">
                <Bookmark className="mx-auto mb-3 h-10 w-10 text-ink-ghost" />
                <p className="text-sm font-medium text-ink">No saved claims yet</p>
                <p className="mt-1 text-xs text-ink-muted max-w-xs mx-auto">
                  Open the Checks tab, then click the bookmark icon next to any claim to save it here.
                </p>
              </div>
            ) : (
              savedClaims.map((sc, i) => (
                <div
                  key={sc.id}
                  className="annotation-card flex items-start gap-3 p-4 animate-slide-up"
                  style={{ animationDelay: `${i * 30}ms` }}
                >
                  <div className="min-w-0 flex-1 space-y-2">
                    <VerdictBadge verdict={sc.verdict as Verdict} />
                    <p className="text-sm text-ink leading-relaxed">{sc.claim_text}</p>
                    {sc.note && (
                      <p className="text-xs italic text-ink-muted">"{sc.note}"</p>
                    )}
                    <Link
                      to={`/history/${sc.check_id}`}
                      className="inline-flex items-center gap-1 text-[11px] text-ink-faint hover:text-cerulean transition-colors"
                    >
                      <FileText className="h-3 w-3" />
                      View source check
                    </Link>
                  </div>
                  <button
                    onClick={async () => {
                      await unsaveClaim(sc.id);
                      setSavedClaims((prev) => prev.filter((x) => x.id !== sc.id));
                      setSavedClaimMap((prev) => { const next = { ...prev }; delete next[sc.claim_id]; return next; });
                      toast.success("Claim removed");
                    }}
                    className="shrink-0 rounded-lg p-1.5 text-ink-ghost transition-colors hover:bg-terracotta-wash hover:text-terracotta"
                    title="Remove saved claim"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {showAddModal && (
        <AddChecksModal
          projectId={project.id}
          existingCheckIds={existingCheckIds}
          onClose={() => setShowAddModal(false)}
          onAdded={() => { setShowAddModal(false); reloadProject(); }}
        />
      )}
    </div>
  );
}
