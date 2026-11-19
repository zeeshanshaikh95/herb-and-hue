import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { z } from 'zod';

const here = path.dirname(fileURLToPath(import.meta.url));
/** server/ regardless of running from src/ or dist/. */
export const serverRoot = path.resolve(here, '../..');
export const projectRoot = path.resolve(serverRoot, '..');

// Local convenience only: real deployments inject variables from the host.
dotenv.config({ path: path.join(serverRoot, '.env') });
dotenv.config({ path: path.join(projectRoot, '.env') });

const boolish = z
  .union([z.boolean(), z.enum(['true', 'false', '1', '0', ''])])
  .transform((value) => value === true || value === 'true' || value === '1');

const csv = z
  .string()
  .transform((value) =>
    value
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean),
  )
  .pipe(z.array(z.string().url('CORS entries must be absolute origins')));

const WEAK_SECRET_MARKERS = [
  'change-me',
  'changeme',
  'secret',
  'password',
  'development-only',
  'example',
  'your-',
  'insecure',
];

export const DEV_JWT_SECRET = 'dev-only-insecure-jwt-secret-never-use-in-production-0001';
export const DEV_ADMIN_PASSWORD_PLACEHOLDER = 'ChangeMe!HerbHue2026';

export function isStrongJwtSecret(secret: string): boolean {
  if (secret.length < 32) return false;
  const lower = secret.toLowerCase();
  if (WEAK_SECRET_MARKERS.some((marker) => lower.includes(marker))) return false;
  if (new Set(secret).size < 12) return false;
  if (/^(.)\1+$/.test(secret)) return false;
  return true;
}

export function isStrongPassword(password: string): boolean {
  return (
    password.length >= 12 &&
    password.length <= 128 &&
    /[a-z]/.test(password) &&
    /[A-Z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
  );
}

const rawSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  // Some hosts export PORT=0/empty by default; treat that as "unset" so the
  // local .env value is used. Explicit process env still wins when valid.
  PORT: z.preprocess(
    (value) => (value === '' || value === '0' || value === 0 ? undefined : value),
    z.coerce.number().int().min(1).max(65535).default(4000),
  ),
  MONGODB_URI: z.string().trim().optional(),
  JWT_SECRET: z.string().optional(),
  JWT_EXPIRES_IN: z.string().trim().default('2h'),
  CORS_ORIGINS: csv.default(['http://localhost:5173', 'http://127.0.0.1:5173']),
  PUBLIC_SITE_URL: z.string().url().default('http://localhost:5173'),
  PUBLIC_API_URL: z.string().url().optional(),
  ADMIN_EMAIL: z.string().trim().toLowerCase().email().optional(),
  ADMIN_PASSWORD: z.string().optional(),
  AUTO_SEED: boolish.default(false),
  CLOUDINARY_CLOUD_NAME: z.string().trim().optional(),
  CLOUDINARY_API_KEY: z.string().trim().optional(),
  CLOUDINARY_API_SECRET: z.string().trim().optional(),
  CLOUDINARY_FOLDER: z.string().trim().default('herb-and-hue'),
  UPLOAD_MAX_BYTES: z.coerce.number().int().min(1024).max(25 * 1024 * 1024).default(5 * 1024 * 1024),
  UPLOAD_MAX_FILES: z.coerce.number().int().min(1).max(10).default(6),
  TRUST_PROXY: boolish.default(false),
  LOG_LEVEL: z.enum(['dev', 'combined', 'common', 'short', 'tiny']).default('dev'),
});

export interface AppConfig {
  nodeEnv: 'development' | 'test' | 'production';
  isProduction: boolean;
  isTest: boolean;
  port: number;
  mongodbUri: string | null;
  jwtSecret: string;
  jwtExpiresIn: string;
  corsOrigins: string[];
  publicSiteUrl: string;
  publicApiUrl: string;
  admin: { email: string | null; password: string | null };
  autoSeed: boolean;
  cloudinary: {
    cloudName: string;
    apiKey: string;
    apiSecret: string;
    folder: string;
  } | null;
  uploads: { maxBytes: number; maxFiles: number };
  trustProxy: boolean;
  logLevel: 'dev' | 'combined' | 'common' | 'short' | 'tiny';
}

export interface ConfigIssue {
  variable: string;
  message: string;
}

export interface ConfigResult {
  config: AppConfig | null;
  errors: ConfigIssue[];
  warnings: string[];
}

/** Pure, testable environment evaluation. */
export function buildConfig(source: NodeJS.ProcessEnv): ConfigResult {
  const parsed = rawSchema.safeParse(source);
  if (!parsed.success) {
    return {
      config: null,
      errors: parsed.error.issues.map((issue) => ({
        variable: String(issue.path[0] ?? 'ENV'),
        message: issue.message,
      })),
      warnings: [],
    };
  }

  const env = parsed.data;
  const errors: ConfigIssue[] = [];
  const warnings: string[] = [];
  const isProduction = env.NODE_ENV === 'production';

  // Database
  if (env.MONGODB_URI) {
    if (!/^mongodb(\+srv)?:\/\//.test(env.MONGODB_URI)) {
      errors.push({ variable: 'MONGODB_URI', message: 'Must start with mongodb:// or mongodb+srv://' });
    }
  } else if (isProduction) {
    errors.push({ variable: 'MONGODB_URI', message: 'Required in production (MongoDB Atlas connection string)' });
  }

  // JWT
  let jwtSecret = env.JWT_SECRET ?? '';
  if (isProduction) {
    if (!jwtSecret) {
      errors.push({ variable: 'JWT_SECRET', message: 'Required in production' });
    } else if (!isStrongJwtSecret(jwtSecret)) {
      errors.push({
        variable: 'JWT_SECRET',
        message: 'Must be at least 32 characters, high-entropy, and free of placeholder words',
      });
    }
  } else if (!jwtSecret) {
    jwtSecret = DEV_JWT_SECRET;
    warnings.push('JWT_SECRET not set — using a development-only secret. Tokens are invalidated on restart.');
  } else if (!isStrongJwtSecret(jwtSecret)) {
    warnings.push('JWT_SECRET is weak; acceptable for local development only.');
  }

  // Admin bootstrap
  if ((env.ADMIN_EMAIL && !env.ADMIN_PASSWORD) || (!env.ADMIN_EMAIL && env.ADMIN_PASSWORD)) {
    errors.push({
      variable: 'ADMIN_EMAIL',
      message: 'ADMIN_EMAIL and ADMIN_PASSWORD must be provided together (or neither)',
    });
  }
  if (env.ADMIN_PASSWORD) {
    if (!isStrongPassword(env.ADMIN_PASSWORD)) {
      errors.push({
        variable: 'ADMIN_PASSWORD',
        message: 'Must be 12–128 characters with upper case, lower case, number and symbol',
      });
    }
    if (env.ADMIN_PASSWORD === DEV_ADMIN_PASSWORD_PLACEHOLDER) {
      errors.push({ variable: 'ADMIN_PASSWORD', message: 'Placeholder password rejected' });
    }
  }
  if (env.ADMIN_EMAIL && env.ADMIN_PASSWORD && !isProduction) {
    warnings.push('Admin bootstrap credentials detected; they are used only when no admin account exists.');
  }

  // Cloudinary
  const cloudinaryParts = [
    env.CLOUDINARY_CLOUD_NAME,
    env.CLOUDINARY_API_KEY,
    env.CLOUDINARY_API_SECRET,
  ];
  const cloudinaryCount = cloudinaryParts.filter(Boolean).length;
  if (cloudinaryCount > 0 && cloudinaryCount < 3) {
    errors.push({
      variable: 'CLOUDINARY_*',
      message: 'CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET must be set together',
    });
  }
  if (isProduction && cloudinaryCount === 0) {
    errors.push({
      variable: 'CLOUDINARY_*',
      message: 'Cloudinary credentials are required in production for image management',
    });
  }
  if (!isProduction && cloudinaryCount === 0) {
    warnings.push('Cloudinary is not configured — uploads will use the local development fallback.');
  }

  // URLs
  if (isProduction) {
    if (!env.PUBLIC_SITE_URL.startsWith('https://')) {
      errors.push({ variable: 'PUBLIC_SITE_URL', message: 'Must be an https:// URL in production' });
    }
    for (const origin of env.CORS_ORIGINS) {
      if (!origin.startsWith('https://')) {
        errors.push({ variable: 'CORS_ORIGINS', message: `Origin "${origin}" must use https in production` });
      }
    }
    if (env.CORS_ORIGINS.length === 0) {
      errors.push({ variable: 'CORS_ORIGINS', message: 'At least one explicit origin is required' });
    }
  }
  if (env.CORS_ORIGINS.includes('*')) {
    errors.push({ variable: 'CORS_ORIGINS', message: 'Wildcard origins are not permitted' });
  }

  if (errors.length > 0) return { config: null, errors, warnings };

  const cloudinary =
    cloudinaryCount === 3
      ? {
          cloudName: env.CLOUDINARY_CLOUD_NAME as string,
          apiKey: env.CLOUDINARY_API_KEY as string,
          apiSecret: env.CLOUDINARY_API_SECRET as string,
          folder: env.CLOUDINARY_FOLDER,
        }
      : null;

  return {
    config: {
      nodeEnv: env.NODE_ENV,
      isProduction,
      isTest: env.NODE_ENV === 'test',
      port: env.PORT,
      mongodbUri: env.MONGODB_URI ?? null,
      jwtSecret,
      jwtExpiresIn: env.JWT_EXPIRES_IN,
      corsOrigins: env.CORS_ORIGINS,
      publicSiteUrl: env.PUBLIC_SITE_URL.replace(/\/$/, ''),
      publicApiUrl: (env.PUBLIC_API_URL ?? `http://localhost:${env.PORT}`).replace(/\/$/, ''),
      admin: { email: env.ADMIN_EMAIL ?? null, password: env.ADMIN_PASSWORD ?? null },
      autoSeed: env.AUTO_SEED,
      cloudinary,
      uploads: { maxBytes: env.UPLOAD_MAX_BYTES, maxFiles: env.UPLOAD_MAX_FILES },
      trustProxy: env.TRUST_PROXY,
      logLevel: env.LOG_LEVEL,
    },
    errors: [],
    warnings,
  };
}

export function assertConfig(source: NodeJS.ProcessEnv = process.env): AppConfig {
  const { config, errors } = buildConfig(source);
  if (!config) {
    const summary = errors.map((issue) => `  • ${issue.variable}: ${issue.message}`).join('\n');
    throw new Error(`Invalid environment configuration:\n${summary}`);
  }
  return config;
}

const evaluated = buildConfig(process.env);
for (const warning of evaluated.warnings) {
  if (!evaluated.config?.isTest) console.warn(`[config] ${warning}`);
}
if (!evaluated.config) {
  const summary = evaluated.errors.map((issue) => `${issue.variable}: ${issue.message}`).join('; ');
  throw new Error(`Invalid environment configuration — ${summary}`);
}

export const config: AppConfig = evaluated.config;
