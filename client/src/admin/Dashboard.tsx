import { Link } from 'react-router-dom';
import {
  getAdminAnalytics,
  listAdminCategories,
  listAdminGallery,
  listAdminProducts,
  listAdminReviews,
  moderateAdminReview,
} from '../api/admin';
import { errorMessage } from '../api/client';
import { useApi } from '../hooks/useApi';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { AdminPageHeader, AdminEmpty, AdminIcon, StatCard } from './AdminUI';
import { Button, ButtonLink } from '../components/ui/Button';
import { RatingStars } from '../components/ui/Bits';
import { ErrorState, InlineNotice, SkeletonBlock, Spinner } from '../components/ui/feedback';
import { formatDate, formatNumber } from '../lib/format';
import { useState } from 'react';

export function Dashboard() {
  const toast = useToast();
  const { admin, mustChangePassword } = useAuth();
  const { settings } = useSettings();
  const [busyId, setBusyId] = useState<string | null>(null);

  const products = useApi(() => listAdminProducts({ status: 'all', limit: 100 }), []);
  const pending = useApi(() => listAdminReviews('pending', 1), []);
  const categories = useApi(() => listAdminCategories(), []);
  const gallery = useApi(() => listAdminGallery(), []);
  const analytics = useApi(() => getAdminAnalytics(14), []);

  const productList = products.data?.data ?? [];
  const sampleCount = productList.filter((product) => product.sampleData).length;
  const pendingReviews = pending.data?.data ?? [];
  const summary = analytics.data?.data;
  const maxSeries = Math.max(1, ...(summary?.series.map((point) => point.count) ?? [0]));

  const approve = async (id: string) => {
    setBusyId(id);
    try {
      await moderateAdminReview(id, 'approved');
      toast.success('Review approved', 'It is now visible on the storefront.');
      pending.reload();
      analytics.reload();
    } catch (error) {
      toast.error('Could not approve review', errorMessage(error));
    } finally {
      setBusyId(null);
    }
  };

  const readiness = [
    { label: 'Password changed from bootstrap', done: !mustChangePassword },
    { label: 'WhatsApp number configured', done: /^[1-9]\d{7,14}$/.test(settings.whatsappNumber) },
    { label: 'Catalogue published', done: (products.data?.meta.total ?? 0) > 0 },
    { label: 'Sample listings replaced', done: sampleCount === 0 },
  ];
  const readyCount = readiness.filter((item) => item.done).length;

  return (
    <div>
      <AdminPageHeader
        eyebrow="Overview"
        title={`Good to see you, ${admin?.name?.split(' ')[0] ?? 'there'}.`}
        description="A quiet view of the store: catalogue health, moderation queue and recent activity."
        actions={
          <>
            <ButtonLink to="/admin/products/new" size="sm">
              <AdminIcon name="plus" className="h-3.5 w-3.5" /> New product
            </ButtonLink>
            <ButtonLink to="/" variant="outline" size="sm">
              View storefront
            </ButtonLink>
          </>
        }
      />

      {sampleCount > 0 ? (
        <InlineNotice tone="warning" className="mt-6">
          <strong className="font-semibold">{sampleCount} sample listing{sampleCount === 1 ? '' : 's'}</strong> are
          published for preview. Replace them with real products (and remove the sample flag) before going live.
        </InlineNotice>
      ) : null}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Products"
          value={products.loading ? <Spinner /> : formatNumber(products.data?.meta.total ?? 0)}
          hint={`${sampleCount} marked as sample`}
          icon="bottle"
        />
        <StatCard
          label="Pending reviews"
          value={pending.loading ? <Spinner /> : formatNumber(pending.data?.meta.total ?? 0)}
          hint="Awaiting moderation"
          icon="star"
          tone={(pending.data?.meta.total ?? 0) > 0 ? 'gold' : 'light'}
        />
        <StatCard
          label="Categories"
          value={categories.loading ? <Spinner /> : formatNumber(categories.data?.data.length ?? 0)}
          hint="Storefront collections"
          icon="layers"
        />
        <StatCard
          label="WhatsApp clicks"
          value={analytics.loading ? <Spinner /> : formatNumber(summary?.totals.whatsappClicks ?? 0)}
          hint="Last 14 days"
          icon="external"
          tone="forest"
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.35fr_1fr]">
        <section className="admin-card">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-serif text-[24px] text-forest-dark">Store activity</h2>
              <p className="mt-1 text-[12px] text-muted">All tracked events, last 14 days. No personal data is stored.</p>
            </div>
            <span className="badge badge-gold">Private</span>
          </div>

          {analytics.error ? (
            <ErrorState className="mt-5" error={analytics.error} onRetry={analytics.reload} />
          ) : analytics.loading ? (
            <SkeletonBlock className="mt-5 h-40 w-full" />
          ) : (
            <>
              <div className="mt-6 flex h-36 items-end gap-1" role="img" aria-label="Daily event volume chart">
                {(summary?.series ?? []).map((point) => (
                  <div key={point.date} className="group relative flex flex-1 flex-col items-center justify-end">
                    <span
                      className="w-full bg-forest/20 transition-colors group-hover:bg-gold"
                      style={{ height: `${Math.max(3, (point.count / maxSeries) * 100)}%` }}
                    />
                    <span className="mt-2 hidden text-[9px] text-muted sm:block">{point.date.slice(8)}</span>
                  </div>
                ))}
              </div>
              <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-forest/10 pt-4 sm:grid-cols-4">
                {[
                  ['Page views', summary?.totals.pageViews ?? 0],
                  ['Product views', summary?.totals.productViews ?? 0],
                  ['Add to bag', summary?.totals.addToCart ?? 0],
                  ['WhatsApp', summary?.totals.whatsappClicks ?? 0],
                ].map(([label, value]) => (
                  <div key={String(label)}>
                    <dt className="text-[10px] uppercase tracking-[0.12em] text-muted">{label}</dt>
                    <dd className="mt-1 font-serif text-[22px] text-forest-dark">{formatNumber(Number(value))}</dd>
                  </div>
                ))}
              </dl>
              {summary && summary.topProducts.length > 0 ? (
                <div className="mt-4 border-t border-forest/10 pt-3">
                  <p className="text-[10px] uppercase tracking-[0.12em] text-muted">Most viewed</p>
                  <ul className="mt-2 space-y-1">
                    {summary.topProducts.slice(0, 3).map((item) => (
                      <li key={item.slug} className="flex items-center justify-between text-[12px]">
                        <span className="truncate text-forest">{item.slug}</span>
                        <span className="tabular-nums text-muted">{item.views}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </>
          )}
        </section>

        <section className="admin-card">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-serif text-[24px] text-forest-dark">Moderation queue</h2>
            <Link to="/admin/reviews" className="text-[10px] font-medium uppercase tracking-[0.12em] text-forest hover:text-gold-dark">
              All reviews
            </Link>
          </div>
          {pending.error ? (
            <ErrorState className="mt-4" error={pending.error} onRetry={pending.reload} />
          ) : pending.loading ? (
            <SkeletonBlock className="mt-4 h-40 w-full" />
          ) : pendingReviews.length === 0 ? (
            <div className="mt-4">
              <AdminEmpty title="Nothing waiting" body="New reviews will appear here for approval before publishing." />
            </div>
          ) : (
            <ul className="mt-4 space-y-4">
              {pendingReviews.slice(0, 4).map((review) => (
                <li key={review.id} className="border-b border-forest/10 pb-4 last:border-0">
                  <div className="flex items-center justify-between gap-2">
                    <RatingStars rating={review.rating} />
                    <span className="text-[10px] text-muted">{formatDate(review.createdAt)}</span>
                  </div>
                  <p className="mt-1.5 line-clamp-2 text-[12.5px] leading-relaxed text-charcoal/75">{review.body}</p>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <span className="truncate text-[10px] uppercase tracking-[0.1em] text-muted">{review.authorName}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      loading={busyId === review.id}
                      onClick={() => approve(review.id)}
                      className="px-3 py-1.5 text-[9px]"
                    >
                      Approve
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1fr]">
        <section className="admin-card">
          <h2 className="font-serif text-[24px] text-forest-dark">Store readiness</h2>
          <p className="mt-1 text-[12px] text-muted">{readyCount} of {readiness.length} checks complete.</p>
          <ul className="mt-4 space-y-3">
            {readiness.map((item) => (
              <li key={item.label} className="flex items-center gap-3 text-[12.5px]">
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                    item.done ? 'border-forest bg-forest text-ivory' : 'border-forest/25 text-transparent'
                  }`}
                >
                  <AdminIcon name="check" className="h-3 w-3" />
                </span>
                <span className={item.done ? 'text-forest' : 'text-muted'}>{item.label}</span>
              </li>
            ))}
          </ul>
          <div className="mt-5 flex flex-wrap gap-2">
            <ButtonLink to="/admin/settings" variant="outline" size="sm">
              Open settings
            </ButtonLink>
            <ButtonLink to="/admin/products" variant="ghost" size="sm">
              Manage catalogue
            </ButtonLink>
          </div>
        </section>

        <section className="admin-card">
          <h2 className="font-serif text-[24px] text-forest-dark">Quick access</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {[
              { label: 'New product', href: '/admin/products/new', icon: 'bottle' },
              { label: 'Categories', href: '/admin/categories', icon: 'layers' },
              { label: 'Gallery', href: '/admin/gallery', icon: 'image' },
              { label: 'Store settings', href: '/admin/settings', icon: 'settings' },
            ].map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className="flex items-center gap-3 rounded-[3px] border border-forest/10 bg-ivory/40 px-4 py-3 text-[12px] font-medium text-forest transition-colors hover:border-gold hover:bg-gold/10"
              >
                <AdminIcon name={item.icon} className="h-4 w-4 text-gold-dark" />
                {item.label}
              </Link>
            ))}
          </div>
          <div className="mt-5 border-t border-forest/10 pt-4">
            <p className="text-[10px] uppercase tracking-[0.12em] text-muted">Gallery items</p>
            <p className="mt-1 font-serif text-[24px] text-forest-dark">{gallery.data?.data.length ?? 0}</p>
            <p className="text-[11px] text-muted">
              {gallery.data?.data.filter((item) => item.isActive).length ?? 0} active on the storefront
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
