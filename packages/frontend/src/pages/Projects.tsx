import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FolderOpen, FolderPlus, LogIn, X, ChevronRight, Search, FileText,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { getProjects, createProject, type Project } from "../lib/api";
import Navbar from "../components/Navbar";

// ─── Credibility score helpers ────────────────────────────────────────────

function scoreColor(s: number): string {
  if (s > 80) return "text-sage";
  if (s >= 50) return "text-amber";
  return "text-terracotta";
}

function scoreBg(s: number): string {
  if (s > 80) return "bg-sage-wash border-sage-border";
  if (s >= 50) return "bg-amber-wash border-amber-border";
  return "bg-terracotta-wash border-terracotta-border";
}

function CredibilityPill({ score }: { score: number | null }) {
  if (score === null) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-vellum bg-parchment px-2.5 py-1 text-xs font-medium text-ink-faint">
        — Credibility
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${scoreBg(score)}`}>
      <span className={scoreColor(score)}>{score}</span>
      <span className="text-ink-muted">Credibility</span>
    </span>
  );
}

function relativeDate(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ─── Create project modal ─────────────────────────────────────────────────

function CreateModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (p: Project) => void;
}) {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleCreate() {
    const trimmed = name.trim();
    if (!trimmed) { setError("Project name is required."); return; }
    setSaving(true);
    setError("");
    try {
      const { project } = await createProject({ name: trimmed, description: desc.trim() || undefined });
      onCreate(project);
    } catch (e) {
      setError((e as Error).message);
      setSaving(false);
    }
  }

  return (
    <div
      className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center p-4"
      aria-modal="true" role="dialog"
    >
      <div
        className="absolute inset-0 bg-navy/60 backdrop-blur-sm"
        onClick={onClose} aria-hidden="true"
      />
      <div className="scholarly-card relative w-full max-w-md animate-rise">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-ink-faint transition-colors hover:bg-parchment hover:text-ink"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="px-6 pt-6 pb-4">
          <div className="mb-1 flex items-center gap-2">
            <FolderPlus className="h-5 w-5 text-cerulean" />
            <span className="text-xs font-semibold uppercase tracking-wider text-cerulean">
              New Project
            </span>
          </div>
          <h2 className="font-display text-xl font-bold text-ink">
            Create a research project
          </h2>
          <p className="mt-1 text-sm text-ink-muted">
            Group related fact-checks for an essay, paper, or topic.
          </p>
        </div>

        <div className="px-6 pb-2 space-y-3">
          <div>
            <label className="block mb-1 text-xs font-medium text-ink-muted">
              Project name <span className="text-terracotta">*</span>
            </label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              placeholder="e.g. Climate Change Essay"
              maxLength={120}
              className="w-full rounded-lg border border-vellum bg-white px-3 py-2 text-sm text-ink placeholder:text-ink-ghost focus:border-cerulean focus:outline-none focus:ring-2 focus:ring-cerulean/20"
            />
          </div>
          <div>
            <label className="block mb-1 text-xs font-medium text-ink-muted">
              Description <span className="text-ink-ghost">(optional)</span>
            </label>
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="What's this project about?"
              maxLength={500}
              rows={2}
              className="w-full resize-none rounded-lg border border-vellum bg-white px-3 py-2 text-sm text-ink placeholder:text-ink-ghost focus:border-cerulean focus:outline-none focus:ring-2 focus:ring-cerulean/20"
            />
          </div>
          {error && (
            <p className="rounded-lg border border-terracotta-border bg-terracotta-wash px-3 py-2 text-xs text-terracotta">
              {error}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2 px-6 pb-6 pt-3 sm:flex-row-reverse">
          <button
            onClick={handleCreate}
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-cerulean px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-cerulean/20 transition-all hover:bg-cerulean-light disabled:opacity-60"
          >
            {saving
              ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> Creating…</>
              : <><FolderPlus className="h-4 w-4" /> Create project</>
            }
          </button>
          <button
            onClick={onClose}
            disabled={saving}
            className="inline-flex items-center justify-center rounded-xl border border-vellum px-5 py-2.5 text-sm font-medium text-ink-muted transition-colors hover:bg-parchment hover:text-ink disabled:opacity-60"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────

export default function Projects() {
  const { user, loading: authLoading, login } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    getProjects()
      .then((res) => setProjects(res.projects))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  function handleCreated(p: Project) {
    setShowModal(false);
    navigate(`/projects/${p.id}`);
  }

  return (
    <div className="min-h-screen bg-ivory">
      <Navbar />
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">

        {/* Header */}
        <div className="mb-8 flex items-center justify-between animate-rise">
          <div>
            <div className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5 text-cerulean" />
              <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">
                My Projects
              </h1>
            </div>
            <p className="mt-1 text-sm text-ink-muted">
              Organise fact-checks by essay, paper, or research topic.
            </p>
          </div>
          {user && (
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-cerulean px-4 py-2 text-sm font-semibold text-white shadow-md shadow-cerulean/20 transition-all hover:bg-cerulean-light"
            >
              <FolderPlus className="h-4 w-4" />
              <span className="hidden sm:inline">New Project</span>
            </button>
          )}
        </div>

        {/* Auth gate */}
        {authLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-cerulean border-t-transparent" />
          </div>
        ) : !user ? (
          <div className="rounded-xl border border-vellum bg-parchment/50 p-10 text-center animate-rise">
            <LogIn className="mx-auto mb-4 h-10 w-10 text-ink-ghost" />
            <h2 className="font-display text-lg font-bold text-ink">
              Sign in to create projects
            </h2>
            <p className="mt-2 text-sm text-ink-muted">
              Projects let you group and track fact-checks across your assignments.
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
            {[...Array(3)].map((_, i) => (
              <div key={i} className="annotation-card h-20 animate-shimmer" />
            ))}
          </div>

        ) : projects.length === 0 ? (
          <div className="rounded-xl border border-vellum bg-parchment/50 p-12 text-center animate-rise">
            <FolderOpen className="mx-auto mb-4 h-12 w-12 text-ink-ghost" />
            <h2 className="font-display text-lg font-bold text-ink">No projects yet</h2>
            <p className="mt-2 text-sm text-ink-muted max-w-xs mx-auto">
              Create your first project to start grouping fact-checks for an essay or research paper.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <button
                onClick={() => setShowModal(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-cerulean px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-cerulean/20 transition-all hover:bg-cerulean-light"
              >
                <FolderPlus className="h-4 w-4" />
                Create a project
              </button>
              <Link
                to="/check"
                className="inline-flex items-center gap-2 rounded-xl border border-vellum bg-white px-4 py-2 text-sm font-semibold text-ink transition-all hover:border-stone"
              >
                <Search className="h-4 w-4" />
                Check Facts
              </Link>
            </div>
          </div>

        ) : (
          <div className="space-y-3">
            {projects.map((p, i) => (
              <Link
                key={p.id}
                to={`/projects/${p.id}`}
                className="annotation-card flex items-center gap-4 p-4 transition-shadow hover:shadow-md animate-slide-up"
                style={{ animationDelay: `${i * 40}ms` }}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-cerulean-wash">
                  <FolderOpen className="h-5 w-5 text-cerulean" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">{p.name}</p>
                  {p.description && (
                    <p className="mt-0.5 truncate text-xs text-ink-muted">{p.description}</p>
                  )}
                  <p className="mt-0.5 text-xs text-ink-faint">
                    {p.check_count} check{p.check_count !== 1 ? "s" : ""} · Updated {relativeDate(p.updated_at)}
                  </p>
                </div>
                <div className="shrink-0 flex items-center gap-2">
                  <CredibilityPill score={p.credibility_score} />
                  <ChevronRight className="h-4 w-4 text-ink-ghost" />
                </div>
              </Link>
            ))}

            {/* Footer CTA */}
            <div className="pt-2 flex gap-3">
              <button
                onClick={() => setShowModal(true)}
                className="inline-flex items-center gap-2 rounded-xl border border-vellum bg-white px-4 py-2 text-sm font-medium text-ink-muted transition-colors hover:bg-parchment hover:text-ink"
              >
                <FolderPlus className="h-3.5 w-3.5" />
                New project
              </button>
              <Link
                to="/history"
                className="inline-flex items-center gap-2 rounded-xl border border-vellum bg-white px-4 py-2 text-sm font-medium text-ink-muted transition-colors hover:bg-parchment hover:text-ink"
              >
                <FileText className="h-3.5 w-3.5" />
                View all checks
              </Link>
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <CreateModal onClose={() => setShowModal(false)} onCreate={handleCreated} />
      )}
    </div>
  );
}
