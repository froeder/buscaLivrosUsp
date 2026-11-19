import type {
  ApiPaginationMeta,
  Book,
  BooksApiResponse,
  SearchFilterKey,
  SearchFilterOption,
} from '../types/book';
import { normalizeApiBook } from '../utils/format';

export const EVENT_FLAG = '28-festa-do-livro-da-usp';
const API_BASE_URL = 'https://festadolivro.edusp.com.br/api/v1/event-books';

export const SEARCH_FILTER_OPTIONS: SearchFilterOption[] = [
  { label: 'Título', value: 'name', placeholder: 'Ex.: mortes, filosofia, Machado...' },
  { label: 'Autor', value: 'author_name', placeholder: 'Ex.: Conceição Evaristo, Clarice...' },
  { label: 'Editora', value: 'publisher_name', placeholder: 'Ex.: Edusp, Companhia das Letras...' },
  { label: 'Assunto', value: 'subject', placeholder: 'Ex.: Direito, Psicanálise, Poesia...' },
  { label: 'ISBN', value: 'isbn', placeholder: 'Ex.: 9786584041004' },
];

export interface SearchBooksParams {
  query: string;
  filter: SearchFilterKey;
  page?: number;
  perPage?: number;
  signal?: AbortSignal;
}

export interface SearchBooksResult {
  books: Book[];
  meta: ApiPaginationMeta;
}

export async function searchBooks({
  query,
  filter,
  page = 1,
  perPage = 12,
  signal,
}: SearchBooksParams): Promise<SearchBooksResult> {
  const params = new URLSearchParams({
    flag: EVENT_FLAG,
    page: String(page),
    per_page: String(perPage),
    column: 'name',
    order: 'asc',
  });

  const trimmed = query.trim();
  if (trimmed) {
    params.set(filter, trimmed);
  }

  const response = await fetch(`${API_BASE_URL}?${params.toString()}`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
    signal,
  });

  if (!response.ok) {
    throw new Error(`Erro ao consultar o catálogo (${response.status}).`);
  }

  const payload = (await response.json()) as BooksApiResponse;
  const books = Array.isArray(payload.data) ? payload.data.map(normalizeApiBook) : [];

  return {
    books,
    meta: payload.meta,
  };
}

