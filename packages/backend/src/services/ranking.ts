import {
  TIER1_DOMAINS, TIER2_DOMAINS, SPAM_DOMAINS,
  RELIABILITY_TIERS, LIMITS,
} from "@verities/shared";
import type { ExtractedClaim, RiskSignal } from "@verities/shared";
import type { SearchResult } from "./search.js";

export interface RankedSource {
  id: string;
  title: string;
  url: string;
  snippet: string;
  domain: string;
  tier: number;
  score: number;
  datePublished?: string;
}

function assignTier(domain: string): number {
  if (domain.endsWith(".edu") || domain.endsWith(".gov")) return 1;
  if (TIER1_DOMAINS.some((d) => domain.includes(d))) return 1;
  if (TIER2_DOMAINS.some((d) => domain.includes(d))) return 2;
  if (domain.includes("wikipedia.org")) return 4;
  return 3;
}

function computeRelevance(claimText: string, snippet: string): number {
  const claimWords = new Set(claimText.toLowerCase().split(/\s+/).filter((w) => w.length > 3));
  const snippetWords = snippet.toLowerCase().split(/\s+/);
  if (claimWords.size === 0) return 0;
  let matches = 0;
  for (const w of snippetWords) {
    if (claimWords.has(w)) matches++;
  }
  return Math.min(matches / claimWords.size, 1);
}

function isRecent(dateStr?: string): boolean {
  if (!dateStr) return false;
  const pub = new Date(dateStr);
  const twoYearsAgo = new Date();
  twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
  return pub > twoYearsAgo;
}

export function rankSources(claim: ExtractedClaim, rawResults: SearchResult[]): RankedSource[] {
  const claimText = `${claim.subject} ${claim.predicate}`;

  const scored = rawResults.map((result) => {
    const tier = assignTier(result.domain);
    const base = RELIABILITY_TIERS[tier as keyof typeof RELIABILITY_TIERS].baseScore;
    const relevance = computeRelevance(claimText, result.snippet);

    let bonus = 0;
    if (claim.numbers && result.snippet.includes(claim.numbers)) bonus += 0.15;
    if (claim.dates && result.snippet.includes(claim.dates)) bonus += 0.10;
    if (isRecent(result.datePublished)) bonus += 0.05;

    let penalty = 0;
    if (SPAM_DOMAINS.some((d) => result.domain.includes(d))) penalty += 0.5;
    if (!result.title || !result.snippet) penalty += 0.2;

    const finalScore = base * 0.4 + relevance * 0.5 + bonus - penalty;

    return {
      id: crypto.randomUUID(),
      title: result.title,
      url: result.url,
      snippet: result.snippet,
      domain: result.domain,
      tier,
      score: Math.max(0, Math.min(1, finalScore)),
      datePublished: result.datePublished,
    };
  });

  scored.sort((a, b) => b.score - a.score);

  const selected: RankedSource[] = [];
  const hasTier1or2 = scored.some((s) => s.tier <= 2);

  if (hasTier1or2) {
    const topTier = scored.find((s) => s.tier <= 2);
    if (topTier && !scored.slice(0, LIMITS.MIN_SOURCES_PER_CLAIM).includes(topTier)) {
      selected.push(topTier);
    }
  }

  for (const s of scored) {
    if (selected.length >= LIMITS.MAX_SOURCES_PER_CLAIM) break;
    if (!selected.includes(s)) selected.push(s);
  }

  return selected.slice(0, LIMITS.MAX_SOURCES_PER_CLAIM);
}

const SUPERLATIVE_PATTERNS = /\b(all|every|never|always|none|no one|everyone|best|worst|most|least|largest|smallest|greatest|only)\b/i;
const NUMBER_PATTERN = /\b\d[\d,.]*%?\b/;
const DATE_PATTERN = /\b(19|20)\d{2}\b|\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d/i;
const STATISTICAL_PATTERN = /\b(percent|percentage|average|median|rate|ratio|statistic|study|survey|research shows|data|according to)\b/i;

export function scoreClaimRisk(
  text: string,
  claim: ExtractedClaim
): { score: number; signals: RiskSignal[] } {
  const signals: RiskSignal[] = [];
  let score = 0;

  if (SUPERLATIVE_PATTERNS.test(text)) {
    signals.push("superlative");
    score += 0.3;
  }
  if (NUMBER_PATTERN.test(text)) {
    signals.push("specific_number");
    score += 0.2;
  }
  if (DATE_PATTERN.test(text)) {
    signals.push("specific_date");
    score += 0.15;
  }
  if (STATISTICAL_PATTERN.test(text)) {
    signals.push("statistical_assertion");
    score += 0.25;
  }

  const hasCitation = /\(.*?\d{4}\)|\[\d+\]/.test(text);
  if (!hasCitation) {
    signals.push("no_citation");
    score += 0.1;
  }

  return { score: Math.min(score, 1), signals };
}
