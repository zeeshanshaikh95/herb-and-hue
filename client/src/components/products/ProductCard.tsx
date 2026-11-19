import { Link } from 'react-router-dom';
import type { Product } from '../../api/types';
import { useCart } from '../../context/CartContext';
import { useSettings } from '../../context/SettingsContext';
import { cn } from '../../lib/cn';
import { imageSrcSet, imageUrl, IMAGE_WIDTHS, priorityAttr } from '../../lib/images';
import { Badge, Price } from '../ui/Bits';

export function ProductCard({ product, priority = false }: { product: Product; priority?: boolean }) {
  const { settings } = useSettings();
  const { addItem } = useCart();
  const primary = product.images[0];
  const secondary = product.images[1];
  const lowStock = product.stockQuantity > 0 && product.stockQuantity <= settings.commerce.lowStockThreshold;
  const quickAddable = product.variants.length === 0 && product.inStock;

  return (
    <article className="group flex flex-col">
      <div className="relative overflow-hidden bg-sage/30">
        <Link
          to={`/product/${product.slug}`}
          className="block aspect-[4/5] overflow-hidden focus-visible:outline-offset-4"
          aria-label={`View ${product.name}`}
        >
          {primary ? (
            <img
              src={imageUrl(primary.url, IMAGE_WIDTHS.card)}
              srcSet={imageSrcSet(primary.url)}
              sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
              alt={primary.alt}
              loading={priority ? 'eager' : 'lazy'}
              {...priorityAttr(priority)}
              decoding="async"
              className={cn(
                'h-full w-full object-cover transition-all duration-700 ease-editorial',
                secondary ? 'group-hover:opacity-0' : 'group-hover:scale-[1.03]',
                !product.inStock && 'opacity-75',
              )}
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-sage/50">
              <span className="text-[11px] uppercase tracking-[0.18em] text-forest/40">No image</span>
            </div>
          )}
          {secondary ? (
            <img
              src={imageUrl(secondary.url, IMAGE_WIDTHS.card)}
              srcSet={imageSrcSet(secondary.url)}
              sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
              alt={secondary.alt}
              loading="lazy"
              decoding="async"
              className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-700 ease-editorial group-hover:opacity-100"
            />
          ) : null}
        </Link>

        <div className="pointer-events-none absolute inset-x-3 top-3 flex items-start justify-between gap-2">
          <div className="flex flex-col items-start gap-1.5">
            {product.bestseller ? <Badge tone="gold">Bestseller</Badge> : null}
            {!product.inStock ? <Badge tone="forest">Sold out</Badge> : null}
          </div>
          {product.sampleData ? <Badge tone="muted" className="bg-ivory/85">Sample</Badge> : null}
        </div>

        {quickAddable ? (
          <div className="absolute inset-x-3 bottom-3 translate-y-2 opacity-100 transition-all duration-300 ease-editorial lg:opacity-0 lg:group-hover:translate-y-0 lg:group-hover:opacity-100 lg:group-focus-within:translate-y-0 lg:group-focus-within:opacity-100">
            <button
              type="button"
              onClick={() =>
                addItem({
                  productId: product.id,
                  slug: product.slug,
                  name: product.name,
                  image: primary?.url ?? '',
                  price: product.price,
                  quantity: 1,
                })
              }
              className="w-full border border-forest/20 bg-ivory/95 px-4 py-2.5 font-sans text-[10px] font-medium uppercase tracking-[0.16em] text-forest backdrop-blur transition-colors hover:bg-forest hover:text-ivory"
            >
              Add to bag
            </button>
          </div>
        ) : null}
        {!product.inStock ? <div className="absolute inset-0 bg-ivory/20" aria-hidden="true" /> : null}
      </div>

      <div className="flex flex-1 flex-col pt-4">
        {product.category ? (
          <Link
            to={`/category/${product.category.slug}`}
            className="text-[9px] font-medium uppercase tracking-[0.18em] text-muted transition-colors hover:text-gold-dark"
          >
            {product.category.name}
          </Link>
        ) : null}
        <h3 className="mt-1.5 font-serif text-[19px] leading-snug text-forest-dark">
          <Link to={`/product/${product.slug}`} className="hover:text-forest-light">
            {product.name}
          </Link>
        </h3>
        <p className="mt-1 line-clamp-2 min-h-[2.4em] text-[12px] leading-relaxed text-muted">
          {product.shortDescription}
        </p>
        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
          <Price price={product.price} compareAtPrice={product.compareAtPrice} size="sm" />
          {lowStock ? (
            <span className="text-[10px] uppercase tracking-[0.12em] text-clay">Only {product.stockQuantity} left</span>
          ) : null}
        </div>
        {product.variants.length > 0 ? (
          <p className="mt-1.5 text-[10px] uppercase tracking-[0.12em] text-muted/70">
            {product.variants.length} sizes available
          </p>
        ) : null}
      </div>
    </article>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="flex flex-col" aria-hidden="true">
      <div className="skeleton aspect-[4/5] w-full" />
      <div className="pt-4">
        <div className="skeleton h-2.5 w-16" />
        <div className="skeleton mt-3 h-4 w-3/4" />
        <div className="skeleton mt-2 h-3 w-full" />
        <div className="skeleton mt-3 h-3.5 w-20" />
      </div>
    </div>
  );
}
