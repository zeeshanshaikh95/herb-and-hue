import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '../../lib/cn';
import { resolveImageUrl } from '../../lib/images';

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  breadcrumbs?: { label: string; href?: string }[];
  children?: ReactNode;
  align?: 'left' | 'center';
  className?: string;
}

export function PageHeader({
  eyebrow,
  title,
  description,
  breadcrumbs,
  children,
  align = 'left',
  className,
}: PageHeaderProps) {
  return (
    <section className={cn('relative overflow-hidden border-b border-gold/20 bg-ivory-dark', className)}>
      <img
        src={resolveImageUrl('/brand/leaf-mark.png')}
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute -right-10 -top-8 hidden w-72 opacity-[0.07] sm:block lg:w-96"
        loading="lazy"
      />
      <div className="container-editorial relative py-12 sm:py-16 lg:py-20">
        {breadcrumbs && breadcrumbs.length > 0 ? (
          <nav aria-label="Breadcrumb" className="mb-6">
            <ol className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-muted">
              {breadcrumbs.map((crumb, index) => (
                <li key={`${crumb.label}-${index}`} className="flex items-center gap-2">
                  {crumb.href ? (
                    <Link to={crumb.href} className="hover:text-forest">
                      {crumb.label}
                    </Link>
                  ) : (
                    <span aria-current="page" className="text-forest/70">
                      {crumb.label}
                    </span>
                  )}
                  {index < breadcrumbs.length - 1 ? <span aria-hidden="true">/</span> : null}
                </li>
              ))}
            </ol>
          </nav>
        ) : null}
        <div className={cn(align === 'center' && 'mx-auto max-w-3xl text-center')}>
          {eyebrow ? <p className="eyebrow mb-4">{eyebrow}</p> : null}
          <h1 className="text-balance text-[clamp(2.5rem,6vw,4.6rem)] leading-[0.98] text-forest-dark">{title}</h1>
          {description ? (
            <p className={cn('mt-5 max-w-xl text-[15px] leading-[1.85] text-muted', align === 'center' && 'mx-auto')}>
              {description}
            </p>
          ) : null}
          {children ? <div className="mt-8">{children}</div> : null}
        </div>
      </div>
    </section>
  );
}
