import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  archiveAdminProduct,
  listAdminCategories,
  listAdminProducts,
  restoreAdminProduct,
} from '../api/admin';
import { errorMessage } from '../api/client';
import type { AdminProduct } from '../api/types';
import { useApi } from '../hooks/useApi';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { useToast } from '../context/ToastContext';
import { AdminEmpty, AdminIcon, AdminPageHeader } from './AdminUI';
import { Button, ButtonLink } from '../components/ui/Button';
import { Badge } from '../components/ui/Bits';
import { ErrorState, SkeletonBlock } from '../components/ui/feedback';
import { Pagination } from '../components/ui/Pagination';
import { formatMoney, formatDate } from '../lib/format';
import { imageUrl } from '../lib/images';
import { cn } from '../lib/cn';

type StatusFilter = 'active' | 'archived' | 'all';

const STATUS_TABS: { value: StatusFilter; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'archived', label: 'Archived' },
  { value: 'all', label: 'All' },
];

export function AdminProducts() {
  const toast = useToast();
  const [status, setStatus] = useState<StatusFilter>('active');
  const [searchInput, setSearchInput] = useState('');
  const search = useDebouncedValue(searchInput, 350);
  const [category, setCategory] = useState('all');
  const [page, setPage] = useState(1);
  const [busyId, setBusyId] = useState<string | null>(null);

  const categories = useApi(() => listAdminCategories(), []);
  const products = useApi(
    () =>
      listAdminProducts({
        status,
        search: search || undefined,
        category: category === 'all' ? undefined : category,
        page,
        limit: 20,
      }),
    [status, search, category, page],
  );

  useEffect(() => {
    setPage(1);
  }, [status, search, category]);

  const items = products.data?.data ?? [];

  const toggleArchive = async (product: AdminProduct) => {
    setBusyId(product.id);
    try {
      if (product.archivedAt) {
        await restoreAdminProduct(product.id);
        toast.success('Product restored', `${product.name} is active again.`);
      } else {
        await archiveAdminProduct(product.id);
        toast.success('Product archived', `${product.name} is hidden from the storefront. Reviews are preserved.`);
      }
      products.reload();
    } catch (error) {
      toast.error('Could not update product', errorMessage(error));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <AdminPageHeader
        eyebrow="Catalogue"
        title="Products"
        description="Create, edit and archive pieces. Archived products disappear from the storefront but keep their review history."
        actions={
          <ButtonLink to="/admin/products/new" size="sm">
            <AdminIcon name="plus" className="h-3.5 w-3.5" /> New product
          </ButtonLink>
        }
      />

      <div className="mt-6 flex flex-col gap-4 rounded-[4px] border border-forest/10 bg-white p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setStatus(tab.value)}
              aria-pressed={status === tab.value}
              className={cn(
                'border px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.12em] transition-colors',
                status === tab.value
                  ? 'border-forest bg-forest text-ivory'
                  : 'border-forest/20 text-forest hover:border-forest',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative">
            <AdminIcon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-forest/40" />
            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search products"
              aria-label="Search products"
              className="admin-field w-full pl-9 sm:w-56"
            />
          </div>
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            aria-label="Filter by category"
            className="admin-field sm:w-44"
          >
            <option value="all">All categories</option>
            {(categories.data?.data ?? []).map((entry) => (
              <option key={entry.id} value={entry.slug}>
                {entry.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <p className="text-[11px] uppercase tracking-[0.12em] text-muted">
          {products.loading ? 'Loading…' : `${products.data?.meta.total ?? 0} products`}
        </p>
        {status === 'archived' ? (
          <p className="text-[11px] text-muted">Archived products are hidden from shoppers.</p>
        ) : null}
      </div>

      {products.error ? (
        <ErrorState className="mt-4" error={products.error} onRetry={products.reload} />
      ) : products.loading ? (
        <div className="mt-4 space-y-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <SkeletonBlock key={index} className="h-24 w-full" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="mt-4">
          <AdminEmpty
            title={search || category !== 'all' ? 'No products match those filters' : 'No products yet'}
            body={
              search || category !== 'all'
                ? 'Try another search term, category or status.'
                : 'Add your first product to begin building the catalogue. Sample content can be replaced at any time.'
            }
            action={<ButtonLink to="/admin/products/new">Create a product</ButtonLink>}
          />
        </div>
      ) : (
        <ul className="mt-4 space-y-3">
          {items.map((product) => (
            <li
              key={product.id}
              className="flex flex-col gap-4 rounded-[4px] border border-forest/10 bg-white p-4 sm:flex-row sm:items-center"
            >
              <div className="flex min-w-0 flex-1 items-center gap-4">
                {product.images[0] ? (
                  <img
                    src={imageUrl(product.images[0].url, 200)}
                    alt=""
                    className="h-[76px] w-16 shrink-0 border border-forest/10 object-cover"
                  />
                ) : (
                  <div className="flex h-[76px] w-16 shrink-0 items-center justify-center border border-dashed border-forest/20 text-[9px] uppercase text-muted">
                    None
                  </div>
                )}
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      to={`/admin/products/${product.id}/edit`}
                      className="truncate font-serif text-[20px] leading-tight text-forest-dark hover:text-gold-dark"
                    >
                      {product.name}
                    </Link>
                    {product.sampleData ? <Badge tone="muted">Sample</Badge> : null}
                    {product.archivedAt ? <Badge tone="out">Archived</Badge> : null}
                    {product.featured ? <Badge tone="gold">Featured</Badge> : null}
                    {product.bestseller ? <Badge tone="gold">Bestseller</Badge> : null}
                  </div>
                  <p className="mt-1 truncate text-[11px] text-muted">
                    {product.category?.name ?? 'No category'} · /{product.slug}
                  </p>
                  <p className="mt-1 text-[11px] text-muted">
                    Updated {formatDate(product.updatedAt)} · {product.variants.length > 0 ? `${product.variants.length} sizes` : 'Single size'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-6 sm:w-auto sm:justify-end">
                <div className="text-left sm:text-right">
                  <p className="text-[13px] font-medium tabular-nums text-forest-dark">
                    {formatMoney(product.price)}
                  </p>
                  <p className={`mt-1 text-[10px] uppercase tracking-[0.1em] ${product.inStock ? 'text-forest/70' : 'text-red-800'}`}>
                    {product.inStock ? `${product.stockQuantity} in stock` : 'Out of stock'}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    to={`/admin/products/${product.id}/edit`}
                    className="border border-forest/20 px-3 py-2 text-[10px] font-medium uppercase tracking-[0.1em] text-forest transition-colors hover:border-forest hover:bg-forest hover:text-ivory"
                  >
                    Edit
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    loading={busyId === product.id}
                    onClick={() => toggleArchive(product)}
                    className="px-2 py-2 text-[9px]"
                  >
                    {product.archivedAt ? 'Restore' : 'Archive'}
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {products.data && products.data.meta.totalPages > 1 ? (
        <Pagination
          page={products.data.meta.page}
          totalPages={products.data.meta.totalPages}
          onChange={setPage}
          className="mt-8"
        />
      ) : null}
    </div>
  );
}
