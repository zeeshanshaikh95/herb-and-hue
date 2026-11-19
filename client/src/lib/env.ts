const rawApiBase = import.meta.env.VITE_API_BASE_URL?.trim() ?? '';

/** Empty string means same-origin (dev proxy, or a reverse-proxied deployment). */
export const API_BASE = rawApiBase.replace(/\/+$/, '');

export const ROUTER_BASENAME = import.meta.env.BASE_URL.replace(/\/$/, '') || '';

export const SITE_URL =
  import.meta.env.VITE_PUBLIC_SITE_URL?.replace(/\/+$/, '') ||
  (typeof window !== 'undefined' ? window.location.origin : '');

export const BRAND = {
  name: 'Herb & Hue',
  tagline: 'Natural skincare, quietly considered.',
  wordmark: '/brand/herb-and-hue-wordmark.png',
  logo: '/brand/herb-and-hue-logo.png',
  fallbackEmail: 'hello@herb-and-hue.example',
} as const;

export const NAV_LINKS = [
  { label: 'Shop', href: '/shop' },
  { label: 'Collections', href: '/categories' },
  { label: 'Our story', href: '/about' },
  { label: 'Reviews', href: '/reviews' },
  { label: 'Journal', href: '/gallery' },
  { label: 'Contact', href: '/contact' },
] as const;

export const ADMIN_NAV = [
  { label: 'Overview', href: '/admin', icon: 'grid' },
  { label: 'Products', href: '/admin/products', icon: 'bottle' },
  { label: 'Categories', href: '/admin/categories', icon: 'layers' },
  { label: 'Reviews', href: '/admin/reviews', icon: 'star' },
  { label: 'Gallery', href: '/admin/gallery', icon: 'image' },
  { label: 'Settings', href: '/admin/settings', icon: 'settings' },
] as const;
