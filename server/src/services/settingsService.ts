import { SiteSettings, type SiteSettingsData, type SiteSettingsDocument } from '../models/SiteSettings.js';
import { DEFAULT_SETTINGS } from '../config/brandDefaults.js';

/** Returns the single settings document, creating it with brand defaults once. */
export async function getSettings(): Promise<SiteSettingsDocument> {
  const existing = await SiteSettings.findOne({ key: 'site' });
  if (existing) return existing;

  try {
    return await SiteSettings.create({ key: 'site', ...DEFAULT_SETTINGS });
  } catch (error) {
    // Concurrent first requests can race on the unique key; return the winner.
    if (typeof error === 'object' && error !== null && 'code' in error && (error as { code: number }).code === 11000) {
      const settings = await SiteSettings.findOne({ key: 'site' });
      if (settings) return settings;
    }
    throw error;
  }
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export interface PublicSettings {
  businessName: string;
  tagline: string;
  shortDescription: string;
  logoUrl: string;
  whatsappNumber: string;
  whatsappTemplates: SiteSettingsData['whatsappTemplates'];
  contact: SiteSettingsData['contact'];
  socials: SiteSettingsData['socials'];
  announcement: SiteSettingsData['announcement'];
  homepage: SiteSettingsData['homepage'];
  about: SiteSettingsData['about'];
  seo: SiteSettingsData['seo'];
  commerce: SiteSettingsData['commerce'];
  footer: SiteSettingsData['footer'];
  features: SiteSettingsData['features'];
  updatedAt: Date;
}

/** Allowlist projection — no internal fields are exposed to the storefront. */
export function toPublicSettings(settings: SiteSettingsDocument): PublicSettings {
  return {
    businessName: settings.businessName,
    tagline: settings.tagline,
    shortDescription: settings.shortDescription,
    logoUrl: settings.logoUrl,
    whatsappNumber: settings.whatsappNumber,
    whatsappTemplates: {
      general: settings.whatsappTemplates.general,
      product: settings.whatsappTemplates.product,
      cart: settings.whatsappTemplates.cart,
    },
    contact: {
      email: settings.contact.email,
      phone: settings.contact.phone,
      addressLines: [...settings.contact.addressLines],
      hours: settings.contact.hours,
    },
    socials: settings.socials.map((social) => ({ platform: social.platform, url: social.url })),
    announcement: clone(settings.announcement),
    homepage: clone(settings.homepage),
    about: clone(settings.about),
    seo: clone(settings.seo),
    commerce: clone(settings.commerce),
    footer: clone(settings.footer),
    features: clone(settings.features),
    updatedAt: settings.updatedAt,
  };
}
