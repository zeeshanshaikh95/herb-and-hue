import { beforeEach, describe, expect, it } from 'vitest';
import { Review } from '../src/models/Review.js';
import {
  adminAuth,
  app,
  clearDatabase,
  createCategory,
  createProduct,
  request,
} from './helpers.js';

const reviewBody = {
  authorName: 'Test Customer',
  email: 'customer@example.com',
  rating: 5,
  title: 'Lovely texture',
  body: 'A genuine test review submitted by the automated suite.',
};

describe('review submission and moderation', () => {
  beforeEach(clearDatabase);

  it('accepts a review as pending and keeps it off the storefront', async () => {
    const product = await createProduct();
    const created = await request(app)
      .post('/api/reviews')
      .send({ ...reviewBody, productSlug: product.slug });
    expect(created.status).toBe(201);
    expect(created.body.data.status).toBe('pending');

    expect((await request(app).get('/api/reviews')).body.data).toHaveLength(0);
    expect((await request(app).get('/api/reviews')).body.summary.total).toBe(0);
  });

  it('publishes a review only after approval, with a rating summary', async () => {
    const { header } = await adminAuth();
    const created = await request(app).post('/api/reviews').send(reviewBody);
    expect(created.status).toBe(201);

    const approved = await request(app)
      .patch(`/api/admin/reviews/${created.body.data.id}`)
      .set('Authorization', header)
      .send({ status: 'approved', adminNote: 'Verified by the team' });
    expect(approved.status).toBe(200);

    const publicList = await request(app).get('/api/reviews');
    expect(publicList.body.data).toHaveLength(1);
    expect(publicList.body.data[0].email).toBeUndefined();
    expect(publicList.body.data[0].status).toBeUndefined();
    expect(publicList.body.summary.average).toBe(5);
    expect(publicList.body.summary.distribution['5']).toBe(1);
  });

  it('requires admin authentication to moderate', async () => {
    const created = await Review.create(reviewBody);
    const response = await request(app)
      .patch(`/api/admin/reviews/${created._id}`)
      .send({ status: 'approved' });
    expect(response.status).toBe(401);
  });

  it('validates ratings and required fields', async () => {
    const badRating = await request(app).post('/api/reviews').send({ ...reviewBody, rating: 9 });
    expect(badRating.status).toBe(422);

    const shortBody = await request(app).post('/api/reviews').send({ ...reviewBody, body: 'Too short' });
    expect(shortBody.status).toBe(422);

    const badEmail = await request(app).post('/api/reviews').send({ ...reviewBody, email: 'nope' });
    expect(badEmail.status).toBe(422);
  });

  it('deletes a review', async () => {
    const { header } = await adminAuth();
    const created = await Review.create({ ...reviewBody, status: 'approved' });
    const response = await request(app)
      .delete(`/api/admin/reviews/${created._id}`)
      .set('Authorization', header);
    expect(response.status).toBe(200);
    expect(await Review.countDocuments()).toBe(0);
  });
});

describe('cart validation', () => {
  beforeEach(clearDatabase);

  it('returns server-side prices and flags a stale client price', async () => {
    const product = await createProduct({ price: 2500, stockQuantity: 5 });
    const response = await request(app)
      .post('/api/cart/validate')
      .send({ items: [{ productId: String(product._id), quantity: 2, price: 100 }] });

    expect(response.status).toBe(200);
    const line = response.body.data.lines[0];
    expect(line.unitPrice).toBe(2500);
    expect(line.lineTotal).toBe(5000);
    expect(line.priceChanged).toBe(true);
    expect(line.issue).toBe('price_changed');
    expect(response.body.data.subtotal).toBe(5000);
    expect(response.body.data.hasIssues).toBe(true);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.body.data.note).toMatch(/enquiry, not a confirmed order/i);
  });

  it('flags insufficient stock and out-of-stock products', async () => {
    const category = await createCategory();
    const limited = await createProduct({ category: category._id, name: 'Limited', stockQuantity: 1 });
    const soldOut = await createProduct({ category: category._id, name: 'Sold out', stockQuantity: 0 });

    const response = await request(app)
      .post('/api/cart/validate')
      .send({
        items: [
          { productId: String(limited._id), quantity: 3 },
          { productId: String(soldOut._id), quantity: 1 },
        ],
      });

    expect(response.body.data.lines[0].issue).toBe('insufficient_stock');
    expect(response.body.data.lines[0].lineTotal).toBe(2500);
    expect(response.body.data.lines[1].issue).toBe('out_of_stock');
    expect(response.body.data.lines[1].inStock).toBe(false);
  });

  it('requires a variant when the product has variants', async () => {
    const category = await createCategory();
    const product = await createProduct({
      category: category._id,
      variants: [{ label: '30 ml', price: 3000, stockQuantity: 4, compareAtPrice: null, sku: null }],
    });
    const response = await request(app)
      .post('/api/cart/validate')
      .send({ items: [{ productId: String(product._id), quantity: 1 }] });
    expect(response.body.data.lines[0].issue).toBe('variant_required');
    expect(response.body.data.subtotal).toBe(0);

    const variantId = String(product.variants[0]._id);
    const withVariant = await request(app)
      .post('/api/cart/validate')
      .send({ items: [{ productId: String(product._id), variantId, quantity: 2 }] });
    expect(withVariant.body.data.lines[0].issue).toBe('none');
    expect(withVariant.body.data.subtotal).toBe(6000);
  });

  it('marks unknown or archived products as unavailable', async () => {
    const category = await createCategory();
    const archived = await createProduct({ category: category._id, archivedAt: new Date() });
    const response = await request(app)
      .post('/api/cart/validate')
      .send({
        items: [
          { productId: '64b000000000000000000000', quantity: 1 },
          { productId: String(archived._id), quantity: 1 },
        ],
      });
    expect(response.body.data.lines.every((line: { issue: string }) => line.issue === 'unavailable')).toBe(true);
  });

  it('rejects empty carts, invalid IDs and quantities', async () => {
    expect((await request(app).post('/api/cart/validate').send({ items: [] })).status).toBe(422);
    expect(
      (
        await request(app)
          .post('/api/cart/validate')
          .send({ items: [{ productId: 'not-an-id', quantity: 1 }] })
      ).status,
    ).toBe(422);
    expect(
      (
        await request(app)
          .post('/api/cart/validate')
          .send({ items: [{ productId: '64b000000000000000000000', quantity: 0 }] })
      ).status,
    ).toBe(422);
  });
});
