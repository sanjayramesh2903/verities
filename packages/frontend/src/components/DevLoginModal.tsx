import { useState, type FormEvent } from "react";
import { X, FlaskConical } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  onLogin: (email: string) => Promise<void>;
}

export default function DevLoginModal({ open, onClose, onLogin }: Props) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await onLogin(email.trim());
      setEmail("");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="scholarly-card w-full max-w-sm mx-4 p-6 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-charcoal/40 hover:text-charcoal transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-2 mb-1">
          <FlaskConical className="h-4 w-4 text-cerulean" />
          <span className="text-xs font-medium text-cerulean uppercase tracking-wider">Dev Mode</span>
        </div>
        <h2 className="font-display text-xl font-bold text-navy mb-1">Sign in</h2>
        <p className="text-sm text-charcoal/60 mb-5">
          Enter any email — a test account will be created automatically.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            autoFocus
            className="w-full rounded-lg border border-vellum bg-white px-3 py-2 text-sm text-charcoal placeholder-charcoal/40 focus:outline-none focus:ring-2 focus:ring-cerulean/30 focus:border-cerulean"
          />

          {error && <p className="text-sm text-terracotta">{error}</p>}

          <button
            type="submit"
            disabled={loading || !email.trim()}
            className="w-full rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white hover:bg-navy/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
