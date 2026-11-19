import { getCategories } from '../api/catalog';
import { useApi } from '../hooks/useApi';
import { Seo } from '../components/Seo';
import { PageHeader } from '../components/layout/PageHeader';
import { CategoryCard } from '../components/products/CategoryCard';
import { EmptyState, ErrorState, SkeletonBlock } from '../components/ui/feedback';
import { ButtonLink } from '../components/ui/Button';
import { useSettings } from '../context/SettingsContext';

export function Categories() {
  const { settings } = useSettings();
  const categories = useApi((signal) => getCategories(signal), []);
  const items = categories.data?.data ?? [];

  return (
    <>
      <Seo
        title="Collections"
        description="Explore Herb & Hue collections: cleanse, treat, hydrate and body care."
        path="/categories"
      />
      <PageHeader
        eyebrow="The collection"
        title="Care, by ritual"
        description="Four quiet categories, each a step in a routine. Browse by the part of the ritual you are building."
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Collections' }]}
      />

      <div className="container-editorial py-12 sm:py-16">
        {categories.error ? (
          <ErrorState error={categories.error} onRetry={categories.reload} />
        ) : categories.loading ? (
          <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <SkeletonBlock key={index} className="aspect-[3/4] w-full" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            eyebrow="The collection"
            title="Collections are being prepared"
            body="Categories will appear here once they are published in the dashboard."
            action={<ButtonLink to="/shop">Browse all products</ButtonLink>}
          />
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
            {items.map((category, index) => (
              <CategoryCard key={category.id} category={category} index={index} />
            ))}
          </div>
        )}

        <div className="mt-14 grid gap-8 border-t border-gold/25 pt-10 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <p className="eyebrow">Not sure where to start?</p>
            <p className="mt-4 max-w-xl font-serif text-[26px] leading-snug text-forest-dark">
              Tell us what your skin likes and we will suggest a simple order of things.
            </p>
            <p className="mt-2 text-[13px] text-muted">{settings.tagline}</p>
          </div>
          <ButtonLink to="/contact" variant="outline">
            Ask the studio
          </ButtonLink>
        </div>
      </div>
    </>
  );
}
