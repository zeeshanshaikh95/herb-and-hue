import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getCategories, getGallery, getProducts, getReviews } from '../api/catalog';
import { useApi } from '../hooks/useApi';
import { useSettings } from '../context/SettingsContext';
import { Seo } from '../components/Seo';
import { ButtonLink } from '../components/ui/Button';
import { SectionHeading, RatingStars, Badge } from '../components/ui/Bits';
import { CategoryCard } from '../components/products/CategoryCard';
import { ProductGrid } from '../components/products/ProductGrid';
import { ProductCardSkeleton } from '../components/products/ProductCard';
import { EmptyState, ErrorState, SkeletonBlock } from '../components/ui/feedback';
import { LeafMark, Wordmark } from '../components/brand/Logo';
import { WhatsAppLink, WhatsAppIcon } from '../components/ui/WhatsAppLink';
import { buildGeneralEnquiry } from '../lib/whatsapp';
import { imageUrl, IMAGE_WIDTHS } from '../lib/images';
import { SITE_URL } from '../lib/env';
import { trackEvent } from '../lib/analytics';
import { formatDate } from '../lib/format';

export function Home() {
  const { settings } = useSettings();
  const home = settings.homepage;

  const categories = useApi((signal) => getCategories(signal), []);
  const featured = useApi((signal) => getProducts({ featured: true, limit: 4, sort: 'featured' }, signal), []);
  const bestsellers = useApi((signal) => getProducts({ bestseller: true, limit: 4, sort: 'featured' }, signal), []);
  const reviews = useApi((signal) => getReviews({ limit: 3 }, signal), []);
  const gallery = useApi((signal) => getGallery(signal), []);

  const featuredProducts = featured.data?.data ?? [];
  const needsLatest = featured.data !== null && featuredProducts.length === 0;
  const latest = useApi(
    (signal) => getProducts({ limit: 4, sort: 'newest' }, signal),
    [],
    { enabled: needsLatest },
  );
  const displayProducts = featuredProducts.length > 0 ? featuredProducts : latest.data?.data ?? [];
  const showingFallback = featuredProducts.length === 0 && displayProducts.length > 0;

  const bestsellerProducts = bestsellers.data?.data ?? [];
  const reviewData = reviews.data;
  const galleryItems = gallery.data?.data ?? [];
  const categoryItems = categories.data?.data ?? [];

  useEffect(() => {
    trackEvent('page_view', { path: '/' });
  }, []);

  const organizationJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: settings.businessName,
    url: SITE_URL,
    logo: `${SITE_URL}${settings.logoUrl}`,
    description: settings.shortDescription,
    ...(settings.socials.length > 0 ? { sameAs: settings.socials.map((social) => social.url) } : {}),
  };

  return (
    <>
      <Seo
        title={settings.seo.title || `${settings.businessName} — Botanical Skincare`}
        description={settings.seo.description}
        path="/"
        image={settings.seo.ogImage}
        jsonLd={organizationJsonLd}
      />

      {/* Hero */}
      <section className="relative overflow-hidden bg-ivory">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_78%_18%,rgba(220,229,216,0.75),transparent_55%)]"
        />
        <div className="container-editorial relative grid items-center gap-12 py-12 sm:py-16 lg:grid-cols-[1.02fr_0.98fr] lg:gap-16 lg:py-20">
          <div className="max-w-xl animate-rise">
            <p className="eyebrow">{home.heroEyebrow}</p>
            <h1 className="mt-6 text-[clamp(2.9rem,6.5vw,5.4rem)] leading-[0.94] tracking-[-0.02em] text-forest-dark">
              {home.heroTitle}
              {home.heroTitleAccent ? (
                <span className="mt-1 block font-serif italic text-forest-light">{home.heroTitleAccent}</span>
              ) : null}
            </h1>
            <p className="mt-7 max-w-md text-[15px] leading-[1.9] text-charcoal/75 sm:text-[16px]">{home.heroBody}</p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <ButtonLink to={home.heroCtaUrl || '/shop'}>{home.heroCtaLabel}</ButtonLink>
              <ButtonLink to="/about" variant="outline">
                Our philosophy
              </ButtonLink>
            </div>
            <div className="mt-10 flex items-center gap-3 border-t border-gold/25 pt-5">
              <LeafMark height={30} className="opacity-70" />
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted">{home.heroNote}</p>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[540px] lg:max-w-none">
            <div className="absolute -inset-3 border border-gold/30 sm:-inset-4" aria-hidden="true" />
            <figure className="relative overflow-hidden bg-sage/40">
              <img
                src={imageUrl(home.heroImage, IMAGE_WIDTHS.hero)}
                alt={home.heroImageAlt}
                width={1000}
                height={1250}
                {...{ fetchpriority: 'high' }}
                decoding="async"
                className="aspect-[4/5] h-full w-full object-cover"
              />
              <figcaption className="sr-only">{home.heroImageAlt}</figcaption>
            </figure>
            <div className="absolute -bottom-6 left-4 hidden w-[240px] border border-gold/40 bg-ivory/95 p-5 shadow-soft backdrop-blur sm:block lg:-left-8">
              <div className="flex items-center justify-between">
                <p className="text-[9px] uppercase tracking-[0.2em] text-gold-dark">The house edit</p>
                <Wordmark height={16} tone="dark" />
              </div>
              <p className="mt-3 font-serif text-[19px] leading-snug text-forest-dark">
                Botanical formulas for a slower routine.
              </p>
              <Link
                to="/shop"
                className="mt-4 inline-flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.16em] text-forest hover:text-gold-dark"
              >
                Explore the collection
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                  <path d="M1 6h10M6 1l5 5-5 5" stroke="currentColor" strokeWidth="1.1" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="section border-t border-gold/15 bg-ivory" aria-labelledby="collections-heading">
        <div className="container-editorial">
          <SectionHeading
            eyebrow={home.categoriesEyebrow}
            title={home.categoriesTitle}
            action={
              <Link to="/categories" className="link-underline">
                All collections
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                  <path d="M1 6h10M6 1l5 5-5 5" stroke="currentColor" strokeWidth="1.1" />
                </svg>
              </Link>
            }
            className="mb-10"
          />
          {categories.error ? (
            <ErrorState error={categories.error} onRetry={categories.reload} />
          ) : categories.loading ? (
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <SkeletonBlock key={index} className="aspect-[3/4] w-full" />
              ))}
            </div>
          ) : categoryItems.length === 0 ? (
            <EmptyState
              title="Collections are being prepared"
              body="New categories will appear here as soon as they are published in the dashboard."
              action={<ButtonLink to="/shop" variant="outline">Browse all products</ButtonLink>}
            />
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4">
              {categoryItems.slice(0, 4).map((category, index) => (
                <CategoryCard key={category.id} category={category} index={index} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Featured */}
      <section className="section border-y border-gold/15 bg-ivory-dark/60" aria-labelledby="featured-heading">
        <div className="container-editorial">
          <SectionHeading
            eyebrow={showingFallback ? 'New in' : home.featuredEyebrow}
            title={showingFallback ? 'The collection' : home.featuredTitle}
            action={
              <Link to="/shop" className="link-underline">
                Shop all
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                  <path d="M1 6h10M6 1l5 5-5 5" stroke="currentColor" strokeWidth="1.1" />
                </svg>
              </Link>
            }
            className="mb-10"
          />
          {featured.error ? (
            <ErrorState error={featured.error} onRetry={featured.reload} />
          ) : featured.loading || (needsLatest && latest.loading) ? (
            <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <ProductCardSkeleton key={index} />
              ))}
            </div>
          ) : displayProducts.length === 0 ? (
            <EmptyState
              eyebrow="The collection"
              title="The shelves are being prepared"
              body="Products will appear here as soon as they are published in the dashboard."
              action={<ButtonLink to="/contact" variant="outline">Ask us about the launch</ButtonLink>}
            />
          ) : (
            <ProductGrid products={displayProducts.slice(0, 4)} columns={4} priorityCount={2} />
          )}
        </div>
      </section>

      {/* Philosophy */}
      <section className="section bg-ivory" aria-labelledby="philosophy-heading">
        <div className="container-editorial grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
          <div className="relative order-2 lg:order-1">
            <div className="absolute -inset-3 border border-gold/25 sm:-inset-4" aria-hidden="true" />
            <img
              src={imageUrl(home.philosophyImage, IMAGE_WIDTHS.hero)}
              alt={home.philosophyImageAlt}
              loading="lazy"
              decoding="async"
              className="relative aspect-[5/4] w-full object-cover"
            />
          </div>
          <div className="order-1 lg:order-2">
            <p className="eyebrow">{home.philosophyEyebrow}</p>
            <h2 id="philosophy-heading" className="mt-5 text-[clamp(2.2rem,4.5vw,3.6rem)] leading-[1.02]">
              {home.philosophyTitle}
            </h2>
            <div className="prose-editorial mt-6">
              {home.philosophyBody.map((paragraph) => (
                <p key={paragraph.slice(0, 40)}>{paragraph}</p>
              ))}
            </div>
            {home.ingredients.length > 0 ? (
              <ul className="mt-8 grid grid-cols-2 gap-x-6 gap-y-3 border-t border-gold/25 pt-6">
                {home.ingredients.map((ingredient) => (
                  <li key={ingredient} className="flex items-center gap-2.5 text-[12px] uppercase tracking-[0.12em] text-forest/80">
                    <span className="h-1 w-1 shrink-0 rounded-full bg-gold" aria-hidden="true" />
                    {ingredient}
                  </li>
                ))}
              </ul>
            ) : null}
            <div className="mt-9">
              <ButtonLink to="/about" variant="outline">
                Read our story
              </ButtonLink>
            </div>
          </div>
        </div>
      </section>

      {/* Why */}
      <section className="section relative overflow-hidden bg-forest text-ivory" aria-labelledby="why-heading">
        <img
          src={imageUrl('/brand/leaf-mark.png')}
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 top-0 w-[420px] opacity-[0.06]"
          loading="lazy"
        />
        <div className="container-editorial relative">
          <SectionHeading eyebrow={home.whyEyebrow} title={home.whyTitle} light className="mb-12" />
          <div className="grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {home.values.map((value, index) => (
              <div key={value.title} className="border-t border-gold/30 pt-5">
                <p className="font-sans text-[10px] tracking-[0.2em] text-gold/70">0{index + 1}</p>
                <h3 className="mt-3 font-serif text-[24px] leading-tight text-ivory">{value.title}</h3>
                <p className="mt-3 text-[13px] leading-[1.8] text-ivory/65">{value.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bestsellers */}
      {bestsellerProducts.length > 0 ? (
        <section className="section bg-ivory" aria-labelledby="bestsellers-heading">
          <div className="container-editorial">
            <SectionHeading
              eyebrow={home.bestsellersEyebrow}
              title={home.bestsellersTitle}
              action={
                <Link to="/shop?sort=featured" className="link-underline">
                  Shop the edit
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                    <path d="M1 6h10M6 1l5 5-5 5" stroke="currentColor" strokeWidth="1.1" />
                  </svg>
                </Link>
              }
              className="mb-10"
            />
            <ProductGrid products={bestsellerProducts.slice(0, 4)} columns={4} />
          </div>
        </section>
      ) : null}

      {/* Ritual */}
      <section className="section bg-sage/25" aria-labelledby="ritual-heading">
        <div className="container-editorial grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-20">
          <div>
            <p className="eyebrow">{home.ritualEyebrow}</p>
            <h2 id="ritual-heading" className="mt-5 text-[clamp(2.2rem,4.5vw,3.4rem)] leading-[1.03]">
              {home.ritualTitle}
            </h2>
            <ol className="mt-9 space-y-7">
              {home.ritualSteps.map((step, index) => (
                <li key={step.title} className="flex gap-5 border-t border-forest/15 pt-6">
                  <span className="font-serif text-[28px] leading-none text-gold-dark">0{index + 1}</span>
                  <div>
                    <h3 className="font-serif text-[23px] leading-tight text-forest-dark">{step.title}</h3>
                    <p className="mt-1.5 max-w-sm text-[13px] leading-[1.8] text-charcoal/70">{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>
            <div className="mt-9">
              <ButtonLink to="/shop" variant="outline">
                Build your ritual
              </ButtonLink>
            </div>
          </div>
          <div className="relative">
            <div className="absolute -inset-3 border border-gold/30" aria-hidden="true" />
            <img
              src={imageUrl(home.ritualImage, IMAGE_WIDTHS.hero)}
              alt={home.ritualImageAlt}
              loading="lazy"
              decoding="async"
              className="relative aspect-[12/7] w-full object-cover"
            />
          </div>
        </div>
      </section>

      {/* Reviews */}
      <section className="section border-y border-gold/15 bg-ivory-dark/50" aria-labelledby="reviews-heading">
        <div className="container-editorial">
          <SectionHeading
            eyebrow={home.reviewsEyebrow}
            title={home.reviewsTitle}
            action={
              <Link to="/reviews" className="link-underline">
                All reviews
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                  <path d="M1 6h10M6 1l5 5-5 5" stroke="currentColor" strokeWidth="1.1" />
                </svg>
              </Link>
            }
            className="mb-10"
          />
          {reviewData && reviewData.data.length > 0 ? (
            <div className="grid gap-5 md:grid-cols-3">
              {reviewData.data.map((review) => (
                <figure key={review.id} className="flex h-full flex-col border border-forest/10 bg-ivory p-6">
                  <RatingStars rating={review.rating} showValue />
                  <blockquote className="mt-4 flex-1 text-[14px] leading-[1.85] text-charcoal/80">
                    {review.title ? <p className="mb-2 font-serif text-[20px] leading-snug text-forest-dark">{review.title}</p> : null}
                    “{review.body}”
                  </blockquote>
                  <figcaption className="mt-5 border-t border-gold/25 pt-4 text-[11px] uppercase tracking-[0.14em] text-muted">
                    {review.authorName}
                    {review.product ? <span className="normal-case tracking-normal"> · {review.product.name}</span> : null}
                    <span className="mt-1 block normal-case tracking-normal text-muted/70">{formatDate(review.createdAt)}</span>
                  </figcaption>
                </figure>
              ))}
            </div>
          ) : (
            <div className="grid items-center gap-8 border border-forest/10 bg-ivory p-7 sm:p-10 lg:grid-cols-[1fr_auto]">
              <div>
                <div className="flex items-center gap-3">
                  <Badge tone="gold">Verified only</Badge>
                  <RatingStars rating={0} />
                </div>
                <h3 className="mt-5 font-serif text-[28px] leading-tight text-forest-dark">
                  Customer notes will appear here — with permission.
                </h3>
                <p className="mt-3 max-w-2xl text-[13px] leading-[1.8] text-muted">
                  We do not publish invented testimonials. Reviews submitted through the site are held for moderation
                  and appear only after the Herb &amp; Hue team approves them.
                </p>
              </div>
              <ButtonLink to="/reviews" variant="outline">
                Write a review
              </ButtonLink>
            </div>
          )}
        </div>
      </section>

      {/* Gallery */}
      {settings.features.galleryEnabled && galleryItems.length > 0 ? (
        <section className="section bg-ivory" aria-labelledby="gallery-heading">
          <div className="container-editorial">
            <SectionHeading
              eyebrow={home.galleryEyebrow}
              title={home.galleryTitle}
              action={
                <Link to="/gallery" className="link-underline">
                  View the journal
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                    <path d="M1 6h10M6 1l5 5-5 5" stroke="currentColor" strokeWidth="1.1" />
                  </svg>
                </Link>
              }
              className="mb-10"
            />
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
              {galleryItems.slice(0, 4).map((item) => (
                <Link key={item.id} to="/gallery" className="gallery-tile group aspect-square">
                  <img
                    src={imageUrl(item.image.url, 700)}
                    alt={item.image.alt}
                    loading="lazy"
                    decoding="async"
                  />
                  <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-forest-deep/75 to-transparent p-4 text-[10px] uppercase tracking-[0.16em] text-ivory opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                    {item.title}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* WhatsApp CTA */}
      <section className="relative overflow-hidden bg-forest py-16 text-ivory sm:py-20" aria-labelledby="whatsapp-heading">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/60 to-transparent" aria-hidden="true" />
        <img
          src={imageUrl('/brand/leaf-mark.png')}
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute -left-10 bottom-0 w-64 opacity-[0.08]"
          loading="lazy"
        />
        <div className="container-editorial relative grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="max-w-2xl">
            <p className="eyebrow eyebrow-light">{home.whatsappEyebrow}</p>
            <h2 id="whatsapp-heading" className="mt-4 text-[clamp(2rem,4vw,3rem)] leading-[1.05] text-ivory">
              {home.whatsappTitle}
            </h2>
            <p className="mt-4 max-w-xl text-[14px] leading-[1.85] text-ivory/70">{home.whatsappBody}</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
            <WhatsAppLink message={buildGeneralEnquiry(settings)} variant="gold">
              <WhatsAppIcon className="h-4 w-4" /> Chat on WhatsApp
            </WhatsAppLink>
            <ButtonLink to="/contact" variant="light">
              Contact the studio
            </ButtonLink>
          </div>
        </div>
      </section>
    </>
  );
}
