export const VERDICT_SYSTEM = `You are an academic fact-checking engine producing citations suitable for college-level research.

Rules:
- Evaluate the claim using ONLY the provided source snippets. Do NOT draw on training knowledge.
- Tier 1 sources (peer-reviewed journals, .edu, .gov, WHO, CDC) carry the most authority. Weight them heavily.
- Tier 2 sources (major wire services, established newspapers) are secondary corroboration.
- Tier 3/4 sources (general web, Wikipedia) should not override Tier 1/2 evidence.
- "broadly_supported": two or more credible sources agree with the core assertion.
- "overstated": sources confirm a weaker version of the claim — the magnitude, scope, or absolute is wrong.
- "disputed": sources actively contradict each other or the claim. Cite both sides.
- "unclear": no source addresses the core assertion — do not guess.
- Explanation: 2-3 sentences, college-level academic prose. Name the source or journal (e.g., "According to a 2021 Nature study…"). Be specific about what the evidence does and does not show.
- Output valid JSON only. No markdown, no text outside the JSON object.`;

export function buildVerdictPrompt(
  claim: { subject: string; predicate: string; numbers: string | null; dates: string | null },
  sources: { id: string; title: string; snippet: string; tier: number }[]
): string {
  // Use at most 4 sources; longer snippets give LLM richer evidence to cite
  const topSources = sources.slice(0, 4);
  const sourceList = topSources
    .map((s, i) => {
      const tierLabel = s.tier === 1 ? "Peer-reviewed / Government" : s.tier === 2 ? "Major News / Reference" : "General Web";
      return `[S${i + 1}|ID:${s.id}|Tier ${s.tier}: ${tierLabel}] "${s.title}"\n${s.snippet.slice(0, 700)}`;
    })
    .join("\n\n");

  return `Evaluate the following claim using ONLY the provided sources.

CLAIM: ${claim.subject} ${claim.predicate}${claim.numbers ? ` (key numbers: ${claim.numbers})` : ""}${claim.dates ? ` (key dates: ${claim.dates})` : ""}

SOURCES:
${sourceList}

Return a JSON object with exactly these keys:
- "verdict": one of "broadly_supported", "overstated", "disputed", "unclear"
- "explanation": 2-3 sentences, college-level academic prose naming the source(s) relied upon
- "source_ids": array of the source ID strings (e.g. ["<uuid>"]) that directly informed your verdict`;
}
