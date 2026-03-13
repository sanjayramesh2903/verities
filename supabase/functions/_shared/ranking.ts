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
  "ncbi.nlm.nih.gov",
  "nature.com",
  "science.org",
  "nejm.org",
  "thelancet.com",
  "bmj.com",
  "cell.com",
  "pnas.org",
  "arxiv.org",
  "biorxiv.org",
  "medrxiv.org",
  "jstor.org",
  "ssrn.com",
  "cochrane.org",
  "jamanetwork.com",
  "annals.org",
  "plosone.org",
  "plos.org",
  "frontiersin.org",
  "springer.com",
  "link.springer.com",
  "sciencedirect.com",
  "wiley.com",
  "onlinelibrary.wiley.com",
  "tandfonline.com",
  "oxford.ac.uk",
  "academic.oup.com",
  "europepmc.org",
  "semanticscholar.org",
  "ieee.org",
  "ieeexplore.ieee.org",
  "dl.acm.org",
  "ourworldindata.org",
  "gapminder.org",
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
  "scientificamerican.com",
  "pewresearch.org",
  "rand.org",
  "cfr.org",
  "worldbank.org",
  "imf.org",
  "un.org",
  "mayoclinic.org",
  "clevelandclinic.org",
  "kff.org",
  "statnews.com",
  "medscape.com",
  "britannica.com",
]);

const SPAM_DOMAINS = new Set([
  "pinterest.com",
  "facebook.com",
  "twitter.com",
  "x.com",
  "instagram.com",
  "tiktok.com",
  "amazon.com",
  "ebay.com",
  "etsy.com",
  "reddit.com",
  "quora.com",
  "yahoo.com",
  "naturalnews.com",
  "infowars.com",
  "beforeitsnews.com",
  "thegatewaypundit.com",
  "zerohedge.com",
  "breitbart.com",
  "dailymail.co.uk",
  "theonion.com",
  "babylonbee.com",
]);

const SOCIAL_DOMAINS = new Set([
  "medium.com",
  "substack.com",
  "blogspot.com",
  "wordpress.com",
  "tumblr.com",
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
  const ranked = results
    .filter((r) => r.url && r.title && !SPAM_DOMAINS.has(r.domain))
    .map((r) => {
      const tier = assignTier(r.domain);
      const tierScore = [1.0, 0.82, 0.55, 0.35][tier - 1];
      const tier1Bonus = tier === 1 ? 0.10 : 0;
      const socialPenalty = SOCIAL_DOMAINS.has(r.domain) ? -0.25 : 0;
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
        tierScore + tier1Bonus + socialPenalty + hasNumbers + hasDates + isRecent,
        1
      );
      return { ...r, reliability_tier: tier, _score: score };
    })
    .sort((a, b) => b._score - a._score);

  // Prefer academic results: if Tier 1 or 2 sources exist, drop Tier 3/4 sources
  const hasAcademic = ranked.some((r) => r.reliability_tier <= 2);
  const filtered = hasAcademic
    ? ranked.filter((r) => r.reliability_tier <= 2)
    : ranked;

  return filtered
    .slice(0, 8)
    .map(({ _score: _s, ...r }) => r as RankedResult);
}
