import { cn } from '../../lib/cn';

interface PaginationProps {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
  className?: string;
}

function pageWindow(page: number, totalPages: number): (number | 'gap')[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1);
  const pages = new Set<number>([1, totalPages, page, page - 1, page + 1]);
  const sorted = [...pages].filter((value) => value >= 1 && value <= totalPages).sort((a, b) => a - b);
  const result: (number | 'gap')[] = [];
  sorted.forEach((value, index) => {
    if (index > 0 && value - (sorted[index - 1] as number) > 1) result.push('gap');
    result.push(value);
  });
  return result;
}

export function Pagination({ page, totalPages, onChange, className }: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <nav aria-label="Pagination" className={cn('flex items-center justify-center gap-1.5', className)}>
      <button
        type="button"
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        className="flex h-9 items-center gap-2 border border-forest/20 px-3 text-[10px] font-medium uppercase tracking-[0.14em] text-forest transition-colors hover:border-forest hover:bg-forest hover:text-ivory disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-forest"
      >
        Prev
      </button>
      {pageWindow(page, totalPages).map((entry, index) =>
        entry === 'gap' ? (
          <span key={`gap-${index}`} className="px-2 text-forest/40" aria-hidden="true">
            …
          </span>
        ) : (
          <button
            key={entry}
            type="button"
            onClick={() => onChange(entry)}
            aria-current={entry === page ? 'page' : undefined}
            aria-label={`Page ${entry}`}
            className={cn(
              'h-9 min-w-9 border px-2 font-sans text-[12px] tabular-nums transition-colors',
              entry === page
                ? 'border-forest bg-forest text-ivory'
                : 'border-forest/20 text-forest hover:border-forest hover:bg-forest/5',
            )}
          >
            {entry}
          </button>
        ),
      )}
      <button
        type="button"
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages}
        className="flex h-9 items-center gap-2 border border-forest/20 px-3 text-[10px] font-medium uppercase tracking-[0.14em] text-forest transition-colors hover:border-forest hover:bg-forest hover:text-ivory disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-forest"
      >
        Next
      </button>
    </nav>
  );
}
