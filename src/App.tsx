import { useState } from 'react';
import { Cloud, CloudOff, Info } from 'lucide-react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';
import { Header, type ActiveTab } from './components/Header';
import { SearchSection } from './components/SearchSection';
import { CartSection } from './components/CartSection';
import { BookDetailsPage } from './components/BookDetailsPage';
import { AuthDialog, type AuthMode } from './components/AuthDialog';
import type { Book } from './types/book';

function AppShell() {
  const { user, loading: authLoading, isConfigured } = useAuth();
  const [activeTab, setActiveTab] = useState<ActiveTab>('search');
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [returnTab, setReturnTab] = useState<ActiveTab>('search');
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>('login');

  const openAuth = (mode: AuthMode) => {
    setAuthMode(mode);
    setAuthDialogOpen(true);
  };

  const handleChangeTab = (tab: ActiveTab) => {
    setSelectedBook(null);
    setActiveTab(tab);
  };

  const handleSelectBook = (book: Book, from: ActiveTab) => {
    setReturnTab(from);
    setSelectedBook(book);
  };

  return (
    <div className="app-shell">
      <Header
        activeTab={activeTab}
        onChangeTab={handleChangeTab}
        onOpenAuth={openAuth}
      />

      {!isConfigured ? (
        <div className="status-banner status-banner-warning" role="status">
          <div className="container status-banner-inner">
            <Info size={16} aria-hidden="true" />
            <span>
              <strong>Modo local:</strong> configure as variáveis <code>VITE_FIREBASE_*</code> no
              arquivo <code>.env</code> para ativar cadastro, login e sincronização do carrinho no
              Firebase.
            </span>
          </div>
        </div>
      ) : !authLoading && !user ? (
        <div className="status-banner status-banner-info" role="status">
          <div className="container status-banner-inner">
            <CloudOff size={16} aria-hidden="true" />
            <span>
              Sua lista está salva neste navegador.{' '}
              <button
                type="button"
                className="inline-link"
                onClick={() => openAuth('login')}
              >
                Entre
              </button>{' '}
              ou{' '}
              <button
                type="button"
                className="inline-link"
                onClick={() => openAuth('register')}
              >
                crie uma conta
              </button>{' '}
              para sincronizar seu carrinho na nuvem.
            </span>
          </div>
        </div>
      ) : user ? (
        <div className="status-banner status-banner-synced">
          <div className="container status-banner-inner">
            <Cloud size={15} aria-hidden="true" />
            <span>Carrinho sincronizado com sua conta ({user.email}).</span>
          </div>
        </div>
      ) : null}

      <main className="container app-main">
        {selectedBook && (
          <BookDetailsPage
            book={selectedBook}
            backLabel={
              returnTab === 'cart' ? 'Voltar para o carrinho' : 'Voltar para a busca'
            }
            onBack={() => {
              setSelectedBook(null);
              setActiveTab(returnTab);
            }}
            onGoToCart={() => handleChangeTab('cart')}
          />
        )}

        <div hidden={Boolean(selectedBook) || activeTab !== 'search'}>
          <SearchSection
            onGoToCart={() => handleChangeTab('cart')}
            onSelectBook={(book) => handleSelectBook(book, 'search')}
          />
        </div>

        {!selectedBook && activeTab === 'cart' && (
          <CartSection
            onBackToSearch={() => handleChangeTab('search')}
            onSelectBook={(book) => handleSelectBook(book, 'cart')}
          />
        )}
      </main>

      <footer className="app-footer">
        <div className="container footer-inner">
          <p>
            Dados consultados em tempo real na API oficial da{' '}
            <a
              href="https://festadolivro.edusp.com.br/28-festa-do-livro-da-usp/busca-por-livros"
              target="_blank"
              rel="noopener noreferrer"
            >
              28ª Festa do Livro da USP (Edusp)
            </a>
            .
          </p>
        </div>
      </footer>

      <AuthDialog
        open={authDialogOpen}
        mode={authMode}
        onModeChange={setAuthMode}
        onClose={() => setAuthDialogOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <AppShell />
      </CartProvider>
    </AuthProvider>
  );
}

