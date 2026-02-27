import { useState } from "react";
import { X, Check, Zap } from "lucide-react";
// Billing coming soon — createCheckoutSession not yet implemented

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
}

const FREE_FEATURES = [
  "5 fact-checks / month",
  "3 document reviews / month",
  "Check history",
  "Concept graph",
];

const PRO_FEATURES = [
  "100 fact-checks / month",
  "Unlimited document reviews",
  "Shareable report links",
  "Priority support",
];

export default function UpgradeModal({ open, onClose }: UpgradeModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  function handleUpgrade() {
    setError(null);
    window.alert("Billing coming soon. Contact hello@verities.app to upgrade.");
  }

  return (
    <div
      className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center p-4"
      aria-modal="true"
      role="dialog"
      aria-labelledby="upgrade-modal-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-navy/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Card */}
      <div className="scholarly-card relative w-full max-w-lg animate-rise overflow-hidden">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-ink-faint transition-colors hover:bg-parchment hover:text-ink"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header */}
        <div className="px-6 pb-4 pt-6">
          <div className="mb-1 flex items-center gap-2">
            <Zap className="h-5 w-5 text-cerulean" />
            <span className="text-xs font-semibold uppercase tracking-wider text-cerulean">
              Upgrade
            </span>
          </div>
          <h2
            id="upgrade-modal-title"
            className="font-display text-xl font-bold text-ink"
          >
            You've reached your free tier limit
          </h2>
          <p className="mt-1 text-sm text-ink-muted">
            Upgrade to Pro to keep fact-checking without interruption.
          </p>
        </div>

        {/* Feature comparison */}
        <div className="grid grid-cols-2 gap-px bg-vellum mx-6 mb-6 rounded-xl overflow-hidden border border-vellum">
          {/* Free column */}
          <div className="bg-ivory p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink-faint">
              Free
            </p>
            <ul className="space-y-2">
              {FREE_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-ink-muted">
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-faint" />
                  {f}
                </li>
              ))}
            </ul>
          </div>

          {/* Pro column */}
          <div className="bg-navy/5 p-4">
            <div className="mb-3 flex items-center gap-1.5">
              <p className="text-xs font-semibold uppercase tracking-wider text-cerulean">
                Pro
              </p>
              <span className="rounded-full bg-cerulean px-2 py-0.5 text-[10px] font-semibold text-white">
                $12/mo
              </span>
            </div>
            <ul className="space-y-2">
              {PRO_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-ink">
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cerulean" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mx-6 mb-4 rounded-xl border border-terracotta-border bg-terracotta-wash p-3 text-sm text-terracotta">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-2 px-6 pb-6 sm:flex-row-reverse">
          <button
            onClick={handleUpgrade}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-cerulean px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-cerulean/20 transition-all hover:bg-cerulean-light disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Redirecting…
              </>
            ) : (
              <>
                <Zap className="h-4 w-4" />
                Upgrade to Pro — $12/month
              </>
            )}
          </button>
          <button
            onClick={onClose}
            disabled={loading}
            className="inline-flex items-center justify-center rounded-xl border border-vellum px-5 py-2.5 text-sm font-medium text-ink-muted transition-colors hover:bg-parchment hover:text-ink disabled:opacity-60"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}
