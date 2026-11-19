import type { ReactNode } from 'react';

export interface AccordionItem {
  title: string;
  content: ReactNode;
  defaultOpen?: boolean;
}

export function Accordion({ items, className }: { items: AccordionItem[]; className?: string }) {
  return (
    <div className={className}>
      {items.map((item) => (
        <details key={item.title} className="group border-b border-forest/15" open={item.defaultOpen}>
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-[12px] font-medium uppercase tracking-[0.14em] text-forest transition-colors hover:text-gold-dark [&::-webkit-details-marker]:hidden">
            {item.title}
            <span aria-hidden="true" className="relative h-3 w-3 shrink-0">
              <span className="absolute left-0 top-1/2 h-px w-3 -translate-y-1/2 bg-current" />
              <span className="absolute left-1/2 top-0 h-3 w-px -translate-x-1/2 bg-current transition-transform duration-300 group-open:rotate-90 group-open:opacity-0" />
            </span>
          </summary>
          <div className="pb-5 text-[14px] leading-[1.8] text-charcoal/75">{item.content}</div>
        </details>
      ))}
    </div>
  );
}
