import { apiFetch } from './client';
import type {
  CartValidation,
  Category,
  GalleryItem,
  Paginated,
  Product,
  PublicSettings,
  ReviewPage,
} from './types';

export interface ProductQuery {
  search?: string;
  category?: string;
  sort?: 'featured' | 'newest' | 'price-asc' | 'price-desc' | 'name';
  page?: number;
  limit?: number;
  featured?: boolean;
  bestseller?: boolean;
  inStock?: boolean;
}

export function getProducts(query: ProductQuery = {}, signal?: AbortSignal) {
  return apiFetch<Paginated<Product>>('/api/products', {
    signal,
    query: {
      search: query.search,
      category: query.category,
      sort: query.sort,
      page: query.page,
      limit: query.limit,
      featured: query.featured === undefined ? undefined : String(query.featured),
      bestseller: query.bestseller === undefined ? undefined : String(query.bestseller),
      inStock: query.inStock === undefined ? undefined : String(query.inStock),
    },
  });
}

export function getProduct(slug: string, signal?: AbortSignal) {
  return apiFetch<{ data: Product }>(`/api/products/${encodeURIComponent(slug)}`, { signal });
}

export function getRelatedProducts(slug: string, signal?: AbortSignal) {
  return apiFetch<{ data: Product[] }>(`/api/products/${encodeURIComponent(slug)}/related`, { signal });
}

export function getCategories(signal?: AbortSignal) {
  return apiFetch<{ data: Category[] }>('/api/categories', { signal });
}

export function getCategory(slug: string, signal?: AbortSignal) {
  return apiFetch<{ data: Category }>(`/api/categories/${encodeURIComponent(slug)}`, { signal });
}

export function getReviews(
  params: { page?: number; limit?: number; rating?: number; product?: string } = {},
  signal?: AbortSignal,
) {
  return apiFetch<ReviewPage>('/api/reviews', {
    signal,
    query: params as Record<string, string | number | undefined>,
  });
}

export interface ReviewInput {
  authorName: string;
  email: string;
  rating: number;
  title: string;
  body: string;
  productSlug?: string;
}

export function submitReview(input: ReviewInput) {
  return apiFetch<{ data: { id: string; status: string; message: string } }>('/api/reviews', {
    method: 'POST',
    body: input,
  });
}

export function getGallery(signal?: AbortSignal) {
  return apiFetch<{ data: GalleryItem[] }>('/api/gallery', { signal });
}

export function getPublicSettings(signal?: AbortSignal) {
  return apiFetch<{ data: PublicSettings }>('/api/settings/public', { signal });
}

export interface CartValidationInput {
  productId: string;
  variantId?: string | null;
  quantity: number;
  price?: number;
}

export function validateCart(items: CartValidationInput[]) {
  return apiFetch<{ data: CartValidation }>('/api/cart/validate', {
    method: 'POST',
    body: { items },
  });
}
