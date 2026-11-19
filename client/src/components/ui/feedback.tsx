import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';
import { errorMessage } from '../../api/client';
import { Button } from './Button';

export function Spinner({ className }: { className?: string }) {
  return (
    <svg
      className={cn('h-5 w-5 animate-spin text-forest', className)}
      viewBox="0 0 24 24"
      fill="none"
      role="img"
      aria-label="Loading"
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.2" strokeWidth="2.5" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

export function SkeletonBlock({ className }: { className?: string }) {
  return <div className={cn('skeleton', className)} aria-hidden="true" />;
}

export function EmptyState({
  eyebrow,
  title,
  body,
  action,
  className,
}: {
  eyebrow?: string;
  title: string;
  body?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center border border-dashed border-forest/20 bg-white/40 px-6 py-16 text-center', className)}>
      <svg width="44" height="44" viewBox="0 0 44 44" fill="none" aria-hidden="true" className="mb-5 text-gold-dark">
        <circle cx="22" cy="22" r="21" stroke="currentColor" strokeOpacity="0.35" />
        <path d="M22 31V16c4-2 7-2 10-1-1 7-4 11-10 12" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" />
        <path d="M22 24c-3-1-5-3-6-7 4 0 6 2 6 7Z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" />
      </svg>
      {eyebrow ? <p className="eyebrow mb-3">{eyebrow}</p> : null}
      <h2 className="text-2xl text-forest-dark">{title}</h2>
      {body ? <p className="mt-3 max-w-md text-[14px] leading-relaxed text-muted">{body}</p> : null}
      {action ? <div className="mt-7">{action}</div> : null}
    </div>
  );
}

export function ErrorState({
  title = 'Something interrupted this page',
  error,
  message,
  onRetry,
  className,
}: {
  title?: string;
  error?: unknown;
  message?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn('border border-red-900/20 bg-[#fbf3ef] px-6 py-12 text-center', className)}
    >
      <h2 className="text-2xl text-forest-dark">{title}</h2>
      <p className="mx-auto mt-3 max-w-md text-[14px] leading-relaxed text-charcoal/70">
        {message ?? errorMessage(error)}
      </p>
      {onRetry ? (
        <Button variant="outline" className="mt-6" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </div>
  );
}

export function InlineNotice({
  children,
  tone = 'info',
  className,
}: {
  children: ReactNode;
  tone?: 'info' | 'warning' | 'error';
  className?: string;
}) {
  const tones = {
    info: 'border-gold/40 bg-gold/10 text-charcoal',
    warning: 'border-gold/60 bg-[#fbf5e6] text-[#5c4a24]',
    error: 'border-red-900/25 bg-[#fbf0ec] text-[#6b2b1f]',
  } as const;
  return (
    <div className={cn('border px-4 py-3 text-[13px] leading-relaxed', tones[tone], className)}>{children}</div>
  );
}
