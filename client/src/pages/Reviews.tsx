import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { getReviews, submitReview } from '../api/catalog';
import type { Review } from '../api/types';
import { errorMessage } from '../api/client';
import { useApi } from '../hooks/useApi';
import { useSettings } from '../context/SettingsContext';
import { useToast } from '../context/ToastContext';
import { Seo } from '../components/Seo';
import { PageHeader } from '../components/layout/PageHeader';
import { Button } from '../components/ui/Button';
import { RatingStars, SectionHeading } from '../components/ui/Bits';
import { EmptyState, ErrorState, InlineNotice, SkeletonBlock } from '../components/ui/feedback';
import { Pagination } from '../components/ui/Pagination';
import { cn } from '../lib/cn';
import { formatDate, initials } from '../lib/format';

const RATING_FILTERS = [0, 5, 4, 3, 2, 1];

interface FormState {
  authorName: string;
  email: string;
  rating: number;
  title: string;
  body: string;
}

const EMPTY_FORM: FormState = { authorName: '', email: '', rating: 5, title: '', body: '' };

function ReviewCard({ review }: { review: Review }) {
  return (
    <article className="flex h-full flex-col border border-forest/10 bg-white/60 p-6">
      <div className="flex items-center justify-between gap-3">
        <RatingStars rating={review.rating} />
        <span className="text-[10px] uppercase tracking-[0.12em] text-muted">{formatDate(review.createdAt)}</span>
      </div>
      {review.title ? (
        <h3 className="mt-4 font-serif text-[22px] leading-snug text-forest-dark">{review.title}</h3>
      ) : null}
      <p className="mt-2 flex-1 text-[13.5px] leading-[1.9] text-charcoal/75">{review.body}</p>
      <div className="mt-5 flex items-center gap-3 border-t border-gold/25 pt-4">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-forest font-sans text-[10px] font-semibold text-ivory">
          {initials(review.authorName)}
        </span>
        <div>
          <p className="text-[12px] font-medium text-forest-dark">{review.authorName}</p>
          {review.product ? (
            <Link to={`/product/${review.product.slug}`} className="text-[11px] text-muted hover:text-forest">
              {review.product.name}
            </Link>
          ) : (
            <p className="text-[11px] text-muted">Verified customer</p>
          )}
        </div>
      </div>
    </article>
  );
}

export function Reviews() {
  const { settings } = useSettings();
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [ratingFilter, setRatingFilter] = useState(0);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const reviews = useApi(
    (signal) => getReviews({ page, limit: 9, rating: ratingFilter || undefined }, signal),
    [page, ratingFilter],
    { enabled: settings.features.reviewsEnabled },
  );

  const data = reviews.data;
  const summary = data?.summary;
  const items = data?.data ?? [];
  const total = summary?.total ?? 0;

  const updateField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: '' }));
  };

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    if (form.authorName.trim().length < 2) next.authorName = 'Please tell us your name.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) next.email = 'Enter a valid email address.';
    if (form.body.trim().length < 10) next.body = 'Please write at least a sentence or two.';
    if (form.title.length > 120) next.title = 'Keep the headline under 120 characters.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const response = await submitReview({
        authorName: form.authorName.trim(),
        email: form.email.trim(),
        rating: form.rating,
        title: form.title.trim(),
        body: form.body.trim(),
      });
      setSubmitted(response.data.message);
      setForm(EMPTY_FORM);
      toast.success('Review received', 'Thank you — it will appear once approved by our team.');
    } catch (error) {
      toast.error('We could not submit your review', errorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Seo
        title="Customer reviews"
        description="Read genuine, moderated customer reviews of Herb & Hue. We publish only reviews submitted with permission."
        path="/reviews"
      />
      <PageHeader
        eyebrow="In their words"
        title="Customer notes"
        description="Only reviews submitted through this site and approved by our team appear here. We do not write or invent testimonials."
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Reviews' }]}
      />

      <div className="container-editorial py-12 sm:py-16">
        {!settings.features.reviewsEnabled ? (
          <EmptyState
            eyebrow="Reviews"
            title="Reviews are currently closed"
            body="Our team is not accepting public reviews at the moment. You are always welcome to ask us questions directly."
          />
        ) : (
          <>
            <div className="grid gap-10 border-b border-gold/25 pb-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
              <div>
                <p className="eyebrow">The summary</p>
                <div className="mt-5 flex items-end gap-4">
                  <span className="font-serif text-[64px] leading-none text-forest-dark">
                    {total > 0 ? (summary?.average ?? 0).toFixed(1) : '—'}
                  </span>
                  <div className="pb-2">
                    <RatingStars rating={summary?.average ?? 0} />
                    <p className="mt-1 text-[11px] uppercase tracking-[0.12em] text-muted">
                      {total} approved {total === 1 ? 'review' : 'reviews'}
                    </p>
                  </div>
                </div>
                <div className="mt-6 space-y-2">
                  {[5, 4, 3, 2, 1].map((star) => {
                    const count = summary?.distribution[String(star)] ?? 0;
                    const percent = total > 0 ? Math.round((count / total) * 100) : 0;
                    return (
                      <div key={star} className="flex items-center gap-3">
                        <span className="w-10 text-[11px] tabular-nums text-muted">{star} ★</span>
                        <span className="h-1.5 flex-1 bg-forest/10">
                          <span className="block h-full bg-gold" style={{ width: `${percent}%` }} />
                        </span>
                        <span className="w-6 text-right text-[11px] tabular-nums text-muted">{count}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-6 flex flex-wrap gap-2">
                  {RATING_FILTERS.map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => {
                        setRatingFilter(value);
                        setPage(1);
                      }}
                      aria-pressed={ratingFilter === value}
                      className={cn(
                        'border px-3 py-1.5 text-[10px] uppercase tracking-[0.12em] transition-colors',
                        ratingFilter === value
                          ? 'border-forest bg-forest text-ivory'
                          : 'border-forest/20 text-forest hover:border-forest',
                      )}
                    >
                      {value === 0 ? 'All' : `${value} star`}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="eyebrow">A note on honesty</p>
                <h2 className="mt-4 font-serif text-[clamp(1.8rem,3vw,2.6rem)] leading-tight text-forest-dark">
                  Reviews are verified, moderated and never invented.
                </h2>
                <p className="mt-4 max-w-xl text-[13.5px] leading-[1.9] text-muted">
                  Every submission is held for moderation. We may remove abusive or irrelevant content, but we do not
                  alter the substance of a review. Your email is used only to verify the review and is never published.
                </p>
              </div>
            </div>

            <div className="mt-10" id="reviews-list">
              {reviews.error ? (
                <ErrorState error={reviews.error} onRetry={reviews.reload} />
              ) : reviews.loading ? (
                <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <SkeletonBlock key={index} className="h-64 w-full" />
                  ))}
                </div>
              ) : items.length === 0 ? (
                <EmptyState
                  eyebrow={ratingFilter ? 'No matches' : 'No reviews yet'}
                  title={ratingFilter ? 'No reviews with that rating' : 'The first note is yet to arrive'}
                  body={
                    ratingFilter
                      ? 'Try another rating or view all approved reviews.'
                      : 'We only publish reviews that customers have written and our team has approved. If you have used a Herb & Hue piece, you are warmly invited to share your experience.'
                  }
                  action={
                    ratingFilter ? (
                      <Button variant="outline" onClick={() => setRatingFilter(0)}>
                        View all reviews
                      </Button>
                    ) : (
                      <a href="#write-review" className="btn btn-outline">
                        Write a review
                      </a>
                    )
                  }
                />
              ) : (
                <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                  {items.map((review) => (
                    <ReviewCard key={review.id} review={review} />
                  ))}
                </div>
              )}

              {data && data.meta.totalPages > 1 ? (
                <Pagination
                  page={data.meta.page}
                  totalPages={data.meta.totalPages}
                  onChange={(nextPage) => {
                    setPage(nextPage);
                    document.getElementById('reviews-list')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="mt-12"
                />
              ) : null}
            </div>

            <section id="write-review" className="mt-16 scroll-mt-28 border-t border-gold/25 pt-12">
              <SectionHeading
                eyebrow="Share your experience"
                title="Write a review"
                description="Reviews are published after moderation, with your first name and review text only."
                className="mb-8"
              />

              {submitted ? (
                <div className="border border-forest/15 bg-white/60 p-8">
                  <InlineNotice tone="info">{submitted}</InlineNotice>
                  <div className="mt-6 flex flex-wrap gap-3">
                    <Button variant="outline" onClick={() => setSubmitted(null)}>
                      Write another
                    </Button>
                    <Button variant="ghost" onClick={() => setSubmitted(null)}>
                      Back to the form
                    </Button>
                  </div>
                </div>
              ) : (
                <form onSubmit={onSubmit} className="grid gap-6 border border-forest/15 bg-white/50 p-6 sm:p-8 lg:grid-cols-2">
                  <div>
                    <label htmlFor="review-name" className="field-label">
                      Your name <span className="text-gold-dark">*</span>
                    </label>
                    <input
                      id="review-name"
                      value={form.authorName}
                      onChange={(event) => updateField('authorName', event.target.value)}
                      className={cn('field', errors.authorName && 'field-error')}
                      autoComplete="name"
                      maxLength={60}
                      required
                    />
                    {errors.authorName ? <p className="field-error-text">{errors.authorName}</p> : null}
                  </div>
                  <div>
                    <label htmlFor="review-email" className="field-label">
                      Email <span className="text-gold-dark">*</span>
                    </label>
                    <input
                      id="review-email"
                      type="email"
                      value={form.email}
                      onChange={(event) => updateField('email', event.target.value)}
                      className={cn('field', errors.email && 'field-error')}
                      autoComplete="email"
                      maxLength={254}
                      required
                    />
                    <p className="field-hint">Never published. Used only to verify your review.</p>
                    {errors.email ? <p className="field-error-text">{errors.email}</p> : null}
                  </div>

                  <fieldset className="lg:col-span-2">
                    <legend className="field-label">Your rating</legend>
                    <div className="flex flex-wrap gap-2">
                      {[5, 4, 3, 2, 1].map((value) => (
                        <label
                          key={value}
                          className={cn(
                            'flex cursor-pointer items-center gap-2 border px-3 py-2 text-[11px] transition-colors',
                            form.rating === value
                              ? 'border-forest bg-forest text-ivory'
                              : 'border-forest/20 text-forest hover:border-forest',
                          )}
                        >
                          <input
                            type="radio"
                            name="rating"
                            value={value}
                            checked={form.rating === value}
                            onChange={() => updateField('rating', value)}
                            className="sr-only"
                          />
                          <span aria-hidden="true">★</span>
                          {value}
                          <span className="sr-only">star{value === 1 ? '' : 's'}</span>
                        </label>
                      ))}
                    </div>
                  </fieldset>

                  <div className="lg:col-span-2">
                    <label htmlFor="review-title" className="field-label">
                      Headline <span className="normal-case tracking-normal text-muted">(optional)</span>
                    </label>
                    <input
                      id="review-title"
                      value={form.title}
                      onChange={(event) => updateField('title', event.target.value)}
                      className={cn('field', errors.title && 'field-error')}
                      maxLength={120}
                    />
                    {errors.title ? <p className="field-error-text">{errors.title}</p> : null}
                  </div>

                  <div className="lg:col-span-2">
                    <label htmlFor="review-body" className="field-label">
                      Your review <span className="text-gold-dark">*</span>
                    </label>
                    <textarea
                      id="review-body"
                      value={form.body}
                      onChange={(event) => updateField('body', event.target.value)}
                      rows={6}
                      maxLength={2000}
                      required
                      className={cn('field resize-y', errors.body && 'field-error')}
                      placeholder="What did you use, and how did it fit into your routine?"
                    />
                    <div className="mt-1 flex items-center justify-between">
                      {errors.body ? <p className="field-error-text">{errors.body}</p> : <span />}
                      <span className="text-[11px] text-muted">{form.body.length}/2000</span>
                    </div>
                  </div>

                  <div className="lg:col-span-2 flex flex-wrap items-center gap-4">
                    <Button type="submit" loading={submitting}>
                      Submit for review
                    </Button>
                    <p className="max-w-md text-[11px] leading-relaxed text-muted">
                      By submitting, you confirm the review reflects your own experience. We do not publish reviews
                      written on behalf of others.
                    </p>
                  </div>
                </form>
              )}
            </section>
          </>
        )}
      </div>
    </>
  );
}
