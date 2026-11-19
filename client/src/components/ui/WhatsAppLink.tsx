import type { ReactNode } from 'react';
import { useSettings } from '../../context/SettingsContext';
import { buildWhatsAppUrl } from '../../lib/whatsapp';
import { trackEvent } from '../../lib/analytics';
import { Button, ButtonAnchor, type ButtonSize, type ButtonVariant } from './Button';

export function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className ?? 'h-4 w-4'} fill="currentColor" aria-hidden="true">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm0 18.13h-.01a8.2 8.2 0 0 1-4.18-1.15l-.3-.18-3.11.82.83-3.04-.2-.31a8.19 8.19 0 0 1-1.26-4.36c0-4.54 3.7-8.23 8.24-8.23a8.2 8.2 0 0 1 8.23 8.24c0 4.54-3.7 8.21-8.24 8.21Zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.12-.16.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.01-.38.11-.5.11-.11.25-.29.37-.43.12-.14.16-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.4-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.23.25-.87.85-.87 2.07s.9 2.4 1.03 2.56c.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.67-1.18.21-.58.21-1.08.15-1.18-.06-.11-.23-.17-.48-.29Z" />
    </svg>
  );
}

interface WhatsAppLinkProps {
  message: string;
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  disabledHint?: string;
}

export function WhatsAppLink({
  message,
  children,
  variant = 'outline',
  size = 'md',
  className,
  disabledHint = 'WhatsApp is not configured yet — please use the contact page.',
}: WhatsAppLinkProps) {
  const { settings } = useSettings();
  const url = buildWhatsAppUrl(settings.whatsappNumber, message);

  if (!url) {
    return (
      <span className={className}>
        <Button variant={variant} size={size} disabled title={disabledHint} className="w-full">
          {children}
        </Button>
        <span className="mt-2 block text-[11px] leading-snug text-muted">{disabledHint}</span>
      </span>
    );
  }

  return (
    <ButtonAnchor
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      variant={variant}
      size={size}
      className={className}
      onClick={() => trackEvent('whatsapp_click', { path: window.location.pathname })}
    >
      {children}
    </ButtonAnchor>
  );
}
