import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  BookMarked,
  Check,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Minus,
  Plus,
  Search,
  Sparkles,
  X,
} from 'lucide-react';
import { SEARCH_FILTER_OPTIONS, searchBooks } from '../services/booksApi';
import { useCart } from '../contexts/CartContext';
import type { ApiPaginationMeta, Book, SearchFilterKey } from '../types/book';
import { calcDiscountPercent, formatBRL } from '../utils/format';
import { BookCover } from './BookCover';

interface SearchSectionProps {
  onGoToCart: () => void;
  onSelectBook: (book: Book) => void;
}

const SUGGESTIONS = ['Poesia', 'Filosofia', 'Romance', 'História', 'Direito', 'Teatro'];
const SKELETON_COUNT = 6;

export function SearchSection({ onGoToCart, onSelectBook }: SearchSectionProps) {
  const { addBook, updateQuantity, getItemQuantity, totalItems, error: cartError } = useCart();

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

  const runSearch = (query: string, nextFilter: SearchFilterKey) => {
    setActiveQuery(query.trim());
    setActiveFilter(nextFilter);
    setPage(1);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    runSearch(inputValue, filter);
  };

  const handleSuggestion = (term: string) => {
    setInputValue(term);
    setFilter('name');
    runSearch(term, 'name');
  };

  const handleClearSearch = () => {
    setInputValue('');
    runSearch('', filter);
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
      }, 1400);
    } catch {
      // Error message is exposed via cartError from CartContext
    }
  };

  const handleQty = async (bookId: string, qty: number) => {
    try {
      await updateQuantity(bookId, qty);
    } catch {
      // Error message is exposed via cartError from CartContext
    }
  };

  const goToPage = (nextPage: number) => {
    setPage(nextPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const isSafeHttpUrl = (url: string) => /^https?:\/\//i.test(url);

  return (
    <section className="search-section" aria-label="Busca de livros">
      <div className="hero-card">
        <div className="hero-glow" aria-hidden="true" />
        <div className="hero-copy">
          <span className="hero-eyebrow">
            <Sparkles size={14} aria-hidden="true" />
            28ª Festa do Livro da USP
          </span>
          <h1>Encontre seus livros e monte a lista perfeita</h1>
          <p>
            Busque no catálogo oficial da Edusp, compare preços com desconto e organize tudo por
            editora antes de ir à feira.
          </p>
        </div>

        <form className="search-form" onSubmit={handleSubmit} role="search">
          <div className="search-bar">
            <label htmlFor="search-query" className="visually-hidden">
              Termo de busca
            </label>
            <Search size={20} className="search-input-icon" aria-hidden="true" />
            <input
              id="search-query"
              type="search"
              className="search-input"
              enterKeyHint="search"
              autoComplete="off"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={currentFilterOption.placeholder}
            />
            {inputValue && (
              <button
                type="button"
                className="search-clear"
                aria-label="Limpar campo de busca"
                onClick={() => setInputValue('')}
              >
                <X size={16} aria-hidden="true" />
              </button>
            )}
            <button type="submit" className="btn btn-accent search-submit">
              Buscar
            </button>
          </div>

          <fieldset className="filter-chips">
            <legend className="visually-hidden">Buscar por</legend>
            {SEARCH_FILTER_OPTIONS.map((opt) => (
              <label key={opt.value} className="chip">
                <input
                  type="radio"
                  name="search-filter"
                  value={opt.value}
                  checked={filter === opt.value}
                  onChange={() => setFilter(opt.value)}
                />
                <span>{opt.label}</span>
              </label>
            ))}
          </fieldset>

          <div className="suggestions">
            <span className="suggestions-label">Sugestões:</span>
            {SUGGESTIONS.map((term) => (
              <button
                key={term}
                type="button"
                className="suggestion"
                onClick={() => handleSuggestion(term)}
              >
                {term}
              </button>
            ))}
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
                  Catálogo completo · <strong>{meta.total.toLocaleString('pt-BR')}</strong> livros
                </>
              )}
            </span>
          ) : null}
        </div>

        {activeQuery && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={handleClearSearch}>
            <X size={14} aria-hidden="true" />
            <span>Limpar busca</span>
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
        <div className="books-grid" role="status" aria-label="Carregando livros">
          {Array.from({ length: SKELETON_COUNT }, (_, i) => (
            <div key={i} className="book-card skeleton-card" aria-hidden="true">
              <div className="skeleton skeleton-cover" />
              <div className="skeleton-body">
                <div className="skeleton skeleton-line skeleton-line-sm" />
                <div className="skeleton skeleton-line" />
                <div className="skeleton skeleton-line skeleton-line-md" />
                <div className="skeleton skeleton-line skeleton-line-price" />
              </div>
            </div>
          ))}
        </div>
      ) : books.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon" aria-hidden="true">
            <BookMarked size={32} />
          </span>
          <h2>Nenhum livro encontrado</h2>
          <p>Tente outro termo ou mude o filtro (Título, Autor, Editora, Assunto ou ISBN).</p>
        </div>
      ) : (
        <>
          <div className="books-grid">
            {books.map((book) => {
              const qtyInCart = getItemQuantity(book.id);
              const discountPct = calcDiscountPercent(book.originalPrice, book.unitPrice);
              const isJustAdded = justAddedId === book.id;

              return (
                <article key={book.id} className={`book-card ${qtyInCart > 0 ? 'in-cart' : ''}`}>
                  <button
                    type="button"
                    className="book-card-cover"
                    onClick={() => onSelectBook(book)}
                    tabIndex={-1}
                    aria-hidden="true"
                  >
                    <BookCover
                      title={book.name}
                      publisher={book.publisher}
                      authors={book.authors}
                      size="md"
                    />
                    {discountPct !== null && (
                      <span className="discount-badge">-{discountPct}%</span>
                    )}
                  </button>

                  <div className="book-card-body">
                    <span className="publisher-badge">{book.publisher}</span>

                    <h2 className="book-title">
                      <button
                        type="button"
                        className="book-title-btn"
                        onClick={() => onSelectBook(book)}
                      >
                        {book.name}
                      </button>
                    </h2>

                    <p className="book-authors">{book.authors}</p>

                    {book.subject && <p className="book-subject">{book.subject}</p>}

                    <div className="book-card-footer">
                      <div className="book-pricing">
                        {book.originalPrice > 0 && book.originalPrice > book.unitPrice && (
                          <span className="price-original">{formatBRL(book.originalPrice)}</span>
                        )}
                        <span className="price-discount">
                          {book.unitPrice > 0
                            ? formatBRL(book.unitPrice)
                            : book.priceDiscount || book.price || 'Sob consulta'}
                        </span>
                      </div>

                      <div className="book-actions">
                        {isSafeHttpUrl(book.link) && (
                          <a
                            href={book.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="icon-btn"
                            title="Ver no site da editora"
                            aria-label={`Ver ${book.name} no site da editora`}
                          >
                            <ExternalLink size={16} aria-hidden="true" />
                          </a>
                        )}

                        {qtyInCart > 0 ? (
                          <div className="qty-stepper" role="group" aria-label={`Quantidade de ${book.name}`}>
                            <button
                              type="button"
                              className="qty-btn"
                              aria-label={`Diminuir quantidade de ${book.name}`}
                              onClick={() => void handleQty(book.id, qtyInCart - 1)}
                            >
                              <Minus size={14} aria-hidden="true" />
                            </button>
                            <span className="qty-value" aria-live="polite">
                              {qtyInCart}
                            </span>
                            <button
                              type="button"
                              className="qty-btn"
                              aria-label={`Aumentar quantidade de ${book.name}`}
                              disabled={qtyInCart >= 99}
                              onClick={() => void handleQty(book.id, qtyInCart + 1)}
                            >
                              <Plus size={14} aria-hidden="true" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={() => void handleAdd(book)}
                            aria-label={`Adicionar ${book.name} ao carrinho`}
                          >
                            {isJustAdded ? (
                              <>
                                <Check size={15} aria-hidden="true" />
                                <span>Adicionado</span>
                              </>
                            ) : (
                              <>
                                <Plus size={15} aria-hidden="true" />
                                <span>Adicionar</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
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
                onClick={() => goToPage(Math.max(1, page - 1))}
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
                onClick={() => goToPage(Math.min(meta.last_page, page + 1))}
              >
                <span>Próxima</span>
                <ChevronRight size={16} aria-hidden="true" />
              </button>
            </nav>
          )}
        </>
      )}

      {totalItems > 0 && (
        <button type="button" className="floating-cart" onClick={onGoToCart}>
          Ver carrinho · {totalItems} {totalItems === 1 ? 'livro' : 'livros'}
        </button>
      )}
    </section>
  );
}
