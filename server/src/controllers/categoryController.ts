import type { Request, Response } from 'express';
import { Types } from 'mongoose';
import { Category, type CategoryData } from '../models/Category.js';
import { Product } from '../models/Product.js';
import { parseId } from '../middleware/validate.js';
import { AppError } from '../utils/AppError.js';
import { slugify } from '../utils/slug.js';
import { cleanupDetachedImages } from '../services/mediaCleanup.js';
import { toAdminCategory, toPublicCategory } from '../services/serializers.js';
import { categoryInputSchema, categoryPatchSchema, type CategoryInput, type ImageInput } from '../validation/schemas.js';
import type { z } from 'zod';

type CategoryLike = CategoryData & { _id: Types.ObjectId; productCount?: number };

async function countsByCategory(): Promise<Map<string, number>> {
  const rows = await Product.aggregate<{ _id: Types.ObjectId; count: number }>([
    { $match: { archivedAt: null } },
    { $group: { _id: '$category', count: { $sum: 1 } } },
  ]);
  return new Map(rows.map((row) => [String(row._id), row.count]));
}

export async function listPublicCategories(_req: Request, res: Response): Promise<void> {
  const [categories, counts] = await Promise.all([
    Category.find({ isActive: true }).sort({ displayOrder: 1, name: 1 }),
    countsByCategory(),
  ]);
  res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
  res.json({
    data: categories.map((category) =>
      toPublicCategory({
        ...(category.toObject() as CategoryData),
        _id: category._id,
        productCount: counts.get(String(category._id)) ?? 0,
      } as CategoryLike),
    ),
  });
}

export async function getPublicCategory(req: Request, res: Response): Promise<void> {
  const slug = String(req.params.slug);
  const category = await Category.findOne({ slug, isActive: true });
  if (!category) throw AppError.notFound('category_not_found', 'This collection could not be found.');
  const count = await Product.countDocuments({ category: category._id, archivedAt: null });
  res.json({
    data: toPublicCategory({
      ...(category.toObject() as CategoryData),
      _id: category._id,
      productCount: count,
    } as CategoryLike),
  });
}

export async function listAdminCategories(_req: Request, res: Response): Promise<void> {
  const [categories, counts] = await Promise.all([
    Category.find().sort({ displayOrder: 1, name: 1 }),
    countsByCategory(),
  ]);
  res.setHeader('Cache-Control', 'no-store');
  res.json({
    data: categories.map((category) =>
      toAdminCategory({
        ...(category.toObject() as CategoryData),
        _id: category._id,
        productCount: counts.get(String(category._id)) ?? 0,
      } as CategoryLike),
    ),
  });
}

export async function createCategory(req: Request, res: Response): Promise<void> {
  const input = req.body as CategoryInput;
  const slug = input.slug ?? slugify(input.name);
  if (await Category.exists({ slug })) {
    throw AppError.conflict('duplicate_slug', 'A category with that slug already exists.');
  }
  const category = await Category.create({ ...input, slug });
  res.status(201).json({
    data: toAdminCategory({ ...(category.toObject() as CategoryData), _id: category._id } as CategoryLike),
  });
}

export async function updateCategory(req: Request, res: Response): Promise<void> {
  const id = parseId(req.params.id);
  const patch = req.body as z.infer<typeof categoryPatchSchema>;
  const category = await Category.findById(id);
  if (!category) throw AppError.notFound('category_not_found', 'Category not found.');

  const previousImage = category.image
    ? { publicId: category.image.publicId, url: category.image.url }
    : null;

  const merged = {
    name: patch.name ?? category.name,
    slug: patch.slug ?? category.slug,
    description: patch.description ?? category.description,
    image:
      patch.image === undefined
        ? category.image
          ? {
              url: category.image.url,
              publicId: category.image.publicId,
              alt: category.image.alt,
              width: category.image.width ?? null,
              height: category.image.height ?? null,
            }
          : null
        : patch.image,
    displayOrder: patch.displayOrder ?? category.displayOrder,
    isActive: patch.isActive ?? category.isActive,
  };

  const validated = categoryInputSchema.parse(merged);
  Object.assign(category, validated);
  await category.save();

  if (
    previousImage?.publicId &&
    validated.image?.publicId !== previousImage.publicId
  ) {
    void cleanupDetachedImages([previousImage]);
  }

  res.json({
    data: toAdminCategory({ ...(category.toObject() as CategoryData), _id: category._id } as CategoryLike),
  });
}

export async function deleteCategory(req: Request, res: Response): Promise<void> {
  const id = parseId(req.params.id);
  const category = await Category.findById(id);
  if (!category) throw AppError.notFound('category_not_found', 'Category not found.');

  const productCount = await Product.countDocuments({ category: id });
  if (productCount > 0) {
    throw AppError.conflict(
      'category_in_use',
      `This category is used by ${productCount} product${productCount === 1 ? '' : 's'}. Move them first or deactivate the category.`,
    );
  }

  const image = category.image ? { publicId: category.image.publicId, url: category.image.url } : null;
  await category.deleteOne();
  if (image) void cleanupDetachedImages([image]);

  res.json({ data: { message: 'Category deleted.' } });
}

export async function reorderCategories(req: Request, res: Response): Promise<void> {
  const { ids } = req.body as { ids: string[] };
  const found = await Category.countDocuments({ _id: { $in: ids } });
  if (found !== ids.length) {
    throw AppError.badRequest('unknown_category', 'One or more categories no longer exist.');
  }
  await Category.bulkWrite(
    ids.map((id, index) => ({
      updateOne: { filter: { _id: id }, update: { $set: { displayOrder: index } } },
    })),
  );
  res.json({ data: { message: 'Category order updated.' } });
}

export type { ImageInput };
