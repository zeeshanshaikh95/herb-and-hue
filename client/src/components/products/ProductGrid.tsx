import type { Product } from '../../api/types';
import { cn } from '../../lib/cn';
import { ProductCard, ProductCardSkeleton } from './ProductCard';

interface ProductGridProps {
  products: Product[];
  loading?: boolean;
  skeletonCount?: number;
  columns?: 3 | 4;
  className?: string;
  priorityCount?: number;
}

export function ProductGrid({
  products,
  loading = false,
  skeletonCount = 8,
  columns = 4,
  className,
  priorityCount = 0,
}: ProductGridProps) {
  const gridClass =
    columns === 3
      ? 'grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 md:grid-cols-3'
      : 'grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 lg:grid-cols-4';

  return (
    <div className={cn(gridClass, className)} aria-busy={loading || undefined}>
      {loading
        ? Array.from({ length: skeletonCount }).map((_, index) => <ProductCardSkeleton key={index} />)
        : products.map((product, index) => (
            <ProductCard key={product.id} product={product} priority={index < priorityCount} />
          ))}
    </div>
  );
}
