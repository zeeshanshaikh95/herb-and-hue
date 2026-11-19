import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { errorMessage } from '../api/client';
import { validateCart } from '../api/catalog';
import type { CartValidation, CartValidationLine } from '../api/types';
import { useCart } from '../context/CartContext';
import { useSettings } from '../context/SettingsContext';
import { useToast } from '../context/ToastContext';
import { PageHeader } from '../components/layout/PageHeader';
import { Seo } from '../components/Seo';
import { Button, ButtonLink } from '../components/ui/Button';
import { EmptyState, InlineNotice } from '../components/ui/feedback';
import { QuantityStepper } from '../components/ui/QuantityStepper';
import { Price } from '../components/ui/Bits';
import { WhatsAppIcon } from '../components/ui/WhatsAppLink';
import { lineKey, type CartLine } from '../lib/cart';
import { buildCartEnquiry, buildWhatsAppUrl, normalizeWhatsAppNumber } from '../lib/whatsapp';
import { formatMoney } from '../lib/format';
import { imageUrl } from '../lib/images';
import { trackEvent } from '../lib/analytics';

const ISSUE_LABELS: Record<CartValidationLine['issue'], string | null> = {
  none: null,
  unavailable: 'This piece is no longer available and will be removed.',
  variant_required: 'Choose a size for this piece.',
  variant_missing: 'That size is no longer available.',
  out_of_stock: 'This piece is currently out of stock and will be removed.',
  insufficient_stock: 'Stock has reduced — quantities were adjusted.',
  price_changed: 'The price has been updated to the current listing.',
};

export function Cart() {
  const { lines, count, subtotal, setQuantity, removeItem, replaceLines, clear } = useCart();
  const { settings } = useSettings();
  const toast = useToast();

  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [validating, setValidating] = useState(false);
  const [validation, setValidation] = useState<CartValidation | null>(null);
  const [nameError, setNameError] = useState('');
  const whatsappConfigured = Boolean(normalizeWhatsAppNumber(settings.whatsappNumber));

  const validationByKey = useMemo(() => {
    const map = new Map<string, CartValidationLine>();
    for (const line of validation?.lines ?? []) {
      map.set(lineKey(line.productId, line.variantId), line);
    }
    return map;
  }, [validation]);

  const syncCartWithValidation = (data: CartValidation) => {
    const preserved = new Map(lines.map((line) => [line.key, line]));
    const next: CartLine[] = [];
    for (const line of data.lines) {
      const blocking =
        line.issue === 'unavailable' ||
        line.issue === 'out_of_stock' ||
        line.issue === 'variant_missing' ||
        line.issue === 'variant_required';
      if (blocking || !line.inStock || line.availableQuantity <= 0) continue;
      const key = lineKey(line.productId, line.variantId);
      const existing = preserved.get(key);
      next.push({
        key,
        productId: line.productId,
        slug: line.slug || existing?.slug || '',
        name: line.name,
        image: line.image?.url ?? existing?.image ?? '',
        variantId: line.variantId,
        variantLabel: line.variantLabel,
        price: line.unitPrice,
        quantity: Math.min(line.quantity, line.availableQuantity),
      });
    }
    replaceLines(next);
    setValidation(data);
  };

  const handleOrder = async () => {
    if (name.trim().length < 2) {
      setNameError('Please add your name so the team knows who they are speaking with.');
      return;
    }
    setNameError('');
    setValidating(true);
    try {
      const response = await validateCart(
        lines.map((line) => ({
          productId: line.productId,
          variantId: line.variantId,
          quantity: line.quantity,
          price: line.price,
        })),
      );
      const data = response.data;

      const blocking = data.lines.some(
        (line) =>
          line.issue === 'unavailable' ||
          line.issue === 'out_of_stock' ||
          line.issue === 'variant_missing' ||
          line.issue === 'variant_required',
      );
      const needsAdjustment =
        data.hasIssues && data.lines.some((line) => {
          if (line.issue === 'none') return false;
          if (blocking) return true;
          return line.quantity > line.availableQuantity || line.priceChanged;
        });

      if (blocking || needsAdjustment) {
        syncCartWithValidation(data);
        setValidation(null);
        toast.info(
          blocking ? 'Your bag was updated' : 'Prices and stock refreshed',
          'Some details changed since you added these pieces. Review your bag and continue when ready.',
        );
        return;
      }

      const url = buildWhatsAppUrl(
        settings.whatsappNumber,
        buildCartEnquiry(settings, {
          lines: data.lines
            .filter((line) => line.inStock)
            .map((line) => ({
              name: line.name,
              variantLabel: line.variantLabel,
              quantity: line.quantity,
              lineTotal: line.unitPrice * line.quantity,
            })),
          subtotal: data.subtotal,
          name,
          notes,
        }),
      );

      if (!url) {
        toast.error('WhatsApp is not configured', 'Please use the contact page or the email address in the footer.');
        return;
      }

      window.open(url, '_blank', 'noopener,noreferrer');
      trackEvent('whatsapp_click', { path: '/cart' });
      toast.success(
        'WhatsApp opened',
        'Send the message to begin your order. It is not confirmed until our team replies.',
      );
    } catch (error) {
      toast.error('We could not review your bag', errorMessage(error));
    } finally {
      setValidating(false);
    }
  };

  const issueLines = validation?.lines.filter((line) => line.issue !== 'none') ?? [];

  return (
    <>
      <Seo title="Your bag" description="Review your Herb & Hue selection and enquire on WhatsApp." path="/cart" noIndex />
      <PageHeader
        eyebrow="Your selection"
        title="Your bag"
        description={
          count > 0
            ? `${count === 1 ? 'One piece' : `${count} pieces`} ready to review. Orders are completed with our team on WhatsApp — no payment is taken here.`
            : 'A quiet place for the pieces you are considering.'
        }
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Bag' }]}
      />

      <div className="container-editorial py-12 sm:py-16">
        {lines.length === 0 ? (
          <EmptyState
            eyebrow="Empty"
            title="Your bag is waiting"
            body="Explore the collection and add the pieces you would like to ask about. We will help you complete the order on WhatsApp."
            action={
              <div className="flex flex-wrap items-center justify-center gap-3">
                <ButtonLink to="/shop">Shop the collection</ButtonLink>
                <ButtonLink to="/contact" variant="outline">
                  Ask a question
                </ButtonLink>
              </div>
            }
          />
        ) : (
          <div className="grid gap-10 lg:grid-cols-[1.5fr_0.9fr] lg:gap-16">
            <div>
              <div className="flex items-center justify-between border-b border-forest/15 pb-4">
                <p className="text-[11px] uppercase tracking-[0.14em] text-muted">{count} items</p>
                <button
                  type="button"
                  onClick={() => {
                    clear();
                    setValidation(null);
                    toast.info('Bag cleared');
                  }}
                  className="text-[10px] uppercase tracking-[0.14em] text-muted underline decoration-gold/50 underline-offset-4 hover:text-forest"
                >
                  Clear bag
                </button>
              </div>

              <ul className="divide-y divide-forest/10">
                {lines.map((line) => {
                  const live = validationByKey.get(line.key);
                  const issue = live && live.issue !== 'none' ? (ISSUE_LABELS[live.issue] ?? null) : null;
                  return (
                    <li key={line.key} className="flex gap-4 py-6 sm:gap-6">
                      <Link to={`/product/${line.slug}`} className="block w-[88px] shrink-0 sm:w-[110px]">
                        {line.image ? (
                          <img
                            src={imageUrl(line.image, 300)}
                            alt={line.name}
                            loading="lazy"
                            className="aspect-[4/5] w-full border border-forest/10 object-cover"
                          />
                        ) : (
                          <div className="aspect-[4/5] w-full bg-sage/40" />
                        )}
                      </Link>
                      <div className="flex min-w-0 flex-1 flex-col justify-between">
                        <div>
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div className="min-w-0">
                              <h2 className="font-serif text-[20px] leading-snug text-forest-dark">
                                <Link to={`/product/${line.slug}`} className="hover:text-forest-light">
                                  {line.name}
                                </Link>
                              </h2>
                              {line.variantLabel ? (
                                <p className="mt-0.5 text-[11px] uppercase tracking-[0.12em] text-muted">
                                  {line.variantLabel}
                                </p>
                              ) : null}
                              <p className="mt-1 text-[11px] text-muted">
                                {formatMoney(line.price)} each
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                removeItem(line.key);
                                setValidation(null);
                              }}
                              className="p-1 text-[10px] uppercase tracking-[0.12em] text-muted underline decoration-gold/40 underline-offset-4 hover:text-forest"
                              aria-label={`Remove ${line.name} from bag`}
                            >
                              Remove
                            </button>
                          </div>
                          {issue ? <p className="mt-2 text-[11px] text-[#7a3b28]">{issue}</p> : null}
                        </div>

                        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                          <QuantityStepper
                            value={line.quantity}
                            onChange={(quantity) => {
                              setQuantity(line.key, quantity);
                              setValidation(null);
                            }}
                            max={99}
                            label={`${line.name} quantity`}
                          />
                          <Price
                            price={line.price * line.quantity}
                            size="sm"
                            className="font-medium"
                          />
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>

              <div className="mt-6">
                <Link to="/shop" className="link-underline">
                  Continue shopping
                </Link>
              </div>
            </div>

            <aside className="h-max border border-forest/15 bg-ivory-dark/50 p-6 lg:sticky lg:top-28">
              <h2 className="font-serif text-[26px] text-forest-dark">Order summary</h2>
              <div className="mt-5 flex items-baseline justify-between border-b border-forest/15 pb-4">
                <span className="text-[12px] uppercase tracking-[0.12em] text-muted">Subtotal</span>
                <span className="font-sans text-[20px] tabular-nums text-forest-dark">
                  {formatMoney(subtotal)}
                </span>
              </div>
              <p className="mt-4 text-[11.5px] leading-relaxed text-muted">
                {settings.commerce.shippingNote} {settings.commerce.priceNote}
              </p>

              {issueLines.length > 0 ? (
                <InlineNotice tone="warning" className="mt-5">
                  <ul className="space-y-1.5">
                    {issueLines.map((line) => (
                      <li key={lineKey(line.productId, line.variantId)}>
                        <strong className="font-semibold">{line.name}:</strong> {ISSUE_LABELS[line.issue]}
                      </li>
                    ))}
                  </ul>
                </InlineNotice>
              ) : null}

              <div className="mt-6 space-y-4">
                <div>
                  <label htmlFor="cart-name" className="field-label">
                    Your name <span className="text-gold-dark">*</span>
                  </label>
                  <input
                    id="cart-name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    maxLength={80}
                    autoComplete="name"
                    className={`field ${nameError ? 'field-error' : ''}`}
                    aria-invalid={nameError ? true : undefined}
                    aria-describedby={nameError ? 'cart-name-error' : undefined}
                    placeholder="So we know who we are speaking with"
                  />
                  {nameError ? (
                    <span id="cart-name-error" role="alert" className="field-error-text">
                      {nameError}
                    </span>
                  ) : null}
                </div>
                <div>
                  <label htmlFor="cart-notes" className="field-label">
                    Notes for the team <span className="normal-case tracking-normal text-muted">(optional)</span>
                  </label>
                  <textarea
                    id="cart-notes"
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    rows={3}
                    maxLength={500}
                    className="field resize-y"
                    placeholder="Delivery city, timing, or a question about a piece"
                  />
                </div>
              </div>

              <Button
                onClick={handleOrder}
                loading={validating}
                variant="primary"
                className="mt-5 w-full"
                disabled={!whatsappConfigured}
              >
                <WhatsAppIcon className="h-4 w-4" />
                Review &amp; enquire
              </Button>

              {!whatsappConfigured ? (
                <InlineNotice tone="warning" className="mt-4">
                  WhatsApp is not configured for this store yet. Please email{' '}
                  {settings.contact.email ? (
                    <a href={`mailto:${settings.contact.email}`} className="underline">
                      {settings.contact.email}
                    </a>
                  ) : (
                    'the studio'
                  )}{' '}
                  to place your order.
                </InlineNotice>
              ) : (
                <p className="mt-3 text-[11px] leading-relaxed text-muted">
                  This opens WhatsApp with your bag as an enquiry. It is not a payment and your order is not confirmed
                  until our team replies.
                </p>
              )}
            </aside>
          </div>
        )}
      </div>
    </>
  );
}
