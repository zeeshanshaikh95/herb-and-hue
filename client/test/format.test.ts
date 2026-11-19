import { describe, expect, it } from 'vitest';
import { formatMoney, percentageOff } from '../src/lib/format';

/**
 * Prices are stored as integer paise and must render as Indian rupees on every
 * surface. These assertions guard both the currency symbol and the Indian
 * digit grouping (₹1,29,900 rather than ₹129,900).
 */
describe('formatMoney', () => {
  it('formats minor units as Indian rupees with the ₹ symbol', () => {
    expect(formatMoney(129900)).toBe('₹1,299.00');
    expect(formatMoney(189900)).toBe('₹1,899.00');
    expect(formatMoney(74900)).toBe('₹749.00');
  });

  it('uses Indian digit grouping for larger amounts', () => {
    expect(formatMoney(12990000)).toBe('₹1,29,900.00');
    expect(formatMoney(100000000)).toBe('₹10,00,000.00');
  });

  it('never renders a dollar sign for any sample price', () => {
    const samplePrices = [129900, 189900, 259900, 159900, 74900, 99900, 174900, 129900, 124900];
    for (const price of samplePrices) {
      const formatted = formatMoney(price);
      expect(formatted.startsWith('₹')).toBe(true);
      expect(formatted).not.toContain('$');
      expect(formatted).not.toMatch(/USD|US\$/);
    }
  });

  it('formats zero and invalid values without throwing', () => {
    expect(formatMoney(0)).toBe('₹0.00');
    expect(formatMoney(Number.NaN)).toBe('₹0.00');
  });

  it('keeps paise visible when a price is not a whole rupee', () => {
    expect(formatMoney(99950)).toBe('₹999.50');
  });
});

describe('percentageOff', () => {
  it('reports the discount between a selling and original price', () => {
    expect(percentageOff(99900, 129900)).toBe(23);
    expect(percentageOff(129900, null)).toBeNull();
    expect(percentageOff(129900, 99900)).toBeNull();
  });
});
