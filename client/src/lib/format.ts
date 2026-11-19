/**
 * Herb & Hue sells in Indian rupees. Prices are stored everywhere as integer
 * minor units (paise), so every display in the app goes through this one
 * formatter — never a hand-written "$" or a locale-dependent default.
 */
export const CURRENCY = 'INR';

const inrFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: CURRENCY,
  maximumFractionDigits: 2,
});

export function formatMoney(minorUnits: number): string {
  const amount = (Number.isFinite(minorUnits) ? minorUnits : 0) / 100;
  return inrFormatter.format(amount);
}

export function formatDate(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat().format(value);
}

export function truncate(value: string, max = 140): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1).trimEnd()}…`;
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export function percentageOff(price: number, compareAt: number | null): number | null {
  if (!compareAt || compareAt <= price || price <= 0) return null;
  return Math.round(((compareAt - price) / compareAt) * 100);
}
