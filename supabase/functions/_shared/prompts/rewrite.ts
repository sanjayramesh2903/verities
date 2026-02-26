export function buildRewritePrompt(
  originalText: string,
  sources: { title: string; url: string; snippet: string }[]
): string {
  const evidence = sources
    .slice(0, 3)
    .map((s, i) => `[${i + 1}] "${s.snippet}" — ${s.title} (${s.url})`)
    .join("\n");

  return `The following claim is contested or refuted by evidence. Rewrite it to be accurate and appropriately hedged.

ORIGINAL CLAIM: "${originalText}"

EVIDENCE:
${evidence}

INSTRUCTIONS:
- Rewrite 1 must be a hedged/qualified version (e.g. "Some studies suggest..." or "According to [source]...")
- Rewrite 2 must be an alternative accurate framing of what the evidence actually supports
- Keep rewrites concise (under 50 words each)

Return ONLY JSON:
{
  "rewrites": [
    "<rewrite 1: hedged/qualified>",
    "<rewrite 2: alternative accurate framing>"
  ]
}`;
}
