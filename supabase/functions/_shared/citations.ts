export interface CitationSource {
  title: string;
  url: string;
  snippet?: string;
  datePublished?: string;
  domain?: string;
}

function currentYear(): number {
  return new Date().getFullYear();
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function formatMlaInline(source: CitationSource, index: number): string {
  const domain = extractDomain(source.url);
  return `(${domain}, par. ${index})`;
}

function formatMlaBibliography(source: CitationSource, index: number): string {
  const year = source.datePublished
    ? new Date(source.datePublished).getFullYear()
    : currentYear();
  const domain = extractDomain(source.url);
  return `${index}. "${source.title}." ${domain}, ${year}, ${source.url}.`;
}

function formatApaInline(source: CitationSource, _index: number): string {
  const domain = extractDomain(source.url);
  const year = source.datePublished
    ? new Date(source.datePublished).getFullYear()
    : "n.d.";
  return `(${domain}, ${year})`;
}

function formatApaBibliography(
  source: CitationSource,
  index: number
): string {
  const domain = extractDomain(source.url);
  const year = source.datePublished
    ? new Date(source.datePublished).getFullYear()
    : "n.d.";
  return `${index}. ${source.title}. (${year}). ${domain}. ${source.url}`;
}

function formatChicagoInline(
  source: CitationSource,
  index: number
): string {
  return `[${index}]`;
}

function formatChicagoBibliography(
  source: CitationSource,
  index: number
): string {
  const domain = extractDomain(source.url);
  const year = source.datePublished
    ? new Date(source.datePublished).getFullYear()
    : currentYear();
  return `${index}. "${source.title}." ${domain}. ${year}. ${source.url}.`;
}

export function formatCitation(
  source: CitationSource,
  index: number,
  style: "mla" | "apa" | "chicago",
  type: "inline" | "bibliography"
): string {
  if (style === "mla") {
    return type === "inline"
      ? formatMlaInline(source, index)
      : formatMlaBibliography(source, index);
  }
  if (style === "apa") {
    return type === "inline"
      ? formatApaInline(source, index)
      : formatApaBibliography(source, index);
  }
  // chicago
  return type === "inline"
    ? formatChicagoInline(source, index)
    : formatChicagoBibliography(source, index);
}
