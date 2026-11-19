import type { Request, Response } from 'express';
import { Types } from 'mongoose';
import { Product } from '../models/Product.js';
import { publicImage } from '../services/serializers.js';

type CartInput = { productId: string; variantId?: string | null; quantity: number; price?: number };

export async function validateCart(req: Request, res: Response): Promise<void> {
  const { items } = req.body as { items: CartInput[] };
  const ids = [...new Set(items.map((item) => item.productId))];
  const products = await Product.find({ _id: { $in: ids }, archivedAt: null }).populate('category', 'name slug');
  const byId = new Map(products.map((product) => [String(product._id), product]));

  const lines = items.map((item) => {
    const product = byId.get(item.productId);
    if (!product) {
      return {
        productId: item.productId,
        variantId: item.variantId ?? null,
        name: 'Unavailable product',
        slug: '',
        image: null,
        variantLabel: null,
        quantity: item.quantity,
        availableQuantity: 0,
        unitPrice: 0,
        lineTotal: 0,
        priceChanged: false,
        inStock: false,
        issue: 'unavailable' as const,
      };
    }

    const hasVariants = product.variants.length > 0;
    const variant = item.variantId
      ? product.variants.find((entry) => String(entry._id) === item.variantId)
      : undefined;

    const unitPrice = variant ? variant.price : product.price;
    const availableQuantity = hasVariants
      ? variant
        ? variant.stockQuantity
        : 0
      : product.stockQuantity;
    const requested = Math.min(item.quantity, Math.max(availableQuantity, 0));
    const priceChanged = typeof item.price === 'number' && item.price !== unitPrice;

    let issue: 'none' | 'unavailable' | 'variant_required' | 'variant_missing' | 'out_of_stock' | 'insufficient_stock' | 'price_changed' =
      'none';
    if (hasVariants && !item.variantId) issue = 'variant_required';
    else if (hasVariants && !variant) issue = 'variant_missing';
    else if (availableQuantity <= 0) issue = 'out_of_stock';
    else if (item.quantity > availableQuantity) issue = 'insufficient_stock';
    else if (priceChanged) issue = 'price_changed';

    return {
      productId: String(product._id),
      variantId: variant?._id ? String(variant._id) : null,
      name: product.name,
      slug: product.slug,
      image: product.images[0] ? publicImage(product.images[0]) : null,
      variantLabel: variant?.label ?? null,
      quantity: item.quantity,
      availableQuantity,
      unitPrice,
      lineTotal: unitPrice * requested,
      priceChanged,
      inStock: availableQuantity > 0,
      issue,
    };
  });

  const sellable = lines.filter((line) => line.inStock && line.issue !== 'variant_required' && line.issue !== 'variant_missing');
  const subtotal = sellable.reduce((sum, line) => sum + line.lineTotal, 0);

  res.setHeader('Cache-Control', 'no-store');
  res.json({
    data: {
      lines,
      subtotal,
      currencyProductIds: [...new Set(products.map((product) => String(product._id)))],
      hasIssues: lines.some((line) => line.issue !== 'none'),
      checkedAt: new Date().toISOString(),
      note: 'This is an enquiry, not a confirmed order. Stock, pricing and delivery are confirmed by our team on WhatsApp.',
    },
  });
}

export function parseCartIds(input: unknown[]): Types.ObjectId[] {
  return input.filter((value): value is string => typeof value === 'string' && Types.ObjectId.isValid(value)).map((value) => new Types.ObjectId(value));
}
