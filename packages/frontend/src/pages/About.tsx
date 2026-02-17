import { Link } from "react-router-dom";
import {
  Shield, Search, BookOpen, CheckCircle2, GitFork, Lock,
  Globe, Layers, ArrowRight
} from "lucide-react";
import Navbar from "../components/Navbar";

const pipeline = [
  {
    step: "1",
    title: "Claim Extraction",
    desc: "A lightweight AI model identifies discrete factual assertions in your text — separating facts from opinions, hedges, and rhetorical questions.",
  },
  {
    step: "2",
    title: "Web Search",
    desc: "For each claim, we search the web and retrieve 2–5 sources. Results are ranked by domain authority (academic, government, major news) before any AI analysis.",
  },
  {
    step: "3",
    title: "Verdict & Explanation",
    desc: "A reasoning model evaluates the claim against only the retrieved source snippets — never from AI training data alone. It assigns one of four verdicts.",
  },
  {
    step: "4",
    title: "Rewrite & Cite",
    desc: "For overstated or disputed claims, a rewrite is suggested that aligns with the evidence. Citations are generated deterministically from source metadata.",
  },
];

const tiers = [
  { label: "Tier 1 — Authoritative", color: "bg-green-500", examples: ".edu, .gov, peer-reviewed journals, established encyclopedias" },
  { label: "Tier 2 — Major Reference", color: "bg-cerulean", examples: "AP, Reuters, BBC, NYT, NPR, The Economist" },
  { label: "Tier 3 — General Web", color: "bg-amber-400", examples: "Blogs, general news, lesser-known outlets" },
  { label: "Tier 4 — Wikipedia", color: "bg-stone-400", examples: "User-editable; useful context but labeled as unverified" },
];

export default function About() {
  return (
    <div className="min-h-screen bg-ivory">
      <Navbar />

      {/* Hero */}
      <section className="border-b border-vellum bg-parchment/30">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 text-center animate-rise">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-cerulean shadow-lg shadow-cerulean/20">
            <Shield className="h-7 w-7 text-white" />
          </div>
          <h1 className="font-display text-3xl font-bold text-ink sm:text-4xl">About Verities</h1>
          <p className="mt-4 text-lg leading-relaxed text-ink-muted">
            Verities helps students and knowledge workers verify factual claims in their
            writing — providing verdicts, evidence-backed rewrites, and copy-ready citations.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Link
              to="/check"
              className="inline-flex items-center gap-2 rounded-xl bg-cerulean px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-cerulean/20 transition-all hover:bg-cerulean-light"
            >
              <Search className="h-4 w-4" />
              Try it now
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* What Verities is NOT */}
      <section className="border-b border-vellum">
        <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
          <h2 className="font-display text-2xl font-bold text-ink mb-6">What Verities is (and isn't)</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { icon: CheckCircle2, title: "It IS: A fact-checking assistant", desc: "Verities surfaces evidence, assigns verdicts, and suggests source-aligned rewrites." },
              { icon: Globe, title: "It IS: Source-grounded", desc: "All verdicts are based on retrieved web sources — AI training data is never the sole basis." },
              { icon: Shield, title: "It is NOT: A guarantee of accuracy", desc: "Always verify critical claims with primary sources. Verities assists — it does not replace your judgement." },
              { icon: Lock, title: "It is NOT: A writing monitor", desc: "Verities only runs when you explicitly click 'Check facts'. No background monitoring or keystroke logging." },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="scholarly-card p-5">
                <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-cerulean-wash">
                  <Icon className="h-5 w-5 text-cerulean" />
                </div>
                <h3 className="text-sm font-semibold text-ink">{title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-ink-muted">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pipeline */}
      <section className="border-b border-vellum bg-parchment/30">
        <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
          <h2 className="font-display text-2xl font-bold text-ink mb-2">How the pipeline works</h2>
          <p className="text-sm text-ink-muted mb-8">Every fact-check follows these four steps.</p>
          <div className="space-y-4">
            {pipeline.map(({ step, title, desc }) => (
              <div key={step} className="annotation-card flex gap-4 p-5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cerulean text-xs font-bold text-white">
                  {step}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-ink">{title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-ink-muted">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Source reliability tiers */}
      <section className="border-b border-vellum">
        <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
          <div className="flex items-center gap-2 mb-6">
            <Layers className="h-5 w-5 text-cerulean" />
            <h2 className="font-display text-2xl font-bold text-ink">Source reliability tiers</h2>
          </div>
          <p className="text-sm text-ink-muted mb-6">
            Sources are ranked before any LLM analysis. Higher-tier sources weight the verdict more heavily.
          </p>
          <div className="space-y-3">
            {tiers.map(({ label, color, examples }) => (
              <div key={label} className="scholarly-card flex items-start gap-4 p-4">
                <div className={`mt-1 h-3 w-3 shrink-0 rounded-full ${color}`} />
                <div>
                  <p className="text-sm font-semibold text-ink">{label}</p>
                  <p className="text-xs text-ink-muted mt-0.5">{examples}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Concept graph */}
      <section className="border-b border-vellum bg-parchment/30">
        <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
          <div className="flex items-center gap-2 mb-4">
            <GitFork className="h-5 w-5 text-cerulean" />
            <h2 className="font-display text-2xl font-bold text-ink">Concept Map</h2>
          </div>
          <p className="text-sm leading-relaxed text-ink-muted">
            After every fact-check, Verities generates an interactive concept map — an Obsidian-style
            force-directed graph showing the connections between your claims and the concepts they reference.
            Claim nodes are colored by their verdict. Drag to rearrange, scroll to zoom. For logged-in users,
            your concept map grows across all your checks, revealing patterns in your writing over time.
          </p>
        </div>
      </section>

      {/* Privacy */}
      <section className="border-b border-vellum">
        <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
          <div className="flex items-center gap-2 mb-4">
            <Lock className="h-5 w-5 text-cerulean" />
            <h2 className="font-display text-2xl font-bold text-ink">Privacy</h2>
          </div>
          <ul className="space-y-2 text-sm leading-relaxed text-ink-muted list-disc list-inside">
            <li>Anonymous use by default — no account required.</li>
            <li>When signed in, only short text snippets and metadata are stored, not full documents.</li>
            <li>History is retained for 30 days then automatically deleted.</li>
            <li>Login uses Google OAuth. We store only your email and display name.</li>
            <li>All traffic is encrypted in transit. Data at rest is encrypted in managed storage.</li>
          </ul>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="bg-parchment/30">
        <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 text-center">
          <BookOpen className="mx-auto mb-4 h-8 w-8 text-cerulean" />
          <h2 className="font-display text-xl font-bold text-ink">Ready to verify your writing?</h2>
          <p className="mt-2 text-sm text-ink-muted">No account needed to get started.</p>
          <div className="mt-6 flex justify-center gap-3">
            <Link
              to="/check"
              className="inline-flex items-center gap-2 rounded-xl bg-cerulean px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-cerulean/20 transition-all hover:bg-cerulean-light"
            >
              <Search className="h-4 w-4" />
              Check Facts
            </Link>
            <Link
              to="/review"
              className="inline-flex items-center gap-2 rounded-xl border border-vellum bg-white px-5 py-2.5 text-sm font-semibold text-ink transition-all hover:border-stone"
            >
              Review Document
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
