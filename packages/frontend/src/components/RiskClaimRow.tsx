import { AlertTriangle, ChevronRight } from "lucide-react";
import type { HighRiskClaim } from "@verities/shared";

const signalLabels: Record<string, string> = {
  superlative: "Superlative",
  specific_number: "Number",
  specific_date: "Date",
  statistical_assertion: "Statistic",
  no_citation: "No Citation",
};

interface RiskClaimRowProps {
  claim: HighRiskClaim;
  index: number;
  onClick?: () => void;
}

export default function RiskClaimRow({ claim, index, onClick }: RiskClaimRowProps) {
  const riskPercent = Math.round(claim.risk_score * 100);

  const riskColor =
    claim.risk_score > 0.7
      ? "bg-terracotta"
      : claim.risk_score > 0.4
        ? "bg-amber"
        : "bg-sage";

  const riskTrack =
    claim.risk_score > 0.7
      ? "bg-terracotta-wash"
      : claim.risk_score > 0.4
        ? "bg-amber-wash"
        : "bg-sage-wash";

  return (
    <button
      onClick={onClick}
      className="scholarly-card w-full animate-slide-up p-4 text-left transition-all hover:bg-parchment/50"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0">
          <AlertTriangle
            className={`h-4 w-4 ${
              claim.risk_score > 0.7
                ? "text-terracotta"
                : claim.risk_score > 0.4
                  ? "text-amber"
                  : "text-sage"
            }`}
          />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium leading-relaxed text-ink line-clamp-2">
            {claim.original_text}
          </p>

          {/* Risk bar */}
          <div className="mt-2 flex items-center gap-3">
            <div className={`h-1.5 flex-1 rounded-full ${riskTrack} overflow-hidden`}>
              <div
                className={`h-full rounded-full ${riskColor} transition-all`}
                style={{ width: `${riskPercent}%` }}
              />
            </div>
            <span className="shrink-0 text-[11px] font-semibold text-ink-faint tabular-nums">
              {riskPercent}%
            </span>
          </div>

          {/* Signal tags */}
          <div className="mt-2 flex flex-wrap gap-1.5">
            {claim.risk_signals.map((signal) => (
              <span
                key={signal}
                className="rounded-md bg-parchment px-2 py-0.5 text-[11px] font-medium text-ink-muted"
              >
                {signalLabels[signal] ?? signal}
              </span>
            ))}
          </div>

          {/* Summary verdict */}
          <p className="mt-1.5 text-xs text-ink-faint">{claim.summary_verdict}</p>
        </div>

        <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-ink-ghost transition-transform group-hover:translate-x-0.5" />
      </div>
    </button>
  );
}
