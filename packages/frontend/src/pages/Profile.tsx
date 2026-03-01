import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { User, Save, LogOut, CheckCircle2, CreditCard, TrendingUp, Trash2 } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { getPreferences, updatePreferences, getUsage } from "../lib/api";
import Navbar from "../components/Navbar";

interface UserPreferences {
  citation_style: "mla" | "apa" | "chicago";
  max_claims: number;
}

interface UsageData {
  plan_tier: "free" | "pro";
  checks_used: number;
  checks_limit: number;
  reviews_used: number;
  reviews_limit: number | null;
  reset_at: string;
  subscription_status?: string;
}

export default function Profile() {
  const { user, loading: authLoading, logout } = useAuth();
  const navigate = useNavigate();

  const [prefs, setPrefs] = useState<UserPreferences>({ citation_style: "mla", max_claims: 10 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const [usage, setUsage] = useState<UsageData | null>(null);
  const [billingLoading, setBillingLoading] = useState(false);
  const [billingError, setBillingError] = useState("");

  useEffect(() => {
    if (!authLoading && !user) navigate("/", { replace: true });
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    getPreferences()
      .then((data) => setPrefs(data as UserPreferences))
      .catch(() => {})
      .finally(() => setLoading(false));
    getUsage()
      .then((data) => setUsage(data as UsageData))
      .catch(() => {});
  }, [user]);

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      await updatePreferences(prefs);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save preferences");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm(
      "Are you sure? This will permanently delete your account."
    );
    if (!confirmed) return;
    try {
      await logout();
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete account");
    }
  };

  const handleUpgrade = () => {
    setBillingLoading(false);
    setBillingError("");
    window.alert("Billing coming soon. Contact us at hello@verities.app to upgrade.");
  };

  const handleManageBilling = () => {
    setBillingLoading(false);
    setBillingError("");
    window.alert("Billing portal coming soon. Contact hello@verities.app for billing changes.");
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-surface">
        <Navbar />
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-navy border-t-transparent" />
        </div>
      </div>
    );
  }

  if (!user) return null;

  const isPro = usage?.plan_tier === "pro";
  const checksUsed = usage?.checks_used ?? 0;
  const checksLimit = usage?.checks_limit ?? 5;
  const usagePercent = Math.min(100, Math.round((checksUsed / checksLimit) * 100));

  return (
    <div className="min-h-screen bg-surface">
      <Navbar />
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <div className="mb-8">
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-navy" />
            <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">Profile & Settings</h1>
          </div>
        </div>

        {/* Account info */}
        <div className="card p-6 mb-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-faint mb-4">Account</h2>
          <div className="flex items-center gap-4">
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt="" className="h-14 w-14 rounded-full border border-border object-cover" />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-navy text-white text-xl font-bold">
                {(user.displayName ?? user.email)[0].toUpperCase()}
              </div>
            )}
            <div>
              {user.displayName && (
                <p className="text-base font-semibold text-ink">{user.displayName}</p>
              )}
              <p className="text-sm text-ink-muted">{user.email}</p>
            </div>
          </div>
        </div>

        {/* Preferences */}
        <div className="card p-6 mb-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-faint mb-4">Preferences</h2>

          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">
                Default citation style
              </label>
              <select
                value={prefs.citation_style}
                onChange={(e) => setPrefs((p) => ({ ...p, citation_style: e.target.value as UserPreferences["citation_style"] }))}
                className="rounded-lg border border-border bg-white px-3 py-2 text-sm text-ink transition-colors hover:border-border-strong focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/20 w-full max-w-xs"
              >
                <option value="mla">MLA</option>
                <option value="apa">APA</option>
                <option value="chicago">Chicago</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">
                Max claims per check
              </label>
              <input
                type="number"
                min={1}
                max={20}
                value={prefs.max_claims}
                onChange={(e) => setPrefs((p) => ({ ...p, max_claims: Math.max(1, Math.min(20, parseInt(e.target.value) || 10)) }))}
                className="rounded-lg border border-border bg-white px-3 py-2 text-sm text-ink transition-colors hover:border-border-strong focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/20 w-24"
              />
              <p className="mt-1 text-xs text-ink-faint">Between 1 and 20</p>
            </div>
          </div>

          {error && (
            <p className="mt-4 text-sm text-rose">{error}</p>
          )}

          <div className="mt-6 flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-primary inline-flex items-center gap-2 disabled:opacity-50"
            >
              {saved
                ? <><CheckCircle2 className="h-4 w-4" />Saved!</>
                : saving
                  ? <><div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />Saving…</>
                  : <><Save className="h-4 w-4" />Save preferences</>
              }
            </button>
          </div>
        </div>

        {/* Plan & Billing */}
        <div className="card p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <CreditCard className="h-4 w-4 text-ink-faint" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-faint">Plan & Billing</h2>
          </div>

          {usage === null ? (
            <div className="space-y-3">
              <div className="h-6 w-24 rounded-full bg-surface-2 animate-pulse" />
              <div className="h-4 w-full max-w-sm rounded bg-surface-2 animate-pulse" />
              <div className="h-2 w-full max-w-sm rounded-full bg-surface-2 animate-pulse" />
              <div className="h-9 w-32 rounded-xl bg-surface-2 animate-pulse" />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Plan badge */}
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
                    isPro
                      ? "bg-navy text-white"
                      : "bg-surface-2 text-ink-muted"
                  }`}
                >
                  {isPro && <TrendingUp className="h-3 w-3" />}
                  {isPro ? "Pro" : "Free"}
                </span>
                {usage.subscription_status && usage.subscription_status !== "none" && (
                  <span className="text-xs text-ink-faint capitalize">{usage.subscription_status}</span>
                )}
              </div>

              {isPro ? (
                <div>
                  <p className="text-sm text-ink-muted">
                    100 fact-checks / month · Unlimited reviews
                  </p>
                  {billingError && (
                    <p className="mt-2 text-sm text-rose">{billingError}</p>
                  )}
                  <button
                    onClick={handleManageBilling}
                    disabled={billingLoading}
                    className="mt-4 btn-primary inline-flex items-center gap-2 disabled:opacity-50"
                  >
                    {billingLoading ? (
                      <><div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />Redirecting…</>
                    ) : (
                      <><CreditCard className="h-4 w-4" />Manage Billing</>
                    )}
                  </button>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-ink-muted mb-2">
                    {checksUsed} of {checksLimit} fact-checks used this month
                  </p>
                  <div className="h-2 w-full max-w-sm rounded-full bg-surface-2 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-navy transition-all"
                      style={{ width: `${usagePercent}%` }}
                    />
                  </div>
                  {billingError && (
                    <p className="mt-2 text-sm text-rose">{billingError}</p>
                  )}
                  <button
                    onClick={handleUpgrade}
                    disabled={billingLoading}
                    className="mt-4 btn-gold inline-flex items-center gap-2 disabled:opacity-50"
                  >
                    {billingLoading ? (
                      <><div className="h-4 w-4 animate-spin rounded-full border-2 border-navy border-t-transparent" />Loading…</>
                    ) : (
                      <><TrendingUp className="h-4 w-4" />Upgrade to Pro</>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Account Actions */}
        <div className="card p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-faint mb-4">Account Actions</h2>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-2 rounded-lg border border-rose/30 px-4 py-2 text-sm font-medium text-rose transition-colors hover:bg-rose/5"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
            <button
              onClick={handleDeleteAccount}
              className="inline-flex items-center gap-2 rounded-lg border border-rose/30 px-4 py-2 text-sm font-medium text-rose transition-colors hover:bg-rose/5"
            >
              <Trash2 className="h-4 w-4" />
              Delete account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
