export function buildExtractionPrompt(text: string, maxClaims: number): string {
  return `You are a rigorous fact-checking assistant. Extract up to ${maxClaims} distinct, verifiable factual claims from the following text.

RULES:
- Each claim must be a single, standalone factual assertion (not an opinion or question)
- Include claims with specific numbers, statistics, dates, names, or causal relationships
- Skip vague statements, rhetorical questions, and pure opinions
- Claims must be extractable verbatim or near-verbatim from the text

Return ONLY a JSON object with a "claims" array. No markdown, no explanation.

Format:
{
  "claims": [
    {
      "claim_id": "c1",
      "original_text": "exact text from source",
      "subject": "main topic (2-5 words)",
      "predicate": "what is claimed about subject"
    }
  ]
}

TEXT TO ANALYZE:
${text}`;
}
