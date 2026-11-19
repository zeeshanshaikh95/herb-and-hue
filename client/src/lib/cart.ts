export interface CartLine {
  key: string;
  productId: string;
  slug: string;
  name: string;
  image: string;
  variantId: string | null;
  variantLabel: string | null;
  price: number;
  quantity: number;
}

export interface CartLineInput {
  productId: string;
  slug: string;
  name: string;
  image: string;
  variantId?: string | null;
  variantLabel?: string | null;
  price: number;
  quantity?: number;
}

export const CART_STORAGE_KEY = 'herb-and-hue.cart.v1';
export const MAX_QUANTITY = 99;

export function lineKey(productId: string, variantId: string | null | undefined): string {
  return `${productId}::${variantId ?? 'default'}`;
}

export function clampQuantity(quantity: number): number {
  if (!Number.isFinite(quantity)) return 1;
  return Math.min(MAX_QUANTITY, Math.max(1, Math.floor(quantity)));
}

export function addLine(lines: CartLine[], input: CartLineInput): CartLine[] {
  const key = lineKey(input.productId, input.variantId);
  const existing = lines.find((line) => line.key === key);
  if (existing) {
    return lines.map((line) =>
      line.key === key
        ? { ...line, quantity: clampQuantity(line.quantity + (input.quantity ?? 1)) }
        : line,
    );
  }
  return [
    ...lines,
    {
      key,
      productId: input.productId,
      slug: input.slug,
      name: input.name,
      image: input.image,
      variantId: input.variantId ?? null,
      variantLabel: input.variantLabel ?? null,
      price: input.price,
      quantity: clampQuantity(input.quantity ?? 1),
    },
  ];
}

export function updateQuantity(lines: CartLine[], key: string, quantity: number): CartLine[] {
  return lines.map((line) => (line.key === key ? { ...line, quantity: clampQuantity(quantity) } : line));
}

export function removeLine(lines: CartLine[], key: string): CartLine[] {
  return lines.filter((line) => line.key !== key);
}

export function cartCount(lines: CartLine[]): number {
  return lines.reduce((total, line) => total + line.quantity, 0);
}

export function cartSubtotal(lines: CartLine[]): number {
  return lines.reduce((total, line) => total + line.price * line.quantity, 0);
}

export function isSameLine(a: CartLine, b: CartLine): boolean {
  return a.key === b.key;
}

function isCartLine(value: unknown): value is CartLine {
  if (typeof value !== 'object' || value === null) return false;
  const line = value as Record<string, unknown>;
  return (
    typeof line.key === 'string' &&
    typeof line.productId === 'string' &&
    typeof line.slug === 'string' &&
    typeof line.name === 'string' &&
    typeof line.image === 'string' &&
    typeof line.price === 'number' &&
    Number.isFinite(line.price) &&
    typeof line.quantity === 'number' &&
    (line.variantId === null || typeof line.variantId === 'string') &&
    (line.variantLabel === null || typeof line.variantLabel === 'string')
  );
}

/** Defensive parse of persisted cart data (never trust localStorage shape). */
export function parseStoredCart(raw: string | null): CartLine[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isCartLine).map((line) => ({ ...line, quantity: clampQuantity(line.quantity) }));
  } catch {
    return [];
  }
}

export function cartToWhatsAppLines(lines: CartLine[]) {
  return lines.map((line) => ({
    name: line.name,
    variantLabel: line.variantLabel,
    quantity: line.quantity,
    lineTotal: line.price * line.quantity,
  }));
}
