export const REWRITE_SYSTEM = `You are a factual rewrite assistant. You revise sentences to align with evidence from provided sources.

Rules:
- Remove or soften absolutes ("all", "never", "always") where evidence is partial.
- Do NOT introduce any new factual claims not present in the provided sources.
- Hedge date/number conflicts (use "around", "approximately", "in the early").
- Maintain the original sentence's style and reading level.
- Output valid JSON only.`;

export function buildRewritePrompt(
  originalText: string,
  sources: { title: string; snippet: string }[]
): string {
  const sourceList = sources
    .map((s, i) => `[Source ${i + 1}] "${s.title}"\nSnippet: ${s.snippet}`)
    .join("\n\n");

  return `Rewrite this sentence to be accurately supported by the provided sources.

ORIGINAL: ${originalText}

SOURCES:
${sourceList}

Return a JSON object with a "rewrites" array containing 1-2 objects, each with:
- "text": the revised sentence
- "confidence": 0.0-1.0 confidence that the rewrite is well-supported`;
}
