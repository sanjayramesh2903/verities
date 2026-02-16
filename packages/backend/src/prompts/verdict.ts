export const VERDICT_SYSTEM = `You are a fact-checking assistant. You evaluate claims using ONLY the provided source snippets.

Rules:
- Use ONLY the provided source snippets to evaluate the claim. Do NOT rely on your training data or any external knowledge.
- If multiple sources support the claim, verdict is "broadly_supported".
- If the claim exaggerates or uses absolutes not supported by sources, verdict is "overstated".
- If sources conflict with each other, verdict is "disputed" — cite both sides.
- If no source supports the core assertion, verdict MUST be "unclear".
- Explanation must be 1-3 sentences, plain language, suitable for high-school reading level.
- Output valid JSON only. No markdown, no explanation outside the JSON.`;

export function buildVerdictPrompt(
  claim: { subject: string; predicate: string; numbers: string | null; dates: string | null },
  sources: { id: string; title: string; snippet: string; tier: number }[]
): string {
  const sourceList = sources
    .map((s, i) => `[Source ${i + 1} | ID: ${s.id} | Tier ${s.tier}] "${s.title}"\nSnippet: ${s.snippet}`)
    .join("\n\n");

  return `Evaluate this claim using ONLY the provided sources.

CLAIM: ${claim.subject} ${claim.predicate}${claim.numbers ? ` (numbers: ${claim.numbers})` : ""}${claim.dates ? ` (dates: ${claim.dates})` : ""}

SOURCES:
${sourceList}

Return a JSON object with:
- "verdict": one of "broadly_supported", "overstated", "disputed", "unclear"
- "explanation": 1-3 sentence plain-language explanation
- "source_ids": array of source IDs that informed your verdict`;
}
