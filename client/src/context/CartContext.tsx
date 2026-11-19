import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  CART_STORAGE_KEY,
  addLine,
  cartCount,
  cartSubtotal,
  parseStoredCart,
  removeLine,
  updateQuantity,
  type CartLine,
  type CartLineInput,
} from '../lib/cart';
import { trackEvent } from '../lib/analytics';
import { useToast } from './ToastContext';

interface CartContextValue {
  lines: CartLine[];
  count: number;
  subtotal: number;
  addItem: (input: CartLineInput) => void;
  setQuantity: (key: string, quantity: number) => void;
  removeItem: (key: string) => void;
  replaceLines: (lines: CartLine[]) => void;
  clear: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>(() => {
    try {
      return parseStoredCart(window.localStorage.getItem(CART_STORAGE_KEY));
    } catch {
      return [];
    }
  });
  const toast = useToast();

  useEffect(() => {
    try {
      window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(lines));
    } catch {
      // Storage can be unavailable (private mode, quota); cart still works in memory.
    }
  }, [lines]);

  const addItem = useCallback(
    (input: CartLineInput) => {
      setLines((current) => addLine(current, input));
      trackEvent('add_to_cart', { productSlug: input.slug });
      toast.success('Added to your ritual', `${input.name}${input.variantLabel ? ` — ${input.variantLabel}` : ''}`);
    },
    [toast],
  );

  const setQuantity = useCallback((key: string, quantity: number) => {
    setLines((current) => updateQuantity(current, key, quantity));
  }, []);

  const removeItem = useCallback((key: string) => {
    setLines((current) => removeLine(current, key));
  }, []);

  const replaceLines = useCallback((next: CartLine[]) => setLines(next), []);

  const clear = useCallback(() => setLines([]), []);

  const value = useMemo<CartContextValue>(
    () => ({
      lines,
      count: cartCount(lines),
      subtotal: cartSubtotal(lines),
      addItem,
      setQuantity,
      removeItem,
      replaceLines,
      clear,
    }),
    [lines, addItem, setQuantity, removeItem, replaceLines, clear],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used inside CartProvider');
  return context;
}
