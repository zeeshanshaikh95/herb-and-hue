import { Types } from 'mongoose';
import mongoose from 'mongoose';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { Admin } from '../src/models/Admin.js';
import { Category } from '../src/models/Category.js';
import { Product } from '../src/models/Product.js';
import { Review } from '../src/models/Review.js';
import { GalleryItem } from '../src/models/GalleryItem.js';
import { SiteSettings } from '../src/models/SiteSettings.js';
import { AnalyticsEvent } from '../src/models/AnalyticsEvent.js';
import { MediaAsset } from '../src/models/MediaAsset.js';
import { hashPassword } from '../src/utils/password.js';
import { signAdminToken } from '../src/utils/authToken.js';

export const app = createApp();

export const ADMIN_EMAIL = 'owner@herb-and-hue.test';
export const ADMIN_PASSWORD = 'TestOwner!Passw0rd2026';
/** bcrypt hash of the test owner password, computed once per test worker. */
let cachedHash: string | null = null;

export async function clearDatabase(): Promise<void> {
  await Promise.all([
    Admin.deleteMany({}),
    Category.deleteMany({}),
    Product.deleteMany({}),
    Review.deleteMany({}),
    GalleryItem.deleteMany({}),
    SiteSettings.deleteMany({}),
    AnalyticsEvent.deleteMany({}),
    MediaAsset.deleteMany({}),
  ]);
}

export async function createAdmin(overrides: Partial<Record<string, unknown>> = {}) {
  if (!cachedHash) cachedHash = await hashPassword(ADMIN_PASSWORD);
  return Admin.create({
    name: 'Test owner',
    email: ADMIN_EMAIL,
    passwordHash: cachedHash,
    role: 'owner',
    tokenVersion: 0,
    mustChangePassword: false,
    ...overrides,
  });
}

export function tokenFor(admin: { _id: unknown; tokenVersion: number; role: string }): string {
  return signAdminToken({ id: String(admin._id), tokenVersion: admin.tokenVersion, role: admin.role }).token;
}

export async function adminAuth() {
  const admin = await createAdmin();
  return { admin, token: tokenFor(admin), header: `Bearer ${tokenFor(admin)}` };
}

export async function createCategory(overrides: Record<string, unknown> = {}) {
  return Category.create({ name: 'Test Collection', description: 'A test category.', ...overrides });
}

interface ProductOverrides {
  category?: Types.ObjectId;
  [key: string]: unknown;
}

export async function createProduct(overrides: ProductOverrides = {}) {
  const category = overrides.category ?? (await createCategory())._id;
  return Product.create({
    name: 'Test Serum',
    shortDescription: 'A sample serum for API tests.',
    description: 'Full description used by automated tests.',
    category,
    price: 2500,
    stockQuantity: 10,
    images: [{ url: '/images/products/radiance-serum.svg', alt: 'Test serum bottle' }],
    benefits: ['Hydration'],
    ...overrides,
  });
}

export function auth(token: string) {
  return { Authorization: `Bearer ${token}` };
}

/** Convenience for asserting a body has no internal/admin-only fields. */
export function assertNoInternalFields(payload: Record<string, unknown>, fields = ['adminNotes', 'archivedAt']) {
  for (const field of fields) {
    if (field in payload) throw new Error(`Internal field "${field}" leaked to a public response`);
  }
}

export { request, mongoose };
