import rateLimit from 'express-rate-limit';
import { config } from '../config/env.js';

const skipInTest = () => config.isTest;

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 600,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: skipInTest,
  message: { error: { code: 'rate_limited', message: 'Too many requests. Please try again shortly.' } },
});

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: skipInTest,
  message: { error: { code: 'rate_limited', message: 'Too many sign-in attempts. Try again in 15 minutes.' } },
});

export const adminWriteLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: skipInTest,
  message: { error: { code: 'rate_limited', message: 'Too many changes at once. Please slow down.' } },
});

/** Page-view telemetry is high-volume; keep it separate from form submissions. */
export const analyticsLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 150,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: skipInTest,
  message: { error: { code: 'rate_limited', message: 'Too many events. Please slow down.' } },
});

export const publicWriteLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: skipInTest,
  message: { error: { code: 'rate_limited', message: 'Too many submissions. Please try again later.' } },
});
