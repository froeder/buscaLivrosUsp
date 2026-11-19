import { useState } from 'react';
import { Cloud, CloudOff, Info } from 'lucide-react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';
import { Header, type ActiveTab } from './components/Header';
import { SearchSection } from './components/SearchSection';
import { CartSection } from './components/CartSection';
import { AuthDialog, type AuthMode } from './components/AuthDialog';

function AppShell() {
  const { user, loading: authLoading, isConfigured } = useAuth();
  const [activeTab, setActiveTab] = useState<ActiveTab>('search');
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>('login');

  const openAuth = (mode: AuthMode) => {
    setAuthMode(mode);
    setAuthDialogOpen(true);
  };

  return (
    <div className="app-shell">
      <Header
        activeTab={activeTab}
        onChangeTab={setActiveTab}
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
        {activeTab === 'search' ? (
          <SearchSection onGoToCart={() => setActiveTab('cart')} />
        ) : (
          <CartSection onBackToSearch={() => setActiveTab('search')} />
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

