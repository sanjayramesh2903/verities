import type { CacheService } from "../cache/cache.js";
import { CacheKeys, CacheTTL } from "../cache/cache.js";

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  domain: string;
  datePublished?: string;
}

/**
 * Search using DuckDuckGo HTML scraping — no API key required.
 * Falls back gracefully on parse errors.
 */
async function searchDuckDuckGo(query: string): Promise<SearchResult[]> {
  const params = new URLSearchParams({ q: query });
  const response = await fetch(`https://html.duckduckgo.com/html/?${params}`, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    },
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    throw new Error(`DuckDuckGo search failed: ${response.status}`);
  }

  const html = await response.text();
  const results: SearchResult[] = [];

  // Parse DuckDuckGo HTML results — each result is in a .result class
  const resultBlocks = html.split(/class="result\s/);

  for (let i = 1; i < resultBlocks.length && results.length < 10; i++) {
    const block = resultBlocks[i];

    // Extract title and URL from the result link
    const linkMatch = block.match(/class="result__a"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/);
    if (!linkMatch) continue;

    let url = linkMatch[1];
    const titleHtml = linkMatch[2];
    const title = titleHtml.replace(/<[^>]+>/g, "").trim();

    // DuckDuckGo wraps URLs in a redirect — extract the actual URL
    if (url.includes("uddg=")) {
      const uddgMatch = url.match(/uddg=([^&]+)/);
      if (uddgMatch) {
        url = decodeURIComponent(uddgMatch[1]);
      }
    }

    // Extract snippet
    const snippetMatch = block.match(/class="result__snippet"[^>]*>([\s\S]*?)<\/(?:a|td|div|span)/);
    const snippet = snippetMatch
      ? snippetMatch[1].replace(/<[^>]+>/g, "").trim()
      : "";

    if (!url || !title) continue;

    try {
      const parsedUrl = new URL(url);
      results.push({
        title,
        url,
        snippet,
        domain: parsedUrl.hostname.replace(/^www\./, ""),
      });
    } catch {
      // Skip malformed URLs
    }
  }

  return results;
}

export async function searchForClaim(claimText: string, cache?: CacheService): Promise<SearchResult[]> {
  // Check cache first
  if (cache) {
    const cacheKey = CacheKeys.searchResult(claimText);
    const cached = await cache.get<SearchResult[]>(cacheKey).catch(() => null);
    if (cached) return cached;
  }

  const results = await searchDuckDuckGo(claimText);

  // Store in cache
  if (cache && results.length > 0) {
    const cacheKey = CacheKeys.searchResult(claimText);
    await cache.set(cacheKey, results, CacheTTL.SEARCH_RESULT).catch(() => {});
  }

  return results;
}
