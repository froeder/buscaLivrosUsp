import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  BookMarked,
  Building2,
  Check,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Loader2,
  Plus,
  Search,
  UserPen,
} from 'lucide-react';
import { SEARCH_FILTER_OPTIONS, searchBooks } from '../services/booksApi';
import { useCart } from '../contexts/CartContext';
import type { ApiPaginationMeta, Book, SearchFilterKey } from '../types/book';
import { calcDiscountPercent, formatBRL } from '../utils/format';

interface SearchSectionProps {
  onGoToCart: () => void;
}

export function SearchSection({ onGoToCart }: SearchSectionProps) {
  const { addBook, getItemQuantity, error: cartError } = useCart();

  const [inputValue, setInputValue] = useState('');
  const [filter, setFilter] = useState<SearchFilterKey>('name');
  const [activeQuery, setActiveQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<SearchFilterKey>('name');
  const [page, setPage] = useState(1);

  const [books, setBooks] = useState<Book[]>([]);
  const [meta, setMeta] = useState<ApiPaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [justAddedId, setJustAddedId] = useState<string | null>(null);
  const addedTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    searchBooks({
      query: activeQuery,
      filter: activeFilter,
      page,
      perPage: 12,
      signal: controller.signal,
    })
      .then((result) => {
        setBooks(result.books);
        setMeta(result.meta);
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setError(
          err instanceof Error
            ? err.message
            : 'Não foi possível buscar os livros no momento. Tente novamente.',
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [activeQuery, activeFilter, page]);

  useEffect(() => {
    return () => {
      if (addedTimerRef.current !== null) {
        window.clearTimeout(addedTimerRef.current);
      }
    };
  }, []);

  const currentFilterOption =
    SEARCH_FILTER_OPTIONS.find((opt) => opt.value === filter) ?? SEARCH_FILTER_OPTIONS[0];

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setActiveQuery(inputValue.trim());
    setActiveFilter(filter);
    setPage(1);
  };

  const handleClearSearch = () => {
    setInputValue('');
    setActiveQuery('');
    setPage(1);
  };

  const handleAdd = async (book: Book) => {
    try {
      await addBook(book);
      setJustAddedId(book.id);
      if (addedTimerRef.current !== null) {
        window.clearTimeout(addedTimerRef.current);
      }
      addedTimerRef.current = window.setTimeout(() => {
        setJustAddedId(null);
      }, 1200);
    } catch {
      // Error message is exposed via cartError from CartContext
    }
  };

  const isSafeHttpUrl = (url: string) => /^https?:\/\//i.test(url);

  return (
    <section className="search-section" aria-label="Busca de livros">
      <div className="hero-card">
        <div className="hero-copy">
          <h1>Monte sua lista para a 28ª Festa do Livro da USP</h1>
          <p>
            Busque diretamente no catálogo oficial da Edusp, confira os preços com desconto e
            organize seu carrinho agrupado por editora.
          </p>
        </div>

        <form className="search-form" onSubmit={handleSubmit} role="search">
          <div className="search-field-group">
            <label htmlFor="search-filter" className="visually-hidden">
              Filtrar busca por
            </label>
            <select
              id="search-filter"
              className="search-select"
              value={filter}
              onChange={(e) => setFilter(e.target.value as SearchFilterKey)}
            >
              {SEARCH_FILTER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            <label htmlFor="search-query" className="visually-hidden">
              Termo de busca
            </label>
            <div className="search-input-wrap">
              <Search size={18} className="search-input-icon" aria-hidden="true" />
              <input
                id="search-query"
                type="search"
                className="search-input"
                enterKeyHint="search"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={currentFilterOption.placeholder}
              />
            </div>

            <button type="submit" className="btn btn-primary search-submit">
              Buscar
            </button>
          </div>
        </form>
      </div>

      <div className="results-toolbar">
        <div className="results-meta" aria-live="polite">
          {loading ? (
            <span>Buscando no catálogo oficial...</span>
          ) : meta ? (
            <span>
              {activeQuery ? (
                <>
                  <strong>{meta.total.toLocaleString('pt-BR')}</strong> resultado(s) para{' '}
                  <em>“{activeQuery}”</em>
                </>
              ) : (
                <>
                  Exibindo catálogo completo ·{' '}
                  <strong>{meta.total.toLocaleString('pt-BR')}</strong> livros disponíveis
                </>
              )}
            </span>
          ) : null}
        </div>

        {activeQuery && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={handleClearSearch}>
            Limpar busca
          </button>
        )}
      </div>

      {cartError && (
        <div className="alert-error" role="alert">
          {cartError}
        </div>
      )}

      {error && (
        <div className="alert-error" role="alert">
          {error}
        </div>
      )}

      {loading ? (
        <div className="loading-state" role="status" aria-live="polite">
          <Loader2 size={28} className="spin" aria-hidden="true" />
          <p>Consultando livros na Festa do Livro da USP...</p>
        </div>
      ) : books.length === 0 ? (
        <div className="empty-state">
          <BookMarked size={36} aria-hidden="true" />
          <h2>Nenhum livro encontrado</h2>
          <p>
            Tente outro termo ou mude o filtro (Título, Autor, Editora, Assunto ou ISBN).
          </p>
        </div>
      ) : (
        <>
          <div className="books-grid">
            {books.map((book) => {
              const qtyInCart = getItemQuantity(book.id);
              const discountPct = calcDiscountPercent(book.originalPrice, book.unitPrice);
              const isJustAdded = justAddedId === book.id;

              return (
                <article key={book.id} className="book-card">
                  <div className="book-card-top">
                    <div className="book-badges">
                      <span className="publisher-badge">
                        <Building2 size={13} aria-hidden="true" />
                        {book.publisher}
                      </span>
                      {discountPct !== null && (
                        <span className="discount-badge">-{discountPct}%</span>
                      )}
                    </div>

                    <h2 className="book-title">{book.name}</h2>

                    <p className="book-authors">
                      <UserPen size={14} aria-hidden="true" />
                      <span>{book.authors}</span>
                    </p>

                    {book.subject && <p className="book-subject">{book.subject}</p>}
                  </div>

                  <div className="book-card-footer">
                    <div className="book-pricing">
                      {book.originalPrice > 0 && book.originalPrice > book.unitPrice && (
                        <span className="price-original">{formatBRL(book.originalPrice)}</span>
                      )}
                      <span className="price-discount">
                        {book.unitPrice > 0
                          ? formatBRL(book.unitPrice)
                          : book.priceDiscount || book.price || 'Preço sob consulta'}
                      </span>
                    </div>

                    <div className="book-actions">
                      {isSafeHttpUrl(book.link) && (
                        <a
                          href={book.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="icon-btn"
                          title="Ver livro no site da editora"
                          aria-label={`Ver ${book.name} no site da editora`}
                        >
                          <ExternalLink size={16} aria-hidden="true" />
                        </a>
                      )}

                      <button
                        type="button"
                        className={`btn ${qtyInCart > 0 ? 'btn-added' : 'btn-primary'} btn-sm`}
                        onClick={() => void handleAdd(book)}
                      >
                        {isJustAdded ? (
                          <>
                            <Check size={15} aria-hidden="true" />
                            <span>Adicionado!</span>
                          </>
                        ) : qtyInCart > 0 ? (
                          <>
                            <Plus size={15} aria-hidden="true" />
                            <span>No carrinho ({qtyInCart})</span>
                          </>
                        ) : (
                          <>
                            <Plus size={15} aria-hidden="true" />
                            <span>Adicionar</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          {meta && meta.last_page > 1 && (
            <nav className="pagination" aria-label="Paginação dos resultados">
              <button
                type="button"
                className="btn btn-outline btn-sm"
                disabled={page <= 1}
                onClick={() => {
                  setPage((p) => Math.max(1, p - 1));
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              >
                <ChevronLeft size={16} aria-hidden="true" />
                <span>Anterior</span>
              </button>

              <span className="pagination-info">
                Página <strong>{meta.current_page}</strong> de{' '}
                <strong>{meta.last_page.toLocaleString('pt-BR')}</strong>
              </span>

              <button
                type="button"
                className="btn btn-outline btn-sm"
                disabled={page >= meta.last_page}
                onClick={() => {
                  setPage((p) => Math.min(meta.last_page, p + 1));
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              >
                <span>Próxima</span>
                <ChevronRight size={16} aria-hidden="true" />
              </button>
            </nav>
          )}
        </>
      )}

      <div className="mobile-cart-cta-spacer" />
      <button type="button" className="visually-hidden" onClick={onGoToCart}>
        Ir para o carrinho
      </button>
    </section>
  );
}

