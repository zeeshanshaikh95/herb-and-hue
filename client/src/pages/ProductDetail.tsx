import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getProduct, getRelatedProducts, getReviews } from '../api/catalog';
import { useApi } from '../hooks/useApi';
import { useCart } from '../context/CartContext';
import { useSettings } from '../context/SettingsContext';
import { useToast } from '../context/ToastContext';
import { Seo } from '../components/Seo';
import { ProductGallery } from '../components/products/ProductGallery';
import { ProductGrid } from '../components/products/ProductGrid';
import { Accordion } from '../components/ui/Accordion';
import { Badge, Price, RatingStars, SectionHeading } from '../components/ui/Bits';
import { Button, ButtonLink } from '../components/ui/Button';
import { QuantityStepper } from '../components/ui/QuantityStepper';
import { EmptyState, ErrorState, SkeletonBlock } from '../components/ui/feedback';
import { WhatsAppLink, WhatsAppIcon } from '../components/ui/WhatsAppLink';
import { buildProductEnquiry } from '../lib/whatsapp';
import { SITE_URL } from '../lib/env';
import { cn } from '../lib/cn';
import { CURRENCY, formatDate } from '../lib/format';
import { imageUrl } from '../lib/images';

export function ProductDetail() {
  const { slug = '' } = useParams<{ slug: string }>();
  const { settings } = useSettings();
  const { addItem } = useCart();
  const toast = useToast();

  const productRequest = useApi((signal) => getProduct(slug, signal), [slug], { enabled: Boolean(slug) });
  const product = productRequest.data?.data ?? null;
  const related = useApi(
    (signal) => getRelatedProducts(slug, signal),
    [slug, product?.id],
    { enabled: Boolean(product) },
  );
  const reviews = useApi(
    (signal) => getReviews({ product: slug, limit: 3 }, signal),
    [slug, product?.id],
    { enabled: Boolean(product) && settings.features.reviewsEnabled },
  );

  const [variantId, setVariantId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);

  const selectedVariant = useMemo(
    () => product?.variants.find((variant) => variant.id === variantId) ?? null,
    [product, variantId],
  );

  useEffect(() => {
    if (!product) return;
    const firstAvailable = product.variants.find((variant) => variant.stockQuantity > 0) ?? product.variants[0];
    setVariantId(firstAvailable?.id ?? null);
    setQuantity(1);
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [product]);

  const availableStock = product
    ? selectedVariant
      ? selectedVariant.stockQuantity
      : product.variants.length > 0
        ? 0
        : product.stockQuantity
    : 0;

  useEffect(() => {
    if (availableStock > 0 && quantity > availableStock) setQuantity(Math.max(1, availableStock));
  }, [availableStock, quantity]);

  if (productRequest.loading && !product) {
    return (
      <div className="container-editorial grid gap-10 py-14 lg:grid-cols-2">
        <SkeletonBlock className="aspect-[4/5] w-full" />
        <div className="space-y-4">
          <SkeletonBlock className="h-3 w-24" />
          <SkeletonBlock className="h-12 w-3/4" />
          <SkeletonBlock className="h-5 w-28" />
          <SkeletonBlock className="h-20 w-full" />
          <SkeletonBlock className="h-12 w-48" />
        </div>
      </div>
    );
  }

  if (productRequest.error || !product) {
    return (
      <div className="container-editorial py-20">
        <ErrorState
          title="This piece is not available"
          message={productRequest.error ? undefined : 'It may have been archived or the link may be incorrect.'}
          error={productRequest.error}
          onRetry={productRequest.reload}
        />
        <div className="mt-6 text-center">
          <ButtonLink to="/shop" variant="outline">
            Back to the collection
          </ButtonLink>
        </div>
      </div>
    );
  }

  const unitPrice = selectedVariant?.price ?? product.price;
  const compareAtPrice = selectedVariant?.compareAtPrice ?? product.compareAtPrice;
  const requiresVariant = product.variants.length > 0;
  const canAdd = availableStock > 0;
  const lowStock = availableStock > 0 && availableStock <= settings.commerce.lowStockThreshold;
  const reviewSummary = reviews.data?.summary;
  const images = product.images;

  const whatsappMessage = buildProductEnquiry(settings, product, {
    variantLabel: selectedVariant?.label ?? null,
    variantPrice: unitPrice,
    siteUrl: SITE_URL,
  });

  const addToBag = () => {
    if (requiresVariant && !selectedVariant) {
      toast.error('Choose a size', 'Select a size before adding this piece to your bag.');
      return;
    }
    if (!canAdd) {
      toast.error('Currently unavailable', 'Ask us on WhatsApp and we will let you know when it returns.');
      return;
    }
    addItem({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      image: images[0]?.url ?? '',
      variantId: selectedVariant?.id ?? null,
      variantLabel: selectedVariant?.label ?? null,
      price: unitPrice,
      quantity,
    });
  };

  const productJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.seoDescription || product.shortDescription || product.description,
    image: images.map((image) =>
      imageUrl(image.url).startsWith('http') ? imageUrl(image.url) : `${SITE_URL}${imageUrl(image.url)}`,
    ),
    sku: product.variants[0]?.sku || undefined,
    brand: { '@type': 'Brand', name: settings.businessName },
    category: product.category?.name,
    offers: {
      '@type': 'Offer',
      url: `${SITE_URL}/product/${product.slug}`,
      priceCurrency: CURRENCY,
      price: (unitPrice / 100).toFixed(2),
      availability: canAdd ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      itemCondition: 'https://schema.org/NewCondition',
      seller: { '@type': 'Organization', name: settings.businessName },
    },
    ...(reviewSummary && reviewSummary.total > 0
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: reviewSummary.average,
            reviewCount: reviewSummary.total,
          },
        }
      : {}),
  };

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Shop', item: `${SITE_URL}/shop` },
      ...(product.category
        ? [{ '@type': 'ListItem', position: 3, name: product.category.name, item: `${SITE_URL}/category/${product.category.slug}` }]
        : []),
      {
        '@type': 'ListItem',
        position: product.category ? 4 : 3,
        name: product.name,
        item: `${SITE_URL}/product/${product.slug}`,
      },
    ],
  };

  const detailAccordions = [
    {
      title: 'Description',
      defaultOpen: true,
      content: product.description ? (
        <div className="prose-editorial">
          {product.description.split('\n').filter(Boolean).map((paragraph) => (
            <p key={paragraph.slice(0, 30)}>{paragraph}</p>
          ))}
        </div>
      ) : (
        <p>{product.shortDescription || 'Full description coming soon.'}</p>
      ),
    },
    {
      title: 'Why it earns its place',
      content:
        product.benefits.length > 0 ? (
          <ul className="space-y-2.5">
            {product.benefits.map((benefit) => (
              <li key={benefit} className="flex gap-3">
                <span aria-hidden="true" className="mt-2 h-1 w-1 shrink-0 rounded-full bg-gold-dark" />
                {benefit}
              </li>
            ))}
          </ul>
        ) : (
          <p>Product benefits are being finalised. Ask us for details before ordering.</p>
        ),
    },
    {
      title: 'Ingredients',
      content: product.ingredients ? (
        <p className="whitespace-pre-line">{product.ingredients}</p>
      ) : (
        <p>
          The ingredient list for this piece is pending. Please contact us before ordering if you have sensitivities or
          allergies.
        </p>
      ),
    },
    {
      title: 'How to use',
      content: product.directions ? (
        <p className="whitespace-pre-line">{product.directions}</p>
      ) : (
        <p>Directions for use are being finalised.</p>
      ),
    },
    {
      title: 'Care & warnings',
      content: product.warnings ? (
        <p className="whitespace-pre-line">{product.warnings}</p>
      ) : (
        <p>
          For external use only. Patch test before first use and discontinue if irritation occurs. Consult a qualified
          professional for persistent skin concerns.
        </p>
      ),
    },
  ];

  return (
    <>
      <Seo
        title={product.seoTitle || product.name}
        description={product.seoDescription || product.shortDescription}
        path={`/product/${product.slug}`}
        image={product.images[0]?.url}
        type="product"
        jsonLd={[productJsonLd, breadcrumbJsonLd]}
      />

      <div className="container-editorial py-6 sm:py-10">
        <nav aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.14em] text-muted">
            <li><Link to="/" className="hover:text-forest">Home</Link></li>
            <li aria-hidden="true">/</li>
            <li><Link to="/shop" className="hover:text-forest">Shop</Link></li>
            {product.category ? (
              <>
                <li aria-hidden="true">/</li>
                <li><Link to={`/category/${product.category.slug}`} className="hover:text-forest">{product.category.name}</Link></li>
              </>
            ) : null}
            <li aria-hidden="true">/</li>
            <li aria-current="page" className="text-forest/80">{product.name}</li>
          </ol>
        </nav>

        <div className="mt-7 grid gap-10 lg:grid-cols-[1.02fr_0.98fr] lg:gap-16">
          <div>
            <ProductGallery images={images} productName={product.name} />
          </div>

          <div className="lg:pt-2">
            <div className="flex flex-wrap items-center gap-2">
              {product.category ? (
                <Link
                  to={`/category/${product.category.slug}`}
                  className="text-[10px] font-medium uppercase tracking-[0.18em] text-gold-dark hover:text-forest"
                >
                  {product.category.name}
                </Link>
              ) : null}
              {product.sampleData ? <Badge tone="muted">Sample listing</Badge> : null}
              {product.bestseller ? <Badge tone="gold">Bestseller</Badge> : null}
            </div>

            <h1 className="mt-4 font-serif text-[clamp(2.2rem,4.6vw,3.4rem)] leading-[1.02] text-forest-dark">
              {product.name}
            </h1>

            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
              <Price price={unitPrice} compareAtPrice={compareAtPrice} size="lg" />
              {reviewSummary && reviewSummary.total > 0 ? (
                <a href="#customer-notes" className="inline-flex items-center gap-2 hover:opacity-80">
                  <RatingStars rating={reviewSummary.average} />
                  <span className="text-[11px] text-muted">({reviewSummary.total})</span>
                </a>
              ) : null}
            </div>

            <p className="mt-5 max-w-lg text-[14px] leading-[1.85] text-charcoal/75">{product.shortDescription}</p>

            <div className="mt-7 border-t border-forest/15 pt-6">
              {requiresVariant ? (
                <div>
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-forest/80">Size</p>
                    <p className="text-[11px] text-muted">{selectedVariant?.label ?? 'Choose a size'}</p>
                  </div>
                  <div role="radiogroup" aria-label="Choose a size" className="mt-3 flex flex-wrap gap-2">
                    {product.variants.map((variant) => {
                      const outOfStock = variant.stockQuantity <= 0;
                      const active = variant.id === variantId;
                      return (
                        <button
                          key={variant.id ?? variant.label}
                          type="button"
                          role="radio"
                          aria-checked={active}
                          disabled={outOfStock}
                          onClick={() => setVariantId(variant.id)}
                          className={cn(
                            'border px-4 py-2.5 text-[12px] transition-colors',
                            active
                              ? 'border-forest bg-forest text-ivory'
                              : 'border-forest/25 text-forest hover:border-forest',
                            outOfStock && 'cursor-not-allowed border-forest/10 text-forest/35 line-through hover:border-forest/10',
                          )}
                        >
                          {variant.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-stretch">
                <QuantityStepper
                  value={quantity}
                  onChange={setQuantity}
                  min={1}
                  max={Math.max(1, Math.min(availableStock || 1, 99))}
                  label="Quantity"
                  className="w-max"
                />
                <Button onClick={addToBag} disabled={!canAdd} className="flex-1">
                  {canAdd ? 'Add to bag' : 'Currently unavailable'}
                </Button>
              </div>

              <div className="mt-3">
                <WhatsAppLink message={whatsappMessage} variant="outline" className="w-full">
                  <WhatsAppIcon className="h-4 w-4" />
                  {canAdd ? 'Enquire on WhatsApp' : 'Ask about availability'}
                </WhatsAppLink>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px]">
                <span className="inline-flex items-center gap-2 text-forest/80">
                  <span
                    aria-hidden="true"
                    className={cn(
                      'h-1.5 w-1.5 rounded-full',
                      canAdd ? (lowStock ? 'bg-gold-dark' : 'bg-forest') : 'bg-charcoal/35',
                    )}
                  />
                  {canAdd
                    ? lowStock
                      ? `Only ${availableStock} left`
                      : 'In stock'
                    : 'Out of stock'}
                </span>
                <span className="text-muted">·</span>
                <span className="text-muted">Confirmed on WhatsApp before dispatch</span>
              </div>

              <div className="mt-5 space-y-2 border-t border-gold/25 pt-5 text-[11.5px] leading-relaxed text-muted">
                <p>{settings.commerce.shippingNote}</p>
                <p>{settings.commerce.priceNote}</p>
              </div>
            </div>

            <Accordion items={detailAccordions} className="mt-6" />

            {reviewSummary && reviewSummary.total > 0 ? (
              <section id="customer-notes" className="mt-8 border border-forest/10 bg-white/50 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="eyebrow">Customer notes</p>
                    <div className="mt-2 flex items-center gap-3">
                      <RatingStars rating={reviewSummary.average} showValue />
                      <span className="text-[11px] text-muted">· {reviewSummary.total} verified</span>
                    </div>
                  </div>
                  <Link to="/reviews" className="link-underline">
                    All reviews
                  </Link>
                </div>
                <ul className="mt-4 space-y-4">
                  {(reviews.data?.data ?? []).map((review) => (
                    <li key={review.id} className="border-t border-forest/10 pt-4 first:border-0 first:pt-0">
                      <RatingStars rating={review.rating} />
                      <p className="mt-2 text-[13px] leading-relaxed text-charcoal/80">“{review.body}”</p>
                      <p className="mt-2 text-[10px] uppercase tracking-[0.12em] text-muted">
                        {review.authorName} · {formatDate(review.createdAt)}
                      </p>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>
        </div>
      </div>

      <section className="border-t border-gold/20 bg-ivory-dark/40 py-14 sm:py-20">
        <div className="container-editorial">
          <SectionHeading eyebrow="Continue the ritual" title="Pairs quietly with" className="mb-9" />
          {related.error ? (
            <ErrorState error={related.error} onRetry={related.reload} />
          ) : related.loading ? (
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <SkeletonBlock key={index} className="aspect-[4/5] w-full" />
              ))}
            </div>
          ) : (related.data?.data.length ?? 0) === 0 ? (
            <EmptyState title="More pieces are on the way" body="Explore the full collection in the meantime." />
          ) : (
            <ProductGrid products={related.data?.data ?? []} columns={4} />
          )}
        </div>
      </section>

      <div className="container-editorial py-10">
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-gold/25 pt-6">
          <Link to="/shop" className="link-underline">
            Back to the collection
          </Link>
          <p className="text-[11px] text-muted">
            {settings.businessName} · {settings.tagline}
          </p>
        </div>
      </div>
    </>
  );
}
