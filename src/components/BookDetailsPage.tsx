import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Building2,
  ExternalLink,
  Loader2,
  Minus,
  Plus,
  ShoppingBag,
  UserPen,
} from 'lucide-react';
import {
  fetchBookEnrichment,
  normalizeIsbn,
  type BookEnrichment,
} from '../services/bookDetailsApi';
import { useCart } from '../contexts/CartContext';
import type { Book } from '../types/book';
import { calcDiscountPercent, formatBRL } from '../utils/format';
import { BookCover } from './BookCover';

interface BookDetailsPageProps {
  book: Book;
  backLabel: string;
  onBack: () => void;
  onGoToCart: () => void;
}

export function BookDetailsPage({
  book,
  backLabel,
  onBack,
  onGoToCart,
}: BookDetailsPageProps) {
  const { getItemQuantity, addBook, updateQuantity, error: cartError } = useCart();

  const [enrichment, setEnrichment] = useState<BookEnrichment | null>(null);
  const [loadingExtra, setLoadingExtra] = useState<boolean>(() => Boolean(normalizeIsbn(book.isbn)));
  const [coverFailed, setCoverFailed] = useState(false);

  const qtyInCart = getItemQuantity(book.id);
  const discountPct = calcDiscountPercent(book.originalPrice, book.unitPrice);
  const savings =
    book.originalPrice > book.unitPrice ? book.originalPrice - book.unitPrice : 0;
  const hasPublisherLink = /^https?:\/\//i.test(book.link);
  const validIsbn = normalizeIsbn(book.isbn);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [book.id]);

  useEffect(() => {
    setCoverFailed(false);
    if (!validIsbn) {
      setEnrichment(null);
      setLoadingExtra(false);
      return;
    }

    const controller = new AbortController();
    setLoadingExtra(true);

    fetchBookEnrichment(validIsbn, controller.signal)
      .then((data) => {
        setEnrichment(data);
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setEnrichment(null);
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoadingExtra(false);
        }
      });

    return () => controller.abort();
  }, [validIsbn]);

  const handleAdd = async () => {
    try {
      await addBook(book);
    } catch {
      // Error surfaced through cartError
    }
  };

  const handleUpdateQty = async (nextQty: number) => {
    try {
      await updateQuantity(book.id, nextQty);
    } catch {
      // Error surfaced through cartError
    }
  };

  const showCoverImage = Boolean(enrichment?.coverUrl && !coverFailed);

  const mergedSubjects = (() => {
    const list: string[] = [];
    if (book.subject) list.push(book.subject);
    for (const s of enrichment?.subjects ?? []) {
      if (!list.some((existing) => existing.toLowerCase() === s.toLowerCase())) {
        list.push(s);
      }
    }
    return list;
  })();

  const metadataRows: Array<{ label: string; value: string }> = [
    { label: 'Editora', value: book.publisher },
    ...(book.isbn ? [{ label: 'ISBN', value: book.isbn }] : []),
    ...(enrichment?.year ? [{ label: 'Ano de publicação', value: enrichment.year }] : []),
    ...(enrichment?.pageCount
      ? [{ label: 'Páginas', value: `${enrichment.pageCount} páginas` }]
      : []),
    ...(enrichment?.format ? [{ label: 'Formato', value: enrichment.format }] : []),
    ...(enrichment?.dimensions ? [{ label: 'Dimensões', value: enrichment.dimensions }] : []),
    ...(enrichment?.location ? [{ label: 'Local de publicação', value: enrichment.location }] : []),
  ];

  return (
    <section className="book-detail-section" aria-label={`Detalhes de ${book.name}`}>
      <button type="button" className="btn btn-ghost btn-sm back-link" onClick={onBack}>
        <ArrowLeft size={16} aria-hidden="true" />
        <span>{backLabel}</span>
      </button>

      {cartError && (
        <div className="alert-error" role="alert">
          {cartError}
        </div>
      )}

      <article className="book-detail-card">
        <div className="book-detail-hero">
          <div className="book-cover-column">
            {showCoverImage ? (
              <img
                src={enrichment!.coverUrl!}
                alt={`Capa do livro ${book.name}`}
                className="book-cover-img"
                onError={() => setCoverFailed(true)}
              />
            ) : (
              <BookCover
                title={book.name}
                publisher={book.publisher}
                authors={book.authors}
                size="lg"
              />
            )}
          </div>

          <div className="book-detail-main">
            <div className="book-detail-badges">
              <span className="publisher-badge">
                <Building2 size={14} aria-hidden="true" />
                {book.publisher}
              </span>
              {discountPct !== null && (
                <span className="discount-badge">-{discountPct}% na feira</span>
              )}
            </div>

            <h1 className="book-detail-title">{book.name}</h1>
            {enrichment?.subtitle && (
              <p className="book-detail-subtitle">{enrichment.subtitle}</p>
            )}

            <p className="book-detail-authors">
              <UserPen size={16} aria-hidden="true" />
              <span>{book.authors}</span>
            </p>

            <div className="book-detail-pricing-box">
              <div className="book-detail-prices">
                {book.originalPrice > 0 && book.originalPrice > book.unitPrice && (
                  <span className="price-original">De {formatBRL(book.originalPrice)}</span>
                )}
                <strong className="book-detail-price">
                  {book.unitPrice > 0
                    ? formatBRL(book.unitPrice)
                    : book.priceDiscount || book.price || 'Preço sob consulta'}
                </strong>
                {savings > 0 && (
                  <span className="book-detail-savings">
                    Economia de {formatBRL(savings)}
                  </span>
                )}
              </div>

              <div className="book-detail-cart-controls">
                {qtyInCart > 0 ? (
                  <>
                    <div className="qty-stepper" aria-label={`Quantidade de ${book.name}`}>
                      <button
                        type="button"
                        className="qty-btn"
                        aria-label={`Diminuir quantidade de ${book.name}`}
                        onClick={() => void handleUpdateQty(qtyInCart - 1)}
                      >
                        <Minus size={15} aria-hidden="true" />
                      </button>
                      <span className="qty-value">{qtyInCart}</span>
                      <button
                        type="button"
                        className="qty-btn"
                        aria-label={`Aumentar quantidade de ${book.name}`}
                        disabled={qtyInCart >= 99}
                        onClick={() => void handleUpdateQty(qtyInCart + 1)}
                      >
                        <Plus size={15} aria-hidden="true" />
                      </button>
                    </div>
                    <button type="button" className="btn btn-added" onClick={onGoToCart}>
                      <ShoppingBag size={16} aria-hidden="true" />
                      <span>Ver no carrinho</span>
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => void handleAdd()}
                  >
                    <Plus size={17} aria-hidden="true" />
                    <span>Adicionar ao carrinho</span>
                  </button>
                )}
              </div>
            </div>

            <div className="book-detail-links">
              {hasPublisherLink && (
                <a
                  href={book.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-outline btn-sm"
                >
                  <ExternalLink size={15} aria-hidden="true" />
                  <span>Abrir página oficial da editora</span>
                </a>
              )}
              {enrichment?.openLibraryUrl && (
                <a
                  href={enrichment.openLibraryUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-ghost btn-sm"
                >
                  <ExternalLink size={15} aria-hidden="true" />
                  <span>Ver na Open Library</span>
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="book-detail-extra">
          <div className="book-detail-block">
            <h2>Sobre o livro</h2>
            {loadingExtra ? (
              <div className="detail-loading" role="status">
                <Loader2 size={18} className="spin" aria-hidden="true" />
                <span>Buscando sinopse e ficha técnica pelo ISBN...</span>
              </div>
            ) : enrichment?.synopsis ? (
              <p className="book-synopsis">{enrichment.synopsis}</p>
            ) : (
              <p className="book-synopsis-empty">
                Sinopse não disponível nas bases públicas para este título.
                {hasPublisherLink
                  ? ' Você pode conferir mais detalhes diretamente na página oficial da editora acima.'
                  : ''}
              </p>
            )}

            {mergedSubjects.length > 0 && (
              <div className="subject-tags" aria-label="Assuntos">
                {mergedSubjects.map((subj) => (
                  <span key={subj} className="subject-tag">
                    {subj}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="book-detail-block">
            <h2>Ficha técnica</h2>
            <dl className="metadata-grid">
              {metadataRows.map((row) => (
                <div key={row.label} className="metadata-item">
                  <dt>{row.label}</dt>
                  <dd>{row.value}</dd>
                </div>
              ))}
            </dl>
            {enrichment && enrichment.sources.length > 0 && (
              <p className="enrichment-attribution">
                Informações complementares obtidas via {enrichment.sources.join(' e ')}.
              </p>
            )}
          </div>
        </div>
      </article>
    </section>
  );
}

