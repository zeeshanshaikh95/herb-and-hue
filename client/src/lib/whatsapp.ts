import { formatMoney } from './format';

export interface WhatsAppSettings {
  whatsappNumber: string;
  whatsappTemplates: { general: string; product: string; cart: string };
  businessName: string;
}

export interface WhatsAppLine {
  name: string;
  variantLabel?: string | null;
  quantity: number;
  lineTotal: number;
}

export function normalizeWhatsAppNumber(value: string | null | undefined): string | null {
  if (!value) return null;
  const digits = value.replace(/[^\d]/g, '');
  if (!/^[1-9]\d{7,14}$/.test(digits)) return null;
  return digits;
}

export interface TemplateValues {
  business?: string;
  product?: string;
  variant?: string;
  url?: string;
  items?: string;
  subtotal?: string;
  name?: string;
  notes?: string;
}

/** Supports {{placeholder}} (current) and {placeholder} (legacy copy). */
export function fillTemplate(template: string, values: TemplateValues): string {
  const replace = (source: string, pattern: RegExp) =>
    source.replace(pattern, (_match, key: string) => {
      const value = values[key as keyof TemplateValues];
      return value === undefined || value === null ? '' : String(value);
    });
  const withDouble = replace(template, /\{\{\s*(\w+)\s*\}\}/g);
  return replace(withDouble, /\{\s*(\w+)\s*\}/g);
}

export function buildWhatsAppUrl(number: string | null | undefined, message: string): string | null {
  const digits = normalizeWhatsAppNumber(number);
  if (!digits) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export function formatOrderLines(lines: WhatsAppLine[]): string {
  return lines
    .map((line) => {
      const variant = line.variantLabel ? ` — ${line.variantLabel}` : '';
      return `• ${line.name}${variant} × ${line.quantity} — ${formatMoney(line.lineTotal)}`;
    })
    .join('\n');
}

export function buildProductEnquiry(
  settings: WhatsAppSettings,
  product: { name: string; slug: string; price: number },
  options: { variantLabel?: string | null; variantPrice?: number; siteUrl: string },
): string {
  const template =
    settings.whatsappTemplates.product?.trim() ||
    'Hello {{business}}, I am interested in {{product}} — {{variant}}. Is it available? {{url}}';
  return fillTemplate(template, {
    business: settings.businessName,
    product: product.name,
    variant: options.variantLabel
      ? `${options.variantLabel} (${formatMoney(options.variantPrice ?? product.price)})`
      : formatMoney(product.price),
    url: `${options.siteUrl}/product/${product.slug}`,
  });
}

export function buildGeneralEnquiry(settings: WhatsAppSettings): string {
  return (
    settings.whatsappTemplates.general?.trim() ||
    'Hello {{business}}, I would like to ask about your skincare collection.'
  ).replace(/\{\{\s*business\s*\}\}/g, settings.businessName);
}

export function buildCartEnquiry(
  settings: WhatsAppSettings,
  options: {
    lines: WhatsAppLine[];
    subtotal: number;
    name: string;
    notes: string;
  },
): string {
  const template =
    settings.whatsappTemplates.cart?.trim() ||
    'Hello {{business}}, I would like to enquire about this order:\n\n{{items}}\n\nSubtotal (reference): {{subtotal}}\n\nName: {{name}}\nNotes: {{notes}}';
  return fillTemplate(template, {
    business: settings.businessName,
    items: formatOrderLines(options.lines),
    subtotal: formatMoney(options.subtotal),
    name: options.name.trim() || '—',
    notes: options.notes.trim() || '—',
  });
}
