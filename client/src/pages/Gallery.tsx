import { useState } from 'react';
import { getGallery } from '../api/catalog';
import type { GalleryItem } from '../api/types';
import { useApi } from '../hooks/useApi';
import { Seo } from '../components/Seo';
import { PageHeader } from '../components/layout/PageHeader';
import { EmptyState, ErrorState } from '../components/ui/feedback';
import { SkeletonBlock } from '../components/ui/feedback';
import { Modal } from '../components/ui/Modal';
import { ButtonLink } from '../components/ui/Button';
import { imageUrl } from '../lib/images';
import { useSettings } from '../context/SettingsContext';

export function Gallery() {
  const { settings } = useSettings();
  const gallery = useApi((signal) => getGallery(signal), []);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const items = gallery.data?.data ?? [];
  const active: GalleryItem | null = activeIndex !== null ? items[activeIndex] ?? null : null;

  const close = () => setActiveIndex(null);
  const step = (direction: 1 | -1) => {
    if (activeIndex === null || items.length === 0) return;
    setActiveIndex((activeIndex + direction + items.length) % items.length);
  };

  return (
    <>
      <Seo
        title="The journal"
        description="Botanical hours — a visual journal from the Herb & Hue studio."
        path="/gallery"
      />
      <PageHeader
        eyebrow="The journal"
        title="Botanical hours"
        description="Light, glass, leaves and quiet corners — a visual note from the studio."
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Journal' }]}
      />

      <div className="container-editorial py-12 sm:py-16">
        {gallery.error ? (
          <ErrorState error={gallery.error} onRetry={gallery.reload} />
        ) : gallery.loading ? (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <SkeletonBlock key={index} className="aspect-square w-full" />
            ))}
          </div>
        ) : !settings.features.galleryEnabled ? (
          <EmptyState
            eyebrow="The journal"
            title="The journal is resting"
            body="Gallery updates are paused at the moment. Explore the collection or contact the studio for more imagery."
            action={<ButtonLink to="/shop">Shop the collection</ButtonLink>}
          />
        ) : items.length === 0 ? (
          <EmptyState
            eyebrow="The journal"
            title="Images are being gathered"
            body="New studio imagery will appear here once it is published in the dashboard."
            action={<ButtonLink to="/shop" variant="outline">Shop the collection</ButtonLink>}
          />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
            {items.map((item, index) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveIndex(index)}
                className="gallery-tile group relative aspect-square text-left focus-visible:outline-offset-4"
                aria-label={`Open image: ${item.title}`}
              >
                <img
                  src={imageUrl(item.image.url, 800)}
                  alt={item.image.alt}
                  loading={index < 3 ? 'eager' : 'lazy'}
                  decoding="async"
                  className="h-full w-full object-cover"
                />
                <span className="absolute inset-0 bg-gradient-to-t from-forest-deep/70 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                <span className="absolute inset-x-0 bottom-0 translate-y-2 p-5 opacity-0 transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100">
                  <span className="block font-serif text-[22px] leading-tight text-ivory">{item.title}</span>
                  {item.caption ? (
                    <span className="mt-1 block text-[11px] leading-relaxed text-ivory/70">{item.caption}</span>
                  ) : null}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <Modal
        open={active !== null}
        onClose={close}
        title={active?.title ?? 'Journal'}
        description={active?.caption}
        size="lg"
      >
        {active ? (
          <figure>
            <img
              src={imageUrl(active.image.url, 1600)}
              alt={active.image.alt}
              className="max-h-[65vh] w-full object-contain bg-sage/30"
            />
            <figcaption className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-[12px] text-muted">{active.image.alt}</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => step(-1)}
                  className="btn btn-outline btn-sm"
                  aria-label="Previous image"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => step(1)}
                  className="btn btn-outline btn-sm"
                  aria-label="Next image"
                >
                  Next
                </button>
              </div>
            </figcaption>
          </figure>
        ) : null}
      </Modal>
    </>
  );
}
