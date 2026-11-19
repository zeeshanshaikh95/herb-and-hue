/**
 * Safe JSON-LD serialization for injection into a <script> tag.
 * Escaping <, >, & and U+2028/U+2029 prevents premature script termination or
 * parser confusion while remaining valid JSON.
 */
export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

export function jsonLdScript(value: unknown): string {
  return serializeJsonLd(value);
}
