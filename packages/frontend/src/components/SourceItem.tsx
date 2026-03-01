import { useState } from "react";
import { ExternalLink, Copy, Check } from "lucide-react";
import { RELIABILITY_TIERS } from "@verities/shared";
import type { Source } from "@verities/shared";

export default function SourceItem({ source }: { source: Source }) {
  const [copied, setCopied] = useState<"inline" | "bib" | null>(null);

  const tierInfo = RELIABILITY_TIERS[source.reliability_tier];

  const copyToClipboard = async (text: string, type: "inline" | "bib") => {
    await navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="group rounded-lg border border-vellum bg-parchment/50 p-3 transition-colors hover:border-stone">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <a
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-semibold text-cerulean hover:underline underline-offset-2 inline-flex items-center gap-1 truncate"
            >
              {source.title}
              <ExternalLink className="h-3 w-3 shrink-0" />
            </a>
            <span className="tier-badge" data-tier={source.reliability_tier}>
              {tierInfo.label}
            </span>
          </div>
          <p className="mt-1.5 text-sm leading-relaxed text-ink-muted line-clamp-2">
            {source.snippet}
          </p>
        </div>
      </div>

      <div className="mt-2 flex items-center gap-2">
        <button
          onClick={() => copyToClipboard(source.citation_inline, "inline")}
          className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-1 text-xs font-medium text-ink-muted border border-vellum transition-colors hover:text-ink hover:border-stone"
        >
          {copied === "inline" ? <Check className="h-3 w-3 text-sage" /> : <Copy className="h-3 w-3" />}
          Inline cite
        </button>
        <button
          onClick={() => copyToClipboard(source.citation_bibliography, "bib")}
          className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-1 text-xs font-medium text-ink-muted border border-vellum transition-colors hover:text-ink hover:border-stone"
        >
          {copied === "bib" ? <Check className="h-3 w-3 text-sage" /> : <Copy className="h-3 w-3" />}
          Full cite
        </button>
      </div>
    </div>
  );
}
