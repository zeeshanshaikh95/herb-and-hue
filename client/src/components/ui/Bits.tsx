import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';
import { formatMoney } from '../../lib/format';

export function Badge({
  children,
  tone = 'muted',
  className,
}: {
  children: ReactNode;
  tone?: 'gold' | 'forest' | 'muted' | 'out';
  className?: string;
}) {
  const tones = {
    gold: 'badge-gold',
    forest: 'badge-forest',
    muted: 'badge-muted',
    out: 'badge-out',
  } as const;
  return <span className={cn('badge', tones[tone], className)}>{children}</span>;
}

export function Price({
  price,
  compareAtPrice,
  className,
  size = 'md',
}: {
  price: number;
  compareAtPrice?: number | null;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const sizes = {
    sm: 'text-[13px]',
    md: 'text-[15px]',
    lg: 'text-2xl',
  } as const;
  return (
    <span className={cn('inline-flex items-baseline gap-2.5', className)}>
      <span className={cn('font-sans tabular-nums text-forest-dark', sizes[size])}>{formatMoney(price)}</span>
      {compareAtPrice && compareAtPrice > price ? (
        <>
          <span className="font-sans text-[12px] text-muted line-through">{formatMoney(compareAtPrice)}</span>
          <span className="sr-only">Original price</span>
        </>
      ) : null}
    </span>
  );
}

export function RatingStars({
  rating,
  showValue = false,
  className,
  size = 14,
}: {
  rating: number;
  showValue?: boolean;
  className?: string;
  size?: number;
}) {
  const rounded = Math.round(rating * 2) / 2;
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <span className="inline-flex items-center gap-0.5" aria-hidden="true">
        {[1, 2, 3, 4, 5].map((star) => {
          const fill = rounded >= star ? 'full' : rounded >= star - 0.5 ? 'half' : 'empty';
          return (
            <svg key={star} width={size} height={size} viewBox="0 0 20 20" className="text-gold-dark">
              <defs>
                <linearGradient id={`half-${star}-${size}`}>
                  <stop offset="50%" stopColor="currentColor" />
                  <stop offset="50%" stopColor="transparent" />
                </linearGradient>
              </defs>
              <path
                d="M10 1.6l2.5 5.4 5.9.7-4.4 4 1.2 5.8L10 14.6l-5.2 2.9 1.2-5.8-4.4-4 5.9-.7Z"
                fill={fill === 'full' ? 'currentColor' : fill === 'half' ? `url(#half-${star}-${size})` : 'none'}
                stroke="currentColor"
                strokeWidth="0.9"
                strokeLinejoin="round"
              />
            </svg>
          );
        })}
      </span>
      <span className={cn('text-[12px] text-muted', !showValue && 'sr-only')}>
        {showValue ? `${rating.toFixed(1)} out of 5` : `${rating.toFixed(1)} out of 5 stars`}
      </span>
    </span>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = 'left',
  action,
  className,
  light = false,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: 'left' | 'center';
  action?: ReactNode;
  className?: string;
  light?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-5 md:flex-row md:items-end md:justify-between',
        align === 'center' && 'md:flex-col md:items-center md:text-center',
        className,
      )}
    >
      <div className={cn('max-w-2xl', align === 'center' && 'mx-auto text-center')}>
        {eyebrow ? <p className={cn('eyebrow mb-4', light && 'eyebrow-light')}>{eyebrow}</p> : null}
        <h2
          className={cn(
            'text-balance text-[clamp(2rem,4vw,3.1rem)] leading-[1.05]',
            light ? 'text-ivory' : 'text-forest-dark',
          )}
        >
          {title}
        </h2>
        {description ? (
          <p className={cn('mt-4 max-w-xl text-[14px] leading-relaxed', light ? 'text-ivory/70' : 'text-muted', align === 'center' && 'mx-auto')}>
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
