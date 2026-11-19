import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
  type Timestamp,
} from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from './AuthContext';
import type { Book, CartItem, PublisherGroup } from '../types/book';

const LOCAL_STORAGE_KEY = 'busca-livros-usp:guest-cart:v1';

interface FirestoreCartDoc {
  id: string;
  name: string;
  authors: string;
  publisher: string;
  isbn?: string;
  subject?: string;
  price?: string;
  priceDiscount?: string;
  unitPrice: number;
  originalPrice?: number;
  link?: string;
  quantity: number;
  addedAt?: Timestamp | null;
}

interface CartContextValue {
  items: CartItem[];
  groupedByPublisher: PublisherGroup[];
  totalItems: number;
  totalPrice: number;
  totalOriginalPrice: number;
  totalSavings: number;
  loading: boolean;
  error: string | null;
  getItemQuantity: (bookId: string) => number;
  addBook: (book: Book) => Promise<void>;
  updateQuantity: (bookId: string, quantity: number) => Promise<void>;
  removeBook: (bookId: string) => Promise<void>;
  clearCart: () => Promise<void>;
}

const CartContext = createContext<CartContextValue | null>(null);

function readLocalCart(): CartItem[] {
  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

function writeLocalCart(items: CartItem[]): void {
  try {
    window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Ignore storage quota errors
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [items, setItems] = useState<CartItem[]>(() => readLocalCart());
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Sync cart with Firestore when authenticated, or fallback to localStorage when guest
  useEffect(() => {
    if (authLoading) return;

    if (!user || !db) {
      setItems(readLocalCart());
      setLoading(false);
      setError(null);
      return;
    }

    const firestore = db;
    const cartRef = collection(firestore, 'users', user.uid, 'cartItems');
    setLoading(true);
    setError(null);

    // Merge any guest items into the authenticated user's Firestore cart once
    const guestItems = readLocalCart();
    if (guestItems.length > 0) {
      const mergeGuestItems = async () => {
        try {
          const existingSnap = await getDocs(cartRef);
          const existingMap = new Map<string, number>();
          existingSnap.forEach((docSnap) => {
            const data = docSnap.data() as Partial<FirestoreCartDoc>;
            existingMap.set(docSnap.id, typeof data.quantity === 'number' ? data.quantity : 1);
          });

          const batch = writeBatch(firestore);
          for (const item of guestItems) {
            const itemRef = doc(cartRef, item.id);
            const currentQty = existingMap.get(item.id) ?? 0;
            if (currentQty > 0) {
              batch.update(itemRef, {
                quantity: Math.min(99, currentQty + item.quantity),
              });
            } else {
              batch.set(itemRef, {
                id: item.id,
                name: item.name,
                authors: item.authors,
                publisher: item.publisher,
                isbn: item.isbn,
                subject: item.subject,
                price: item.price,
                priceDiscount: item.priceDiscount,
                unitPrice: item.unitPrice,
                originalPrice: item.originalPrice,
                link: item.link,
                quantity: Math.min(99, Math.max(1, item.quantity)),
                addedAt: serverTimestamp(),
              });
            }
          }
          await batch.commit();
          window.localStorage.removeItem(LOCAL_STORAGE_KEY);
        } catch (err) {
          console.error('Erro ao mesclar carrinho local:', err);
        }
      };
      void mergeGuestItems();
    }

    const unsubscribe = onSnapshot(
      cartRef,
      (snapshot) => {
        const nextItems: CartItem[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data() as FirestoreCartDoc;
          return {
            id: data.id || docSnap.id,
            name: data.name || 'Título não informado',
            authors: data.authors || 'Autor não informado',
            publisher: data.publisher || 'Editora não informada',
            isbn: data.isbn || '',
            subject: data.subject || '',
            price: data.price || '',
            priceDiscount: data.priceDiscount || '',
            unitPrice: typeof data.unitPrice === 'number' ? data.unitPrice : 0,
            originalPrice: typeof data.originalPrice === 'number' ? data.originalPrice : 0,
            link: data.link || '',
            quantity: typeof data.quantity === 'number' ? data.quantity : 1,
            addedAtMs: data.addedAt?.toMillis?.() ?? Date.now(),
          };
        });

        setItems(nextItems);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Erro ao escutar carrinho no Firestore:', err);
        setError('Não foi possível sincronizar seu carrinho com o Firebase.');
        setLoading(false);
      },
    );

    return unsubscribe;
  }, [user, authLoading]);

  const itemQuantityMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of items) {
      map.set(item.id, item.quantity);
    }
    return map;
  }, [items]);

  const getItemQuantity = useCallback(
    (bookId: string) => itemQuantityMap.get(bookId) ?? 0,
    [itemQuantityMap],
  );

  const addBook = useCallback(
    async (book: Book) => {
      if (user && db) {
        const itemRef = doc(db, 'users', user.uid, 'cartItems', book.id);
        const currentQty = itemQuantityMap.get(book.id) ?? 0;

        if (currentQty > 0) {
          await updateDoc(itemRef, {
            quantity: Math.min(99, currentQty + 1),
          });
        } else {
          await setDoc(itemRef, {
            id: book.id,
            name: book.name,
            authors: book.authors,
            publisher: book.publisher,
            isbn: book.isbn,
            subject: book.subject,
            price: book.price,
            priceDiscount: book.priceDiscount,
            unitPrice: book.unitPrice,
            originalPrice: book.originalPrice,
            link: book.link,
            quantity: 1,
            addedAt: serverTimestamp(),
          });
        }
        return;
      }

      setItems((prev) => {
        const existing = prev.find((i) => i.id === book.id);
        const next = existing
          ? prev.map((i) =>
              i.id === book.id ? { ...i, quantity: Math.min(99, i.quantity + 1) } : i,
            )
          : [...prev, { ...book, quantity: 1, addedAtMs: Date.now() }];
        writeLocalCart(next);
        return next;
      });
    },
    [user, itemQuantityMap],
  );

  const updateQuantity = useCallback(
    async (bookId: string, quantity: number) => {
      if (user && db) {
        const itemRef = doc(db, 'users', user.uid, 'cartItems', bookId);
        if (quantity <= 0) {
          await deleteDoc(itemRef);
        } else {
          await updateDoc(itemRef, { quantity: Math.min(99, quantity) });
        }
        return;
      }

      setItems((prev) => {
        const next =
          quantity <= 0
            ? prev.filter((i) => i.id !== bookId)
            : prev.map((i) => (i.id === bookId ? { ...i, quantity: Math.min(99, quantity) } : i));
        writeLocalCart(next);
        return next;
      });
    },
    [user],
  );

  const removeBook = useCallback(
    async (bookId: string) => {
      if (user && db) {
        await deleteDoc(doc(db, 'users', user.uid, 'cartItems', bookId));
        return;
      }

      setItems((prev) => {
        const next = prev.filter((i) => i.id !== bookId);
        writeLocalCart(next);
        return next;
      });
    },
    [user],
  );

  const clearCart = useCallback(async () => {
    if (user && db) {
      const cartRef = collection(db, 'users', user.uid, 'cartItems');
      const snap = await getDocs(cartRef);
      if (snap.empty) return;
      const batch = writeBatch(db);
      snap.forEach((docSnap) => batch.delete(docSnap.ref));
      await batch.commit();
      return;
    }

    setItems([]);
    writeLocalCart([]);
  }, [user]);

  const groupedByPublisher = useMemo<PublisherGroup[]>(() => {
    const groupsMap = new Map<string, CartItem[]>();
    for (const item of items) {
      const key = item.publisher || 'Editora não informada';
      const list = groupsMap.get(key) ?? [];
      list.push(item);
      groupsMap.set(key, list);
    }

    return Array.from(groupsMap.entries())
      .sort(([pubA], [pubB]) => pubA.localeCompare(pubB, 'pt-BR', { sensitivity: 'base' }))
      .map(([publisher, groupItems]) => {
        const sortedItems = [...groupItems].sort((a, b) =>
          a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }),
        );
        const totalQuantity = sortedItems.reduce((sum, item) => sum + item.quantity, 0);
        const subtotal = sortedItems.reduce(
          (sum, item) => sum + item.unitPrice * item.quantity,
          0,
        );
        const originalSubtotal = sortedItems.reduce(
          (sum, item) =>
            sum + (item.originalPrice > 0 ? item.originalPrice : item.unitPrice) * item.quantity,
          0,
        );
        return {
          publisher,
          items: sortedItems,
          totalQuantity,
          subtotal,
          originalSubtotal,
        };
      });
  }, [items]);

  const { totalItems, totalPrice, totalOriginalPrice, totalSavings } = useMemo(() => {
    const count = items.reduce((sum, item) => sum + item.quantity, 0);
    const total = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    const original = items.reduce(
      (sum, item) =>
        sum + (item.originalPrice > 0 ? item.originalPrice : item.unitPrice) * item.quantity,
      0,
    );
    return {
      totalItems: count,
      totalPrice: total,
      totalOriginalPrice: original,
      totalSavings: Math.max(0, original - total),
    };
  }, [items]);

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      groupedByPublisher,
      totalItems,
      totalPrice,
      totalOriginalPrice,
      totalSavings,
      loading,
      error,
      getItemQuantity,
      addBook,
      updateQuantity,
      removeBook,
      clearCart,
    }),
    [
      items,
      groupedByPublisher,
      totalItems,
      totalPrice,
      totalOriginalPrice,
      totalSavings,
      loading,
      error,
      getItemQuantity,
      addBook,
      updateQuantity,
      removeBook,
      clearCart,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error('useCart deve ser usado dentro de CartProvider.');
  }
  return ctx;
}

