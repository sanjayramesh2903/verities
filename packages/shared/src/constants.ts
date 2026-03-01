export const VERDICT_VALUES = [
  "broadly_supported",
  "overstated",
  "disputed",
  "unclear",
] as const;

export const CITATION_STYLES = ["mla", "apa", "chicago"] as const;

export const CITATION_FORMATS = ["inline", "bibliography", "both"] as const;

export const RISK_SIGNALS = [
  "superlative",
  "specific_number",
  "specific_date",
  "statistical_assertion",
  "no_citation",
] as const;

export const RELIABILITY_TIERS = {
  1: { label: "Authoritative", baseScore: 1.0 },
  2: { label: "Reference / Major News", baseScore: 0.75 },
  3: { label: "General Web", baseScore: 0.4 },
  4: { label: "Wikipedia", baseScore: 0.3 },
} as const;

export const LIMITS = {
  ANALYZE_MAX_CHARS: 5000,
  ANALYZE_MAX_CLAIMS: 20,
  ANALYZE_DEFAULT_CLAIMS: 10,
  REVIEW_MAX_CHARS: 12000,
  REVIEW_MAX_RISK_CLAIMS: 30,
  REVIEW_DEFAULT_RISK_CLAIMS: 20,
  MAX_SOURCES_PER_CLAIM: 5,
  MIN_SOURCES_PER_CLAIM: 2,
  RATE_LIMIT_ANONYMOUS: 10,
  RATE_LIMIT_AUTHENTICATED: 30,
} as const;

export const TIER1_DOMAINS = [
  ".edu", ".gov",
  // Big-five scientific publishers
  "nature.com", "science.org", "thelancet.com", "nejm.org", "cell.com",
  "pnas.org", "bmj.com", "jamanetwork.com", "annals.org",
  // Oxford, Springer, Elsevier, Wiley, T&F
  "academic.oup.com", "link.springer.com", "sciencedirect.com",
  "onlinelibrary.wiley.com", "tandfonline.com",
  // Open-access mega-journals
  "plosone.org", "plosbiology.org", "plosmedicine.org",
  "frontiersin.org", "biomedcentral.com", "elifesciences.org",
  // Preprint & academic repositories
  "arxiv.org", "biorxiv.org", "medrxiv.org", "ssrn.com", "psyarxiv.com",
  "chemrxiv.org", "engrxiv.org",
  // Academic discovery & databases
  "pubmed.ncbi.nlm.nih.gov", "ncbi.nlm.nih.gov", "scholar.google.com",
  "jstor.org", "semanticscholar.org", "europepmc.org",
  // Engineering & computing
  "ieee.org", "acm.org", "dl.acm.org",
  // Authoritative health & science orgs
  "who.int", "cochrane.org",
  // Trusted data aggregators
  "ourworldindata.org", "gapminder.org",
];

export const TIER2_DOMAINS = [
  // Wire services & major newspapers
  "apnews.com", "reuters.com", "nytimes.com", "bbc.com", "bbc.co.uk",
  "washingtonpost.com", "theguardian.com", "npr.org", "pbs.org",
  "economist.com", "ft.com", "bloomberg.com",
  // Evidence-based science/health media
  "scientificamerican.com", "nationalgeographic.com", "theatlantic.com",
  "statnews.com", "medscape.com", "mayoclinic.org",
  // Data journalism & policy research
  "fivethirtyeight.com", "pewresearch.org", "rand.org", "cfr.org",
  "worldbank.org", "imf.org", "un.org", "kff.org",
  // Encyclopedia & general reference
  "britannica.com",
];

export const SPAM_DOMAINS = [
  "content-farm-example.com",
  "naturalnews.com",
  "infowars.com",
  "beforeitsnews.com",
  "thegatewaypundit.com",
  "zerohedge.com",
  "breitbart.com",
  "dailymail.co.uk",
  "theonion.com",
  "babylonbee.com",
  "worldnewsdailyreport.com",
  "empirenews.net",
  "nationalreport.net",
];
