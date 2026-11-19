import { useEffect } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { getCategory, getProducts } from '../api/catalog';
import { useApi } from '../hooks/useApi';
import { Seo } from '../components/Seo';
import { PageHeader } from '../components/layout/PageHeader';
import { ProductGrid } from '../components/products/ProductGrid';
import { EmptyState, ErrorState } from '../components/ui/feedback';
import { Pagination } from '../components/ui/Pagination';
import { ButtonLink } from '../components/ui/Button';
import { SampleNotice } from '../components/products/SampleNotice';
import { WhatsAppLink } from '../components/ui/WhatsAppLink';
import { useSettings } from '../context/SettingsContext';
import { buildGeneralEnquiry } from '../lib/whatsapp';
import { pluralize } from '../lib/format';
import { imageUrl } from '../lib/images';
import { trackEvent } from '../lib/analytics';

const SORT_OPTIONS = [
  { value: 'featured', label: 'Featured' },
  { value: 'newest', label: 'Newest' },
  { value: 'price-asc', label: 'Price: low to high' },
  { value: 'price-desc', label: 'Price: high to low' },
  { value: 'name', label: 'Name: A–Z' },
] as const;

export function CategoryDetail() {
  const { slug = '' } = useParams<{ slug: string }>();
  const { settings } = useSettings();
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Math.max(1, Number.parseInt(searchParams.get('page') ?? '1', 10) || 1);
  const sortParam = searchParams.get('sort') ?? 'featured';
  const sort = SORT_OPTIONS.some((option) => option.value === sortParam)
    ? (sortParam as (typeof SORT_OPTIONS)[number]['value'])
    : 'featured';

  const category = useApi((signal) => getCategory(slug, signal), [slug]);
  const products = useApi(
    (signal) => getProducts({ category: slug, page, limit: 12, sort }, signal),
    [slug, page, sort],
  );

  useEffect(() => {
    trackEvent('page_view', { path: `/category/${slug}` });
  }, [slug]);

  if (category.error) {
    return (
      <div className="container-editorial py-24">
        <ErrorState
          title="This collection is not available"
          error={category.error}
          onRetry={category.reload}
        />
        <div className="mt-6 text-center">
          <ButtonLink to="/categories" variant="outline">
            All collections
          </ButtonLink>
        </div>
      </div>
    );
  }

  const current = category.data?.data;
  const items = products.data?.data ?? [];
  const meta = products.data?.meta;

  return (
    <>
      <Seo
        title={current ? current.name : 'Collection'}
        description={current?.description}
        path={`/category/${slug}`}
        image={current?.image?.url}
      />
      <PageHeader
        eyebrow="Collection"
        title={current?.name ?? 'Collection'}
        description={current?.description}
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Collections', href: '/categories' },
          { label: current?.name ?? 'Collection' },
        ]}
      >
        {meta ? (
          <p className="text-[11px] uppercase tracking-[0.14em] text-muted">
            {pluralize(meta.total, 'piece')} · {sort.replace('-', ' ')}
          </p>
        ) : null}
      </PageHeader>

      <div className="container-editorial py-10 sm:py-14">
        {current?.image ? (
          <div className="relative mb-10 hidden aspect-[3/1] overflow-hidden sm:block">
            <img
              src={imageUrl(current.image.url, 1400)}
              alt={current.image.alt}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-forest-deep/60 via-forest-deep/10 to-transparent" />
            <div className="absolute inset-y-0 left-0 flex max-w-md flex-col justify-center p-8">
              <p className="text-[10px] uppercase tracking-[0.2em] text-gold">Herb &amp; Hue</p>
              <p className="mt-3 font-serif text-[30px] leading-tight text-ivory">{current.name}</p>
            </div>
          </div>
        ) : null}

        {items.some((product) => product.sampleData) ? <SampleNotice className="mb-8" /> : null}

        <div className="mb-8 flex flex-wrap items-center justify-between gap-3 border-y border-forest/15 py-3">
          <p className="text-[10px] uppercase tracking-[0.14em] text-muted" aria-live="polite">
            {products.loading ? 'Loading…' : `${meta?.total ?? 0} pieces`}
          </p>
          <div className="flex items-center gap-2">
            <label htmlFor="category-sort" className="text-[10px] uppercase tracking-[0.14em] text-muted">
              Sort
            </label>
            <select
              id="category-sort"
              value={sort}
              onChange={(event) =>
                setSearchParams((currentParams) => {
                  const next = new URLSearchParams(currentParams);
                  if (event.target.value === 'featured') next.delete('sort');
                  else next.set('sort', event.target.value);
                  next.delete('page');
                  return next;
                })
              }
              className="border border-forest/20 bg-transparent py-2 pl-3 pr-8 text-[12px] text-forest focus:border-forest focus:outline-none"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {products.error ? (
          <ErrorState error={products.error} onRetry={products.reload} />
        ) : !products.loading && items.length === 0 ? (
          <EmptyState
            eyebrow="Collection"
            title="Nothing here just yet"
            body="This collection is being prepared. Explore the full edit or ask us what is arriving next."
            action={
              <div className="flex flex-wrap justify-center gap-3">
                <ButtonLink to="/shop" variant="outline">
                  Shop all
                </ButtonLink>
                <WhatsAppLink message={buildGeneralEnquiry(settings)} variant="outline">
                  Ask on WhatsApp
                </WhatsAppLink>
              </div>
            }
          />
        ) : (
          <ProductGrid products={items} loading={products.loading} priorityCount={2} />
        )}

        {meta && meta.totalPages > 1 ? (
          <Pagination
            page={meta.page}
            totalPages={meta.totalPages}
            onChange={(nextPage) =>
              setSearchParams((currentParams) => {
                const next = new URLSearchParams(currentParams);
                if (nextPage === 1) next.delete('page');
                else next.set('page', String(nextPage));
                return next;
              })
            }
            className="mt-14"
          />
        ) : null}

        <div className="mt-14 border-t border-gold/25 pt-6">
          <Link to="/categories" className="link-underline">
            All collections
          </Link>
        </div>
      </div>
    </>
  );
}
