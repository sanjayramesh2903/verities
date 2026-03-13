import { useState } from "react";
import { Link } from "react-router-dom";
import { Check, ChevronDown, ChevronUp, Zap } from "lucide-react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

const FREE_FEATURES = [
  "5 fact-checks / month",
  "3 document reviews / month",
  "Check history (30 days)",
  "Concept graph visualization",
];

const PRO_FEATURES = [
  "100 fact-checks / month",
  "Unlimited document reviews",
  "Check history (90 days)",
  "Concept graph visualization",
  "Shareable report links",
  "Priority support",
];

const FAQS: { q: string; a: string }[] = [
  {
    q: "What counts as a fact-check?",
    a: "Each submission to the Check Facts page counts as one fact-check against your monthly quota.",
  },
  {
    q: "When does my usage reset?",
    a: "Your usage resets on the 1st of each calendar month.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes — you can cancel your Pro subscription at any time from your Profile page. You'll retain Pro access until the end of the current billing period.",
  },
  {
    q: "Is there a free trial?",
    a: "The free tier is always available with no time limit. You can use Verities for free indefinitely.",
  },
];

export default function Pricing() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-ivory flex flex-col">
      <Navbar />

      {/* Hero */}
      <section className="pt-16 pb-10 text-center px-4 animate-rise">
        <h1 className="font-display text-4xl font-bold text-ink sm:text-5xl mb-4">
          Simple, transparent pricing
        </h1>
        <p className="text-lg text-ink-muted max-w-xl mx-auto">
          Start for free. Upgrade when you need more.
        </p>
      </section>

      {/* Plan cards */}
      <section className="mx-auto max-w-4xl px-4 pb-12 sm:px-6 w-full">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 animate-slide-up">

          {/* Free card */}
          <div className="scholarly-card p-8 flex flex-col">
            <div className="mb-6">
              <h2 className="font-display text-2xl font-bold text-ink mb-1">Free</h2>
              <div className="flex items-baseline gap-1 mt-3">
                <span className="font-display text-4xl font-bold text-ink">$0</span>
                <span className="text-ink-muted text-sm">/ month</span>
              </div>
              <p className="text-sm text-ink-faint mt-2">No credit card required</p>
            </div>

            <ul className="space-y-3 mb-8 flex-1">
              {FREE_FEATURES.map((feat) => (
                <li key={feat} className="flex items-start gap-2.5 text-sm text-ink-muted">
                  <Check className="h-4 w-4 text-cerulean mt-0.5 flex-shrink-0" />
                  {feat}
                </li>
              ))}
            </ul>

            <Link
              to="/check"
              className="block w-full rounded-xl border-2 border-cerulean px-5 py-3 text-center text-sm font-semibold text-cerulean transition-all hover:bg-cerulean hover:text-white"
            >
              Get Started Free
            </Link>
          </div>

          {/* Pro card */}
          <div className="relative rounded-2xl bg-navy p-8 flex flex-col shadow-xl shadow-navy/30">
            {/* Most Popular badge */}
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-cerulean px-4 py-1 text-xs font-bold text-white shadow-md shadow-cerulean/30">
                <Zap className="h-3 w-3" />
                Most Popular
              </span>
            </div>

            <div className="mb-6 mt-2">
              <h2 className="font-display text-2xl font-bold text-white mb-1">Pro</h2>
              <div className="flex items-baseline gap-1 mt-3">
                <span className="font-display text-4xl font-bold text-white">$12</span>
                <span className="text-white/60 text-sm">/ month</span>
              </div>
              <p className="text-sm text-white/50 mt-2">Billed monthly, cancel anytime</p>
            </div>

            <ul className="space-y-3 mb-8 flex-1">
              {PRO_FEATURES.map((feat) => (
                <li key={feat} className="flex items-start gap-2.5 text-sm text-white/80">
                  <Check className="h-4 w-4 text-cerulean mt-0.5 flex-shrink-0" />
                  {feat}
                </li>
              ))}
            </ul>

            <a
              href="mailto:hello@verities.app?subject=Upgrade%20to%20Pro"
              className="w-full rounded-xl bg-cerulean px-5 py-3 text-sm font-semibold text-white shadow-md shadow-cerulean/30 transition-all hover:bg-cerulean-light inline-flex items-center justify-center gap-2 text-center"
            >
              Upgrade to Pro
            </a>
          </div>
        </div>

        {/* Academic discount note */}
        <p className="text-center text-sm text-ink-faint mt-6">
          Academic discount available —{" "}
          <a href="mailto:hello@verities.app?subject=Academic%20Discount" className="text-navy underline-offset-2 hover:underline">
            contact us
          </a>{" "}
          at hello@verities.app
        </p>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-2xl px-4 pb-20 sm:px-6 w-full">
        <h2 className="font-display text-2xl font-bold text-ink text-center mb-8 animate-rise">
          Frequently Asked Questions
        </h2>

        <div className="space-y-3 animate-slide-up">
          {FAQS.map((faq, i) => (
            <div
              key={i}
              className="scholarly-card overflow-hidden"
            >
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="flex w-full items-center justify-between p-5 text-left"
              >
                <span className="text-sm font-semibold text-ink">{faq.q}</span>
                {openFaq === i ? (
                  <ChevronUp className="h-4 w-4 text-ink-faint flex-shrink-0" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-ink-faint flex-shrink-0" />
                )}
              </button>
              {openFaq === i && (
                <div className="border-t border-vellum px-5 pb-5 pt-3">
                  <p className="text-sm text-ink-muted leading-relaxed">{faq.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <div className="mt-auto">
        <Footer />
      </div>
    </div>
  );
}
