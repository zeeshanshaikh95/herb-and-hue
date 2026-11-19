import { cn } from '../../lib/cn';

export function SampleNotice({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'flex flex-col gap-1 border border-gold/40 bg-gold/10 px-4 py-3 text-[12px] leading-relaxed text-[#5c4a24] sm:flex-row sm:items-center sm:gap-3',
        className,
      )}
    >
      <span className="badge badge-gold w-max shrink-0">Sample catalogue</span>
      <p>
        Items marked “Sample” use placeholder names, prices and copy so the storefront can be reviewed. Replace them in
        Admin → Products before publishing. No reviews are fabricated.
      </p>
    </div>
  );
}
