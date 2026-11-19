const BASE = import.meta.env.BASE_URL || '/';
const NORMALIZED_BASE = BASE.endsWith('/') ? BASE : `${BASE}/`;

/** Resolves in-app asset paths against the Vite base (supports GitHub Pages subpaths). */
export function resolveImageUrl(url: string | null | undefined): string {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith('/')) return `${NORMALIZED_BASE.replace(/\/$/, '')}${url}`;
  return `${NORMALIZED_BASE}${url}`;
}

function isCloudinary(url: string): boolean {
  return /res\.cloudinary\.com\/.*\/image\/upload\//.test(url);
}

/**
 * Adds delivery-time transformations so grids never download master files.
 * Cloudinary builds resized, auto-format, auto-quality variants on the fly.
 */
export function imageUrl(url: string | null | undefined, width?: number): string {
  if (!url) return '';
  if (width && isCloudinary(url)) {
    const transform = `f_auto,q_auto,c_limit,w_${width}`;
    return resolveImageUrl(url.replace('/image/upload/', `/image/upload/${transform}/`));
  }
  return resolveImageUrl(url);
}

export function imageSrcSet(url: string | null | undefined, widths: number[] = [400, 800, 1200]): string | undefined {
  if (!url || !isCloudinary(url)) return undefined;
  return widths.map((width) => `${imageUrl(url, width)} ${width}w`).join(', ');
}

/**
 * React 18 does not map `fetchPriority` to the DOM attribute, so pass the
 * lowercase attribute explicitly for critical hero imagery only.
 */
export function priorityAttr(priority: boolean): Record<string, string> {
  return priority ? { fetchpriority: 'high' } : {};
}

export const IMAGE_WIDTHS = {
  card: 600,
  hero: 1200,
  detail: 1200,
  thumb: 160,
} as const;
