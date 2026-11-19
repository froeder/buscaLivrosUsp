import { useState } from 'react';
import {
  ArrowLeft,
  Building2,
  Loader2,
  Minus,
  Plus,
  ShoppingBag,
  Trash2,
} from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import { formatBRL } from '../utils/format';

interface CartSectionProps {
  onBackToSearch: () => void;
}

export function CartSection({ onBackToSearch }: CartSectionProps) {
  const {
    groupedByPublisher,
    totalItems,
    totalPrice,
    totalOriginalPrice,
    totalSavings,
    loading,
    error,
    updateQuantity,
    removeBook,
    clearCart,
  } = useCart();

  const [confirmClear, setConfirmClear] = useState(false);

  if (loading) {
    return (
      <section className="cart-section" aria-label="Carrinho de compras">
        <div className="loading-state" role="status">
          <Loader2 size={28} className="spin" aria-hidden="true" />
          <p>Carregando sua lista de compras...</p>
        </div>
      </section>
    );
  }

  return (
    <section className="cart-section" aria-label="Carrinho de compras">
      <div className="cart-header">
        <div>
          <button
            type="button"
            className="btn btn-ghost btn-sm back-link"
            onClick={onBackToSearch}
          >
            <ArrowLeft size={16} aria-hidden="true" />
            <span>Voltar para a busca</span>
          </button>
          <h1>Meu Carrinho de Compras</h1>
          <p className="cart-subtitle">
            Livros organizados por editora para facilitar sua visita às bancas da Festa do Livro.
          </p>
        </div>

        {totalItems > 0 && (
          <div className="cart-clear-wrap">
            {confirmClear ? (
              <div className="confirm-clear">
                <span>Limpar toda a lista?</span>
                <button
                  type="button"
                  className="btn btn-danger btn-sm"
                  onClick={() => {
                    void clearCart();
                    setConfirmClear(false);
                  }}
                >
                  Confirmar
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setConfirmClear(false)}
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => setConfirmClear(true)}
              >
                <Trash2 size={15} aria-hidden="true" />
                <span>Limpar carrinho</span>
              </button>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="alert-error" role="alert">
          {error}
        </div>
      )}

      {totalItems === 0 ? (
        <div className="empty-state">
          <ShoppingBag size={40} aria-hidden="true" />
          <h2>Seu carrinho está vazio</h2>
          <p>
            Busque livros no catálogo da 28ª Festa do Livro da USP e adicione os títulos que deseja
            comprar.
          </p>
          <button type="button" className="btn btn-primary" onClick={onBackToSearch}>
            Buscar livros
          </button>
        </div>
      ) : (
        <div className="cart-layout">
          <div className="publisher-groups">
            {groupedByPublisher.map((group) => (
              <article key={group.publisher} className="publisher-card">
                <header className="publisher-card-header">
                  <div className="publisher-title-wrap">
                    <Building2 size={18} aria-hidden="true" />
                    <h2>{group.publisher}</h2>
                    <span className="publisher-count">
                      {group.totalQuantity} {group.totalQuantity === 1 ? 'livro' : 'livros'}
                    </span>
                  </div>
                  <div className="publisher-subtotal">
                    <span>Subtotal da editora</span>
                    <strong>{formatBRL(group.subtotal)}</strong>
                  </div>
                </header>

                <ul className="publisher-items">
                  {group.items.map((item) => (
                    <li key={item.id} className="cart-item">
                      <div className="cart-item-info">
                        <h3>{item.name}</h3>
                        <p className="cart-item-authors">{item.authors}</p>
                        <div className="cart-item-unit-price">
                          {item.originalPrice > item.unitPrice && (
                            <span className="price-original">{formatBRL(item.originalPrice)}</span>
                          )}
                          <span>
                            {item.unitPrice > 0
                              ? `${formatBRL(item.unitPrice)} cada`
                              : 'Preço sob consulta'}
                          </span>
                        </div>
                      </div>

                      <div className="cart-item-controls">
                        <div className="qty-stepper" aria-label={`Quantidade de ${item.name}`}>
                          <button
                            type="button"
                            className="qty-btn"
                            aria-label={`Diminuir quantidade de ${item.name}`}
                            onClick={() => void updateQuantity(item.id, item.quantity - 1)}
                          >
                            <Minus size={14} aria-hidden="true" />
                          </button>
                          <span className="qty-value">{item.quantity}</span>
                          <button
                            type="button"
                            className="qty-btn"
                            aria-label={`Aumentar quantidade de ${item.name}`}
                            disabled={item.quantity >= 99}
                            onClick={() => void updateQuantity(item.id, item.quantity + 1)}
                          >
                            <Plus size={14} aria-hidden="true" />
                          </button>
                        </div>

                        <div className="cart-item-total">
                          {formatBRL(item.unitPrice * item.quantity)}
                        </div>

                        <button
                          type="button"
                          className="icon-btn icon-btn-danger"
                          aria-label={`Remover ${item.name} do carrinho`}
                          title="Remover livro"
                          onClick={() => void removeBook(item.id)}
                        >
                          <Trash2 size={16} aria-hidden="true" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>

          <aside className="summary-card" aria-label="Resumo da compra">
            <h2>Resumo da Compra</h2>

            <dl className="summary-stats">
              <div className="summary-row">
                <dt>Total de livros</dt>
                <dd>{totalItems}</dd>
              </div>
              <div className="summary-row">
                <dt>Editoras</dt>
                <dd>{groupedByPublisher.length}</dd>
              </div>
              {totalSavings > 0 && (
                <>
                  <div className="summary-row">
                    <dt>Preço de capa</dt>
                    <dd className="price-original">{formatBRL(totalOriginalPrice)}</dd>
                  </div>
                  <div className="summary-row summary-savings">
                    <dt>Economia na feira</dt>
                    <dd>- {formatBRL(totalSavings)}</dd>
                  </div>
                </>
              )}
            </dl>

            <div className="summary-publishers-breakdown">
              <h3>Por editora</h3>
              <ul>
                {groupedByPublisher.map((group) => (
                  <li key={group.publisher}>
                    <span>
                      {group.publisher} ({group.totalQuantity})
                    </span>
                    <strong>{formatBRL(group.subtotal)}</strong>
                  </li>
                ))}
              </ul>
            </div>

            <div className="summary-total">
              <span>Valor total</span>
              <strong>{formatBRL(totalPrice)}</strong>
            </div>
          </aside>
        </div>
      )}
    </section>
  );
}

