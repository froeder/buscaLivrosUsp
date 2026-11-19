import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import { auth, isFirebaseConfigured } from '../services/firebase';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  isConfigured: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName?: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function mapAuthError(error: unknown): string {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code?: unknown }).code)
      : '';

  switch (code) {
    case 'auth/invalid-email':
      return 'Informe um endereço de e-mail válido.';
    case 'auth/user-disabled':
      return 'Esta conta foi desativada.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'E-mail ou senha incorretos. Verifique os dados e tente novamente.';
    case 'auth/email-already-in-use':
      return 'Já existe uma conta cadastrada com este e-mail.';
    case 'auth/weak-password':
      return 'A senha deve ter pelo menos 6 caracteres.';
    case 'auth/too-many-requests':
      return 'Muitas tentativas seguidas. Aguarde alguns instantes e tente novamente.';
    case 'auth/popup-closed-by-user':
      return 'Login com Google cancelado.';
    case 'auth/unauthorized-domain':
      return 'Domínio não autorizado no Firebase Auth. Adicione localhost em Domínios autorizados no Console do Firebase.';
    case 'auth/network-request-failed':
      return 'Erro de conexão. Verifique sua internet e tente novamente.';
    default:
      return 'Não foi possível concluir a autenticação. Tente novamente.';
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(isFirebaseConfigured);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      isConfigured: isFirebaseConfigured,
      async login(email: string, password: string) {
        if (!auth) {
          throw new Error('Firebase não configurado.');
        }
        await signInWithEmailAndPassword(auth, email.trim(), password);
      },
      async register(email: string, password: string, displayName?: string) {
        if (!auth) {
          throw new Error('Firebase não configurado.');
        }
        const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
        const trimmedName = displayName?.trim();
        if (trimmedName) {
          await updateProfile(credential.user, { displayName: trimmedName });
          // Refresh local user state with displayName
          setUser({ ...credential.user, displayName: trimmedName } as User);
        }
      },
      async loginWithGoogle() {
        if (!auth) {
          throw new Error('Firebase não configurado.');
        }
        const provider = new GoogleAuthProvider();
        await signInWithPopup(auth, provider);
      },
      async logout() {
        if (!auth) return;
        await signOut(auth);
      },
    }),
    [user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider.');
  }
  return ctx;
}

