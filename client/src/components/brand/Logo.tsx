import type { CSSProperties } from 'react';
import { cn } from '../../lib/cn';
import { resolveImageUrl } from '../../lib/images';
import { BRAND } from '../../lib/env';

/**
 * Intrinsic pixel size of the transparent wordmark. The ratio comes from the
 * generated asset, so callers can size the logo by width or height without
 * ever stretching it — the artwork's natural proportion is always preserved.
 */
const WORDMARK_WIDTH = 1103;
const WORDMARK_HEIGHT = 319;

type WordmarkProps = {
  className?: string;
  /** Rendered width in CSS pixels. Takes precedence over `height`. */
  width?: number;
  /** Rendered height in CSS pixels; the width follows the artwork ratio. */
  height?: number;
  /** `light` is the gold wordmark for forest surfaces; `dark` is the full logo. */
  tone?: 'light' | 'dark';
  priority?: boolean;
};

/**
 * The wordmark is derived from the supplied logo artwork (transparent PNG) and
 * designed for forest surfaces. `mark` shows the original square logo.
 */
export function Wordmark({ className, width, height, tone = 'light', priority = false }: WordmarkProps) {
  const square = tone === 'dark';
  /** Leave sizing to the caller when neither dimension is given (responsive headers). */
  const size: CSSProperties | undefined = width
    ? { width, height: 'auto' }
    : height
      ? { height, width: 'auto' }
      : undefined;

  return (
    <img
      src={resolveImageUrl(square ? BRAND.logo : BRAND.wordmark)}
      alt="Herb & Hue — Natural Skincare"
      width={square ? 1254 : WORDMARK_WIDTH}
      height={square ? 1254 : WORDMARK_HEIGHT}
      className={cn('block max-w-full select-none', className)}
      style={size}
      decoding="async"
      {...(priority ? { fetchpriority: 'high' } : {})}
    />
  );
}

export function LeafMark({ className, height = 32 }: { className?: string; height?: number }) {
  return (
    <img
      src={resolveImageUrl('/brand/leaf-mark.png')}
      alt=""
      aria-hidden="true"
      height={height}
      className={cn('w-auto select-none', className)}
      style={{ height }}
      loading="lazy"
      decoding="async"
    />
  );
}
