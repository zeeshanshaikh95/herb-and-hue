import { beforeEach, describe, expect, it } from 'vitest';
import { Product } from '../src/models/Product.js';
import {
  adminAuth,
  app,
  clearDatabase,
  createCategory,
  createProduct,
  request,
  tokenFor,
} from './helpers.js';

const productBody = (categoryId: string, overrides: Record<string, unknown> = {}) => ({
  name: 'Wild Fig Cleansing Balm',
  shortDescription: 'A gentle balm.',
  description: 'A sample description for tests.',
  category: categoryId,
  price: 3200,
  stockQuantity: 4,
  images: [{ url: '/images/products/velvet-cream.svg', alt: 'Amber jar on linen' }],
  benefits: ['Comfort'],
  adminNotes: 'Internal note that must never reach the public API',
  ...overrides,
});

describe('products', () => {
  beforeEach(clearDatabase);

  it('rejects unauthenticated writes', async () => {
    const category = await createCategory();
    const response = await request(app).post('/api/admin/products').send(productBody(String(category._id)));
    expect(response.status).toBe(401);
  });

  it('creates a product, derives a slug and returns admin fields', async () => {
    const { header } = await adminAuth();
    const category = await createCategory();
    const response = await request(app)
      .post('/api/admin/products')
      .set('Authorization', header)
      .send(productBody(String(category._id)));

    expect(response.status).toBe(201);
    expect(response.body.data.slug).toBe('wild-fig-cleansing-balm');
    expect(response.body.data.adminNotes).toContain('Internal note');
    expect(response.body.data.category.slug).toBe('test-collection');
  });

  it('never exposes admin-only fields through the public API', async () => {
    const category = await createCategory();
    await createProduct({
      category: category._id,
      adminNotes: 'secret purchasing note',
      sku: 'SKU-SECRET',
    });

    const list = await request(app).get('/api/products');
    expect(list.status).toBe(200);
    const item = list.body.data[0];
    expect(item.adminNotes).toBeUndefined();
    expect(item.archivedAt).toBeUndefined();
    // The public projections intentionally expose only the catalogue fields.
    expect(Object.keys(item)).not.toContain('categoryId');

    const detail = await request(app).get(`/api/products/${item.slug}`);
    expect(detail.status).toBe(200);
    expect(detail.body.data.adminNotes).toBeUndefined();
  });

  it('validates prices, categories and safe image URLs', async () => {
    const { header } = await adminAuth();
    const category = await createCategory();

    const negative = await request(app)
      .post('/api/admin/products')
      .set('Authorization', header)
      .send(productBody(String(category._id), { price: -100 }));
    expect(negative.status).toBe(422);

    const missingCategory = await request(app)
      .post('/api/admin/products')
      .set('Authorization', header)
      .send(productBody('64b000000000000000000000'));
    expect(missingCategory.status).toBe(422);
    expect(missingCategory.body.error.details[0].field).toBe('category');

    const unsafeImage = await request(app)
      .post('/api/admin/products')
      .set('Authorization', header)
      .send(
        productBody(String(category._id), {
          images: [{ url: 'javascript:alert(1)', alt: 'unsafe' }],
        }),
      );
    expect(unsafeImage.status).toBe(422);

    const compareAtTooLow = await request(app)
      .post('/api/admin/products')
      .set('Authorization', header)
      .send(productBody(String(category._id), { compareAtPrice: 100 }));
    expect(compareAtTooLow.status).toBe(422);
  });

  it('rejects duplicate slugs with a conflict response', async () => {
    const { header } = await adminAuth();
    const category = await createCategory();
    const body = productBody(String(category._id), { slug: 'same-slug' });

    expect((await request(app).post('/api/admin/products').set('Authorization', header).send(body)).status).toBe(201);
    const duplicate = await request(app).post('/api/admin/products').set('Authorization', header).send(body);
    expect(duplicate.status).toBe(409);
    expect(duplicate.body.error.code).toBe('duplicate_slug');
  });

  it('archives and restores products without deleting data', async () => {
    const { header } = await adminAuth();
    const category = await createCategory();
    const product = await createProduct({ category: category._id });

    const archived = await request(app)
      .post(`/api/admin/products/${product._id}/archive`)
      .set('Authorization', header);
    expect(archived.status).toBe(200);
    expect(archived.body.data.archivedAt).toBeTruthy();

    expect((await request(app).get(`/api/products/${product.slug}`)).status).toBe(404);
    expect((await request(app).get('/api/products')).body.data).toHaveLength(0);

    const restored = await request(app)
      .post(`/api/admin/products/${product._id}/restore`)
      .set('Authorization', header);
    expect(restored.status).toBe(200);
    expect((await request(app).get(`/api/products/${product.slug}`)).status).toBe(200);
    expect(await Product.countDocuments()).toBe(1);
  });

  it('patches a product and validates the merged document', async () => {
    const { header } = await adminAuth();
    const category = await createCategory();
    const product = await createProduct({ category: category._id });

    const updated = await request(app)
      .patch(`/api/admin/products/${product._id}`)
      .set('Authorization', header)
      .send({ price: 4100, featured: true });
    expect(updated.status).toBe(200);
    expect(updated.body.data.price).toBe(4100);
    expect(updated.body.data.featured).toBe(true);
    expect(updated.body.data.name).toBe(product.name);
  });

  it('paginates and sorts the public catalogue', async () => {
    const category = await createCategory();
    await createProduct({ category: category._id, name: 'Alpha', price: 5000 });
    await createProduct({ category: category._id, name: 'Beta', price: 1000 });

    const page = await request(app).get('/api/products?limit=1&page=2&sort=price-asc');
    expect(page.status).toBe(200);
    expect(page.body.data).toHaveLength(1);
    expect(page.body.meta.total).toBe(2);
    expect(page.body.meta.totalPages).toBe(2);
  });

  it('rejects malformed query strings and operator injection', async () => {
    const injection = await request(app).get('/api/products?category[$ne]=anything');
    expect(injection.status).toBe(422);

    const badLimit = await request(app).get('/api/products?limit=9999');
    expect(badLimit.status).toBe(422);
  });
});

describe('categories', () => {
  beforeEach(clearDatabase);

  it('creates, updates and deletes an empty category', async () => {
    const { header } = await adminAuth();
    const created = await request(app)
      .post('/api/admin/categories')
      .set('Authorization', header)
      .send({ name: 'Body Rituals', description: 'Body care.' });
    expect(created.status).toBe(201);
    expect(created.body.data.slug).toBe('body-rituals');

    const updated = await request(app)
      .patch(`/api/admin/categories/${created.body.data.id}`)
      .set('Authorization', header)
      .send({ isActive: false });
    expect(updated.status).toBe(200);
    expect(updated.body.data.isActive).toBe(false);

    const removed = await request(app)
      .delete(`/api/admin/categories/${created.body.data.id}`)
      .set('Authorization', header);
    expect(removed.status).toBe(200);
  });

  it('refuses to delete a category that still has products', async () => {
    const { header } = await adminAuth();
    const category = await createCategory();
    await createProduct({ category: category._id });

    const response = await request(app)
      .delete(`/api/admin/categories/${category._id}`)
      .set('Authorization', header);
    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('category_in_use');
  });

  it('hides inactive categories from the storefront', async () => {
    await createCategory({ name: 'Hidden', isActive: false });
    const response = await request(app).get('/api/categories');
    expect(response.body.data).toHaveLength(0);
  });

  it('rejects duplicate category slugs', async () => {
    const { header } = await adminAuth();
    await request(app).post('/api/admin/categories').set('Authorization', header).send({ name: 'Duplicated' });
    const duplicate = await request(app)
      .post('/api/admin/categories')
      .set('Authorization', header)
      .send({ name: 'Duplicated' });
    expect(duplicate.status).toBe(409);
  });

  it('rejects tampered JWTs minted for a deleted admin', async () => {
    const { admin } = await adminAuth();
    const token = tokenFor(admin);
    const { Admin } = await import('../src/models/Admin.js');
    await Admin.deleteMany({});
    const response = await request(app).get('/api/admin/categories').set('Authorization', `Bearer ${token}`);
    expect(response.status).toBe(401);
  });
});
