import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { ZodTypeAny, z } from 'zod';
import { AppError } from '../utils/AppError.js';

/**
 * Validates and replaces req.body with the parsed value. Unknown keys are
 * rejected by `.strict()` schemas, preventing mass assignment.
 */
export function validateBody<T extends ZodTypeAny>(schema: T): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      next(result.error);
      return;
    }
    req.body = result.data;
    next();
  };
}

export function parseQuery<T extends ZodTypeAny>(schema: T, query: unknown): z.infer<T> {
  return schema.parse(query);
}

/** Ensures a route param is a Mongo ObjectId, returning 400 rather than a cast error. */
export function parseId(value: unknown): string {
  if (typeof value !== 'string' || !/^[a-fA-F0-9]{24}$/.test(value)) {
    throw AppError.badRequest('invalid_identifier', 'Invalid identifier.');
  }
  return value;
}

export function requireAdmin(req: Request): NonNullable<Request['admin']> {
  if (!req.admin) {
    const error = new Error('Admin context missing after authentication');
    error.name = 'UnauthenticatedRequest';
    throw error;
  }
  return req.admin;
}
