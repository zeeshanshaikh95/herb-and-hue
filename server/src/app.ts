import compression from 'compression';
import cors from 'cors';
import express, { type Request, type Response } from 'express';
import helmet from 'helmet';
import { config } from './config/env.js';
import { databaseStatus } from './config/database.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';
import { accessLog, requestId } from './middleware/requestId.js';
import { apiLimiter } from './middleware/rateLimit.js';
import { adminRouter } from './routes/admin.js';
import { publicRouter } from './routes/public.js';
import { AppError } from './utils/AppError.js';
import { LOCAL_PUBLIC_PREFIX, LOCAL_UPLOAD_DIR } from './services/uploadService.js';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');

  if (config.trustProxy) app.set('trust proxy', 1);

  app.use(requestId);
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'none'"],
          imgSrc: ["'self'", 'https:'],
          styleSrc: ["'none'"],
          scriptSrc: ["'none'"],
          frameAncestors: ["'none'"],
        },
      },
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      referrerPolicy: { policy: 'no-referrer' },
      hsts: config.isProduction ? { maxAge: 31_536_000, includeSubDomains: true } : false,
    }),
  );

  app.use(
    cors({
      origin(origin, callback) {
        if (!origin) return callback(null, true); // server-to-server and same-origin requests
        if (config.corsOrigins.includes(origin)) return callback(null, true);
        return callback(AppError.forbidden('cors_denied', 'This origin is not allowed to call the API.'));
      },
      credentials: false,
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
      exposedHeaders: ['X-Request-Id', 'RateLimit', 'RateLimit-Policy'],
      maxAge: 600,
    }),
  );

  app.use(compression());
  app.use(express.json({ limit: '100kb' }));
  app.use(express.urlencoded({ extended: false, limit: '100kb' }));
  app.use(accessLog);

  // Locally stored development images only; production uses Cloudinary URLs.
  app.use(
    LOCAL_PUBLIC_PREFIX,
    (_req: Request, res: Response, next) => {
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      next();
    },
    express.static(LOCAL_UPLOAD_DIR, { fallthrough: true, index: false, dotfiles: 'deny' }),
  );

  app.get('/api/health', (_req: Request, res: Response) => {
    const db = databaseStatus();
    const healthy = db === 'connected';
    res.status(healthy ? 200 : 503).json({
      status: healthy ? 'ok' : 'degraded',
      database: db,
      environment: config.nodeEnv,
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    });
  });

  app.use('/api', apiLimiter, publicRouter);
  app.use('/api/admin', adminRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
