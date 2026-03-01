import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight, CheckCircle2, Search, BookOpen, Sparkles,
  Clock, FileText, TrendingUp, Shield, Zap, Quote,
} from "lucide-react";
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
    accent: "teal",
  },
  {
    icon: Shield,
    title: "Evidence-Based Verdicts",
    description: "Each claim is evaluated against ranked academic and authoritative sources.",
    accent: "blue",
  },
  {
    icon: BookOpen,
    title: "Copy-Ready Citations",
    description: "MLA, APA, and Chicago formats generated from source metadata.",
    accent: "teal",
  },
  {
    icon: Zap,
    title: "Suggested Rewrites",
    description: "Get alternative phrasing backed by evidence when claims are overstated.",
    accent: "gold",
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
    <div className="min-h-screen bg-dark-base">
      <Navbar />
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">

        {/* Welcome header */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
        >
          <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">
            Welcome back, {name}.
          </h1>
          <p className="mt-1 text-sm text-ink-muted">What would you like to check today?</p>
        </motion.div>

        {/* Quick actions */}
        <div className="grid gap-4 sm:grid-cols-2 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08, duration: 0.4, ease: "easeOut" }}
          >
            <Link
              to="/check"
              className="scholarly-card p-6 flex items-start gap-4 hover:shadow-md transition-all group block"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal/10 border border-teal/20">
                <Search className="h-5 w-5 text-teal-light" />
              </div>
              <div className="flex-1">
                <h2 className="text-sm font-semibold text-white group-hover:text-teal-light transition-colors">Check Facts</h2>
                <p className="mt-0.5 text-xs text-ink-muted">Verify claims in an essay or article with source citations</p>
              </div>
              <ArrowRight className="ml-auto h-4 w-4 text-ink-faint group-hover:text-teal-light transition-all group-hover:translate-x-0.5 self-center" />
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.14, duration: 0.4, ease: "easeOut" }}
          >
            <Link
              to="/review"
              className="scholarly-card p-6 flex items-start gap-4 hover:shadow-md transition-all group block"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/5 border border-white/10">
                <FileText className="h-5 w-5 text-ink-muted" />
              </div>
              <div className="flex-1">
                <h2 className="text-sm font-semibold text-white group-hover:text-teal-light transition-colors">Review Document</h2>
                <p className="mt-0.5 text-xs text-ink-muted">Scan an entire document for high-risk factual claims</p>
              </div>
              <ArrowRight className="ml-auto h-4 w-4 text-ink-faint group-hover:text-teal-light transition-all group-hover:translate-x-0.5 self-center" />
            </Link>
          </motion.div>
        </div>

        <div className="grid gap-6 sm:grid-cols-3">
          {/* Recent activity */}
          <motion.div
            className="sm:col-span-2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18, duration: 0.4, ease: "easeOut" }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-ink-muted" />
                <h2 className="text-sm font-semibold text-white">Recent Checks</h2>
              </div>
              <Link to="/history" className="text-xs text-teal-light hover:underline">View all</Link>
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
                    className="scholarly-card p-4 flex items-center gap-3 hover:shadow-sm transition-all group block"
                  >
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold shrink-0 ${
                      check.type === "analyze"
                        ? "bg-teal/10 text-teal-light"
                        : "bg-white/6 text-ink-muted"
                    }`}>
                      {check.type === "analyze" ? "Fact" : "Review"}
                    </span>
                    <span className="flex-1 text-xs text-ink-muted truncate group-hover:text-white transition-colors">
                      {check.input_snippet}
                    </span>
                    <span className="text-[10px] text-ink-faint shrink-0">{formatDate(check.created_at)}</span>
                  </Link>
                ))}
              </div>
            )}
          </motion.div>

          {/* Usage sidebar */}
          {usage && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.22, duration: 0.4, ease: "easeOut" }}
            >
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="h-4 w-4 text-ink-muted" />
                <h2 className="text-sm font-semibold text-white">Usage</h2>
              </div>
              <div className="scholarly-card p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-ink-muted">Plan</span>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    usage.plan_tier === "pro"
                      ? "bg-teal/15 text-teal-light border border-teal/25"
                      : "bg-white/6 text-ink-muted"
                  }`}>
                    {usage.plan_tier === "pro" ? "Pro" : "Free"}
                  </span>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-ink-muted">Fact-checks</span>
                    <span className="text-xs font-medium text-white">
                      {usage.checks_used}/{usage.checks_limit}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/6 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-teal transition-all"
                      style={{ width: `${Math.min(100, (usage.checks_used / usage.checks_limit) * 100)}%` }}
                    />
                  </div>
                </div>

                {usage.reviews_limit !== null && (
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs text-ink-muted">Reviews</span>
                      <span className="text-xs font-medium text-white">
                        {usage.reviews_used}/{usage.reviews_limit}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/6 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-teal-light transition-all"
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
                  <Link to="/pricing" className="block text-center text-xs text-teal-light hover:underline">
                    See Pro plans →
                  </Link>
                )}
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Landing() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const heroRef = useRef<HTMLElement>(null);
  const featuresRef = useRef<HTMLDivElement>(null);
  const featuresInView = useInView(featuresRef, { once: true, margin: "-80px" });

  // Mouse spotlight
  const [spotlight, setSpotlight] = useState({ x: "50%", y: "50%" });
  useEffect(() => {
    const handle = (e: MouseEvent) => {
      const rect = heroRef.current?.getBoundingClientRect();
      if (!rect) return;
      setSpotlight({
        x: `${e.clientX - rect.left}px`,
        y: `${e.clientY - rect.top}px`,
      });
    };
    window.addEventListener("mousemove", handle, { passive: true });
    return () => window.removeEventListener("mousemove", handle);
  }, []);

  if (user) {
    return <LoggedInDashboard user={user} />;
  }

  return (
    <div className="min-h-screen bg-dark-base">
      <Navbar />

      {/* ── Hero ──────────────────────────────────────────────────── */}
      <section
        ref={heroRef}
        className="aurora-bg grain-overlay relative flex flex-col items-center justify-center px-6 pt-28 pb-24 text-center"
        style={{ minHeight: "90vh" }}
      >
        {/* Mouse spotlight */}
        <div
          className="spotlight"
          style={{
            ["--spotlight-x" as string]: spotlight.x,
            ["--spotlight-y" as string]: spotlight.y,
          }}
        />

        {/* Floating ambient orbs */}
        <div
          className="pointer-events-none absolute top-1/4 left-[12%] w-[380px] h-[380px] rounded-full animate-float-orb animate-glow-pulse"
          style={{
            background: "radial-gradient(circle, rgba(13,148,136,0.12) 0%, transparent 70%)",
            filter: "blur(40px)",
          }}
        />
        <div
          className="pointer-events-none absolute bottom-1/4 right-[10%] w-[300px] h-[300px] rounded-full animate-glow-pulse"
          style={{
            background: "radial-gradient(circle, rgba(27,43,91,0.4) 0%, transparent 70%)",
            filter: "blur(50px)",
            animationDelay: "1.2s",
          }}
        />

        {/* Content — z-index above aurora overlays */}
        <div className="relative z-10 flex flex-col items-center">
          {/* Eyebrow badge */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-8 inline-flex items-center gap-2 rounded-full border border-teal/25 bg-teal/8 px-4 py-1.5 backdrop-blur-sm"
          >
            <Sparkles className="h-3 w-3 text-teal-light" />
            <span className="text-xs font-semibold text-teal-light tracking-wide uppercase">
              AI-Powered Fact Checking
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="font-display font-bold text-5xl md:text-6xl lg:text-7xl text-white leading-[1.05] tracking-tight max-w-4xl"
          >
            Verify Claims.
            <br />
            <span className="text-transparent bg-clip-text"
              style={{
                backgroundImage: "linear-gradient(90deg, #14B8A6 0%, #0D9488 50%, #F5A623 100%)",
              }}>
              Write with Confidence.
            </span>
          </motion.h1>

          {/* Subhead */}
          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.22, duration: 0.5, ease: "easeOut" }}
            className="mt-7 text-base md:text-lg text-ink-muted leading-relaxed max-w-lg"
          >
            Verities checks each factual claim in your writing against ranked,
            verifiable sources — then generates properly formatted citations.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.34, duration: 0.45, ease: "easeOut" }}
            className="mt-10 flex flex-col sm:flex-row items-center gap-3"
          >
            <button
              onClick={() => navigate("/check")}
              className="inline-flex items-center gap-2 bg-teal text-white font-semibold px-8 py-3.5 rounded-full text-base hover:bg-teal-light transition-all duration-150 shadow-xl shadow-teal/25 cursor-pointer"
            >
              Get Started Free
              <ArrowRight className="h-4 w-4" />
            </button>
            <button
              onClick={() => navigate("/about")}
              className="inline-flex items-center gap-2 border border-white/15 text-white/70 px-8 py-3.5 rounded-full text-base hover:border-teal/35 hover:text-white transition-all duration-150 cursor-pointer"
            >
              Learn More
            </button>
          </motion.div>

          {/* Trust line */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.55, duration: 0.5 }}
            className="mt-5 text-xs text-ink-faint"
          >
            No hallucinated citations. Backed by verifiable sources.
          </motion.p>
        </div>

        {/* Bottom fade */}
        <div
          className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none"
          style={{
            background: "linear-gradient(to bottom, transparent, rgba(4, 11, 24, 0.95))",
          }}
        />
      </section>

      {/* ── How it works ──────────────────────────────────────────── */}
      <section className="relative border-t border-white/6 bg-dark-surface">
        <div className="mx-auto max-w-5xl px-4 py-24 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <p className="text-xs font-bold uppercase tracking-widest text-teal-light mb-3">
              How it works
            </p>
            <h2 className="font-display text-2xl font-bold text-white sm:text-4xl">
              Three steps to verified writing
            </h2>
          </motion.div>

          <div className="grid gap-8 sm:grid-cols-3 relative">
            {/* Connector line */}
            <div className="absolute top-6 left-[20%] right-[20%] h-px hidden sm:block"
              style={{ background: "linear-gradient(90deg, transparent, rgba(13,148,136,0.3), transparent)" }}
            />

            {steps.map((step, i) => {
              const Icon = step.icon;
              return (
                <motion.div
                  key={step.n}
                  className="text-center group"
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.12, duration: 0.45, ease: "easeOut" }}
                >
                  <div className="relative mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full border border-teal/25 bg-dark-elevated shadow-lg shadow-black/30 z-10 group-hover:border-teal/50 group-hover:shadow-teal/10 transition-all duration-300">
                    <Icon className="h-5 w-5 text-teal-light" />
                  </div>
                  <div className="text-xs font-bold uppercase tracking-widest text-teal/50 mb-2">
                    Step {step.n}
                  </div>
                  <h3 className="text-base font-semibold text-white mb-2">{step.title}</h3>
                  <p className="text-sm leading-relaxed text-ink-muted">{step.description}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Features ──────────────────────────────────────────────── */}
      <section className="border-t border-white/6" ref={featuresRef}>
        <div className="mx-auto max-w-5xl px-4 py-24 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <p className="text-xs font-bold uppercase tracking-widest text-teal-light mb-3">
              What you get
            </p>
            <h2 className="font-display text-2xl font-bold text-white sm:text-4xl">
              Built for careful writing
            </h2>
          </motion.div>

          <div className="grid gap-4 sm:grid-cols-2">
            {features.map((feature, i) => {
              const Icon = feature.icon;
              const accentColor =
                feature.accent === "teal" ? "rgba(13,148,136,0.12)" :
                feature.accent === "gold" ? "rgba(245,166,35,0.10)" :
                "rgba(27,43,91,0.3)";
              const textColor =
                feature.accent === "teal" ? "#14B8A6" :
                feature.accent === "gold" ? "#F5A623" :
                "#7C8FAA";

              return (
                <motion.div
                  key={feature.title}
                  className="glass-card p-6 flex gap-4 cursor-default"
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.09, duration: 0.45, ease: "easeOut" }}
                  whileHover={{ y: -3 }}
                >
                  <div
                    className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border"
                    style={{
                      background: accentColor,
                      borderColor: accentColor.replace("0.12", "0.25").replace("0.10", "0.22").replace("0.3", "0.45"),
                    }}
                  >
                    <Icon className="h-4.5 w-4.5" style={{ color: textColor }} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white mb-1">{feature.title}</h3>
                    <p className="text-sm leading-relaxed text-ink-muted">{feature.description}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Quote / Trust Band ─────────────────────────────────────── */}
      <section className="border-t border-white/6 bg-dark-surface">
        <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <Quote className="mx-auto mb-5 h-8 w-8 text-teal/35" />
            <p className="font-display text-xl md:text-2xl font-medium text-white/85 leading-relaxed">
              "Great writing doesn't just argue persuasively —
              <br className="hidden md:block" />
              it cites the evidence that makes it true."
            </p>
            <p className="mt-4 text-sm text-ink-faint">The Verities principle</p>
          </motion.div>
        </div>
      </section>

      {/* ── CTA Band ──────────────────────────────────────────────── */}
      <section
        className="relative border-t border-white/6 overflow-hidden"
        style={{ background: "linear-gradient(135deg, #040B18 0%, #0C1530 50%, #040B18 100%)" }}
      >
        {/* Ambient glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "radial-gradient(ellipse 60% 80% at 50% 50%, rgba(13,148,136,0.08) 0%, transparent 70%)",
          }}
        />
        <div className="relative mx-auto max-w-3xl px-4 py-20 sm:px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="font-display text-2xl font-bold text-white sm:text-4xl mb-4">
              Start writing with confidence
            </h2>
            <p className="text-white/50 text-sm leading-relaxed mb-10">
              Free to use. No account required to check your first claims.
            </p>
            <button
              onClick={() => navigate("/check")}
              className="inline-flex items-center gap-2 bg-teal text-white font-semibold px-10 py-4 rounded-full text-base hover:bg-teal-light transition-all shadow-2xl shadow-teal/25 cursor-pointer"
            >
              Check Facts Now
              <ArrowRight className="h-4 w-4" />
            </button>
          </motion.div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────── */}
      <footer
        className="border-t"
        style={{ borderColor: "rgba(255,255,255,0.06)", background: "#030912" }}
      >
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-teal/15 border border-teal/20">
                <span className="text-teal-light font-serif text-sm leading-none select-none">"</span>
              </div>
              <span className="text-sm font-semibold text-white/70">Verities</span>
            </div>
            <div className="flex items-center gap-6">
              <Link to="/about" className="text-xs text-white/30 hover:text-white/60 transition-colors">About</Link>
              <Link to="/check" className="text-xs text-white/30 hover:text-white/60 transition-colors">Check Facts</Link>
              <Link to="/review" className="text-xs text-white/30 hover:text-white/60 transition-colors">Review Document</Link>
              <Link to="/pricing" className="text-xs text-white/30 hover:text-white/60 transition-colors">Pricing</Link>
            </div>
            <p className="text-xs text-white/20">© {new Date().getFullYear()} Verities</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
