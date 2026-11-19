import { cn } from '../../lib/cn';

interface QuantityStepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  label?: string;
  className?: string;
}

export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max = 99,
  label = 'Quantity',
  className,
}: QuantityStepperProps) {
  const decrement = () => onChange(Math.max(min, value - 1));
  const increment = () => onChange(Math.min(max, value + 1));

  return (
    <div className={cn('inline-flex items-center border border-forest/20 bg-transparent', className)}>
      <button
        type="button"
        onClick={decrement}
        disabled={value <= min}
        aria-label={`Decrease ${label.toLowerCase()}`}
        className="flex h-11 w-11 items-center justify-center text-forest transition-colors hover:bg-forest hover:text-ivory disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-forest"
      >
        <svg width="10" height="1" viewBox="0 0 10 1" aria-hidden="true">
          <rect width="10" height="1" fill="currentColor" />
        </svg>
      </button>
      <span aria-live="polite" className="w-10 text-center font-sans text-[13px] font-medium tabular-nums text-forest">
        <span className="sr-only">{label}: </span>
        {value}
      </span>
      <button
        type="button"
        onClick={increment}
        disabled={value >= max}
        aria-label={`Increase ${label.toLowerCase()}`}
        className="flex h-11 w-11 items-center justify-center text-forest transition-colors hover:bg-forest hover:text-ivory disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-forest"
      >
        <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
          <rect y="4.5" width="10" height="1" fill="currentColor" />
          <rect x="4.5" width="1" height="10" fill="currentColor" />
        </svg>
      </button>
    </div>
  );
}
