export interface RankedResult {
  title: string;
  url: string;
  snippet: string;
  domain: string;
  datePublished?: string;
  reliability_tier: 1 | 2 | 3 | 4;
}

const TIER1_DOMAINS = new Set([
  "pubmed.ncbi.nlm.nih.gov",
  "nature.com",
  "science.org",
  "nejm.org",
  "thelancet.com",
  "bmj.com",
  "cell.com",
  "pnas.org",
  "arxiv.org",
  "jstor.org",
  "ssrn.com",
  "cdc.gov",
  "who.int",
  "nih.gov",
]);

const TIER2_DOMAINS = new Set([
  "apnews.com",
  "reuters.com",
  "bbc.com",
  "bbc.co.uk",
  "nytimes.com",
  "washingtonpost.com",
  "theguardian.com",
  "economist.com",
  "ft.com",
  "wsj.com",
  "npr.org",
  "politifact.com",
  "factcheck.org",
  "snopes.com",
  "theatlantic.com",
  "science.org",
  "scientificamerican.com",
]);

const SPAM_DOMAINS = new Set([
  "pinterest.com",
  "facebook.com",
  "twitter.com",
  "instagram.com",
  "tiktok.com",
  "amazon.com",
  "ebay.com",
  "etsy.com",
]);

function assignTier(domain: string): 1 | 2 | 3 | 4 {
  if (
    domain.endsWith(".edu") ||
    domain.endsWith(".gov") ||
    TIER1_DOMAINS.has(domain)
  )
    return 1;
  if (TIER2_DOMAINS.has(domain)) return 2;
  if (domain === "en.wikipedia.org" || domain === "wikipedia.org") return 4;
  return 3;
}

export function rankResults(
  results: Omit<RankedResult, "reliability_tier">[]
): RankedResult[] {
  return results
    .filter((r) => r.url && r.title && !SPAM_DOMAINS.has(r.domain))
    .map((r) => {
      const tier = assignTier(r.domain);
      const tierScore = [1.0, 0.85, 0.65, 0.5][tier - 1];
      const hasNumbers = /\d/.test(r.snippet) ? 0.08 : 0;
      const hasDates =
        /\b(20\d{2}|19\d{2})\b/.test(r.snippet) ? 0.05 : 0;
      const isRecent =
        r.datePublished &&
        new Date(r.datePublished) >
          new Date(Date.now() - 365 * 86400000)
          ? 0.07
          : 0;
      const score = Math.min(
        tierScore + hasNumbers + hasDates + isRecent,
        1
      );
      return { ...r, reliability_tier: tier, _score: score };
    })
    .sort((a, b) => b._score - a._score)
    .slice(0, 8)
    .map(({ _score: _s, ...r }) => r as RankedResult);
}
