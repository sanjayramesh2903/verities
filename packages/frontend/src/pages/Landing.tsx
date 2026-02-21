import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2, Search, BookOpen, Sparkles, Shield } from "lucide-react";
import Navbar from "../components/Navbar";

const stats = [
  { value: "100%", label: "Claims checked" },
  { value: "MLA · APA · Chicago", label: "Citation formats" },
  { value: "Real-time", label: "Verification" },
];

const steps = [
  {
    n: "01",
    icon: Search,
    title: "Paste your text",
    description: "Drop in your essay, article, or report — up to 5,000 characters.",
  },
  {
    n: "02",
    icon: CheckCircle2,
    title: "Get verdicts",
    description: "Each factual claim is checked against ranked, real-world sources.",
  },
  {
    n: "03",
    icon: BookOpen,
    title: "Cite sources",
    description: "Copy MLA, APA, or Chicago citations directly into your work.",
  },
];

const features = [
  {
    icon: Search,
    title: "Claim Extraction",
    description: "AI identifies discrete factual assertions in your writing automatically.",
  },
  {
    icon: CheckCircle2,
    title: "Evidence-Based Verdicts",
    description: "Each claim is evaluated against ranked sources — never from AI memory alone.",
  },
  {
    icon: BookOpen,
    title: "Copy-Ready Citations",
    description: "MLA, APA, and Chicago formats generated from source metadata.",
  },
  {
    icon: Sparkles,
    title: "Suggested Rewrites",
    description: "Get alternative phrasing backed by evidence when claims are overstated.",
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-white">
        {/* Subtle dot grid */}
        <div className="absolute inset-0 dot-grid opacity-20 pointer-events-none" />

        {/* Bottom fade */}
        <div
          className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none"
          style={{ background: "linear-gradient(to bottom, transparent, white)" }}
        />

        <div className="relative mx-auto max-w-4xl px-4 pt-24 pb-20 text-center sm:px-6">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-navy/10 bg-navy-wash px-4 py-1.5 mb-8">
            <Shield className="h-3.5 w-3.5 text-navy" />
            <span className="text-xs font-semibold text-navy tracking-wide uppercase">AI-Powered Fact Checking</span>
          </div>

          {/* Heading */}
          <h1
            className="font-display font-bold leading-tight text-navy animate-rise"
            style={{ fontSize: "clamp(2.5rem, 6vw, 4rem)" }}
          >
            Verify Claims Instantly.
            <br />
            Write Smarter.{" "}
            <em
              style={{
                fontStyle: "italic",
                fontWeight: 300,
                letterSpacing: "-0.01em",
              }}
            >
              With AI.
            </em>
          </h1>

          {/* Sub-heading */}
          <p
            className="mt-7 mx-auto max-w-lg text-[1.05rem] leading-relaxed text-ink-muted animate-rise"
            style={{ animationDelay: "80ms" }}
          >
            Verities checks factual claims as you write,
            {" "}suggests reliable sources,
            <br className="hidden sm:block" />
            and inserts properly formatted citations
            {" "}— all without leaving your document.
          </p>

          {/* CTAs */}
          <div
            className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center animate-rise"
            style={{ animationDelay: "160ms" }}
          >
            <Link
              to="/check"
              className="inline-flex items-center gap-2 rounded-2xl bg-navy px-8 py-3.5 text-[0.95rem] font-semibold text-white shadow-lg transition-all hover:bg-navy-light hover:shadow-xl hover:-translate-y-0.5"
            >
              Get Started
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/review"
              className="inline-flex items-center gap-2 rounded-2xl border border-vellum bg-white px-8 py-3.5 text-[0.95rem] font-semibold text-ink transition-all hover:border-stone hover:shadow-md hover:-translate-y-0.5"
            >
              Review a Document
            </Link>
          </div>

          {/* Disclaimer */}
          <p
            className="mt-6 text-[0.8rem] italic text-ink-muted animate-fade-in"
            style={{ animationDelay: "240ms" }}
          >
            Backed by verifiable sources — no hallucinated citations.
          </p>

          {/* Stats row */}
          <div
            className="mt-12 flex flex-wrap justify-center gap-4 animate-fade-in"
            style={{ animationDelay: "320ms" }}
          >
            {stats.map((s) => (
              <div
                key={s.label}
                className="rounded-2xl border border-vellum bg-white/80 px-5 py-3 text-center shadow-sm"
              >
                <div className="text-base font-bold text-navy">{s.value}</div>
                <div className="text-xs text-ink-faint mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────── */}
      <section className="border-t border-vellum bg-parchment/40">
        <div className="mx-auto max-w-5xl px-4 py-20 sm:px-6">
          <p className="text-center text-xs font-bold uppercase tracking-widest text-ink-faint mb-3">
            How it works
          </p>
          <h2 className="text-center font-display text-2xl font-bold text-navy sm:text-3xl">
            Three steps to verified writing
          </h2>

          <div className="mt-12 grid gap-8 sm:grid-cols-3 relative">
            {/* Connector line (desktop only) */}
            <div className="absolute top-6 left-[20%] right-[20%] h-px bg-vellum hidden sm:block" />

            {steps.map((step, i) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.n}
                  className="text-center animate-slide-up"
                  style={{ animationDelay: `${i * 100}ms` }}
                >
                  <div className="relative mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full border-2 border-vellum bg-white shadow-sm z-10">
                    <Icon className="h-5 w-5 text-navy" />
                  </div>
                  <div className="text-xs font-bold uppercase tracking-widest text-ink-faint mb-1">
                    Step {step.n}
                  </div>
                  <h3 className="text-base font-semibold text-ink">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-muted">{step.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────── */}
      <section className="border-t border-vellum">
        <div className="mx-auto max-w-5xl px-4 py-20 sm:px-6">
          <p className="text-center text-xs font-bold uppercase tracking-widest text-ink-faint mb-3">
            What you get
          </p>
          <h2 className="text-center font-display text-2xl font-bold text-navy sm:text-3xl">
            Built for careful writing
          </h2>
          <div className="mt-12 grid gap-5 sm:grid-cols-2">
            {features.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="scholarly-card p-6 flex gap-4 animate-slide-up"
                  style={{ animationDelay: `${i * 70}ms` }}
                >
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-navy-wash">
                    <Icon className="h-5 w-5 text-navy" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-navy">{feature.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-ink-muted">{feature.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── CTA Band ─────────────────────────────────────────────── */}
      <section className="border-t border-vellum bg-navy">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 text-center">
          <h2 className="font-display text-2xl font-bold text-white sm:text-3xl">
            Start writing with confidence
          </h2>
          <p className="mt-3 text-white/60 text-sm leading-relaxed">
            Free to use. No account required to check your first claims.
          </p>
          <Link
            to="/check"
            className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-white px-8 py-3.5 text-sm font-semibold text-navy shadow-lg transition-all hover:shadow-xl hover:-translate-y-0.5"
          >
            Check Facts Now
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────── */}
      <footer className="border-t border-navy-mid bg-navy">
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
            <div className="flex items-center gap-2">
              <span className="font-serif text-white/60 text-lg leading-none select-none">"</span>
              <span className="text-sm font-semibold text-white">Verities</span>
            </div>
            <div className="flex items-center gap-6">
              <Link to="/about" className="text-xs text-white/40 hover:text-white/70 transition-colors">About</Link>
              <Link to="/check" className="text-xs text-white/40 hover:text-white/70 transition-colors">Check Facts</Link>
              <Link to="/review" className="text-xs text-white/40 hover:text-white/70 transition-colors">Review Document</Link>
            </div>
            <p className="text-xs text-white/25">© {new Date().getFullYear()} Verities</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
