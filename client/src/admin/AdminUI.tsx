import type { ReactNode } from 'react';
import { Modal } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';
import { cn } from '../lib/cn';

const ICON_PATHS: Record<string, ReactNode> = {
  grid: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </>
  ),
  bottle: (
    <>
      <path d="M10 2h4v4h-4z" />
      <path d="M9 6h6l2 4v11a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V10l2-4Z" />
    </>
  ),
  layers: (
    <>
      <path d="M12 3l9 5-9 5-9-5 9-5Z" />
      <path d="M3 13l9 5 9-5" />
    </>
  ),
  star: <path d="M12 3l2.7 6 6.3.6-4.8 4.3 1.4 6.1-5.6-3.2-5.6 3.2 1.4-6.1L3 9.6 9.3 9 12 3Z" />,
  image: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="1.5" />
      <circle cx="8.5" cy="9.5" r="1.5" />
      <path d="M4 18l5-5 3.5 3.5L16 13l4 4" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H11a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V11a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1Z" />
    </>
  ),
  menu: <path d="M3 6h18M3 12h18M3 18h18" />,
  close: <path d="M4 4l16 16M20 4L4 20" />,
  external: (
    <>
      <path d="M14 4h6v6" />
      <path d="M20 4l-9 9" />
      <path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
    </>
  ),
  logout: (
    <>
      <path d="M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4" />
      <path d="M10 17l-5-5 5-5M5 12h11" />
    </>
  ),
  plus: <path d="M12 4v16M4 12h16" />,
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="M15.5 15.5L21 21" />
    </>
  ),
  arrowUp: <path d="M12 20V5M5 12l7-7 7 7" />,
  arrowDown: <path d="M12 4v15M5 12l7 7 7-7" />,
  trash: (
    <>
      <path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14" />
      <path d="M10 11v6M14 11v6" />
    </>
  ),
  check: <path d="M4 12.5l5 5L20 6" />,
};

export function AdminIcon({
  name,
  className = 'h-4 w-4',
}: {
  name: keyof typeof ICON_PATHS | string;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {ICON_PATHS[name] ?? ICON_PATHS.grid}
    </svg>
  );
}

export function AdminPageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-5 border-b border-forest/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow ? <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gold-dark">{eyebrow}</p> : null}
        <h1 className="mt-2 font-serif text-[clamp(1.9rem,3vw,2.7rem)] leading-tight text-forest-dark">{title}</h1>
        {description ? <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = 'light',
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: string;
  tone?: 'light' | 'forest' | 'gold';
}) {
  const tones = {
    light: 'border-forest/10 bg-white text-forest-dark',
    forest: 'border-forest bg-forest text-ivory',
    gold: 'border-gold/40 bg-gold/15 text-forest-dark',
  } as const;
  return (
    <div className={cn('rounded-[4px] border p-5 shadow-sm', tones[tone])}>
      <div className="flex items-start justify-between gap-3">
        <p className={cn('text-[10px] font-semibold uppercase tracking-[0.16em]', tone === 'forest' ? 'text-gold' : 'text-muted')}>
          {label}
        </p>
        {icon ? (
          <span className={cn('opacity-60', tone === 'forest' ? 'text-gold' : 'text-forest')}>
            <AdminIcon name={icon} className="h-4 w-4" />
          </span>
        ) : null}
      </div>
      <div className="mt-3 font-serif text-[34px] leading-none">{value}</div>
      {hint ? (
        <p className={cn('mt-2 text-[11px]', tone === 'forest' ? 'text-ivory/60' : 'text-muted')}>{hint}</p>
      ) : null}
    </div>
  );
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  destructive = false,
  loading = false,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="outline" size="sm" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button
            size="sm"
            variant="primary"
            loading={loading}
            onClick={onConfirm}
            className={destructive ? 'border-red-900 bg-red-900 hover:bg-red-950' : undefined}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-[13px] leading-relaxed text-charcoal/75">{description}</p>
    </Modal>
  );
}

export function AdminEmpty({ title, body, action }: { title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="rounded-[4px] border border-dashed border-forest/20 bg-white/60 px-6 py-14 text-center">
      <h2 className="font-serif text-[24px] text-forest-dark">{title}</h2>
      {body ? <p className="mx-auto mt-2 max-w-md text-[13px] leading-relaxed text-muted">{body}</p> : null}
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}
