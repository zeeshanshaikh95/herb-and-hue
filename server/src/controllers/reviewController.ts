import type { Request, Response } from 'express';
import { Types } from 'mongoose';
import { Product } from '../models/Product.js';
import { Review, type ReviewData } from '../models/Review.js';
import { parseId, parseQuery } from '../middleware/validate.js';
import { AppError } from '../utils/AppError.js';
import { pageMeta } from '../utils/pagination.js';
import { toAdminReview, toPublicReview } from '../services/serializers.js';
import { getSettings } from '../services/settingsService.js';
import {
  adminReviewQuerySchema,
  reviewModerationSchema,
  reviewQuerySchema,
  type ReviewSubmission,
} from '../validation/schemas.js';
import type { z } from 'zod';

type ReviewLike = ReviewData & { _id: Types.ObjectId; product?: unknown };

export async function listPublicReviews(req: Request, res: Response): Promise<void> {
  const query = parseQuery(reviewQuerySchema, req.query);
  const settings = await getSettings();

  if (!settings.features.reviewsEnabled) {
    res.json({ data: [], meta: pageMeta(1, query.limit, 0), summary: { total: 0, average: 0, distribution: {} } });
    return;
  }

  const filter: Record<string, unknown> = { status: 'approved' };
  if (query.rating) filter.rating = query.rating;
  if (query.product) {
    const product = await Product.findOne({ slug: query.product }).select('_id');
    filter.product = product ? product._id : new Types.ObjectId();
  }

  const [total, reviews, summaryRows] = await Promise.all([
    Review.countDocuments(filter),
    Review.find(filter)
      .populate('product', 'name slug')
      .sort({ createdAt: -1 })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit),
    Review.aggregate<{ _id: number; count: number }>([
      { $match: { status: 'approved' } },
      { $group: { _id: '$rating', count: { $sum: 1 } } },
    ]),
  ]);

  const distribution = Object.fromEntries(summaryRows.map((row) => [String(row._id), row.count]));
  const summaryTotal = summaryRows.reduce((sum, row) => sum + row.count, 0);
  const average =
    summaryTotal > 0
      ? summaryRows.reduce((sum, row) => sum + row._id * row.count, 0) / summaryTotal
      : 0;

  res.setHeader('Cache-Control', 'public, max-age=30, stale-while-revalidate=120');
  res.json({
    data: reviews.map((review) => toPublicReview(review as unknown as ReviewLike)),
    meta: pageMeta(query.page, query.limit, total),
    summary: {
      total: summaryTotal,
      average: Math.round(average * 10) / 10,
      distribution,
    },
  });
}

export async function submitReview(req: Request, res: Response): Promise<void> {
  const input = req.body as ReviewSubmission;
  let productId: Types.ObjectId | null = null;

  if (input.productSlug) {
    const product = await Product.findOne({ slug: input.productSlug, archivedAt: null }).select('_id');
    if (!product) {
      throw new AppError(422, 'validation_failed', 'Some fields need attention.', [
        { field: 'productSlug', message: 'That product is not available.' },
      ]);
    }
    productId = product._id;
  }

  const review = await Review.create({
    authorName: input.authorName,
    email: input.email,
    rating: input.rating,
    title: input.title,
    body: input.body,
    product: productId,
    status: 'pending',
  });

  res.status(201).json({
    data: {
      id: String(review._id),
      status: review.status,
      message:
        'Thank you — your review has been received and will appear once the Herb & Hue team has reviewed it.',
    },
  });
}

export async function listAdminReviews(req: Request, res: Response): Promise<void> {
  const query = parseQuery(adminReviewQuerySchema, req.query);
  const filter: Record<string, unknown> = {};
  if (query.status !== 'all') filter.status = query.status;

  const [total, reviews] = await Promise.all([
    Review.countDocuments(filter),
    Review.find(filter)
      .select('+email')
      .populate('product', 'name slug')
      .sort({ createdAt: -1 })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit),
  ]);

  res.setHeader('Cache-Control', 'no-store');
  res.json({
    data: reviews.map((review) => toAdminReview(review as unknown as ReviewLike & { email?: string })),
    meta: pageMeta(query.page, query.limit, total),
  });
}

export async function moderateReview(req: Request, res: Response): Promise<void> {
  const id = parseId(req.params.id);
  const { status, adminNote } = req.body as z.infer<typeof reviewModerationSchema>;
  const review = await Review.findById(id);
  if (!review) throw AppError.notFound('review_not_found', 'Review not found.');

  review.status = status;
  if (adminNote !== undefined) review.adminNote = adminNote;
  await review.save();
  await review.populate('product', 'name slug');

  res.json({ data: toAdminReview(review as unknown as ReviewLike & { email?: string }) });
}

export async function deleteReview(req: Request, res: Response): Promise<void> {
  const id = parseId(req.params.id);
  const review = await Review.findByIdAndDelete(id);
  if (!review) throw AppError.notFound('review_not_found', 'Review not found.');
  res.json({ data: { message: 'Review deleted.' } });
}
