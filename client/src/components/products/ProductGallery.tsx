import { useEffect, useState } from 'react';
import type { ApiImage } from '../../api/types';
import { cn } from '../../lib/cn';
import { imageSrcSet, imageUrl, IMAGE_WIDTHS } from '../../lib/images';

export function ProductGallery({ images, productName }: { images: ApiImage[]; productName: string }) {
  const [active, setActive] = useState(0);
  const safeImages = images.length > 0 ? images : null;

  useEffect(() => {
    setActive(0);
  }, [productName]);

  if (!safeImages) {
    return (
      <div className="flex aspect-[4/5] items-center justify-center border border-forest/10 bg-sage/30">
        <span className="text-[11px] uppercase tracking-[0.18em] text-forest/40">Image coming soon</span>
      </div>
    );
  }

  const current = safeImages[Math.min(active, safeImages.length - 1)];

  return (
    <div>
      <div className="relative aspect-[4/5] overflow-hidden border border-forest/10 bg-sage/30">
        <img
          key={current.url}
          src={imageUrl(current.url, IMAGE_WIDTHS.detail)}
          srcSet={imageSrcSet(current.url, [600, 900, 1400])}
          sizes="(min-width: 1024px) 55vw, 100vw"
          alt={current.alt || productName}
          className="h-full w-full animate-fade object-cover"
          {...{ fetchpriority: 'high' }}
          decoding="async"
        />
        {safeImages.length > 1 ? (
          <div className="absolute bottom-4 right-4 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActive((index) => (index - 1 + safeImages.length) % safeImages.length)}
              className="flex h-9 w-9 items-center justify-center border border-forest/20 bg-ivory/85 text-forest backdrop-blur transition-colors hover:bg-forest hover:text-ivory"
              aria-label="Previous image"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                <path d="M7.5 1L2.5 6l5 5" stroke="currentColor" strokeWidth="1.2" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => setActive((index) => (index + 1) % safeImages.length)}
              className="flex h-9 w-9 items-center justify-center border border-forest/20 bg-ivory/85 text-forest backdrop-blur transition-colors hover:bg-forest hover:text-ivory"
              aria-label="Next image"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                <path d="M4.5 1l5 5-5 5" stroke="currentColor" strokeWidth="1.2" />
              </svg>
            </button>
          </div>
        ) : null}
      </div>

      {safeImages.length > 1 ? (
        <div className="mt-3 grid grid-cols-4 gap-2 sm:gap-3" role="group" aria-label="Product images">
          {safeImages.map((image, index) => (
            <button
              key={`${image.url}-${index}`}
              type="button"
              onClick={() => setActive(index)}
              aria-label={`Show image ${index + 1} of ${safeImages.length}`}
              aria-pressed={index === active}
              className={cn(
                'aspect-square overflow-hidden border bg-sage/30 transition-colors',
                index === active ? 'border-forest' : 'border-transparent hover:border-forest/40',
              )}
            >
              <img
                src={imageUrl(image.url, IMAGE_WIDTHS.thumb)}
                alt=""
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
