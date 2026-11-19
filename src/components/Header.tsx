import { BookOpen, LogIn, LogOut, Search, ShoppingBag, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { formatBRL } from '../utils/format';

export type ActiveTab = 'search' | 'cart';

interface HeaderProps {
  activeTab: ActiveTab;
  onChangeTab: (tab: ActiveTab) => void;
  onOpenAuth: (mode: 'login' | 'register') => void;
}

export function Header({ activeTab, onChangeTab, onOpenAuth }: HeaderProps) {
  const { user, loading, isConfigured, logout } = useAuth();
  const { totalItems, totalPrice } = useCart();

  return (
    <>
    <header className="app-header">
      <div className="container header-inner">
        <button
          type="button"
          className="brand"
          onClick={() => onChangeTab('search')}
          aria-label="Ir para a busca de livros"
        >
          <span className="brand-icon" aria-hidden="true">
            <BookOpen size={22} />
          </span>
          <span className="brand-text">
            <strong>Festa do Livro USP</strong>
            <small>28ª edição · Lista de compras</small>
          </span>
        </button>

        <nav className="header-nav" aria-label="Navegação principal">
          <button
            type="button"
            className={`nav-tab ${activeTab === 'search' ? 'is-active' : ''}`}
            aria-current={activeTab === 'search' ? 'page' : undefined}
            onClick={() => onChangeTab('search')}
          >
            <Search size={17} aria-hidden="true" />
            <span>Buscar livros</span>
          </button>

          <button
            type="button"
            className={`nav-tab nav-tab-cart ${activeTab === 'cart' ? 'is-active' : ''}`}
            aria-current={activeTab === 'cart' ? 'page' : undefined}
            onClick={() => onChangeTab('cart')}
          >
            <ShoppingBag size={17} aria-hidden="true" />
            <span>Carrinho</span>
            {totalItems > 0 && (
              <span className="cart-pill">
                {totalItems} · {formatBRL(totalPrice)}
              </span>
            )}
          </button>
        </nav>

        <div className="header-auth">
          {loading ? (
            <span className="auth-status-muted">Carregando...</span>
          ) : user ? (
            <div className="user-chip">
              <span className="user-avatar" aria-hidden="true">
                <User size={15} />
              </span>
              <span className="user-label" title={user.email ?? undefined}>
                {user.displayName || user.email}
              </span>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => void logout()}
                title="Sair da conta"
              >
                <LogOut size={15} aria-hidden="true" />
                <span>Sair</span>
              </button>
            </div>
          ) : (
            <div className="auth-actions">
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => onOpenAuth('login')}
                disabled={!isConfigured}
                title={
                  isConfigured
                    ? 'Entrar na sua conta'
                    : 'Configure as variáveis do Firebase no .env para ativar o login'
                }
              >
                <LogIn size={15} aria-hidden="true" />
                <span>Entrar</span>
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => onOpenAuth('register')}
                disabled={!isConfigured}
                title={
                  isConfigured
                    ? 'Criar uma conta gratuita'
                    : 'Configure as variáveis do Firebase no .env para ativar o cadastro'
                }
              >
                Criar conta
              </button>
            </div>
          )}
        </div>
      </div>
    </header>

    <nav className="bottom-nav" aria-label="Navegação principal (celular)">
      <button
        type="button"
        className={`bottom-nav-item ${activeTab === 'search' ? 'is-active' : ''}`}
        aria-current={activeTab === 'search' ? 'page' : undefined}
        onClick={() => onChangeTab('search')}
      >
        <Search size={20} aria-hidden="true" />
        <span>Buscar</span>
      </button>
      <button
        type="button"
        className={`bottom-nav-item ${activeTab === 'cart' ? 'is-active' : ''}`}
        aria-current={activeTab === 'cart' ? 'page' : undefined}
        onClick={() => onChangeTab('cart')}
      >
        <span className="bottom-nav-icon">
          <ShoppingBag size={20} aria-hidden="true" />
          {totalItems > 0 && <span className="bottom-nav-badge">{totalItems}</span>}
        </span>
        <span>Carrinho</span>
      </button>
    </nav>
    </>
  );
}

