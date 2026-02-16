import type { CitationStyle, CitationFormat, FormatCitationResponse } from "@verities/shared";
import type { CacheService } from "../cache/cache.js";
import { CacheKeys, CacheTTL } from "../cache/cache.js";

interface SourceMeta {
  title: string;
  url: string;
  author?: string | null;
  publisher?: string | null;
  date?: string | null;
  domain?: string;
}

function formatDate(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  } catch {
    return null;
  }
}

function formatMLA(meta: SourceMeta): { inline: string; bibliography: string } {
  const author = meta.author ?? "";
  const title = `"${meta.title}."`;
  const publisher = meta.publisher ?? meta.domain ?? "";
  const date = formatDate(meta.date);
  const url = meta.url;

  const inline = author ? `(${author.split(" ").pop()})` : `("${meta.title}")`;

  const parts = [author ? `${author}.` : "", title, publisher ? `*${publisher}*,` : "", date ? `${date},` : "", url + "."].filter(Boolean);
  const bibliography = parts.join(" ").replace(/\s+/g, " ").trim();

  return { inline, bibliography };
}

function formatAPA(meta: SourceMeta): { inline: string; bibliography: string } {
  const author = meta.author ?? "";
  const year = meta.date ? new Date(meta.date).getFullYear().toString() : "n.d.";
  const title = meta.title;
  const publisher = meta.publisher ?? meta.domain ?? "";
  const url = meta.url;

  const inline = author
    ? `(${author.split(" ").pop()}, ${year})`
    : `("${title.slice(0, 30)}${title.length > 30 ? "..." : ""}", ${year})`;

  const parts = [
    author ? `${author}.` : "",
    `(${year}).`,
    `${title}.`,
    publisher ? `*${publisher}*.` : "",
    url,
  ].filter(Boolean);
  const bibliography = parts.join(" ").replace(/\s+/g, " ").trim();

  return { inline, bibliography };
}

function formatChicago(meta: SourceMeta): { inline: string; bibliography: string } {
  const author = meta.author ?? "";
  const title = `"${meta.title}."`;
  const publisher = meta.publisher ?? meta.domain ?? "";
  const date = formatDate(meta.date);
  const url = meta.url;

  const inline = author
    ? `(${author.split(" ").pop()}${meta.date ? ", " + new Date(meta.date).getFullYear() : ""})`
    : `("${meta.title.slice(0, 30)}${meta.title.length > 30 ? "..." : ""}")`;

  const parts = [author ? `${author}.` : "", title, publisher ? `${publisher}.` : "", date ? `${date}.` : "", url + "."].filter(Boolean);
  const bibliography = parts.join(" ").replace(/\s+/g, " ").trim();

  return { inline, bibliography };
}

const formatters = { mla: formatMLA, apa: formatAPA, chicago: formatChicago };

export function formatCitation(
  source: SourceMeta,
  style: CitationStyle,
  format: "inline" | "bibliography"
): string {
  const result = formatters[style](source);
  return format === "inline" ? result.inline : result.bibliography;
}

export async function formatCitationFromUrl(
  sourceUrl: string,
  style: CitationStyle,
  format: CitationFormat,
  cache?: CacheService
): Promise<FormatCitationResponse> {
  const url = new URL(sourceUrl);
  const domain = url.hostname.replace(/^www\./, "");

  let title = domain;
  let author: string | null = null;
  let publisher: string | null = domain;
  let date: string | null = null;

  // Check metadata cache
  const cacheKey = CacheKeys.sourceMetadata(sourceUrl);
  if (cache) {
    const cached = await cache.get<SourceMeta>(cacheKey).catch(() => null);
    if (cached) {
      const formatted = formatters[style](cached);
      return {
        citation_inline: format === "bibliography" ? "" : formatted.inline,
        citation_bibliography: format === "inline" ? "" : formatted.bibliography,
        metadata_used: { author: cached.author ?? null, title: cached.title, publisher: cached.publisher ?? null, date: cached.date ?? null, url: sourceUrl },
      };
    }
  }

  try {
    const response = await fetch(sourceUrl, {
      headers: { "User-Agent": "Verities Citation Bot/1.0" },
      signal: AbortSignal.timeout(5000),
    });
    const html = await response.text();

    const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/is);
    if (titleMatch) title = titleMatch[1].replace(/\s+/g, " ").trim();

    const authorMatch = html.match(/<meta\s+(?:name|property)=["'](?:author|article:author)["']\s+content=["'](.*?)["']/i);
    if (authorMatch) author = authorMatch[1].trim();

    const dateMatch = html.match(/<meta\s+(?:name|property)=["'](?:date|article:published_time|datePublished)["']\s+content=["'](.*?)["']/i);
    if (dateMatch) date = dateMatch[1].trim();

    const publisherMatch = html.match(/<meta\s+(?:name|property)=["'](?:og:site_name|publisher)["']\s+content=["'](.*?)["']/i);
    if (publisherMatch) publisher = publisherMatch[1].trim();
  } catch {
    // Use defaults if fetch fails
  }

  const meta: SourceMeta = { title, url: sourceUrl, author, publisher, date, domain };

  // Store metadata in cache
  if (cache) {
    await cache.set(cacheKey, meta, CacheTTL.SOURCE_METADATA).catch(() => {});
  }

  const formatted = formatters[style](meta);

  return {
    citation_inline: format === "bibliography" ? "" : formatted.inline,
    citation_bibliography: format === "inline" ? "" : formatted.bibliography,
    metadata_used: { author, title, publisher, date, url: sourceUrl },
  };
}
