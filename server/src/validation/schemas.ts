import { z } from 'zod';
import { ANALYTICS_EVENT_TYPES } from '../models/AnalyticsEvent.js';
import { isStrongPassword } from '../config/env.js';
import { safeHttpUrl } from '../utils/safeUrl.js';
import { isValidSlug, slugify } from '../utils/slug.js';
import { isSafeImageUrl } from '../models/shared.js';

const trimmed = (min: number, max: number, label = 'Value') =>
  z
    .string()
    .trim()
    .min(min, `${label} must be at least ${min} characters`)
    .max(max, `${label} must be at most ${max} characters`);

const optionalText = (max: number) => z.string().trim().max(max).default('');

export const objectIdSchema = z
  .string()
  .regex(/^[a-fA-F0-9]{24}$/, 'Expected a valid identifier');

export const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .refine(isValidSlug, 'Use lowercase letters, numbers and single hyphens');

const priceSchema = z
  .number({ error: 'Price must be a number in minor units' })
  .int('Price must be a whole number of minor units (e.g. cents)')
  .min(0, 'Price cannot be negative')
  .max(10_000_000, 'Price is unrealistically high');

const stockSchema = z.number().int().min(0).max(1_000_000);

const imageUrlSchema = z
  .string()
  .trim()
  .min(1, 'Image URL is required')
  .max(2048)
  .refine(isSafeImageUrl, 'Image must be an http(s) URL or an absolute in-app path');

export const imageInputSchema = z
  .object({
    url: imageUrlSchema,
    publicId: z.string().trim().max(300).nullable().default(null),
    alt: trimmed(1, 200, 'Alt text'),
    width: z.number().int().min(1).max(20_000).nullable().optional(),
    height: z.number().int().min(1).max(20_000).nullable().optional(),
  })
  .strict();

const variantSchema = z
  .object({
    label: trimmed(1, 60, 'Variant label'),
    price: priceSchema,
    compareAtPrice: priceSchema.nullable().default(null),
    stockQuantity: stockSchema.default(0),
    sku: z.string().trim().max(64).nullable().default(null),
  })
  .strict()
  .superRefine((variant, ctx) => {
    if (variant.compareAtPrice !== null && variant.compareAtPrice <= variant.price) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['compareAtPrice'],
        message: 'Compare-at price must be higher than the selling price',
      });
    }
  });

const slugField = z
  .string()
  .trim()
  .min(1)
  .max(80)
  .transform((value) => slugify(value))
  .refine(isValidSlug, 'Slug must contain lowercase letters, numbers and hyphens');

const productInputObject = z
  .object({
    name: trimmed(2, 140, 'Product name'),
    slug: slugField.optional(),
    shortDescription: optionalText(260),
    description: optionalText(5000),
    category: objectIdSchema,
    price: priceSchema,
    compareAtPrice: priceSchema.nullable().default(null),
    sku: z.string().trim().max(64).nullable().default(null),
    variants: z.array(variantSchema).max(10).default([]),
    stockQuantity: stockSchema.default(0),
    images: z.array(imageInputSchema).max(8).default([]),
    ingredients: optionalText(5000),
    benefits: z.array(trimmed(1, 160, 'Benefit')).max(8).default([]),
    directions: optionalText(2000),
    warnings: optionalText(2000),
    featured: z.boolean().default(false),
    bestseller: z.boolean().default(false),
    displayOrder: z.number().int().min(0).max(100_000).default(0),
    seoTitle: optionalText(70),
    seoDescription: optionalText(320),
    sampleData: z.boolean().default(false),
    adminNotes: z.string().max(2000).default(''),
  })
  .strict();

// The compare-at-price rule is attached to the create/update schema only.
// productPatchSchema stays a plain (partial) object, matching the previous
// behaviour where the refinement was stripped before partial() was applied.
export const productInputSchema = productInputObject.superRefine((product, ctx) => {
  if (product.compareAtPrice !== null && product.compareAtPrice <= product.price) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['compareAtPrice'],
      message: 'Compare-at price must be higher than the selling price',
    });
  }
});

export const productPatchSchema = productInputObject.partial().strict();

export const productQuerySchema = z
  .object({
    search: z.string().trim().max(120).optional(),
    category: z.string().trim().max(80).optional(),
    sort: z.enum(['featured', 'newest', 'price-asc', 'price-desc', 'name']).default('featured'),
    page: z.coerce.number().int().min(1).max(10_000).default(1),
    limit: z.coerce.number().int().min(1).max(48).default(12),
    featured: z.enum(['true', 'false']).optional(),
    bestseller: z.enum(['true', 'false']).optional(),
    inStock: z.enum(['true', 'false']).optional(),
  })
  .strict();

export const adminProductQuerySchema = z
  .object({
    search: z.string().trim().max(120).optional(),
    status: z.enum(['active', 'archived', 'all']).default('active'),
    category: z.string().trim().max(80).optional(),
    page: z.coerce.number().int().min(1).max(10_000).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();

export const categoryInputSchema = z
  .object({
    name: trimmed(2, 80, 'Category name'),
    slug: slugField.optional(),
    description: optionalText(1200),
    image: imageInputSchema.nullable().default(null),
    displayOrder: z.number().int().min(0).max(100_000).default(0),
    isActive: z.boolean().default(true),
  })
  .strict();

export const categoryPatchSchema = categoryInputSchema.partial();

export const galleryInputSchema = z
  .object({
    title: trimmed(1, 120, 'Title'),
    caption: optionalText(400),
    image: imageInputSchema,
    linkUrl: z.string().trim().max(2048).default(''),
    displayOrder: z.number().int().min(0).max(100_000).default(0),
    isActive: z.boolean().default(true),
    sampleData: z.boolean().default(false),
  })
  .strict();

export const galleryPatchSchema = galleryInputSchema.partial();

export const loginSchema = z
  .object({
    email: z.string().trim().toLowerCase().email('Enter a valid email address').max(254),
    password: z.string().min(1, 'Password is required').max(200),
  })
  .strict();

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required').max(200),
    newPassword: z
      .string()
      .min(12, 'Use at least 12 characters')
      .max(128)
      .refine(isStrongPassword, 'Include upper case, lower case, a number and a symbol'),
  })
  .strict()
  .refine((data) => data.currentPassword !== data.newPassword, {
    path: ['newPassword'],
    message: 'Choose a password different from your current one',
  });

export const reviewSubmissionSchema = z
  .object({
    authorName: trimmed(2, 60, 'Name'),
    email: z.string().trim().toLowerCase().email('Enter a valid email address').max(254),
    rating: z.number().int().min(1, 'Rating must be between 1 and 5').max(5),
    title: optionalText(120),
    body: trimmed(10, 2000, 'Review'),
    productSlug: slugSchema.optional(),
  })
  .strict();

export const reviewModerationSchema = z
  .object({
    status: z.enum(['pending', 'approved', 'rejected']),
    adminNote: z.string().trim().max(500).optional(),
  })
  .strict();

export const reviewQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).max(10_000).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(9),
    rating: z.coerce.number().int().min(1).max(5).optional(),
    product: z.string().trim().max(80).optional(),
  })
  .strict();

export const adminReviewQuerySchema = z
  .object({
    status: z.enum(['pending', 'approved', 'rejected', 'all']).default('pending'),
    page: z.coerce.number().int().min(1).max(10_000).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();

const safeHref = (value: string) => {
  if (value === '') return true;
  if (value.startsWith('/') && !value.startsWith('//')) return true;
  return safeHttpUrl(value) !== null;
};

const hrefSchema = z
  .string()
  .trim()
  .max(2048)
  .refine(safeHref, 'Use an in-app path beginning with / or a full http(s) URL');

const httpsUrl = z
  .string()
  .trim()
  .max(500)
  .refine((value) => {
    const url = safeHttpUrl(value);
    return url !== null && new URL(url).protocol === 'https:';
  }, 'Use a full https:// URL');

export const whatsappNumberSchema = z
  .string()
  .trim()
  .refine((value) => value === '' || /^[1-9]\d{7,14}$/.test(value), {
    message: 'Use 8–15 digits in international format, without + or spaces',
  });

const imagePathSchema = z
  .string()
  .trim()
  .max(2048)
  .refine((value) => value === '' || isSafeImageUrl(value), 'Use an http(s) URL or an absolute in-app path');

export const settingsInputSchema = z
  .object({
    businessName: trimmed(1, 80, 'Business name'),
    tagline: optionalText(160),
    shortDescription: optionalText(600),
    logoUrl: imagePathSchema,
    whatsappNumber: whatsappNumberSchema,
    whatsappTemplates: z
      .object({
        general: z.string().max(1000).default(''),
        product: z.string().max(1000).default(''),
        cart: z.string().max(2000).default(''),
      })
      .strict(),
    contact: z
      .object({
        email: z
          .string()
          .trim()
          .max(254)
          .refine((value) => value === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value), 'Enter a valid email'),
        phone: optionalText(40),
        addressLines: z.array(trimmed(1, 120, 'Address line')).max(4).default([]),
        hours: optionalText(200),
      })
      .strict(),
    socials: z
      .array(z.object({ platform: z.enum(['instagram', 'facebook', 'tiktok', 'pinterest', 'youtube', 'x']), url: httpsUrl }).strict())
      .max(8)
      .default([]),
    announcement: z
      .object({
        enabled: z.boolean(),
        text: optionalText(200),
        linkLabel: optionalText(60),
        linkUrl: hrefSchema.default(''),
      })
      .strict(),
    homepage: z
      .object({
        heroEyebrow: optionalText(80),
        heroTitle: trimmed(1, 120, 'Hero title'),
        heroTitleAccent: optionalText(120),
        heroBody: optionalText(600),
        heroCtaLabel: trimmed(1, 60, 'CTA label'),
        heroCtaUrl: hrefSchema,
        heroImage: imagePathSchema,
        heroImageAlt: optionalText(200),
        heroNote: optionalText(160),
        categoriesEyebrow: optionalText(80),
        categoriesTitle: optionalText(120),
        featuredEyebrow: optionalText(80),
        featuredTitle: optionalText(120),
        philosophyEyebrow: optionalText(80),
        philosophyTitle: optionalText(160),
        philosophyBody: z.array(trimmed(1, 800, 'Paragraph')).max(6).default([]),
        ingredients: z.array(trimmed(1, 80, 'Ingredient')).max(12).default([]),
        philosophyImage: imagePathSchema,
        philosophyImageAlt: optionalText(200),
        whyEyebrow: optionalText(80),
        whyTitle: optionalText(160),
        values: z
          .array(z.object({ title: trimmed(1, 80, 'Title'), body: trimmed(1, 400, 'Body') }).strict())
          .max(6)
          .default([]),
        bestsellersEyebrow: optionalText(80),
        bestsellersTitle: optionalText(120),
        ritualEyebrow: optionalText(80),
        ritualTitle: optionalText(160),
        ritualImage: imagePathSchema,
        ritualImageAlt: optionalText(200),
        ritualSteps: z
          .array(z.object({ title: trimmed(1, 80, 'Title'), body: trimmed(1, 400, 'Body') }).strict())
          .max(6)
          .default([]),
        reviewsEyebrow: optionalText(80),
        reviewsTitle: optionalText(120),
        galleryEyebrow: optionalText(80),
        galleryTitle: optionalText(120),
        whatsappEyebrow: optionalText(80),
        whatsappTitle: optionalText(160),
        whatsappBody: optionalText(600),
      })
      .strict(),
    about: z
      .object({
        eyebrow: optionalText(80),
        title: optionalText(160),
        intro: optionalText(1200),
        image: imagePathSchema,
        imageAlt: optionalText(200),
        sections: z
          .array(z.object({ title: trimmed(1, 100, 'Title'), body: trimmed(1, 1200, 'Body') }).strict())
          .max(6)
          .default([]),
      })
      .strict(),
    seo: z
      .object({
        title: optionalText(70),
        description: optionalText(320),
        canonicalUrl: z
          .string()
          .trim()
          .max(300)
          .refine((value) => value === '' || safeHttpUrl(value) !== null, 'Enter a full https:// URL'),
        ogImage: imagePathSchema,
      })
      .strict(),
    commerce: z
      .object({
        currency: z.enum(['USD', 'EUR', 'GBP', 'PKR', 'AED', 'INR', 'CAD', 'AUD', 'SAR']),
        shippingNote: optionalText(600),
        priceNote: optionalText(600),
        lowStockThreshold: z.number().int().min(0).max(100),
      })
      .strict(),
    footer: z.object({ blurb: optionalText(500), note: optionalText(300) }).strict(),
    features: z.object({ reviewsEnabled: z.boolean(), galleryEnabled: z.boolean() }).strict(),
  })
  .strict();

export const settingsPatchSchema = settingsInputSchema.partial().strict();

export const analyticsEventSchema = z
  .object({
    type: z.enum(ANALYTICS_EVENT_TYPES),
    path: z
      .string()
      .trim()
      .max(300)
      .refine((value) => value === '' || (value.startsWith('/') && !value.startsWith('//')), 'Path must start with /'),
    productSlug: slugSchema.optional(),
  })
  .strict();

export const cartValidateSchema = z
  .object({
    items: z
      .array(
        z
          .object({
            productId: objectIdSchema,
            variantId: objectIdSchema.nullable().optional(),
            quantity: z.number().int().min(1).max(99),
            price: z.number().int().min(0).max(10_000_000).optional(),
          })
          .strict(),
      )
      .min(1, 'Add at least one item')
      .max(50),
  })
  .strict();

export const orderSchema = z
  .object({
    ids: z.array(objectIdSchema).min(1).max(100),
  })
  .strict();

export type ProductInput = z.infer<typeof productInputSchema>;
export type ProductPatch = z.infer<typeof productPatchSchema>;
export type CategoryInput = z.infer<typeof categoryInputSchema>;
export type SettingsInput = z.infer<typeof settingsInputSchema>;
export type ImageInput = z.infer<typeof imageInputSchema>;
export type ReviewSubmission = z.infer<typeof reviewSubmissionSchema>;
