import { useEffect, useState } from 'react';
import {
  deleteAdminReview,
  listAdminReviews,
  moderateAdminReview,
} from '../api/admin';
import { errorMessage } from '../api/client';
import type { AdminReview } from '../api/types';
import { useApi } from '../hooks/useApi';
import { useToast } from '../context/ToastContext';
import { AdminEmpty, AdminIcon, AdminPageHeader, ConfirmDialog } from './AdminUI';
import { Button } from '../components/ui/Button';
import { Badge, RatingStars } from '../components/ui/Bits';
import { ErrorState, SkeletonBlock } from '../components/ui/feedback';
import { Pagination } from '../components/ui/Pagination';
import { formatDate } from '../lib/format';
import { cn } from '../lib/cn';

type ReviewStatus = 'pending' | 'approved' | 'rejected' | 'all';

const TABS: { value: ReviewStatus; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'all', label: 'All' },
];

const STATUS_TONE = {
  pending: 'gold',
  approved: 'forest',
  rejected: 'out',
} as const;

export function AdminReviews() {
  const toast = useToast();
  const [status, setStatus] = useState<ReviewStatus>('pending');
  const [page, setPage] = useState(1);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminReview | null>(null);
  const [deleting, setDeleting] = useState(false);

  const reviews = useApi(() => listAdminReviews(status, page), [status, page]);

  useEffect(() => {
    setPage(1);
  }, [status]);

  const items = reviews.data?.data ?? [];

  const moderate = async (review: AdminReview, next: 'approved' | 'rejected' | 'pending') => {
    setBusyId(review.id);
    try {
      await moderateAdminReview(review.id, next);
      toast.success(
        next === 'approved' ? 'Review approved' : next === 'rejected' ? 'Review rejected' : 'Review returned to pending',
        next === 'approved' ? 'It is now visible on the storefront.' : 'It will not be published.',
      );
      reviews.reload();
    } catch (error) {
      toast.error('Could not moderate review', errorMessage(error));
    } finally {
      setBusyId(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteAdminReview(deleteTarget.id);
      toast.success('Review deleted');
      setDeleteTarget(null);
      reviews.reload();
    } catch (error) {
      toast.error('Could not delete review', errorMessage(error));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <AdminPageHeader
        eyebrow="Community"
        title="Reviews"
        description="Only approved reviews appear on the storefront. Never edit a customer's words to invent or exaggerate an outcome."
      />

      <div className="mt-6 flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setStatus(tab.value)}
            aria-pressed={status === tab.value}
            className={cn(
              'border px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.12em] transition-colors',
              status === tab.value
                ? 'border-forest bg-forest text-ivory'
                : 'border-forest/20 text-forest hover:border-forest',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between">
        <p className="text-[11px] uppercase tracking-[0.12em] text-muted">
          {reviews.loading ? 'Loading…' : `${reviews.data?.meta.total ?? 0} reviews`}
        </p>
      </div>

      {reviews.error ? (
        <ErrorState className="mt-4" error={reviews.error} onRetry={reviews.reload} />
      ) : reviews.loading ? (
        <div className="mt-4 space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <SkeletonBlock key={index} className="h-32 w-full" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="mt-4">
          <AdminEmpty
            title={status === 'pending' ? 'The queue is clear' : 'No reviews here'}
            body="Reviews submitted through the storefront appear here for moderation before publication."
          />
        </div>
      ) : (
        <ul className="mt-4 space-y-3">
          {items.map((review) => (
            <li key={review.id} className="rounded-[4px] border border-forest/10 bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <RatingStars rating={review.rating} showValue />
                    <Badge tone={STATUS_TONE[review.status]}>{review.status}</Badge>
                  </div>
                  {review.title ? (
                    <h2 className="mt-2 font-serif text-[21px] leading-tight text-forest-dark">{review.title}</h2>
                  ) : null}
                </div>
                <div className="text-right text-[10px] uppercase tracking-[0.1em] text-muted">
                  <p>{formatDate(review.createdAt)}</p>
                  <p className="mt-0.5 normal-case tracking-normal text-[11px]">{review.authorName}</p>
                  {review.email ? <p className="normal-case tracking-normal text-[11px]">{review.email}</p> : null}
                </div>
              </div>

              <p className="mt-3 whitespace-pre-line text-[13px] leading-[1.8] text-charcoal/80">{review.body}</p>

              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted">
                {review.product ? (
                  <span>
                    Product: <span className="text-forest">{review.product.name}</span>
                  </span>
                ) : (
                  <span>General review</span>
                )}
                {review.adminNote ? <span>Note: {review.adminNote}</span> : null}
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-forest/10 pt-3">
                {review.status !== 'approved' ? (
                  <Button
                    size="sm"
                    variant="outline"
                    loading={busyId === review.id}
                    onClick={() => moderate(review, 'approved')}
                    className="px-3 py-1.5 text-[9px]"
                  >
                    <AdminIcon name="check" className="h-3 w-3" /> Approve
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    loading={busyId === review.id}
                    onClick={() => moderate(review, 'pending')}
                    className="px-2 py-1.5 text-[9px]"
                  >
                    Unpublish
                  </Button>
                )}
                {review.status !== 'rejected' ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    loading={busyId === review.id}
                    onClick={() => moderate(review, 'rejected')}
                    className="px-2 py-1.5 text-[9px]"
                  >
                    Reject
                  </Button>
                ) : null}
                <button
                  type="button"
                  onClick={() => setDeleteTarget(review)}
                  className="ml-auto p-1.5 text-forest/40 hover:text-red-800"
                  aria-label="Delete review"
                >
                  <AdminIcon name="trash" className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {reviews.data && reviews.data.meta.totalPages > 1 ? (
        <Pagination
          page={reviews.data.meta.page}
          totalPages={reviews.data.meta.totalPages}
          onChange={setPage}
          className="mt-8"
        />
      ) : null}

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete this review?"
        description="The review will be permanently removed. Consider rejecting it instead if you may need the record."
        confirmLabel="Delete review"
        destructive
        loading={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
