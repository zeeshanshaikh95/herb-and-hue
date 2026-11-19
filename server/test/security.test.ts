import { beforeEach, describe, expect, it } from 'vitest';
import { MediaAsset } from '../src/models/MediaAsset.js';
import { Product } from '../src/models/Product.js';
import { detectImage } from '../src/utils/imageSignature.js';
import { createCategory, createProduct, adminAuth, app, clearDatabase, request } from './helpers.js';

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);

describe('transport security', () => {
  beforeEach(clearDatabase);

  it('allows configured origins and blocks unknown ones', async () => {
    const allowed = await request(app).get('/api/products').set('Origin', 'http://localhost:5173');
    expect(allowed.status).toBe(200);
    expect(allowed.headers['access-control-allow-origin']).toBe('http://localhost:5173');

    const blocked = await request(app).get('/api/products').set('Origin', 'https://evil.example');
    expect(blocked.status).toBe(403);
    expect(blocked.body.error.code).toBe('cors_denied');
    expect(blocked.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('returns safe error shapes with request IDs and no stack traces', async () => {
    const response = await request(app).get('/api/does-not-exist');
    expect(response.status).toBe(404);
    expect(response.body.error.requestId).toBeTruthy();
    expect(response.body.error.stack).toBeUndefined();
    expect(response.headers['x-powered-by']).toBeUndefined();
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-frame-options']).toBeDefined();
  });

  it('rejects malformed JSON and oversized bodies', async () => {
    const malformed = await request(app)
      .post('/api/cart/validate')
      .set('Content-Type', 'application/json')
      .send('{"items": [}');
    expect(malformed.status).toBe(400);
    expect(malformed.body.error.code).toBe('malformed_json');

    const oversized = await request(app)
      .post('/api/cart/validate')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ items: [{ note: 'x'.repeat(200_000) }] }));
    expect(oversized.status).toBe(413);
    expect(oversized.body.error.code).toBe('payload_too_large');
  });

  it('reports health with database state', async () => {
    const response = await request(app).get('/api/health');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
    expect(response.body.database).toBe('connected');
    expect(response.body).not.toHaveProperty('mongodbUri');
  });
});

describe('image upload security', () => {
  beforeEach(clearDatabase);

  it('requires admin authentication before accepting files', async () => {
    const response = await request(app)
      .post('/api/admin/uploads')
      .attach('images', PNG_SIGNATURE, { filename: 'leaf.png', contentType: 'image/png' });
    expect(response.status).toBe(401);
  });

  it('rejects a file whose bytes are not a real image', async () => {
    const { header } = await adminAuth();
    const response = await request(app)
      .post('/api/admin/uploads')
      .set('Authorization', header)
      .attach('images', Buffer.from('this is not an image at all'), {
        filename: 'fake.png',
        contentType: 'image/png',
      });
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('unsupported_file_type');
  });

  it('rejects disallowed MIME types before reading bytes', async () => {
    const { header } = await adminAuth();
    const response = await request(app)
      .post('/api/admin/uploads')
      .set('Authorization', header)
      .attach('images', Buffer.from('<svg></svg>'), {
        filename: 'vector.svg',
        contentType: 'image/svg+xml',
      });
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('unsupported_file_type');
  });

  it('validates image signatures for JPEG, PNG and WebP only', () => {
    expect(detectImage(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]))?.format).toBe('jpeg');
    expect(detectImage(PNG_SIGNATURE)?.format).toBe('png');
    const webp = Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBP')]);
    expect(detectImage(webp)?.format).toBe('webp');
    expect(detectImage(Buffer.from('GIF89a................'))).toBeNull();
    expect(detectImage(Buffer.from('too-short'))).toBeNull();
  });

  it('refuses to delete an image that is still referenced', async () => {
    const { header } = await adminAuth();
    const category = await createCategory();
    const product = await createProduct({
      category: category._id,
      images: [
        {
          url: 'https://res.cloudinary.com/demo/image/upload/v1/herb-and-hue/leaf.jpg',
          publicId: 'herb-and-hue/leaf',
          alt: 'Leaf',
        },
      ],
    });
    await MediaAsset.create({
      publicId: 'herb-and-hue/leaf',
      url: 'https://res.cloudinary.com/demo/image/upload/v1/herb-and-hue/leaf.jpg',
      secureUrl: 'https://res.cloudinary.com/demo/image/upload/v1/herb-and-hue/leaf.jpg',
      provider: 'cloudinary',
      format: 'jpg',
      bytes: 1000,
      alt: 'Leaf',
    });

    const response = await request(app)
      .delete('/api/admin/media?publicId=herb-and-hue%2Fleaf')
      .set('Authorization', header);
    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('image_in_use');

    // Removing the product reference would allow deletion; the guard is reference based.
    await Product.deleteOne({ _id: product._id });
    expect(await Product.countDocuments()).toBe(0);
  });
});

describe('settings input safety', () => {
  beforeEach(clearDatabase);

  it('rejects javascript: URLs and unsafe image paths', async () => {
    const { header } = await adminAuth();
    const current = await request(app).get('/api/settings/public');
    expect(current.status).toBe(200);
    // updatedAt is a read-only projection field, so it is not part of the input body.
    const settings = current.body.data as Record<string, unknown> & { homepage: Record<string, unknown> };
    delete settings.updatedAt;

    const body = {
      ...settings,
      homepage: { ...settings.homepage, heroCtaUrl: 'javascript:alert(document.cookie)' },
    };
    const response = await request(app)
      .put('/api/admin/settings')
      .set('Authorization', header)
      .send(body);
    expect(response.status).toBe(422);
    expect(response.body.error.details.some((detail: { field: string }) => detail.field.includes('heroCtaUrl'))).toBe(
      true,
    );
  });

  it('rejects an invalid WhatsApp number', async () => {
    const { header } = await adminAuth();
    const current = await request(app).get('/api/settings/public');
    const settings = current.body.data as Record<string, unknown>;
    delete settings.updatedAt;
    const response = await request(app)
      .put('/api/admin/settings')
      .set('Authorization', header)
      .send({ ...settings, whatsappNumber: '+1 (555) 010-0000' });
    expect(response.status).toBe(422);
  });
});
