import type { CacheService } from "../cache/cache.js";
import { CacheKeys, CacheTTL } from "../cache/cache.js";

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  domain: string;
  datePublished?: string;
}

export async function searchForClaim(claimText: string, cache?: CacheService): Promise<SearchResult[]> {
  // Check cache first
  if (cache) {
    const cacheKey = CacheKeys.searchResult(claimText);
    const cached = await cache.get<SearchResult[]>(cacheKey).catch(() => null);
    if (cached) return cached;
  }

  const apiKey = process.env.BING_SEARCH_API_KEY;
  if (!apiKey) {
    throw new Error("BING_SEARCH_API_KEY environment variable is required");
  }

  const params = new URLSearchParams({
    q: claimText,
    count: "10",
    textFormat: "Raw",
    safeSearch: "Moderate",
  });

  const response = await fetch(`https://api.bing.microsoft.com/v7.0/search?${params}`, {
    headers: { "Ocp-Apim-Subscription-Key": apiKey },
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    throw new Error(`Bing search failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const webPages = data.webPages?.value ?? [];

  const results: SearchResult[] = webPages.map((page: Record<string, string>) => {
    const url = new URL(page.url);
    return {
      title: page.name ?? "",
      url: page.url,
      snippet: page.snippet ?? "",
      domain: url.hostname.replace(/^www\./, ""),
      datePublished: page.dateLastCrawled,
    };
  });

  // Store in cache
  if (cache) {
    const cacheKey = CacheKeys.searchResult(claimText);
    await cache.set(cacheKey, results, CacheTTL.SEARCH_RESULT).catch(() => {});
  }

  return results;
}
