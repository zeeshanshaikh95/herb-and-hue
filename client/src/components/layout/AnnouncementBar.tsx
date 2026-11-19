import { Link } from 'react-router-dom';
import { useSettings } from '../../context/SettingsContext';
import { safeInternalOrExternal } from '../../lib/links';

export function AnnouncementBar() {
  const { settings } = useSettings();
  const { announcement } = settings;
  if (!announcement.enabled || !announcement.text.trim()) return null;

  const target = safeInternalOrExternal(announcement.linkUrl);

  return (
    <div className="bg-forest-deep text-ivory/85">
      <div className="container-editorial flex min-h-[38px] flex-wrap items-center justify-center gap-x-3 gap-y-1 py-2 text-center">
        <p className="text-[10px] font-medium uppercase tracking-[0.2em] leading-relaxed sm:text-[10.5px]">
          {announcement.text}
        </p>
        {announcement.linkLabel && target ? (
          target.external ? (
            <a
              href={target.href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] font-medium uppercase tracking-[0.2em] text-gold underline decoration-gold/40 underline-offset-4 hover:text-gold-light"
            >
              {announcement.linkLabel}
            </a>
          ) : (
            <Link
              to={target.href}
              className="text-[10px] font-medium uppercase tracking-[0.2em] text-gold underline decoration-gold/40 underline-offset-4 hover:text-gold-light"
            >
              {announcement.linkLabel}
            </Link>
          )
        ) : null}
      </div>
    </div>
  );
}
