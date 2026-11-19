import { Link } from 'react-router-dom';
import { useSettings } from '../../context/SettingsContext';
import { useCart } from '../../context/CartContext';
import { NAV_LINKS } from '../../lib/env';
import { buildGeneralEnquiry, buildWhatsAppUrl } from '../../lib/whatsapp';
import { trackEvent } from '../../lib/analytics';
import { Wordmark } from '../brand/Logo';
import { WhatsAppIcon } from '../ui/WhatsAppLink';

export function Footer() {
  const { settings } = useSettings();
  const { count } = useCart();
  const year = new Date().getFullYear();
  const whatsappUrl = buildWhatsAppUrl(settings.whatsappNumber, buildGeneralEnquiry(settings));

  return (
    <footer className="border-t border-gold/25 bg-forest-deep text-ivory">
      <div className="container-editorial grid gap-12 py-14 lg:grid-cols-[1.4fr_0.8fr_0.8fr_1fr] lg:gap-10 lg:py-20">
        <div className="max-w-sm">
          <Link to="/" aria-label="Herb & Hue home" className="inline-block">
            <Wordmark width={144} />
          </Link>
          <p className="mt-6 text-[13px] leading-[1.9] text-ivory/65">{settings.footer.blurb}</p>
          <div className="mt-6 flex flex-wrap gap-x-4 gap-y-2">
            {settings.socials.map((social) => (
              <a
                key={`${social.platform}-${social.url}`}
                href={social.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] font-medium uppercase tracking-[0.16em] text-gold/80 transition-colors hover:text-gold"
              >
                {social.platform}
              </a>
            ))}
          </div>
        </div>

        <div>
          <h2 className="font-sans text-[10px] font-semibold uppercase tracking-[0.2em] text-gold">Explore</h2>
          <ul className="mt-5 space-y-3">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <Link to={link.href} className="footer-link">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="font-sans text-[10px] font-semibold uppercase tracking-[0.2em] text-gold">Your bag</h2>
          <ul className="mt-5 space-y-3">
            <li>
              <Link to="/cart" className="footer-link">
                Shopping bag {count > 0 ? `(${count})` : ''}
              </Link>
            </li>
            <li>
              <Link to="/shop" className="footer-link">
                Shop all
              </Link>
            </li>
            <li>
              <Link to="/contact" className="footer-link">
                Contact &amp; orders
              </Link>
            </li>
            {whatsappUrl ? (
              <li>
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackEvent('whatsapp_click', { path: window.location.pathname })}
                  className="footer-link inline-flex items-center gap-2"
                >
                  <WhatsAppIcon className="h-3.5 w-3.5" /> WhatsApp
                </a>
              </li>
            ) : null}
          </ul>
        </div>

        <div>
          <h2 className="font-sans text-[10px] font-semibold uppercase tracking-[0.2em] text-gold">Contact</h2>
          <ul className="mt-5 space-y-3 text-[13px] text-ivory/65">
            {settings.contact.email ? (
              <li>
                <a href={`mailto:${settings.contact.email}`} className="hover:text-gold">
                  {settings.contact.email}
                </a>
              </li>
            ) : null}
            {settings.contact.phone ? (
              <li>
                <a href={`tel:${settings.contact.phone.replace(/[^\d+]/g, '')}`} className="hover:text-gold">
                  {settings.contact.phone}
                </a>
              </li>
            ) : null}
            {settings.contact.addressLines.length > 0 ? (
              <li className="leading-relaxed">
                {settings.contact.addressLines.map((line) => (
                  <span key={line} className="block">
                    {line}
                  </span>
                ))}
              </li>
            ) : null}
            {settings.contact.hours ? <li>{settings.contact.hours}</li> : null}
          </ul>
          {settings.commerce.shippingNote ? (
            <p className="mt-6 border-t border-gold/15 pt-4 text-[11px] leading-relaxed text-ivory/45">
              {settings.commerce.shippingNote}
            </p>
          ) : null}
        </div>
      </div>

      <div className="border-t border-gold/15">
        <div className="container-editorial flex flex-col gap-3 py-6 text-[10px] uppercase tracking-[0.14em] text-ivory/40 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} {settings.businessName}. All rights reserved.
          </p>
          <p className="max-w-md leading-relaxed sm:text-right">{settings.footer.note}</p>
        </div>
      </div>
    </footer>
  );
}
