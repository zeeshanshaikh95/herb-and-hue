import { describe, expect, it } from 'vitest';
import {
  buildCartEnquiry,
  buildGeneralEnquiry,
  buildProductEnquiry,
  buildWhatsAppUrl,
  fillTemplate,
  formatOrderLines,
  normalizeWhatsAppNumber,
  type WhatsAppSettings,
} from '../src/lib/whatsapp';

const settings: WhatsAppSettings = {
  businessName: 'Herb & Hue',
  whatsappNumber: '15550100000',
  whatsappTemplates: {
    general: 'Hello {{business}}, I have a question.',
    product: 'Hello {{business}}, I am interested in {{product}} — {{variant}}. {{url}}',
    cart: 'Order for {{business}}\n{{items}}\nSubtotal: {{subtotal}}\nName: {{name}}\nNotes: {{notes}}',
  },
};

describe('WhatsApp number handling', () => {
  it('normalises international numbers and rejects unsafe values', () => {
    expect(normalizeWhatsAppNumber('+1 (555) 010-0000')).toBe('15550100000');
    expect(normalizeWhatsAppNumber('15550100000')).toBe('15550100000');
    expect(normalizeWhatsAppNumber('0123456')).toBeNull();
    expect(normalizeWhatsAppNumber('')).toBeNull();
    expect(normalizeWhatsAppNumber(null)).toBeNull();
    expect(normalizeWhatsAppNumber(undefined)).toBeNull();
  });

  it('returns null instead of a broken link when the number is missing', () => {
    expect(buildWhatsAppUrl('', 'Hello')).toBeNull();
    expect(buildWhatsAppUrl('123', 'Hello')).toBeNull();
    expect(buildWhatsAppUrl('15550100000', 'Hello')).toBe(
      'https://wa.me/15550100000?text=Hello',
    );
  });

  it('URL-encodes every part of the message, including ampersands and newlines', () => {
    const url = buildWhatsAppUrl('15550100000', 'Hello Herb & Hue\nNew line') as string;
    expect(url).toContain('Hello%20Herb%20%26%20Hue%0ANew%20line');
    expect(url).not.toContain('Herb & Hue');
    expect(url.startsWith('https://wa.me/15550100000?text=')).toBe(true);
  });
});

describe('template filling', () => {
  it('supports double and single brace placeholders and leaves unknown keys empty', () => {
    expect(fillTemplate('Hi {{name}}, from {business}. {{missing}}', { name: 'A', business: 'B' })).toBe(
      'Hi A, from B. ',
    );
  });

  it('builds a general enquiry with the business name interpolated', () => {
    expect(buildGeneralEnquiry(settings)).toBe('Hello Herb & Hue, I have a question.');
    expect(
      buildGeneralEnquiry({ ...settings, whatsappTemplates: { ...settings.whatsappTemplates, general: '' } }),
    ).toMatch(/Herb & Hue/);
  });

  it('builds a product enquiry with variant price and absolute product URL', () => {
    const message = buildProductEnquiry(
      settings,
      { name: 'Radiance Face Serum', slug: 'radiance-face-serum', price: 3200 },
      {
        variantLabel: '30 ml',
        variantPrice: 189900,
        siteUrl: 'https://shop.example.com',
      },
    );
    expect(message).toContain('Radiance Face Serum');
    expect(message).toContain('30 ml');
    expect(message).toContain('https://shop.example.com/product/radiance-face-serum');
    expect(message).toContain('₹1,899.00');
    expect(message).not.toContain('$');
  });
});

describe('cart enquiry message', () => {
  const lines = [
    { name: 'Rose Mist', variantLabel: '100 ml', quantity: 2, lineTotal: 3600 },
    { name: 'Velvet Cream', variantLabel: null, quantity: 1, lineTotal: 4200 },
  ];

  it('formats item lines with quantities, variants and totals', () => {
    const text = formatOrderLines(lines);
    expect(text).toContain('Rose Mist — 100 ml × 2');
    expect(text).toContain('Velvet Cream × 1');
    expect(text.split('\n')).toHaveLength(2);
    expect(text).toContain('₹');
    expect(text).not.toContain('$');
  });

  it('includes name, notes, subtotal and the enquiry caveat-friendly template', () => {
    const message = buildCartEnquiry(settings, {
      lines,
      subtotal: 7800,
      name: '  Sam  ',
      notes: 'Please gift wrap.',
    });
    expect(message).toContain('Order for Herb & Hue');
    expect(message).toContain('Subtotal:');
    expect(message).toContain('Name: Sam');
    expect(message).toContain('Notes: Please gift wrap.');
    expect(message).toContain('Subtotal: ₹78.00');
    expect(message).not.toContain('$');
  });

  it('uses placeholders for missing name and notes rather than undefined', () => {
    const message = buildCartEnquiry(settings, {
      lines,
      subtotal: 7800,
      name: '   ',
      notes: '',
    });
    expect(message).not.toContain('undefined');
    expect(message).toContain('Name: —');
    expect(message).toContain('Notes: —');
  });

  it('falls back to a safe default template when settings are empty', () => {
    const message = buildCartEnquiry(
      { ...settings, whatsappTemplates: { general: '', product: '', cart: '' } },
      { lines, subtotal: 7800, name: 'Sam', notes: '' },
    );
    expect(message).toContain('Herb & Hue');
    expect(message).toContain('Rose Mist');
    expect(message).toContain('Subtotal (reference)');
  });
});
