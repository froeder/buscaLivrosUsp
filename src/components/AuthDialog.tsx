import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { Eye, EyeOff, X } from 'lucide-react';
import { mapAuthError, useAuth } from '../contexts/AuthContext';

export type AuthMode = 'login' | 'register';

interface AuthDialogProps {
  open: boolean;
  mode: AuthMode;
  onModeChange: (mode: AuthMode) => void;
  onClose: () => void;
}

export function AuthDialog({ open, mode, onModeChange, onClose }: AuthDialogProps) {
  const { login, register, loginWithGoogle } = useAuth();
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);
  const titleId = useId();

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ email: boolean; password: boolean }>({
    email: false,
    password: false,
  });

  // Open/close native modal <dialog> via showModal()
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      setServerError(null);
      setFieldErrors({ email: false, password: false });
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  // Fallback for browsers without native <dialog closedby="any"> support (e.g. Safari)
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleClose = () => onClose();
    dialog.addEventListener('close', handleClose);

    const handleBackdropClick = (event: MouseEvent) => {
      if ('closedBy' in HTMLDialogElement.prototype) return;
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      const isInside =
        rect.top <= event.clientY &&
        event.clientY <= rect.top + rect.height &&
        rect.left <= event.clientX &&
        event.clientX <= rect.left + rect.width;
      if (!isInside) {
        dialog.close();
      }
    };

    dialog.addEventListener('click', handleBackdropClick);
    return () => {
      dialog.removeEventListener('close', handleClose);
      dialog.removeEventListener('click', handleBackdropClick);
    };
  }, [onClose]);

  const syncFieldValidity = (input: HTMLInputElement, field: 'email' | 'password') => {
    const isInvalid = input.matches(':user-invalid') || !input.validity.valid;
    setFieldErrors((prev) => (prev[field] === isInvalid ? prev : { ...prev, [field]: isInvalid }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setServerError(null);

    const form = formRef.current;
    if (form && !form.checkValidity()) {
      const emailInput = form.elements.namedItem('email') as HTMLInputElement | null;
      const passwordInput = form.elements.namedItem('password') as HTMLInputElement | null;
      setFieldErrors({
        email: Boolean(emailInput && !emailInput.validity.valid),
        password: Boolean(passwordInput && !passwordInput.validity.valid),
      });
      form.reportValidity();
      return;
    }

    setSubmitting(true);
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register(email, password, displayName);
      }
      setPassword('');
      onClose();
    } catch (err) {
      setServerError(mapAuthError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setServerError(null);
    setSubmitting(true);
    try {
      await loginWithGoogle();
      onClose();
    } catch (err) {
      setServerError(mapAuthError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const switchMode = (nextMode: AuthMode) => {
    setServerError(null);
    setFieldErrors({ email: false, password: false });
    onModeChange(nextMode);
  };

  return (
    <dialog
      ref={dialogRef}
      className="auth-dialog"
      aria-labelledby={titleId}
      {...({ closedby: 'any' } as Record<string, string>)}
    >
      <div className="auth-dialog-body">
        <div className="auth-dialog-header">
          <div>
            <h2 id={titleId}>{mode === 'login' ? 'Entrar na sua conta' : 'Criar conta'}</h2>
            <p className="auth-subtitle">
              {mode === 'login'
                ? 'Acesse sua lista de compras salva na nuvem.'
                : 'Salve sua lista de livros da Festa do Livro em qualquer dispositivo.'}
            </p>
          </div>
          <button
            type="button"
            className="icon-btn"
            onClick={onClose}
            aria-label="Fechar janela de autenticação"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <div className="auth-tabs" role="tablist" aria-label="Modo de autenticação">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'login'}
            className={`auth-tab ${mode === 'login' ? 'is-active' : ''}`}
            onClick={() => switchMode('login')}
          >
            Entrar
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'register'}
            className={`auth-tab ${mode === 'register' ? 'is-active' : ''}`}
            onClick={() => switchMode('register')}
          >
            Cadastrar
          </button>
        </div>

        {serverError && (
          <div className="alert-error" role="alert">
            {serverError}
          </div>
        )}

        <form ref={formRef} className="auth-form" onSubmit={handleSubmit} noValidate>
          {mode === 'register' && (
            <div className="field">
              <label htmlFor="auth-full-name">Nome (opcional)</label>
              <input
                id="auth-full-name"
                name="full-name"
                type="text"
                autoComplete="name"
                enterKeyHint="next"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Como prefere ser chamado(a)"
              />
            </div>
          )}

          <div className="field">
            <label htmlFor="auth-email">E-mail</label>
            <span id="auth-email-hint" className="field-hint">
              Formato: voce@exemplo.com
            </span>
            <input
              id="auth-email"
              name="email"
              type="email"
              required
              autoComplete="username"
              spellCheck={false}
              enterKeyHint="next"
              aria-invalid={fieldErrors.email ? 'true' : 'false'}
              aria-describedby={
                fieldErrors.email ? 'auth-email-hint auth-email-error' : 'auth-email-hint'
              }
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (fieldErrors.email) syncFieldValidity(e.currentTarget, 'email');
              }}
              onBlur={(e) => syncFieldValidity(e.currentTarget, 'email')}
              placeholder="voce@exemplo.com"
            />
            <div id="auth-email-error" className="error-msg">
              <span role="img" aria-label="Erro">
                ⚠
              </span>{' '}
              Informe um endereço de e-mail válido no formato voce@exemplo.com.
            </div>
          </div>

          <div className="field">
            <label htmlFor="auth-password">Senha</label>
            <span id="auth-password-hint" className="field-hint">
              Mínimo de 6 caracteres.
            </span>
            <div className="password-input-wrap">
              <input
                id="auth-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                required
                minLength={6}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                enterKeyHint="done"
                aria-invalid={fieldErrors.password ? 'true' : 'false'}
                aria-describedby={
                  fieldErrors.password
                    ? 'auth-password-hint auth-password-error'
                    : 'auth-password-hint'
                }
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (fieldErrors.password) syncFieldValidity(e.currentTarget, 'password');
                }}
                onBlur={(e) => syncFieldValidity(e.currentTarget, 'password')}
                placeholder="Digite sua senha"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                aria-pressed={showPassword}
              >
                {showPassword ? (
                  <EyeOff size={18} aria-hidden="true" />
                ) : (
                  <Eye size={18} aria-hidden="true" />
                )}
              </button>
            </div>
            <div id="auth-password-error" className="error-msg">
              <span role="img" aria-label="Erro">
                ⚠
              </span>{' '}
              A senha deve ter pelo menos 6 caracteres.
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
            {submitting
              ? 'Aguarde...'
              : mode === 'login'
                ? 'Entrar'
                : 'Criar conta'}
          </button>
        </form>

        <div className="auth-divider">
          <span>ou</span>
        </div>

        <button
          type="button"
          className="btn btn-outline btn-block"
          onClick={() => void handleGoogleSignIn()}
          disabled={submitting}
        >
          Continuar com Google
        </button>
      </div>
    </dialog>
  );
}

