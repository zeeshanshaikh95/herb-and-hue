import type { Request, Response } from 'express';
import { SiteSettings } from '../models/SiteSettings.js';
import { getSettings, toPublicSettings } from '../services/settingsService.js';
import { settingsInputSchema, type SettingsInput } from '../validation/schemas.js';
import { DEFAULT_SETTINGS } from '../config/brandDefaults.js';

export async function getPublicSettings(_req: Request, res: Response): Promise<void> {
  const settings = await getSettings();
  res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
  res.json({ data: toPublicSettings(settings) });
}

export async function getAdminSettings(_req: Request, res: Response): Promise<void> {
  const settings = await getSettings();
  res.setHeader('Cache-Control', 'no-store');
  res.json({
    data: {
      ...toPublicSettings(settings),
      key: settings.key,
      createdAt: settings.createdAt,
    },
  });
}

export async function updateSettings(req: Request, res: Response): Promise<void> {
  const input = req.body as SettingsInput;
  const validated = settingsInputSchema.parse(input);

  const settings = await SiteSettings.findOneAndUpdate(
    { key: 'site' },
    { $set: validated, $setOnInsert: { key: 'site' } },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
  );

  if (!settings) {
    // Extremely unlikely; guarantees the storefront still renders.
    const fallback = await SiteSettings.create({ key: 'site', ...DEFAULT_SETTINGS });
    res.json({ data: toPublicSettings(fallback) });
    return;
  }

  res.json({ data: toPublicSettings(settings) });
}
