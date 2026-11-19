import type { Request, Response } from 'express';
import { analyticsEventSchema } from '../validation/schemas.js';
import { analyticsSummary, recordEvent } from '../services/analyticsService.js';

export async function createAnalyticsEvent(req: Request, res: Response): Promise<void> {
  const input = analyticsEventSchema.parse(req.body);

  let referrerHost = '';
  try {
    const referer = req.headers.referer;
    if (referer) referrerHost = new URL(referer).host.slice(0, 200);
  } catch {
    referrerHost = '';
  }

  await recordEvent({ ...input, referrerHost });
  res.status(202).json({ data: { recorded: true } });
}

export async function getAnalyticsSummary(req: Request, res: Response): Promise<void> {
  const raw = Number.parseInt(String(req.query.days ?? '30'), 10);
  const days = Number.isFinite(raw) ? Math.min(Math.max(raw, 7), 90) : 30;
  const summary = await analyticsSummary(days);
  res.setHeader('Cache-Control', 'no-store');
  res.json({ data: summary });
}
