import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '../src/config/brandDefaults.js';
import { SAMPLE_PRODUCTS } from '../src/seed/seedData.js';

/**
 * Prices are stored as integer paise. The storefront formats them as INR, so a
 * value like 3200 would render as ₹32.00 — a leftover USD-scale placeholder.
 * These checks keep the brand defaults and the sample catalogue on the Indian
 * price points the store is designed around.
 */
describe('INR pricing defaults', () => {
  it('configures the store currency as INR', () => {
    expect(DEFAULT_SETTINGS.commerce.currency).toBe('INR');
    expect(DEFAULT_SETTINGS.commerce.priceNote).toContain('INR');
  });

  it('keeps every sample price as an integer amount in paise', () => {
    for (const product of SAMPLE_PRODUCTS) {
      expect(Number.isInteger(product.price), product.slug).toBe(true);
      expect(product.price % 100, `${product.slug} should be a whole rupee amount`).toBe(0);
    }
  });

  it('uses realistic Indian retail prices rather than dollar-scale values', () => {
    for (const product of SAMPLE_PRODUCTS) {
      expect(product.price, `${product.slug} is priced like a USD placeholder`).toBeGreaterThanOrEqual(50000);
      expect(product.price, `${product.slug} is implausibly high`).toBeLessThanOrEqual(5000000);
    }
  });

  it('only sets a compare-at price when it is genuinely higher', () => {
    for (const product of SAMPLE_PRODUCTS) {
      if (product.compareAtPrice === undefined) continue;
      expect(product.compareAtPrice, product.slug).toBeGreaterThan(product.price);
    }
  });

  it('prices every variant at the same INR scale as its parent product', () => {
    for (const product of SAMPLE_PRODUCTS) {
      for (const variant of product.variants ?? []) {
        expect(variant.price, `${product.slug} ${variant.label}`).toBeGreaterThanOrEqual(50000);
        expect(variant.price % 100).toBe(0);
      }
    }
  });
});
