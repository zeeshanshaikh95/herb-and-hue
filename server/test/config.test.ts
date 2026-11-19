import { describe, expect, it } from 'vitest';
import {
  buildConfig,
  isStrongJwtSecret,
  isStrongPassword,
} from '../src/config/env.js';

const STRONG_SECRET = 'Q7mZ2vK9pLx4Rt8Nc6Wb3Hs1Jd5Fg0Ya';
const PRODUCTION_ENV = {
  NODE_ENV: 'production',
  PORT: '8080',
  MONGODB_URI: 'mongodb+srv://app:secret@cluster0.example.mongodb.net/herb_hue',
  JWT_SECRET: STRONG_SECRET,
  CORS_ORIGINS: 'https://shop.herb-and-hue.example',
  PUBLIC_SITE_URL: 'https://shop.herb-and-hue.example',
  ADMIN_EMAIL: 'owner@herb-and-hue.example',
  ADMIN_PASSWORD: 'Owner!StrongPass2026',
  CLOUDINARY_CLOUD_NAME: 'herb-hue',
  CLOUDINARY_API_KEY: '123456789012345',
  CLOUDINARY_API_SECRET: 'cloudinary-secret-value-123',
} as const;

const errorsFor = (overrides: Record<string, string>) =>
  buildConfig({ ...PRODUCTION_ENV, ...overrides } as NodeJS.ProcessEnv);

describe('production environment validation', () => {
  it('accepts a complete, hardened production configuration', () => {
    const result = errorsFor({});
    expect(result.errors).toEqual([]);
    expect(result.config?.isProduction).toBe(true);
    expect(result.config?.jwtSecret).toBe(STRONG_SECRET);
    expect(result.config?.cloudinary?.cloudName).toBe('herb-hue');
    expect(result.config?.publicSiteUrl).toBe('https://shop.herb-and-hue.example');
  });

  it('fails without a JWT secret', () => {
    const { JWT_SECRET: _omit, ...rest } = PRODUCTION_ENV;
    const result = buildConfig(rest as NodeJS.ProcessEnv);
    expect(result.config).toBeNull();
    expect(result.errors.map((issue) => issue.variable)).toContain('JWT_SECRET');
  });

  it('rejects placeholder or low-entropy JWT secrets in production', () => {
    for (const secret of ['change-me-please-aaaaaaaaaaaaaaaaaaaaaaaa', 'a'.repeat(48), 'development-only-secret-value-000000000000']) {
      const result = errorsFor({ JWT_SECRET: secret });
      expect(result.config, secret).toBeNull();
      expect(result.errors.map((issue) => issue.variable)).toContain('JWT_SECRET');
    }
  });

  it('rejects a database URI with the wrong scheme', () => {
    const result = errorsFor({ MONGODB_URI: 'postgres://cluster/db' });
    expect(result.config).toBeNull();
    expect(result.errors.map((issue) => issue.variable)).toContain('MONGODB_URI');
  });

  it('requires MongoDB, Cloudinary and an https site URL in production', () => {
    const { MONGODB_URI: _db, CLOUDINARY_CLOUD_NAME: _c, CLOUDINARY_API_KEY: _k, CLOUDINARY_API_SECRET: _s, ...rest } =
      PRODUCTION_ENV;
    const result = buildConfig({ ...rest, PUBLIC_SITE_URL: 'http://insecure.example' } as NodeJS.ProcessEnv);
    expect(result.config).toBeNull();
    const variables = result.errors.map((issue) => issue.variable);
    expect(variables).toEqual(expect.arrayContaining(['MONGODB_URI', 'CLOUDINARY_*', 'PUBLIC_SITE_URL']));
  });

  it('rejects partial Cloudinary credentials', () => {
    const result = errorsFor({ CLOUDINARY_API_SECRET: '' });
    expect(result.config).toBeNull();
    expect(result.errors.map((issue) => issue.variable)).toContain('CLOUDINARY_*');
  });

  it('rejects wildcard and insecure CORS origins', () => {
    const wildcard = errorsFor({ CORS_ORIGINS: '*' });
    expect(wildcard.config).toBeNull();
    expect(wildcard.errors.some((issue) => issue.variable === 'CORS_ORIGINS')).toBe(true);

    const plainHttp = errorsFor({ CORS_ORIGINS: 'http://shop.herb-and-hue.example' });
    expect(plainHttp.config).toBeNull();
    expect(plainHttp.errors.some((issue) => issue.variable === 'CORS_ORIGINS')).toBe(true);
  });

  it('rejects weak or placeholder admin bootstrap passwords', () => {
    const weak = errorsFor({ ADMIN_PASSWORD: 'password' });
    expect(weak.config).toBeNull();
    expect(weak.errors.map((issue) => issue.variable)).toContain('ADMIN_PASSWORD');

    const placeholder = errorsFor({ ADMIN_PASSWORD: 'ChangeMe!HerbHue2026' });
    expect(placeholder.config).toBeNull();
  });

  it('requires ADMIN_EMAIL and ADMIN_PASSWORD together', () => {
    const result = errorsFor({ ADMIN_PASSWORD: '' });
    expect(result.config).toBeNull();
    expect(result.errors.map((issue) => issue.variable)).toContain('ADMIN_EMAIL');
  });

  it('falls back to a warning-only development secret outside production', () => {
    const result = buildConfig({ NODE_ENV: 'development' } as NodeJS.ProcessEnv);
    expect(result.config).not.toBeNull();
    expect(result.config?.jwtSecret.length).toBeGreaterThanOrEqual(32);
    expect(result.warnings.join(' ')).toMatch(/development-only secret/i);
  });
});

describe('credential strength helpers', () => {
  it('classifies JWT secrets', () => {
    expect(isStrongJwtSecret(STRONG_SECRET)).toBe(true);
    expect(isStrongJwtSecret('too-short')).toBe(false);
    expect(isStrongJwtSecret('your-super-secret-key-that-is-long-enough')).toBe(false);
    expect(isStrongJwtSecret('abababababababababababababababababab')).toBe(false);
  });

  it('classifies passwords', () => {
    expect(isStrongPassword('Owner!StrongPass2026')).toBe(true);
    expect(isStrongPassword('alllowercase123!')).toBe(false);
    expect(isStrongPassword('NoNumbers!!')).toBe(false);
    expect(isStrongPassword('NoSpecial12345')).toBe(false);
    expect(isStrongPassword('Short1!')).toBe(false);
  });
});
