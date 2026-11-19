import { AnalyticsEvent, type AnalyticsEventType } from '../models/AnalyticsEvent.js';
import { Product } from '../models/Product.js';

export interface RecordEventInput {
  type: AnalyticsEventType;
  path?: string;
  productSlug?: string;
  referrerHost?: string;
}

/** No IP addresses, cookies or user identifiers are stored. */
export async function recordEvent(input: RecordEventInput): Promise<void> {
  let productId: string | null = null;
  if (input.productSlug) {
    const product = await Product.findOne({ slug: input.productSlug, archivedAt: null }).select('_id');
    productId = product ? String(product._id) : null;
  }
  await AnalyticsEvent.create({
    type: input.type,
    path: input.path ?? '',
    product: productId,
    productSlug: input.productSlug ?? '',
    referrerHost: (input.referrerHost ?? '').slice(0, 200),
  });
}

function startOfDayUtc(daysAgo: number): Date {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() - daysAgo);
  return date;
}

export async function analyticsSummary(days: number) {
  const since = startOfDayUtc(days - 1);

  const [totals, topProducts, daily] = await Promise.all([
    AnalyticsEvent.aggregate<{ _id: AnalyticsEventType; count: number }>([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: '$type', count: { $sum: 1 } } },
    ]),
    AnalyticsEvent.aggregate<{ _id: string; count: number }>([
      { $match: { createdAt: { $gte: since }, productSlug: { $nin: ['', null] } } },
      { $group: { _id: '$productSlug', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]),
    AnalyticsEvent.aggregate<{ _id: string; count: number }>([
      { $match: { createdAt: { $gte: since } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'UTC' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
  ]);

  const counts = Object.fromEntries(totals.map((row) => [row._id, row.count]));
  const series: { date: string; count: number }[] = [];
  for (let index = 0; index < days; index += 1) {
    const date = startOfDayUtc(days - 1 - index).toISOString().slice(0, 10);
    series.push({ date, count: daily.find((row) => row._id === date)?.count ?? 0 });
  }

  return {
    days,
    since,
    totals: {
      pageViews: counts.page_view ?? 0,
      productViews: counts.product_view ?? 0,
      whatsappClicks: counts.whatsapp_click ?? 0,
      addToCart: counts.add_to_cart ?? 0,
    },
    topProducts: topProducts.map((row) => ({ slug: row._id, views: row.count })),
    series,
  };
}
