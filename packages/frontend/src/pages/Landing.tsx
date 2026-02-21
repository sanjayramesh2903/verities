import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";

export default function Landing() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Hero */}
      <section className="flex flex-col items-center justify-center px-4 pt-24 pb-20 text-center">
        <h1
          className="max-w-3xl font-display font-bold leading-tight text-navy"
          style={{ fontSize: "clamp(2.4rem, 5.5vw, 3.75rem)" }}
        >
          Verify Claims Instantly.{" "}
          <br className="hidden sm:block" />
          Write Smarter.{" "}
          <em
            className="not-italic"
            style={{
              fontFamily: "Newsreader, Georgia, serif",
              fontStyle: "italic",
              fontWeight: 400,
            }}
          >
            With AI.
          </em>
        </h1>

        <p className="mt-6 max-w-lg text-base leading-relaxed text-ink-muted sm:text-[1.05rem]">
          Verities checks factual claims as you write,
          <br />
          suggests reliable sources,
          <br />
          and inserts properly formatted citations
          <br />
          — all without leaving your document.
        </p>

        <Link
          to="/check"
          className="mt-10 inline-flex items-center justify-center rounded-2xl bg-navy px-10 py-3.5 text-[0.95rem] font-semibold text-white transition-all hover:bg-navy-light hover:shadow-lg"
        >
          Get Started
        </Link>

        <p className="mt-5 text-[0.8rem] italic text-ink-muted">
          Backed by verifiable sources — no hallucinated citations.
        </p>
      </section>

      {/* How it works */}
      <section className="border-t border-vellum bg-parchment/40">
        <div className="mx-auto max-w-5xl px-4 py-20 sm:px-6">
          <h2 className="text-center font-display text-2xl font-bold text-navy sm:text-3xl">
            How it works
          </h2>
          <div className="mt-12 grid gap-8 sm:grid-cols-3">
            {[
              {
                step: "01",
                title: "Paste your text",
                description: "Drop in your essay, article, or report — up to 5,000 characters.",
              },
              {
                step: "02",
                title: "Get verdicts",
                description: "Each factual claim is checked against ranked, real-world sources.",
              },
              {
                step: "03",
                title: "Cite sources",
                description: "Copy MLA, APA, or Chicago citations directly into your work.",
              },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-navy-wash font-display text-sm font-bold text-navy">
                  {item.step}
                </div>
                <h3 className="text-base font-semibold text-ink">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-muted">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-vellum">
        <div className="mx-auto max-w-5xl px-4 py-20 sm:px-6">
          <h2 className="text-center font-display text-2xl font-bold text-navy sm:text-3xl">
            Built for careful writing
          </h2>
          <div className="mt-12 grid gap-6 sm:grid-cols-2">
            {[
              {
                title: "Claim Extraction",
                description: "AI identifies discrete factual assertions in your writing automatically.",
              },
              {
                title: "Evidence-Based Verdicts",
                description: "Each claim is evaluated against ranked sources — never from AI memory alone.",
              },
              {
                title: "Copy-Ready Citations",
                description: "MLA, APA, and Chicago formats generated from source metadata.",
              },
              {
                title: "Suggested Rewrites",
                description: "Get alternative phrasing backed by evidence when claims are overstated.",
              },
            ].map((feature) => (
              <div key={feature.title} className="scholarly-card p-6">
                <h3 className="text-base font-semibold text-navy">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-muted">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-vellum bg-navy">
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
            <div className="flex items-center gap-2">
              <span className="font-serif text-lg text-white/80 leading-none">"</span>
              <span className="text-sm font-semibold text-white">Verities</span>
            </div>
            <div className="flex items-center gap-6">
              <Link to="/about" className="text-xs text-white/50 hover:text-white/80 transition-colors">
                About
              </Link>
              <Link to="/check" className="text-xs text-white/50 hover:text-white/80 transition-colors">
                Check Facts
              </Link>
              <Link to="/review" className="text-xs text-white/50 hover:text-white/80 transition-colors">
                Review Document
              </Link>
            </div>
            <p className="text-xs text-white/30">
              © {new Date().getFullYear()} Verities
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
