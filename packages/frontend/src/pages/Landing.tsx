import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, CheckCircle2, Search, BookOpen, Sparkles, Clock, FileText, TrendingUp } from "lucide-react";
import { motion, useInView } from "framer-motion";
import { useAuth } from "../contexts/AuthContext";
import { getHistory, getUsage } from "../lib/api";

interface CheckSummary {
  id: string;
  type: "analyze" | "review";
  input_snippet: string;
  created_at: string;
}

interface UsageData {
  plan_tier: "free" | "pro";
  checks_used: number;
  checks_limit: number;
  reviews_used: number;
  reviews_limit: number | null;
}
import Navbar from "../components/Navbar";

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

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function LoggedInDashboard({ user }: { user: { displayName: string | null; email: string } }) {
  const [recentChecks, setRecentChecks] = useState<CheckSummary[]>([]);
  const [usage, setUsage] = useState<UsageData | null>(null);

  useEffect(() => {
    getHistory(3, 0).then((res) => setRecentChecks(res.checks as CheckSummary[])).catch(() => {});
    getUsage().then((data) => setUsage(data as UsageData)).catch(() => {});
  }, []);

  const name = user.displayName ?? user.email.split("@")[0];
  const checksRemaining = usage && usage.plan_tier === "free"
    ? Math.max(0, usage.checks_limit - usage.checks_used)
    : null;

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">

        {/* Welcome header */}
        <div className="mb-8 animate-rise">
          <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">
            Welcome back, {name}.
          </h1>
          <p className="mt-1 text-sm text-ink-muted">What would you like to check today?</p>
        </div>

        {/* Quick actions */}
        <div className="grid gap-4 sm:grid-cols-2 mb-8">
          <Link
            to="/check"
            className="scholarly-card p-6 flex items-start gap-4 hover:shadow-md transition-shadow group animate-rise"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-navy/8">
              <Search className="h-5 w-5 text-navy" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-ink group-hover:text-navy transition-colors">Check Facts</h2>
              <p className="mt-0.5 text-xs text-ink-muted">Verify claims in an essay or article with source citations</p>
            </div>
            <ArrowRight className="ml-auto h-4 w-4 text-ink-faint group-hover:text-navy transition-colors self-center" />
          </Link>

          <Link
            to="/review"
            className="scholarly-card p-6 flex items-start gap-4 hover:shadow-md transition-shadow group animate-rise delay-75"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-2">
              <FileText className="h-5 w-5 text-ink-muted" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-ink group-hover:text-navy transition-colors">Review Document</h2>
              <p className="mt-0.5 text-xs text-ink-muted">Scan an entire document for high-risk factual claims</p>
            </div>
            <ArrowRight className="ml-auto h-4 w-4 text-ink-faint group-hover:text-navy transition-colors self-center" />
          </Link>
        </div>

        <div className="grid gap-6 sm:grid-cols-3">
          {/* Recent activity */}
          <div className="sm:col-span-2 animate-rise delay-100">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-ink-muted" />
                <h2 className="text-sm font-semibold text-ink">Recent Checks</h2>
              </div>
              <Link to="/history" className="text-xs text-navy hover:underline">View all</Link>
            </div>

            {recentChecks.length === 0 ? (
              <div className="scholarly-card p-6 text-center">
                <p className="text-sm text-ink-muted">No checks yet — start by checking your first text above.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentChecks.map((check) => (
                  <Link
                    key={check.id}
                    to={`/history/${check.id}`}
                    className="scholarly-card p-4 flex items-center gap-3 hover:shadow-sm transition-shadow group"
                  >
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold shrink-0 ${
                      check.type === "analyze"
                        ? "bg-navy/8 text-navy"
                        : "bg-surface-2 text-ink-muted"
                    }`}>
                      {check.type === "analyze" ? "Fact" : "Review"}
                    </span>
                    <span className="flex-1 text-xs text-ink truncate group-hover:text-navy transition-colors">
                      {check.input_snippet}
                    </span>
                    <span className="text-[10px] text-ink-faint shrink-0">{formatDate(check.created_at)}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Usage sidebar */}
          {usage && (
            <div className="animate-rise delay-150">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="h-4 w-4 text-ink-muted" />
                <h2 className="text-sm font-semibold text-ink">Usage</h2>
              </div>
              <div className="scholarly-card p-4 space-y-4">
                {/* Plan badge */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-ink-muted">Plan</span>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    usage.plan_tier === "pro"
                      ? "bg-navy text-white"
                      : "bg-surface-2 text-ink-muted"
                  }`}>
                    {usage.plan_tier === "pro" ? "Pro" : "Free"}
                  </span>
                </div>

                {/* Checks progress */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-ink-muted">Fact-checks</span>
                    <span className="text-xs font-medium text-ink">
                      {usage.checks_used}/{usage.checks_limit}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-surface-2 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-navy transition-all"
                      style={{ width: `${Math.min(100, (usage.checks_used / usage.checks_limit) * 100)}%` }}
                    />
                  </div>
                </div>

                {/* Reviews progress (free only) */}
                {usage.reviews_limit !== null && (
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs text-ink-muted">Reviews</span>
                      <span className="text-xs font-medium text-ink">
                        {usage.reviews_used}/{usage.reviews_limit}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-surface-2 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-teal transition-all"
                        style={{ width: `${Math.min(100, (usage.reviews_used / usage.reviews_limit) * 100)}%` }}
                      />
                    </div>
                  </div>
                )}

                {usage.plan_tier === "free" && checksRemaining === 0 && (
                  <Link
                    to="/pricing"
                    className="btn-gold block w-full text-center text-xs py-2 px-3 rounded-lg"
                  >
                    Upgrade to Pro
                  </Link>
                )}
                {usage.plan_tier === "free" && checksRemaining !== null && checksRemaining > 0 && (
                  <Link
                    to="/pricing"
                    className="block text-center text-xs text-navy hover:underline"
                  >
                    See Pro plans →
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Landing() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const featuresRef = useRef<HTMLDivElement>(null);
  const featuresInView = useInView(featuresRef, { once: true, margin: "-80px" });

  if (user) {
    return <LoggedInDashboard user={user} />;
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section className="hero-gradient text-white py-28 px-6 text-center relative overflow-hidden min-h-[520px] flex flex-col items-center justify-center">
        {/* Background orbs */}
        <motion.div
          className="absolute top-1/3 left-1/4 w-80 h-80 rounded-full bg-teal/10 blur-3xl pointer-events-none"
          animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full bg-gold/10 blur-3xl pointer-events-none"
          animate={{ scale: [1.1, 1, 1.1], opacity: [0.2, 0.4, 0.2] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />

        <motion.h1
          className="text-5xl md:text-6xl font-bold mb-5 relative z-10 leading-tight"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: "easeOut" }}
        >
          Verify Claims Instantly.<br />
          <span className="text-gold">Write Smarter.</span>
        </motion.h1>

        <motion.p
          className="text-lg md:text-xl text-white/80 mb-10 max-w-2xl mx-auto relative z-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.45 }}
        >
          AI fact-checking with real sources, citation generation, and evidence-backed rewrites — in seconds.
        </motion.p>

        <motion.div
          className="flex flex-wrap gap-4 justify-center relative z-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.28, duration: 0.4 }}
        >
          <button onClick={() => navigate("/check")} className="btn-gold text-base px-8 py-3 text-lg">
            Get Started Free
          </button>
          <button
            onClick={() => navigate("/review")}
            className="border-2 border-white text-white font-semibold px-8 py-3 rounded-lg hover:bg-white hover:text-navy transition-colors duration-150 text-lg cursor-pointer"
          >
            Review a Document
          </button>
        </motion.div>
      </section>

      {/* ── How it works ─────────────────────────────────────────── */}
      <section className="border-t border-border bg-surface">
        <div className="mx-auto max-w-5xl px-4 py-20 sm:px-6">
          <p className="text-center text-xs font-bold uppercase tracking-widest text-ink-faint mb-3">
            How it works
          </p>
          <h2 className="text-center font-display text-2xl font-bold text-navy sm:text-3xl">
            Three steps to verified writing
          </h2>

          <div className="mt-12 grid gap-8 sm:grid-cols-3 relative">
            {/* Connector line (desktop only) */}
            <div className="absolute top-6 left-[20%] right-[20%] h-px bg-border hidden sm:block" />

            {steps.map((step, i) => {
              const Icon = step.icon;
              return (
                <motion.div
                  key={step.n}
                  className="text-center"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, duration: 0.4, ease: "easeOut" }}
                >
                  <div className="relative mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full border-2 border-border bg-white shadow-sm z-10">
                    <Icon className="h-5 w-5 text-navy" />
                  </div>
                  <div className="text-xs font-bold uppercase tracking-widest text-ink-faint mb-1">
                    Step {step.n}
                  </div>
                  <h3 className="text-base font-semibold text-ink">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-muted">{step.description}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────── */}
      <section className="border-t border-border" ref={featuresRef}>
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
                <motion.div
                  key={feature.title}
                  className="scholarly-card p-6 flex gap-4"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, duration: 0.4, ease: "easeOut" }}
                >
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-navy/8">
                    <Icon className="h-5 w-5 text-navy" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-navy">{feature.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-ink-muted">{feature.description}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── CTA Band ─────────────────────────────────────────────── */}
      <section className="border-t border-border bg-navy">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 text-center">
          <h2 className="font-display text-2xl font-bold text-white sm:text-3xl">
            Start writing with confidence
          </h2>
          <p className="mt-3 text-white/60 text-sm leading-relaxed">
            Free to use. No account required to check your first claims.
          </p>
          <button
            onClick={() => navigate("/check")}
            className="mt-8 btn-gold inline-flex items-center gap-2 rounded-2xl px-8 py-3.5 text-sm"
          >
            Check Facts Now
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────── */}
      <footer className="border-t border-navy-dark bg-navy">
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
              <Link to="/pricing" className="text-xs text-white/40 hover:text-white/70 transition-colors">Pricing</Link>
            </div>
            <p className="text-xs text-white/25">© {new Date().getFullYear()} Verities</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
