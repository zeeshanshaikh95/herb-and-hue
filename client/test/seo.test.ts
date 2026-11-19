import { describe, expect, it } from 'vitest';
import { serializeJsonLd } from '../src/lib/jsonld';
import { initials, percentageOff, pluralize, truncate } from '../src/lib/format';
import { imageUrl, imageSrcSet, resolveImageUrl } from '../src/lib/images';

describe('JSON-LD serialization', () => {
  it('escapes HTML-significant characters so an injected script cannot break out', () => {
    const payload = {
      name: '</script><script>alert("xss")</script>',
      note: 'Salt & pepper',
      price: 3200,
    };
    const serialized = serializeJsonLd(payload);
    expect(serialized).not.toContain('<');
    expect(serialized).not.toContain('>');
    expect(serialized).not.toContain('&');
    expect(serialized).toContain('\\u003c/script\\u003e');
    expect(serialized).toContain('\\u0026');
  });

  it('escapes Unicode line separators that can terminate script parsing', () => {
    const serialized = serializeJsonLd({ text: 'a\u2028b\u2029c' });
    expect(serialized).toContain('\\u2028');
    expect(serialized).toContain('\\u2029');
    expect(serialized).not.toMatch(/[\u2028\u2029]/);
  });

  it('remains valid JSON after escaping', () => {
    const value = { '@type': 'Product', name: 'A & B', description: '<tag>' };
    expect(JSON.parse(serializeJsonLd(value))).toEqual(value);
  });

  it('handles nested arrays and objects', () => {
    const serialized = serializeJsonLd({ offers: [{ price: 1, url: '/x?y=1&z=2' }] });
    expect(serialized).not.toContain('&');
    expect(JSON.parse(serialized).offers[0].url).toBe('/x?y=1&z=2');
  });
});

describe('formatting helpers', () => {
  it('calculates truthful discount percentages only when compare-at is higher', () => {
    expect(percentageOff(3000, 4000)).toBe(25);
    expect(percentageOff(4000, 4000)).toBeNull();
    expect(percentageOff(5000, 4000)).toBeNull();
    expect(percentageOff(3000, null)).toBeNull();
    expect(percentageOff(0, 4000)).toBeNull();
  });

  it('truncates long copy on a word boundary budget', () => {
    expect(truncate('short', 20)).toBe('short');
    const truncated = truncate('a'.repeat(200), 20);
    expect(truncated.length).toBeLessThanOrEqual(20);
    expect(truncated.endsWith('…')).toBe(true);
  });

  it('pluralizes and derives initials', () => {
    expect(pluralize(1, 'item')).toBe('1 item');
    expect(pluralize(2, 'item')).toBe('2 items');
    expect(pluralize(0, 'review', 'reviews')).toBe('0 reviews');
    expect(initials('Herb and Hue')).toBe('HA');
    expect(initials('')).toBe('');
  });
});

describe('image URL helpers', () => {
  it('resolves in-app paths against the configured base', () => {
    expect(resolveImageUrl('/images/products/rose-mist.svg')).toBe('/images/products/rose-mist.svg');
    expect(resolveImageUrl('https://res.cloudinary.com/demo/image/upload/v1/a.jpg')).toBe(
      'https://res.cloudinary.com/demo/image/upload/v1/a.jpg',
    );
    expect(resolveImageUrl(null)).toBe('');
  });

  it('adds Cloudinary delivery transformations instead of serving originals', () => {
    const original = 'https://res.cloudinary.com/demo/image/upload/v1/herb-and-hue/hero.jpg';
    const resized = imageUrl(original, 600);
    expect(resized).toContain('/image/upload/f_auto,q_auto,c_limit,w_600/');
    expect(resized).not.toContain('/upload/v1/');
    expect(imageUrl('/local/image.png', 600)).toBe('/local/image.png');
  });

  it('only emits srcsets for transformable remote images', () => {
    const original = 'https://res.cloudinary.com/demo/image/upload/v1/herb-and-hue/hero.jpg';
    const srcset = imageSrcSet(original);
    expect(srcset).toContain('400w');
    expect(srcset).toContain('1200w');
    expect(imageSrcSet('/local/image.png')).toBeUndefined();
  });
});
