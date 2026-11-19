import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getCategories, getProducts, type ProductQuery } from '../api/catalog';
import { useApi } from '../hooks/useApi';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { useSettings } from '../context/SettingsContext';
import { PageHeader } from '../components/layout/PageHeader';
import { Seo } from '../components/Seo';
import { ProductGrid } from '../components/products/ProductGrid';
import { SampleNotice } from '../components/products/SampleNotice';
import { EmptyState, ErrorState } from '../components/ui/feedback';
import { Pagination } from '../components/ui/Pagination';
import { WhatsAppLink } from '../components/ui/WhatsAppLink';
import { buildGeneralEnquiry } from '../lib/whatsapp';
import { cn } from '../lib/cn';
import { formatNumber, pluralize } from '../lib/format';
import { trackEvent } from '../lib/analytics';

const SORT_OPTIONS = [
  { value: 'featured', label: 'Featured' },
  { value: 'newest', label: 'Newest' },
  { value: 'price-asc', label: 'Price: low to high' },
  { value: 'price-desc', label: 'Price: high to low' },
  { value: 'name', label: 'Name: A–Z' },
] as const;

type SortValue = (typeof SORT_OPTIONS)[number]['value'];

const SORT_VALUES = new Set<string>(SORT_OPTIONS.map((option) => option.value));

export function Shop() {
  const { settings } = useSettings();
  const [searchParams, setSearchParams] = useSearchParams();
  const gridRef = useRef<HTMLDivElement>(null);

  const search = searchParams.get('search') ?? '';
  const category = searchParams.get('category') ?? 'all';
  const sortParam = searchParams.get('sort') ?? 'featured';
  const sort: SortValue = SORT_VALUES.has(sortParam) ? (sortParam as SortValue) : 'featured';
  const page = Math.max(1, Number.parseInt(searchParams.get('page') ?? '1', 10) || 1);
  const inStock = searchParams.get('inStock') === 'true';

  const [searchInput, setSearchInput] = useState(search);
  const debouncedSearch = useDebouncedValue(searchInput, 400);
  const categories = useApi((signal) => getCategories(signal), []);

  useEffect(() => {
    setSearchInput(search);
  }, [search]);

  useEffect(() => {
    if (debouncedSearch === search) return;
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (debouncedSearch.trim()) next.set('search', debouncedSearch.trim());
        else next.delete('search');
        next.delete('page');
        return next;
      },
      { replace: true },
    );
  }, [debouncedSearch, search, setSearchParams]);

  const query: ProductQuery = {
    search: search || undefined,
    category: category !== 'all' ? category : undefined,
    sort,
    page,
    limit: 12,
    inStock: inStock ? true : undefined,
  };

  const products = useApi((signal) => getProducts(query, signal), [search, category, sort, page, inStock]);

  useEffect(() => {
    trackEvent('page_view', { path: '/shop' });
  }, []);

  const updateParam = (key: string, value: string | null, resetPage = true) => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      if (value === null || value === '' || value === 'all') next.delete(key);
      else next.set(key, value);
      if (resetPage) next.delete('page');
      return next;
    });
  };

  const clearFilters = () => {
    setSearchInput('');
    setSearchParams(new URLSearchParams(), { replace: true });
  };

  const data = products.data;
  const items = data?.data ?? [];
  const meta = data?.meta;
  const hasActiveFilters = Boolean(search || category !== 'all' || inStock);
  const activeCategory = categories.data?.data.find((entry) => entry.slug === category);
  const showSampleNotice = items.some((product) => product.sampleData);

  const onPageChange = (nextPage: number) => {
    updateParam('page', nextPage === 1 ? null : String(nextPage), false);
    gridRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <>
      <Seo
        title={activeCategory ? `${activeCategory.name} — Shop` : 'Shop the collection'}
        description={
          activeCategory?.description ||
          'Browse the Herb & Hue botanical skincare collection: cleansers, serums, moisturisers and body care.'
        }
        path="/shop"
      />
      <PageHeader
        eyebrow="The collection"
        title={activeCategory ? activeCategory.name : 'Botanical essentials'}
        description={
          activeCategory?.description ||
          'A considered edit of cleansers, serums and moisturisers. Every listing carries its ingredients, directions and cautions.'
        }
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: activeCategory ? 'Shop' : 'Shop', href: '/shop' }, ...(activeCategory ? [{ label: activeCategory.name }] : [])]}
      />

      <div className="container-editorial py-10 sm:py-14" ref={gridRef}>
        {showSampleNotice ? <SampleNotice className="mb-8" /> : null}

        {/* Toolbar */}
        <div className="border-y border-forest/15">
          <div className="flex flex-col gap-4 py-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full lg:max-w-xs">
              <label htmlFor="shop-search" className="sr-only">
                Search products
              </label>
              <svg
                width="15"
                height="15"
                viewBox="0 0 20 20"
                fill="none"
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-forest/50"
              >
                <circle cx="8.5" cy="8.5" r="6" stroke="currentColor" strokeWidth="1.3" />
                <path d="M13 13l5 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
              </svg>
              <input
                id="shop-search"
                type="search"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search the collection"
                maxLength={120}
                className="w-full border border-forest/20 bg-transparent py-2.5 pl-9 pr-3 text-[13px] placeholder:text-muted/60 focus:border-forest focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
              <label className="flex cursor-pointer items-center gap-2 text-[11px] uppercase tracking-[0.12em] text-forest/80">
                <input
                  type="checkbox"
                  checked={inStock}
                  onChange={(event) => updateParam('inStock', event.target.checked ? 'true' : null)}
                  className="h-3.5 w-3.5 accent-forest"
                />
                In stock
              </label>
              <div className="flex items-center gap-2">
                <label htmlFor="shop-sort" className="text-[10px] uppercase tracking-[0.14em] text-muted">
                  Sort
                </label>
                <select
                  id="shop-sort"
                  value={sort}
                  onChange={(event) => updateParam('sort', event.target.value === 'featured' ? null : event.target.value)}
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
          </div>

          <div className="hide-scrollbar -mx-5 flex gap-2 overflow-x-auto border-t border-forest/10 px-5 py-3 sm:-mx-8 sm:px-8 lg:mx-0 lg:px-0">
            <button
              type="button"
              onClick={() => updateParam('category', null)}
              aria-pressed={category === 'all'}
              className={cn(
                'shrink-0 border px-4 py-2 text-[10px] font-medium uppercase tracking-[0.14em] transition-colors',
                category === 'all'
                  ? 'border-forest bg-forest text-ivory'
                  : 'border-forest/20 text-forest hover:border-forest',
              )}
            >
              All
            </button>
            {(categories.data?.data ?? []).map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => updateParam('category', entry.slug)}
                aria-pressed={category === entry.slug}
                className={cn(
                  'shrink-0 border px-4 py-2 text-[10px] font-medium uppercase tracking-[0.14em] transition-colors',
                  category === entry.slug
                    ? 'border-forest bg-forest text-ivory'
                    : 'border-forest/20 text-forest hover:border-forest',
                )}
              >
                {entry.name}
                <span className="ml-1.5 text-[9px] opacity-60">{entry.productCount}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <p className="text-[11px] uppercase tracking-[0.14em] text-muted" aria-live="polite">
            {products.loading
              ? 'Loading the collection…'
              : meta
                ? `${pluralize(meta.total, 'piece')}${search ? ` for “${search}”` : ''}`
                : ''}
          </p>
          {hasActiveFilters ? (
            <button
              type="button"
              onClick={clearFilters}
              className="text-[10px] font-medium uppercase tracking-[0.14em] text-forest underline decoration-gold/50 underline-offset-4 hover:text-gold-dark"
            >
              Clear filters
            </button>
          ) : null}
        </div>

        <div className="mt-8">
          {products.error ? (
            <ErrorState
              title="We could not load the collection"
              error={products.error}
              onRetry={products.reload}
            />
          ) : !products.loading && items.length === 0 ? (
            <EmptyState
              eyebrow={search ? 'No matches' : 'The collection'}
              title={search ? `Nothing matches “${search}” yet` : 'No pieces to show right now'}
              body={
                hasActiveFilters
                  ? 'Try a different search, category or clear the filters to browse everything.'
                  : 'New products will appear here as soon as they are published. In the meantime, we are happy to help on WhatsApp.'
              }
              action={
                <div className="flex flex-wrap items-center justify-center gap-3">
                  {hasActiveFilters ? (
                    <button type="button" onClick={clearFilters} className="btn btn-outline">
                      Clear filters
                    </button>
                  ) : null}
                  <WhatsAppLink message={buildGeneralEnquiry(settings)} variant="outline">
                    Ask on WhatsApp
                  </WhatsAppLink>
                </div>
              }
            />
          ) : (
            <ProductGrid
              products={items}
              loading={products.loading}
              skeletonCount={8}
              priorityCount={2}
            />
          )}
        </div>

        {meta && meta.totalPages > 1 ? (
          <Pagination page={meta.page} totalPages={meta.totalPages} onChange={onPageChange} className="mt-14" />
        ) : null}

        <div className="mt-14 flex flex-col items-start justify-between gap-4 border-t border-gold/25 pt-8 sm:flex-row sm:items-center">
          <p className="max-w-lg text-[12px] leading-relaxed text-muted">
            {formatNumber(meta?.total ?? 0)} pieces in the edit. Orders are confirmed with our team on WhatsApp; no
            payment is taken on this website.
          </p>
          <Link to="/contact" className="link-underline">
            Ask about a piece
          </Link>
        </div>
      </div>

      <div className="sr-only" aria-live="polite">
        {products.loading ? 'Loading products' : ''}
      </div>
    </>
  );
}
