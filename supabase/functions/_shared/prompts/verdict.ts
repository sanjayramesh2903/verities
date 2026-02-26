export interface SourceForPrompt {
  title: string;
  url: string;
  snippet: string;
  reliability_tier: 1 | 2 | 3 | 4;
  datePublished?: string;
}

export function buildVerdictPrompt(
  claimText: string,
  sources: SourceForPrompt[]
): string {
  const sourcesFormatted = sources
    .slice(0, 6)
    .map(
      (s, i) =>
        `[S${i + 1}] ${s.title} (Tier ${s.reliability_tier} — ${s.url})\nDate: ${s.datePublished ?? "unknown"}\n"${s.snippet}"`
    )
    .join("\n\n");

  return `You are a rigorous fact-checker. Evaluate the claim below using ONLY the provided sources. Do not use outside knowledge.

CLAIM: "${claimText}"

SOURCES:
${sourcesFormatted}

VERDICT DEFINITIONS:
- "broadly_supported": Multiple credible sources (Tier 1 or 2) confirm the claim without significant contradiction
- "contested": Sources disagree, only partially support, or the evidence is mixed
- "refuted": One or more credible sources directly contradict the claim
- "unclear": Sources are irrelevant, missing, or too vague to evaluate the claim

Return ONLY a valid JSON object. No markdown fences, no explanation outside the JSON.

{
  "verdict": "broadly_supported" | "contested" | "refuted" | "unclear",
  "confidence": <number 0.0-1.0>,
  "explanation": "<2-3 sentences citing sources like [S1], [S2]. Be specific about what the sources say.>",
  "source_ids": ["S1", "S2"]
}`;
}
