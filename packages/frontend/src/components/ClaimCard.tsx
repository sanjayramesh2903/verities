import { ChevronDown, ChevronUp, Quote } from "lucide-react";
import { useState } from "react";
import type { Claim } from "@verities/shared";
import VerdictBadge from "./VerdictBadge";
import SourceItem from "./SourceItem";
import RewriteSuggestion from "./RewriteSuggestion";

interface ClaimCardProps {
  claim: Claim;
  index: number;
  onUseRewrite?: (span: { start: number; end: number }, text: string) => void;
}

export default function ClaimCard({ claim, index, onUseRewrite }: ClaimCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="annotation-card animate-slide-up p-5"
      data-verdict={claim.verdict}
      style={{ animationDelay: `${index * 80}ms` }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <span className="text-[11px] font-semibold text-ink-faint uppercase tracking-wider">
              Claim {index + 1}
            </span>
            <VerdictBadge verdict={claim.verdict} />
          </div>

          <div className="flex items-start gap-2">
            <Quote className="mt-0.5 h-4 w-4 shrink-0 text-ink-ghost" />
            <p className="text-sm font-medium leading-relaxed text-ink">
              {claim.original_text}
            </p>
          </div>
        </div>

        <button
          onClick={() => setExpanded(!expanded)}
          className="shrink-0 rounded-lg p-1.5 text-ink-faint transition-colors hover:bg-parchment hover:text-ink"
          aria-label={expanded ? "Collapse" : "Expand"}
        >
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>

      {/* Explanation */}
      <p className="mt-3 text-sm leading-relaxed text-ink-muted">
        {claim.explanation}
      </p>

      {/* Expanded detail */}
      {expanded && (
        <div className="mt-4 space-y-4 animate-fade-in">
          {/* Sources */}
          {claim.sources.length > 0 && (
            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-faint">
                Sources ({claim.sources.length})
              </h4>
              <div className="space-y-2">
                {claim.sources.map((source) => (
                  <SourceItem key={source.source_id} source={source} />
                ))}
              </div>
            </div>
          )}

          {/* Rewrites */}
          {claim.rewrites.length > 0 && (
            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-faint">
                Suggested Rewrites
              </h4>
              <div className="space-y-2">
                {claim.rewrites.map((rewrite, i) => (
                  <RewriteSuggestion
                    key={i}
                    rewrite={rewrite}
                    onUse={(text) => onUseRewrite?.(claim.span, text)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Expand hint when collapsed */}
      {!expanded && (claim.sources.length > 0 || claim.rewrites.length > 0) && (
        <button
          onClick={() => setExpanded(true)}
          className="mt-2 text-xs font-medium text-cerulean hover:underline underline-offset-2"
        >
          Show {claim.sources.length} source{claim.sources.length !== 1 ? "s" : ""}
          {claim.rewrites.length > 0 && ` & ${claim.rewrites.length} rewrite${claim.rewrites.length !== 1 ? "s" : ""}`}
        </button>
      )}
    </div>
  );
}
