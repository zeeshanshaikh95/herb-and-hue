export interface LinkTarget {
  href: string;
  external: boolean;
}

/**
 * Maps an admin-managed URL to a router path or a safe external link.
 * Anything that is not an in-app path or http(s) URL is discarded.
 */
export function safeInternalOrExternal(value: string | null | undefined): LinkTarget | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) return { href: trimmed, external: false };
  if (trimmed.startsWith('#')) return { href: trimmed, external: false };
  try {
    const url = new URL(trimmed);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    return { href: url.toString(), external: true };
  } catch {
    return null;
  }
}
