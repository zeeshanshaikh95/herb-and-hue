import { Types } from 'mongoose';
import { config } from '../config/env.js';
import { Category } from '../models/Category.js';
import { GalleryItem } from '../models/GalleryItem.js';
import { Product } from '../models/Product.js';
import { ensureAdminBootstrap } from '../services/adminBootstrap.js';
import { getSettings } from '../services/settingsService.js';
import { SAMPLE_CATEGORIES, SAMPLE_GALLERY, SAMPLE_PRODUCTS, sampleProductDocument } from './seedData.js';
import { DEFAULT_SETTINGS } from '../config/brandDefaults.js';
import { SiteSettings } from '../models/SiteSettings.js';

export interface SeedReport {
  settings: string;
  categories: number;
  products: number;
  gallery: number;
  sampleCatalogue: boolean;
}

/**
 * Idempotent development seed. Sample products are only created outside
 * production; production seeds brand settings/categories only when explicitly
 * enabled, and the owner fills the catalogue in the dashboard.
 */
export async function seed({ force = false, includeSampleCatalogue = !config.isProduction } = {}): Promise<SeedReport> {
  await ensureAdminBootstrap();
  await getSettings();

  const report: SeedReport = {
    settings: 'ready',
    categories: 0,
    products: 0,
    gallery: 0,
    sampleCatalogue: includeSampleCatalogue,
  };

  if (force && includeSampleCatalogue) {
    await Product.deleteMany({ sampleData: true });
    await GalleryItem.deleteMany({ sampleData: true });
  }

  // Brand settings exist for every environment; sample copy lives in defaults
  // and is editable in Admin → Settings.
  await SiteSettings.updateOne(
    { key: 'site' },
    { $setOnInsert: { key: 'site', ...DEFAULT_SETTINGS } },
    { upsert: true },
  );

  // The storefront formats every amount as Indian rupees from integer paise
  // (see client/src/lib/format.ts). Settings documents created by earlier
  // seeds may still carry a legacy currency, so bring them in line.
  await SiteSettings.updateOne(
    { key: 'site', 'commerce.currency': { $ne: 'INR' } },
    { $set: { 'commerce.currency': 'INR' } },
  );

  if (!includeSampleCatalogue) {
    console.log('[seed] Production mode: settings only. Add real catalogue content in /admin.');
    return report;
  }

  const categoryIds = new Map<string, Types.ObjectId>();
  for (const category of SAMPLE_CATEGORIES) {
    const existing = await Category.findOneAndUpdate(
      { slug: category.slug },
      { $set: category },
      { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true },
    );
    if (existing) {
      categoryIds.set(category.slug, existing._id);
      report.categories += 1;
    }
  }

  for (const product of SAMPLE_PRODUCTS) {
    const categoryId = categoryIds.get(product.categorySlug);
    if (!categoryId) continue;
    const exists = await Product.exists({ slug: product.slug });
    if (exists) continue;
    await Product.create(sampleProductDocument(product, categoryId));
    report.products += 1;
  }

  if ((await GalleryItem.countDocuments()) === 0) {
    await GalleryItem.insertMany(SAMPLE_GALLERY);
    report.gallery = SAMPLE_GALLERY.length;
  }

  console.log(`[seed] Development catalogue ready — ${report.categories} categories, ${report.products} new sample products, ${report.gallery} gallery items.`);
  return report;
}
