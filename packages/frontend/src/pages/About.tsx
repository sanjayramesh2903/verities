import { Link } from "react-router-dom";
import {
  Shield, Search, BookOpen, CheckCircle2, GitFork, Lock,
  Globe, Layers, ArrowRight, FileText, AlertTriangle, HelpCircle,
  TrendingUp, Zap,
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

const verdicts = [
  {
    label: "Broadly Supported",
    color: "bg-green-500",
    textColor: "text-green-700",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
    desc: "The claim aligns with what multiple reliable sources say. You can keep it — consider citing the supporting source.",
    action: "Keep & cite the source provided.",
  },
  {
    label: "Overstated",
    color: "bg-amber-500",
    textColor: "text-amber-700",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
    desc: "The claim goes further than the evidence supports — often a number is wrong, a superlative is unverified, or the scope is exaggerated.",
    action: "Use the suggested rewrite or soften the language yourself.",
  },
  {
    label: "Disputed",
    color: "bg-red-500",
    textColor: "text-red-700",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
    desc: "Sources actively contradict the claim. It may be a common myth or a factual error.",
    action: "Remove, correct, or clearly attribute the claim as contested.",
  },
  {
    label: "Unclear",
    color: "bg-stone-400",
    textColor: "text-stone-600",
    bgColor: "bg-stone-50",
    borderColor: "border-stone-200",
    desc: "No relevant sources were found, or the evidence is too thin to reach a verdict. This often means the claim is very niche or poorly worded.",
    action: "Verify manually with a primary source before keeping.",
  },
];

export default function About() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-vellum bg-parchment/30">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 text-center animate-rise">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-cerulean shadow-lg shadow-cerulean/20">
            <Shield className="h-7 w-7 text-white" />
          </div>
          <h1 className="font-display text-3xl font-bold text-ink sm:text-4xl">About Verities</h1>
          <p className="mt-4 text-lg leading-relaxed text-ink-muted">
            Verities helps students and knowledge workers verify factual claims in their
            writing — providing verdicts, evidence-backed rewrites, and copy-ready citations.
          </p>
          <div className="mt-8 flex justify-center gap-3 flex-wrap">
            <Link
              to="/check"
              className="inline-flex items-center gap-2 rounded-xl bg-cerulean px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-cerulean/20 transition-all hover:bg-cerulean-light"
            >
              <Search className="h-4 w-4" />
              Check Facts
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/review"
              className="inline-flex items-center gap-2 rounded-xl border border-vellum bg-white px-5 py-2.5 text-sm font-semibold text-ink transition-all hover:border-stone"
            >
              <FileText className="h-4 w-4" />
              Review Document
            </Link>
          </div>
        </div>
      </section>

      {/* Which tool? */}
      <section className="border-b border-vellum">
        <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
          <h2 className="font-display text-2xl font-bold text-ink mb-2">Which tool should I use?</h2>
          <p className="text-sm text-ink-muted mb-8">Verities has two entry points depending on your goal.</p>
          <div className="grid gap-5 sm:grid-cols-2">
            {/* Check Facts */}
            <div className="scholarly-card p-6 border-2 border-cerulean/20">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-cerulean-wash">
                <Search className="h-5 w-5 text-cerulean" />
              </div>
              <h3 className="text-base font-bold text-ink mb-1">Check Facts</h3>
              <p className="text-xs text-ink-faint font-medium uppercase tracking-wide mb-3">Up to 5,000 characters</p>
              <p className="text-sm leading-relaxed text-ink-muted mb-4">
                Paste a paragraph or short passage. Verities extracts each factual claim, searches the web for evidence,
                and returns a verdict, explanation, sources, and optional rewrite for every claim.
              </p>
              <ul className="space-y-1.5 text-sm text-ink-muted">
                {["Essays and research papers", "News article excerpts", "Social media posts or emails", "Any text with specific factual assertions"].map((u) => (
                  <li key={u} className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-cerulean" />
                    {u}
                  </li>
                ))}
              </ul>
              <Link to="/check" className="mt-5 inline-flex items-center gap-1.5 text-xs font-semibold text-cerulean hover:underline">
                Go to Check Facts <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {/* Review Document */}
            <div className="scholarly-card p-6 border-2 border-stone/20">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-stone/10">
                <FileText className="h-5 w-5 text-ink-muted" />
              </div>
              <h3 className="text-base font-bold text-ink mb-1">Review Document</h3>
              <p className="text-xs text-ink-faint font-medium uppercase tracking-wide mb-3">Up to 12,000 characters</p>
              <p className="text-sm leading-relaxed text-ink-muted mb-4">
                Upload or paste a longer document. Verities scans the entire text, scores every claim by risk level,
                and surfaces only the highest-risk ones for your attention — without you having to read line by line.
              </p>
              <ul className="space-y-1.5 text-sm text-ink-muted">
                {["Full essays or reports", "Uploaded .pdf, .docx, .txt, .md files", "Content before publishing or submission", "Quickly triage a large body of text"].map((u) => (
                  <li key={u} className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-ink-muted" />
                    {u}
                  </li>
                ))}
              </ul>
              <Link to="/review" className="mt-5 inline-flex items-center gap-1.5 text-xs font-semibold text-ink-muted hover:underline">
                Go to Review Document <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Reading your results — Check Facts */}
      <section className="border-b border-vellum bg-parchment/30">
        <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="h-5 w-5 text-cerulean" />
            <h2 className="font-display text-2xl font-bold text-ink">Reading your results: Check Facts</h2>
          </div>
          <p className="text-sm text-ink-muted mb-8">
            Each claim receives one of four verdicts. Here's what they mean and what to do next.
          </p>
          <div className="space-y-4">
            {verdicts.map(({ label, color, textColor, bgColor, borderColor, desc, action }) => (
              <div key={label} className={`rounded-xl border ${borderColor} ${bgColor} p-5`}>
                <div className="flex items-center gap-2.5 mb-2">
                  <div className={`h-2.5 w-2.5 rounded-full shrink-0 ${color}`} />
                  <span className={`text-sm font-bold ${textColor}`}>{label}</span>
                </div>
                <p className="text-sm leading-relaxed text-ink-muted mb-2">{desc}</p>
                <p className="text-xs font-semibold text-ink">
                  <span className="text-ink-faint">What to do: </span>{action}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Reading your results — Review Document */}
      <section className="border-b border-vellum">
        <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-5 w-5 text-cerulean" />
            <h2 className="font-display text-2xl font-bold text-ink">Reading your results: Review Document</h2>
          </div>
          <p className="text-sm text-ink-muted mb-8">
            The Document Review doesn't assign verdicts — it assigns <strong className="text-ink">risk scores</strong> to
            help you prioritize which claims to investigate first.
          </p>
          <div className="space-y-4">
            {[
              {
                icon: AlertTriangle,
                label: "High risk (0.7 – 1.0)",
                color: "text-red-600",
                bg: "bg-red-50",
                border: "border-red-200",
                desc: "The claim uses superlatives, specific statistics, or exact numbers without citation — all common markers of misinformation. These should be your first stop.",
              },
              {
                icon: HelpCircle,
                label: "Needs review (0.4 – 0.7)",
                color: "text-amber-600",
                bg: "bg-amber-50",
                border: "border-amber-200",
                desc: "Some risk signals are present but the claim isn't definitively flagged. Worth a manual read and a quick source check.",
              },
              {
                icon: CheckCircle2,
                label: "Likely OK (0.0 – 0.4)",
                color: "text-green-600",
                bg: "bg-green-50",
                border: "border-green-200",
                desc: "The claim is phrased cautiously or is very general. Lower priority — but still worth spot-checking if it's central to your argument.",
              },
            ].map(({ icon: Icon, label, color, bg, border, desc }) => (
              <div key={label} className={`rounded-xl border ${border} ${bg} p-5 flex gap-4`}>
                <Icon className={`h-5 w-5 shrink-0 mt-0.5 ${color}`} />
                <div>
                  <p className={`text-sm font-bold ${color} mb-1`}>{label}</p>
                  <p className="text-sm leading-relaxed text-ink-muted">{desc}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-6 text-xs text-ink-faint leading-relaxed">
            Risk signals include: specific numbers, statistical assertions, superlatives (e.g. "the largest", "always"),
            specific dates, and the absence of any citation context.
          </p>
        </div>
      </section>

      {/* What Verities is NOT */}
      <section className="border-b border-vellum bg-parchment/30">
        <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
          <h2 className="font-display text-2xl font-bold text-ink mb-6">What Verities is (and isn't)</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { icon: CheckCircle2, title: "It IS: A fact-checking assistant", desc: "Verities surfaces evidence, assigns verdicts, and suggests source-aligned rewrites." },
              { icon: Globe, title: "It IS: Source-grounded", desc: "All verdicts are based on retrieved web sources — AI training data is never the sole basis." },
              { icon: Shield, title: "It is NOT: A guarantee of accuracy", desc: "Always verify critical claims with primary sources. Verities assists — it does not replace your judgement." },
              { icon: Lock, title: "It is NOT: A writing monitor", desc: "Verities only runs when you explicitly click 'Check Facts'. No background monitoring or keystroke logging." },
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
      <section className="border-b border-vellum">
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
      <section className="border-b border-vellum bg-parchment/30">
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
      <section className="border-b border-vellum">
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
      <section className="border-b border-vellum bg-parchment/30">
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
      <section className="bg-navy">
        <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 text-center">
          <BookOpen className="mx-auto mb-4 h-8 w-8 text-white/60" />
          <h2 className="font-display text-xl font-bold text-white">Ready to verify your writing?</h2>
          <p className="mt-2 text-sm text-white/60">No account needed to get started.</p>
          <div className="mt-6 flex justify-center gap-3 flex-wrap">
            <Link
              to="/check"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-navy shadow-md transition-all hover:shadow-lg hover:-translate-y-0.5"
            >
              <Search className="h-4 w-4" />
              Check Facts
            </Link>
            <Link
              to="/review"
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-white/20"
            >
              <FileText className="h-4 w-4" />
              Review Document
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
