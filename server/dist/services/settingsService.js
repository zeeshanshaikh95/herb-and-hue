import { SiteSettings } from '../models/SiteSettings.js';
import { DEFAULT_SETTINGS } from '../config/brandDefaults.js';
/** Returns the single settings document, creating it with brand defaults once. */
export async function getSettings() {
    const existing = await SiteSettings.findOne({ key: 'site' });
    if (existing)
        return existing;
    try {
        return await SiteSettings.create({ key: 'site', ...DEFAULT_SETTINGS });
    }
    catch (error) {
        // Concurrent first requests can race on the unique key; return the winner.
        if (typeof error === 'object' && error !== null && 'code' in error && error.code === 11000) {
            const settings = await SiteSettings.findOne({ key: 'site' });
            if (settings)
                return settings;
        }
        throw error;
    }
}
function clone(value) {
    return JSON.parse(JSON.stringify(value));
}
/** Allowlist projection — no internal fields are exposed to the storefront. */
export function toPublicSettings(settings) {
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
//# sourceMappingURL=settingsService.js.map