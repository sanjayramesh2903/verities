import { Link } from "react-router-dom";
import { Search, FileText, BookOpen, ArrowRight, CheckCircle2, Quote, Sparkles, Shield } from "lucide-react";
import Navbar from "../components/Navbar";

const steps = [
  {
    icon: Quote,
    title: "Paste your text",
    description: "Drop in your essay, article, or report — up to 5,000 characters.",
  },
  {
    icon: Search,
    title: "Get verdicts",
    description: "Each factual claim is checked against ranked, real-world sources.",
  },
  {
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
    <div className="min-h-screen bg-ivory">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 dot-grid opacity-40" />
        <div className="relative mx-auto max-w-5xl px-4 pb-20 pt-24 sm:px-6 text-center">
          <div className="animate-rise">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-cerulean shadow-lg shadow-cerulean/20">
              <Shield className="h-8 w-8 text-white" />
            </div>
            <h1 className="font-display text-4xl font-bold leading-tight text-ink sm:text-5xl lg:text-6xl">
              Verify the facts<br />
              <span className="text-cerulean">in your writing</span>
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-ink-muted">
              Paste your text. Verities extracts each factual claim, checks it against
              ranked sources, and gives you verdicts, citations, and suggested rewrites.
            </p>
          </div>

          <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center animate-rise delay-150">
            <Link
              to="/check"
              className="inline-flex items-center gap-2 rounded-xl bg-cerulean px-6 py-3 text-sm font-semibold text-white shadow-md shadow-cerulean/20 transition-all hover:bg-cerulean-light hover:shadow-lg hover:shadow-cerulean/30"
            >
              <Search className="h-4 w-4" />
              Check Facts
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/review"
              className="inline-flex items-center gap-2 rounded-xl border border-vellum bg-white px-6 py-3 text-sm font-semibold text-ink transition-all hover:border-stone hover:shadow-md"
            >
              <FileText className="h-4 w-4" />
              Review Document
            </Link>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-vellum bg-parchment/50">
        <div className="mx-auto max-w-5xl px-4 py-20 sm:px-6">
          <h2 className="text-center font-display text-2xl font-bold text-ink sm:text-3xl">
            How it works
          </h2>
          <div className="mt-12 grid gap-8 sm:grid-cols-3">
            {steps.map((step, i) => {
              const Icon = step.icon;
              return (
                <div key={i} className="text-center animate-slide-up" style={{ animationDelay: `${i * 120}ms` }}>
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-cerulean-wash">
                    <Icon className="h-6 w-6 text-cerulean" />
                  </div>
                  <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-ink-faint">
                    Step {i + 1}
                  </div>
                  <h3 className="text-base font-semibold text-ink">{step.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{step.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-vellum">
        <div className="mx-auto max-w-5xl px-4 py-20 sm:px-6">
          <h2 className="text-center font-display text-2xl font-bold text-ink sm:text-3xl">
            Built for careful writing
          </h2>
          <div className="mt-12 grid gap-6 sm:grid-cols-2">
            {features.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <div key={i} className="scholarly-card p-6 animate-slide-up" style={{ animationDelay: `${i * 80}ms` }}>
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-cerulean-wash">
                    <Icon className="h-5 w-5 text-cerulean" />
                  </div>
                  <h3 className="text-base font-semibold text-ink">{feature.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Disclaimer */}
      <section className="border-t border-vellum bg-parchment/50">
        <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 text-center">
          <p className="text-sm leading-relaxed text-ink-faint">
            Verities helps you check — it does not guarantee accuracy. Always consult
            primary sources and use your own judgement for important claims.
          </p>
        </div>
      </section>
    </div>
  );
}
