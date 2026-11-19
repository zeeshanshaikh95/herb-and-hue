import { Link } from 'react-router-dom';
import type { Category } from '../../api/types';
import { imageUrl } from '../../lib/images';
import { pluralize } from '../../lib/format';

export function CategoryCard({ category, index = 0 }: { category: Category; index?: number }) {
  return (
    <Link
      to={`/category/${category.slug}`}
      className="group relative block aspect-[3/4] overflow-hidden bg-sage/40"
    >
      {category.image ? (
        <img
          src={imageUrl(category.image.url, 600)}
          alt={category.image.alt}
          loading={index < 2 ? 'eager' : 'lazy'}
          decoding="async"
          className="h-full w-full object-cover transition-transform duration-700 ease-editorial group-hover:scale-[1.03]"
        />
      ) : (
        <div className="h-full w-full bg-gradient-to-br from-sage to-ivory-dark" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-forest-deep/85 via-forest-deep/10 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-5">
        <p className="text-[9px] uppercase tracking-[0.2em] text-gold/85">{pluralize(category.productCount, 'piece')}</p>
        <div className="mt-1.5 flex items-end justify-between gap-3">
          <h3 className="font-serif text-[26px] leading-none text-ivory">{category.name}</h3>
          <span className="mb-0.5 flex h-7 w-7 shrink-0 items-center justify-center border border-ivory/35 text-ivory transition-all duration-300 group-hover:border-gold group-hover:bg-gold group-hover:text-forest">
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <path d="M1 6h10M6 1l5 5-5 5" stroke="currentColor" strokeWidth="1.2" />
            </svg>
          </span>
        </div>
      </div>
    </Link>
  );
}
