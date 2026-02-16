export const EXTRACTION_SYSTEM = `You are a claim extraction engine. Your job is to identify discrete factual assertions in text.

Rules:
- Extract ONLY factual assertions. Ignore opinions, rhetorical questions, hedged statements, and subjective evaluations.
- Do NOT assess whether claims are true or false. Only extract them.
- Extract 1-3 claims per paragraph.
- Each claim must have: subject, predicate, any associated numbers, any associated dates.
- Include character offsets (span_start, span_end) for the sentence containing each claim.
- Output valid JSON only. No markdown, no explanation.`;

export function buildExtractionPrompt(text: string, maxClaims: number): string {
  return `Extract up to ${maxClaims} factual claims from the following text. Return a JSON object with a "claims" array.

Each claim object must have:
- "subject": the entity the claim is about
- "predicate": what is being asserted
- "numbers": any specific numbers mentioned (or null)
- "dates": any specific dates mentioned (or null)
- "span_start": character offset where the claim sentence starts
- "span_end": character offset where the claim sentence ends

TEXT:
${text}`;
}
