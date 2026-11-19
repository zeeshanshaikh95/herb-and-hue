import { API_BASE } from './env';

export type AnalyticsEventType = 'page_view' | 'product_view' | 'whatsapp_click' | 'add_to_cart';

/**
 * Fire-and-forget, privacy-light event recording. No identifiers are sent and
 * failures never affect the shopping experience.
 */
export function trackEvent(
  type: AnalyticsEventType,
  payload: { path?: string; productSlug?: string } = {},
): void {
  try {
    void fetch(`${API_BASE}/api/analytics/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, path: payload.path, productSlug: payload.productSlug }),
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    // Never let analytics interfere with the storefront.
  }
}
