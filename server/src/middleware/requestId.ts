import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import morgan from 'morgan';
import { config } from '../config/env.js';

export function requestId(req: Request, res: Response, next: NextFunction): void {
  const headerId = req.headers['x-request-id'];
  const id =
    typeof headerId === 'string' && /^[A-Za-z0-9-_]{8,64}$/.test(headerId) ? headerId : randomUUID();
  req.requestId = id;
  res.setHeader('X-Request-Id', id);
  next();
}

morgan.token('requestId', (req) => (req as Request).requestId ?? '-');

export const accessLog = morgan(
  config.logLevel === 'dev'
    ? ':method :url :status :response-time ms — :requestId'
    : ':remote-addr :method :url :status :res[content-length] :response-time ms :requestId',
  {
    skip: (req) => config.isTest || (req as Request).path === '/api/health',
  },
);
