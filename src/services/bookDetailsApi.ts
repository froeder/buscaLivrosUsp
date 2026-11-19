export interface BookEnrichment {
  coverUrl: string | null;
  synopsis: string | null;
  subtitle: string | null;
  year: string | null;
  pageCount: number | null;
  format: string | null;
  dimensions: string | null;
  location: string | null;
  subjects: string[];
  openLibraryUrl: string | null;
  sources: string[];
}

interface BrasilApiIsbnResponse {
  isbn?: string;
  title?: string;
  subtitle?: string | null;
  authors?: string[];
  publisher?: string | null;
  synopsis?: string | null;
  dimensions?: {
    width?: number;
    height?: number;
    unit?: string;
  } | null;
  year?: number | string | null;
  format?: string | null;
  page_count?: number | null;
  subjects?: string[] | null;
  location?: string | null;
  cover_url?: string | null;
  provider?: string | null;
}

interface OpenLibraryBookData {
  url?: string;
  subtitle?: string;
  number_of_pages?: number;
  publish_date?: string;
  publish_places?: Array<{ name?: string }>;
  subjects?: Array<{ name?: string }>;
  notes?: string | { value?: string };
  cover?: {
    large?: string;
    medium?: string;
    small?: string;
  };
}

const enrichmentCache = new Map<string, BookEnrichment | null>();

export function normalizeIsbn(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const cleaned = raw.replace(/[^0-9Xx]/g, '').toUpperCase();
  if (cleaned.length === 10 || cleaned.length === 13) {
    return cleaned;
  }
  return null;
}

function formatBookFormat(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const upper = raw.toUpperCase();
  if (upper === 'PHYSICAL') return 'Físico';
  if (upper === 'DIGITAL') return 'Digital';
  return raw;
}

function formatDimensions(
  dim: BrasilApiIsbnResponse['dimensions'],
): string | null {
  if (!dim || !dim.width || !dim.height) return null;
  const unit = dim.unit ? dim.unit.toLowerCase() : 'cm';
  return `${dim.width} × ${dim.height} ${unit}`;
}

function upgradeToHttps(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('http://')) {
    return `https://${trimmed.slice('http://'.length)}`;
  }
  return /^https:\/\//i.test(trimmed) ? trimmed : null;
}

async function fetchBrasilApi(
  isbn: string,
  signal?: AbortSignal,
): Promise<BrasilApiIsbnResponse | null> {
  const res = await fetch(`https://brasilapi.com.br/api/isbn/v1/${isbn}`, {
    headers: { Accept: 'application/json' },
    signal,
  });
  if (!res.ok) return null;
  return (await res.json()) as BrasilApiIsbnResponse;
}

async function fetchOpenLibrary(
  isbn: string,
  signal?: AbortSignal,
): Promise<OpenLibraryBookData | null> {
  const key = `ISBN:${isbn}`;
  const res = await fetch(
    `https://openlibrary.org/api/books?bibkeys=${encodeURIComponent(key)}&format=json&jscmd=data`,
    {
      headers: { Accept: 'application/json' },
      signal,
    },
  );
  if (!res.ok) return null;
  const data = (await res.json()) as Record<string, OpenLibraryBookData>;
  return data[key] ?? null;
}

export async function fetchBookEnrichment(
  rawIsbn: string,
  signal?: AbortSignal,
): Promise<BookEnrichment | null> {
  const isbn = normalizeIsbn(rawIsbn);
  if (!isbn) return null;

  if (enrichmentCache.has(isbn)) {
    return enrichmentCache.get(isbn) ?? null;
  }

  const [brasilResult, openLibResult] = await Promise.allSettled([
    fetchBrasilApi(isbn, signal),
    fetchOpenLibrary(isbn, signal),
  ]);

  if (signal?.aborted) {
    throw new DOMException('Aborted', 'AbortError');
  }

  const brasil = brasilResult.status === 'fulfilled' ? brasilResult.value : null;
  const openLib = openLibResult.status === 'fulfilled' ? openLibResult.value : null;

  if (!brasil && !openLib) {
    enrichmentCache.set(isbn, null);
    return null;
  }

  const sources: string[] = [];
  if (brasil) {
    sources.push(brasil.provider ? `BrasilAPI (${brasil.provider.toUpperCase()})` : 'BrasilAPI');
  }
  if (openLib) {
    sources.push('Open Library');
  }

  const openLibNotes =
    typeof openLib?.notes === 'string'
      ? openLib.notes.trim()
      : typeof openLib?.notes?.value === 'string'
        ? openLib.notes.value.trim()
        : null;

  const subjectSet = new Set<string>();
  for (const s of brasil?.subjects ?? []) {
    const clean = s?.trim();
    if (clean) subjectSet.add(clean);
  }
  for (const s of openLib?.subjects ?? []) {
    const clean = s?.name?.trim();
    if (clean) subjectSet.add(clean);
  }

  const enrichment: BookEnrichment = {
    coverUrl:
      upgradeToHttps(brasil?.cover_url) ??
      upgradeToHttps(openLib?.cover?.large ?? openLib?.cover?.medium ?? openLib?.cover?.small),
    synopsis: brasil?.synopsis?.trim() || openLibNotes || null,
    subtitle: brasil?.subtitle?.trim() || openLib?.subtitle?.trim() || null,
    year:
      brasil?.year !== null && brasil?.year !== undefined && String(brasil.year).trim() !== ''
        ? String(brasil.year).trim()
        : openLib?.publish_date?.trim() || null,
    pageCount:
      typeof brasil?.page_count === 'number' && brasil.page_count > 0
        ? brasil.page_count
        : typeof openLib?.number_of_pages === 'number' && openLib.number_of_pages > 0
          ? openLib.number_of_pages
          : null,
    format: formatBookFormat(brasil?.format),
    dimensions: formatDimensions(brasil?.dimensions),
    location:
      brasil?.location?.trim() || openLib?.publish_places?.[0]?.name?.trim() || null,
    subjects: Array.from(subjectSet).slice(0, 8),
    openLibraryUrl: upgradeToHttps(openLib?.url),
    sources,
  };

  enrichmentCache.set(isbn, enrichment);
  return enrichment;
}

