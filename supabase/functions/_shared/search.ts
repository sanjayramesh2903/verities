import { rankResults, RankedResult } from "./ranking.ts";

export type { RankedResult as SearchResult };

export async function searchForClaim(
  claimText: string
): Promise<RankedResult[]> {
  const braveKey = Deno.env.get("BRAVE_API_KEY");

  const raw = braveKey
    ? await searchBrave(claimText, braveKey)
    : await searchDuckDuckGo(claimText);

  return rankResults(raw);
}

async function searchBrave(
  query: string,
  apiKey: string
): Promise<Omit<RankedResult, "reliability_tier">[]> {
  const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(
    query
  )}&count=10&safesearch=moderate`;

  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      "Accept-Encoding": "gzip",
      "X-Subscription-Token": apiKey,
    },
    signal: AbortSignal.timeout(8_000),
  });

  if (!res.ok) {
    console.warn(`Brave Search returned ${res.status}, falling back to DDG`);
    return await searchDuckDuckGo(query);
  }

  const json = await res.json();
  return (
    (
      json.web?.results as Array<{
        title: string;
        url: string;
        description: string;
        page_age?: string;
      }>
    ) ?? []
  ).map((r) => ({
    title: r.title ?? "",
    url: r.url ?? "",
    snippet: r.description ?? "",
    domain: (() => {
      try {
        return new URL(r.url).hostname.replace(/^www\./, "");
      } catch {
        return "";
      }
    })(),
    datePublished: r.page_age,
  }));
}

async function searchDuckDuckGo(
  query: string
): Promise<Omit<RankedResult, "reliability_tier">[]> {
  try {
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(
      query
    )}`;
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; Verities/1.0; fact-checking research bot)",
      },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return [];

    const html = await res.text();
    const results: Omit<RankedResult, "reliability_tier">[] = [];

    // Extract result links and snippets via regex
    const resultPattern =
      /<a[^>]+class="result__a"[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>/g;
    const snippetPattern =
      /<a[^>]+class="result__snippet"[^>]*>([^<]+)<\/a>/g;

    const links: { url: string; title: string }[] = [];
    const snippets: string[] = [];

    let m;
    while ((m = resultPattern.exec(html)) !== null && links.length < 10) {
      links.push({ url: m[1], title: m[2].trim() });
    }
    while ((m = snippetPattern.exec(html)) !== null && snippets.length < 10) {
      snippets.push(m[1].trim());
    }

    for (let i = 0; i < Math.min(links.length, snippets.length); i++) {
      try {
        const domain = new URL(links[i].url).hostname.replace(/^www\./, "");
        results.push({
          title: links[i].title,
          url: links[i].url,
          snippet: snippets[i],
          domain,
        });
      } catch {
        /* skip malformed URLs */
      }
    }
    return results;
  } catch {
    return [];
  }
}
