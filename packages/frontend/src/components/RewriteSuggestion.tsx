import { Sparkles } from "lucide-react";
import type { Rewrite } from "@verities/shared";

interface RewriteSuggestionProps {
  rewrite: Rewrite;
  onUse: (text: string) => void;
}

export default function RewriteSuggestion({ rewrite, onUse }: RewriteSuggestionProps) {
  const confidencePercent = Math.round(rewrite.confidence * 100);

  return (
    <div className="rounded-lg border border-cerulean-glow bg-cerulean-wash/40 p-3">
      <div className="flex items-start gap-2">
        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-cerulean" />
        <div className="min-w-0 flex-1">
          <p className="text-sm leading-relaxed text-ink">
            {rewrite.text}
          </p>
          <div className="mt-2 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-16 rounded-full bg-vellum overflow-hidden">
                <div
                  className="h-full rounded-full bg-cerulean transition-all"
                  style={{ width: `${confidencePercent}%` }}
                />
              </div>
              <span className="text-[11px] font-medium text-ink-faint">
                {confidencePercent}% confidence
              </span>
            </div>
            <button
              onClick={() => onUse(rewrite.text)}
              className="inline-flex items-center gap-1 rounded-md bg-cerulean px-2.5 py-1 text-xs font-semibold text-white transition-colors hover:bg-cerulean-light"
            >
              Use this rewrite
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
