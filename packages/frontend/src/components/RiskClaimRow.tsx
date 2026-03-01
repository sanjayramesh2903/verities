import { AlertTriangle, ChevronRight } from "lucide-react";
import type { HighRiskClaim } from "@verities/shared";

const signalLabels: Record<string, string> = {
  superlative: "Superlative",
  specific_number: "Number",
  specific_date: "Date",
  statistical_assertion: "Statistic",
  no_citation: "No Citation",
};

const verdictLabels: Record<string, string> = {
  disputed: "Disputed by sources",
  overstated: "May be overstated",
  unclear: "Insufficient evidence",
  broadly_supported: "Appears supported",
  likely_overstated: "Likely overstated",
  needs_review: "Needs review",
  likely_ok: "Likely OK",
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
      ? "bg-rose"
      : claim.risk_score > 0.4
        ? "bg-amber"
        : "bg-teal";

  const riskTrackColor =
    claim.risk_score > 0.7
      ? "rgba(244, 63, 94, 0.15)"
      : claim.risk_score > 0.4
        ? "rgba(245, 158, 11, 0.15)"
        : "rgba(13, 148, 136, 0.15)";

  const riskIconColor =
    claim.risk_score > 0.7
      ? "text-rose"
      : claim.risk_score > 0.4
        ? "text-amber"
        : "text-teal-light";

  const riskBorderClass =
    claim.risk_score > 0.7
      ? "risk-card-high"
      : claim.risk_score > 0.4
        ? "risk-card-medium"
        : "risk-card-low";

  return (
    <button
      onClick={onClick}
      className={`scholarly-card w-full animate-slide-up p-4 text-left transition-all hover:bg-white/3 hover:-translate-y-px hover:shadow-lg ${riskBorderClass}`}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0">
          <AlertTriangle className={`h-4 w-4 ${riskIconColor}`} />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium leading-relaxed text-white line-clamp-2">
            {claim.original_text}
          </p>

          {/* Risk bar */}
          <div className="mt-2 flex items-center gap-3">
            <div className="h-1.5 flex-1 rounded-full overflow-hidden" style={{ background: riskTrackColor }}>
              <div
                className={`h-full rounded-full ${riskColor} transition-all duration-700`}
                style={{ width: `${riskPercent}%`, transitionDelay: `${index * 60 + 300}ms` }}
              />
            </div>
            <span className="shrink-0 text-[11px] font-semibold text-ink-muted tabular-nums">
              {riskPercent}%
            </span>
          </div>

          {/* Signal tags */}
          {claim.risk_signals.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {claim.risk_signals.map((signal) => (
                <span
                  key={signal}
                  className="rounded-md bg-white/5 border border-white/8 px-2 py-0.5 text-[11px] font-medium text-ink-muted"
                >
                  {signalLabels[signal] ?? signal}
                </span>
              ))}
            </div>
          )}

          {/* Verdict label */}
          <p className="mt-1.5 text-xs text-ink-faint">
            {verdictLabels[claim.summary_verdict] ?? claim.summary_verdict}
          </p>
        </div>

        <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-ink-faint transition-transform group-hover:translate-x-0.5" />
      </div>
    </button>
  );
}
