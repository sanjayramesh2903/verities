import type { CacheService } from "../cache/cache.js";
import { CacheKeys, CacheTTL } from "../cache/cache.js";
import { env } from "../config/env.js";

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  domain: string;
  datePublished?: string;
}

interface BraveWebResult {
  title: string;
  url: string;
  description?: string;
  page_age?: string;
  extra_snippets?: string[];
}

// Semaphore to cap concurrent DDG HTML scrapes — prevents rate-limiting when
// many claims are processed in parallel on the free / no-API-key path.
let ddgActive = 0;
const DDG_CONCURRENCY = 2;
const ddgQueue: Array<() => void> = [];

function ddgAcquire(): Promise<void> {
  if (ddgActive < DDG_CONCURRENCY) {
    ddgActive++;
    return Promise.resolve();
  }
  return new Promise((resolve) => ddgQueue.push(resolve));
}

function ddgRelease() {
  ddgActive--;
  const next = ddgQueue.shift();
  if (next) { ddgActive++; next(); }
}

/**
 * Build a search query that surfaces academic/research sources.
 * Appends evidence-seeking terms unless the claim already contains them.
 */
function buildAcademicQuery(base: string): string {
  const alreadyAcademic = /\b(study|research|journal|evidence|peer.reviewed|published|literature)\b/i.test(base);
  return alreadyAcademic ? base : `${base} research evidence`;
}

/**
 * Search using the Brave Search API (official, no ToS issues).
 * Requires BRAVE_API_KEY. Free tier: 2,000 queries/month.
 * Sign up at https://api.search.brave.com
 */
async function searchBrave(query: string): Promise<SearchResult[]> {
  const params = new URLSearchParams({
    q: query,
    count: "15",         // fetch more so ranking has a richer academic pool to filter
    safesearch: "moderate",
    extra_snippets: "true", // additional snippet context for LLM
  });
  const url = `https://api.search.brave.com/res/v1/web/search?${params}`;
  const response = await fetch(url, {
    headers: {
      "Accept": "application/json",
      "Accept-Encoding": "gzip",
      "X-Subscription-Token": env.BRAVE_API_KEY!,
    },
    signal: AbortSignal.timeout(8000),
  });

  if (!response.ok) {
    throw new Error(`Brave Search API error: ${response.status}`);
  }

  const data = await response.json() as { web?: { results?: BraveWebResult[] } };
  const rawResults = data.web?.results ?? [];

  return rawResults.map((r) => {
    let domain = "";
    try {
      domain = new URL(r.url).hostname.replace(/^www\./, "");
    } catch { /* keep empty */ }

    // Merge extra_snippets into the main snippet for richer LLM context
    const snippetParts = [r.description ?? "", ...(r.extra_snippets ?? [])];
    const snippet = snippetParts.filter(Boolean).join(" ").slice(0, 800);

    return {
      title: r.title,
      url: r.url,
      snippet,
      domain,
      datePublished: r.page_age,
    };
  });
}

/**
 * Fallback: DuckDuckGo HTML scraping — no API key required but fragile.
 * Used when BRAVE_API_KEY is not set (local dev / testing).
 * Concurrency is capped to DDG_CONCURRENCY to prevent rate-limiting.
 */
async function searchDuckDuckGo(query: string): Promise<SearchResult[]> {
  await ddgAcquire();
  try {
    const params = new URLSearchParams({ q: query });
    const response = await fetch(`https://html.duckduckgo.com/html/?${params}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; Verities/1.0)",
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      throw new Error(`DuckDuckGo search failed: ${response.status}`);
    }

    const html = await response.text();
    const results: SearchResult[] = [];
    const resultBlocks = html.split(/class="result\s/);

    for (let i = 1; i < resultBlocks.length && results.length < 10; i++) {
      const block = resultBlocks[i];

      const linkMatch = block.match(/class="result__a"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/);
      if (!linkMatch) continue;

      let url = linkMatch[1];
      const title = linkMatch[2].replace(/<[^>]+>/g, "").trim();

      if (url.includes("uddg=")) {
        const uddgMatch = url.match(/uddg=([^&]+)/);
        if (uddgMatch) url = decodeURIComponent(uddgMatch[1]);
      }

      const snippetMatch = block.match(/class="result__snippet"[^>]*>([\s\S]*?)<\/(?:a|td|div|span)/);
      const snippet = snippetMatch ? snippetMatch[1].replace(/<[^>]+>/g, "").trim() : "";

      if (!url || !title) continue;

      try {
        const parsed = new URL(url);
        results.push({ title, url, snippet, domain: parsed.hostname.replace(/^www\./, "") });
      } catch { /* skip malformed URLs */ }
    }

    return results;
  } finally {
    ddgRelease();
  }
}

export async function searchForClaim(
  claimText: string,
  cache?: CacheService,
  hints?: { numbers?: string | null; dates?: string | null }
): Promise<SearchResult[]> {
  // Cache key is the normalized claim text only (hints are enrichments, not identity)
  const cacheKey = CacheKeys.searchResult(claimText);
  if (cache) {
    const cached = await cache.get<SearchResult[]>(cacheKey).catch(() => null);
    if (cached) return cached;
  }

  // Build a richer search query: claim + hints + academic enrichment suffix
  const rawQuery = [claimText, hints?.numbers, hints?.dates]
    .filter((p): p is string => Boolean(p))
    .join(" ")
    .trim();
  const searchQuery = buildAcademicQuery(rawQuery);

  const results = env.BRAVE_API_KEY
    ? await searchBrave(searchQuery)
    : await searchDuckDuckGo(searchQuery);

  if (cache && results.length > 0) {
    await cache.set(cacheKey, results, CacheTTL.SEARCH_RESULT).catch(() => {});
  }

  return results;
}
