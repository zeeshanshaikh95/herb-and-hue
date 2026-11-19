import { apiFetch } from './client';
import type {
  AdminCategory,
  AdminGalleryItem,
  AdminProduct,
  AdminReview,
  AdminUser,
  AnalyticsSummary,
  Category,
  LoginResponse,
  Paginated,
  PublicSettings,
  UploadedImage,
} from './types';

export interface AdminProductInput {
  name: string;
  slug?: string;
  shortDescription: string;
  description: string;
  category: string;
  price: number;
  compareAtPrice: number | null;
  sku: string | null;
  variants: {
    label: string;
    price: number;
    compareAtPrice: number | null;
    stockQuantity: number;
    sku: string | null;
  }[];
  stockQuantity: number;
  images: { url: string; publicId: string | null; alt: string; width?: number | null; height?: number | null }[];
  ingredients: string;
  benefits: string[];
  directions: string;
  warnings: string;
  featured: boolean;
  bestseller: boolean;
  displayOrder: number;
  seoTitle: string;
  seoDescription: string;
  sampleData: boolean;
  adminNotes: string;
}

export interface AdminCategoryInput {
  name: string;
  slug?: string;
  description: string;
  image: { url: string; publicId: string | null; alt: string } | null;
  displayOrder: number;
  isActive: boolean;
}

export interface AdminGalleryInput {
  title: string;
  caption: string;
  image: { url: string; publicId: string | null; alt: string };
  linkUrl: string;
  displayOrder: number;
  isActive: boolean;
  sampleData: boolean;
}

/* ------------------------------- auth ------------------------------- */

export function adminLogin(email: string, password: string) {
  return apiFetch<LoginResponse>('/api/admin/auth/login', {
    method: 'POST',
    body: { email, password },
  });
}

export function adminMe() {
  return apiFetch<{ data: { admin: AdminUser; mustChangePassword: boolean } }>('/api/admin/auth/me');
}

export function adminChangePassword(currentPassword: string, newPassword: string) {
  return apiFetch<{ data: { token: string; expiresIn: string; admin: AdminUser; message: string } }>(
    '/api/admin/auth/change-password',
    { method: 'POST', body: { currentPassword, newPassword } },
  );
}

export function adminLogout() {
  return apiFetch<{ data: { message: string } }>('/api/admin/auth/logout', { method: 'POST' });
}

/* ----------------------------- products ----------------------------- */

export function listAdminProducts(params: {
  search?: string;
  status?: 'active' | 'archived' | 'all';
  category?: string;
  page?: number;
  limit?: number;
} = {}) {
  return apiFetch<Paginated<AdminProduct>>('/api/admin/products', {
    query: params as Record<string, string | number | undefined>,
  });
}

export function getAdminProduct(id: string) {
  return apiFetch<{ data: AdminProduct }>(`/api/admin/products/${id}`);
}

export function createAdminProduct(input: AdminProductInput) {
  return apiFetch<{ data: AdminProduct }>('/api/admin/products', { method: 'POST', body: input });
}

export function updateAdminProduct(id: string, input: Partial<AdminProductInput>) {
  return apiFetch<{ data: AdminProduct }>(`/api/admin/products/${id}`, { method: 'PATCH', body: input });
}

export function archiveAdminProduct(id: string) {
  return apiFetch<{ data: AdminProduct }>(`/api/admin/products/${id}/archive`, { method: 'POST' });
}

export function restoreAdminProduct(id: string) {
  return apiFetch<{ data: AdminProduct }>(`/api/admin/products/${id}/restore`, { method: 'POST' });
}

/* ---------------------------- categories ---------------------------- */

export function listAdminCategories() {
  return apiFetch<{ data: AdminCategory[] }>('/api/admin/categories');
}

export function createAdminCategory(input: AdminCategoryInput) {
  return apiFetch<{ data: AdminCategory }>('/api/admin/categories', { method: 'POST', body: input });
}

export function updateAdminCategory(id: string, input: Partial<AdminCategoryInput>) {
  return apiFetch<{ data: AdminCategory }>(`/api/admin/categories/${id}`, { method: 'PATCH', body: input });
}

export function deleteAdminCategory(id: string) {
  return apiFetch<{ data: { message: string } }>(`/api/admin/categories/${id}`, { method: 'DELETE' });
}

/* ------------------------------ reviews ------------------------------ */

export function listAdminReviews(status: 'pending' | 'approved' | 'rejected' | 'all', page = 1) {
  return apiFetch<Paginated<AdminReview>>('/api/admin/reviews', { query: { status, page, limit: 20 } });
}

export function moderateAdminReview(id: string, status: 'pending' | 'approved' | 'rejected') {
  return apiFetch<{ data: AdminReview }>(`/api/admin/reviews/${id}`, { method: 'PATCH', body: { status } });
}

export function deleteAdminReview(id: string) {
  return apiFetch<{ data: { message: string } }>(`/api/admin/reviews/${id}`, { method: 'DELETE' });
}

/* ------------------------------ gallery ------------------------------ */

export function listAdminGallery() {
  return apiFetch<{ data: AdminGalleryItem[] }>('/api/admin/gallery');
}

export function createAdminGalleryItem(input: AdminGalleryInput) {
  return apiFetch<{ data: AdminGalleryItem }>('/api/admin/gallery', { method: 'POST', body: input });
}

export function updateAdminGalleryItem(id: string, input: Partial<AdminGalleryInput>) {
  return apiFetch<{ data: AdminGalleryItem }>(`/api/admin/gallery/${id}`, { method: 'PATCH', body: input });
}

export function deleteAdminGalleryItem(id: string) {
  return apiFetch<{ data: { message: string } }>(`/api/admin/gallery/${id}`, { method: 'DELETE' });
}

/* ----------------------------- settings ----------------------------- */

export function getAdminSettings() {
  return apiFetch<{ data: PublicSettings }>('/api/admin/settings');
}

export function updateAdminSettings(settings: PublicSettings) {
  // Server-managed fields are not part of the writable schema.
  const payload: Partial<PublicSettings> & { key?: string; createdAt?: string } = { ...settings };
  delete payload.updatedAt;
  delete payload.createdAt;
  delete payload.key;
  return apiFetch<{ data: PublicSettings }>('/api/admin/settings', { method: 'PUT', body: payload });
}

/* ------------------------------- media ------------------------------- */

export async function uploadAdminImages(files: File[], alt = ''): Promise<UploadedImage[]> {
  const form = new FormData();
  for (const file of files) form.append('images', file);
  if (alt) form.append('alt', alt);
  const response = await apiFetch<{ data: UploadedImage[] }>('/api/admin/uploads', {
    method: 'POST',
    body: form,
    timeoutMs: 60_000,
  });
  return response.data;
}

/* ----------------------------- analytics ----------------------------- */

export function getAdminAnalytics(days = 30) {
  return apiFetch<{ data: AnalyticsSummary }>('/api/admin/analytics/summary', { query: { days } });
}

/* ---------------------------- categories ---------------------------- */

export function listPublicCategoryOptions() {
  return apiFetch<{ data: Category[] }>('/api/categories');
}
