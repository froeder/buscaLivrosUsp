import type { ApiBook, Book } from '../types/book';

/**
 * Cleans stray Excel carriage-return artifacts (_x000d_) and extra whitespace
 * present in some catalog records from the Festa do Livro API.
 */
export function cleanText(value: string | null | undefined): string {
  if (!value) return '';
  return value
    .replace(/_x000d_/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Parses Brazilian Real strings like "R$ 37,00" or "R$ 1.234,50" into a number.
 */
export function parseBRLPrice(raw: string | null | undefined): number {
  if (!raw) return 0;
  const normalized = raw
    .replace(/R\$/gi, '')
    .replace(/\s+/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

const brlFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

export function formatBRL(value: number): string {
  return brlFormatter.format(Number.isFinite(value) ? value : 0);
}

export function calcDiscountPercent(originalPrice: number, discountPrice: number): number | null {
  if (originalPrice <= 0 || discountPrice <= 0 || discountPrice >= originalPrice) {
    return null;
  }
  return Math.round(((originalPrice - discountPrice) / originalPrice) * 100);
}

/**
 * Generates a deterministic, Firestore-safe document ID (no slashes, <= 200 chars)
 * for a book record.
 */
export function buildBookId(raw: Pick<ApiBook, 'isbn' | 'name' | 'publisher'>): string {
  const isbn = cleanText(raw.isbn).replace(/[^a-zA-Z0-9]/g, '');
  const name = cleanText(raw.name).toLowerCase();
  const publisher = cleanText(raw.publisher).toLowerCase();

  // Simple FNV-1a 32-bit hash for collision resistance when ISBN is missing or reused
  const seed = `${isbn}|${name}|${publisher}`;
  let hash = 0x811c9dc5;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  const hexHash = (hash >>> 0).toString(16).padStart(8, '0');

  const prefix = isbn ? isbn.slice(0, 32) : 'book';
  return `${prefix}-${hexHash}`;
}

export function normalizeApiBook(raw: ApiBook): Book {
  const name = cleanText(raw.name) || 'Título não informado';
  const authors = cleanText(raw.authors) || 'Autor não informado';
  const publisher = cleanText(raw.publisher) || 'Editora não informada';
  const isbn = cleanText(raw.isbn);
  const subject = cleanText(raw.subject);
  const price = cleanText(raw.price);
  const priceDiscount = cleanText(raw.price_discount);
  const link = cleanText(raw.link);

  const originalPrice = parseBRLPrice(price);
  const parsedDiscount = parseBRLPrice(priceDiscount);
  const unitPrice = parsedDiscount > 0 ? parsedDiscount : originalPrice;

  return {
    id: buildBookId(raw),
    name,
    authors,
    publisher,
    isbn,
    subject,
    price,
    priceDiscount,
    unitPrice,
    originalPrice,
    link,
  };
}

