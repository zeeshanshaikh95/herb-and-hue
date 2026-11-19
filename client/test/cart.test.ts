import { describe, expect, it } from 'vitest';
import {
  CART_STORAGE_KEY,
  MAX_QUANTITY,
  addLine,
  cartCount,
  cartSubtotal,
  cartToWhatsAppLines,
  clampQuantity,
  lineKey,
  parseStoredCart,
  removeLine,
  updateQuantity,
  type CartLine,
} from '../src/lib/cart';

const base = {
  productId: 'p1',
  slug: 'rose-mist',
  name: 'Rose Mist',
  image: '/images/rose.svg',
  price: 1800,
};

function cartWithVariant(): CartLine[] {
  return addLine([], { ...base, variantId: 'v1', variantLabel: '100 ml', quantity: 2 });
}

describe('cart line management', () => {
  it('uses distinct keys for separate variants of the same product', () => {
    expect(lineKey('p1', null)).not.toBe(lineKey('p1', 'v1'));
    let lines = addLine([], { ...base, quantity: 1 });
    lines = addLine(lines, { ...base, variantId: 'v1', variantLabel: '100 ml', quantity: 1 });
    expect(lines).toHaveLength(2);
  });

  it('merges repeat additions of the same line', () => {
    let lines = addLine([], { ...base, quantity: 1 });
    lines = addLine(lines, { ...base, quantity: 2 });
    expect(lines).toHaveLength(1);
    expect(lines[0].quantity).toBe(3);
  });

  it('clamps quantities into the supported range', () => {
    expect(clampQuantity(0)).toBe(1);
    expect(clampQuantity(-5)).toBe(1);
    expect(clampQuantity(2.9)).toBe(2);
    expect(clampQuantity(MAX_QUANTITY + 100)).toBe(MAX_QUANTITY);
    expect(clampQuantity(Number.NaN)).toBe(1);

    const lines = addLine([], { ...base, quantity: 500 });
    expect(lines[0].quantity).toBe(MAX_QUANTITY);

    const updated = updateQuantity(lines, lines[0].key, 0);
    expect(updated[0].quantity).toBe(1);
  });

  it('removes lines and calculates count and subtotal in minor units', () => {
    let lines = addLine([], { ...base, quantity: 2 });
    lines = addLine(lines, { ...base, productId: 'p2', slug: 'serum', name: 'Serum', price: 3200, quantity: 1 });
    expect(cartCount(lines)).toBe(3);
    expect(cartSubtotal(lines)).toBe(1800 * 2 + 3200);

    const removed = removeLine(lines, lineKey('p1', null));
    expect(removed).toHaveLength(1);
    expect(cartSubtotal(removed)).toBe(3200);
  });

  it('maps lines for the WhatsApp summary with per-line totals', () => {
    const mapped = cartToWhatsAppLines(cartWithVariant());
    expect(mapped).toEqual([
      { name: 'Rose Mist', variantLabel: '100 ml', quantity: 2, lineTotal: 3600 },
    ]);
  });
});

describe('persisted cart parsing', () => {
  it('returns an empty cart for missing, corrupt or non-array data', () => {
    expect(parseStoredCart(null)).toEqual([]);
    expect(parseStoredCart('')).toEqual([]);
    expect(parseStoredCart('not-json')).toEqual([]);
    expect(parseStoredCart('{}')).toEqual([]);
    expect(parseStoredCart('"string"')).toEqual([]);
  });

  it('drops malformed lines instead of trusting localStorage', () => {
    const valid = cartWithVariant()[0];
    const raw = JSON.stringify([
      valid,
      { ...valid, price: 'free' },
      { ...valid, variantId: 5 },
      { ...valid, quantity: 900 },
      null,
      { key: 'x' },
    ]);
    const parsed = parseStoredCart(raw);
    expect(parsed).toHaveLength(2);
    expect(parsed[1].quantity).toBe(MAX_QUANTITY);
  });

  it('keeps the storage key stable for existing shoppers', () => {
    expect(CART_STORAGE_KEY).toBe('herb-and-hue.cart.v1');
  });
});
